// Reading recipes from photos in the background: reading takes a free model
// a minute or more, so nobody waits for it. The Server Action
// (app/actions.ts → importRecipesFromPhotos) takes the photos and starts a
// reading; this runs after its answer — converts and stores the photos, reads
// them — and saves every recipe read as a draft
// (Recipe.readingId). The photo page lists the readings
// (components/ReadingList.tsx): "Čítam…" with each title as soon as it is
// read, then each draft to review or keep as it is. Drafts are not among the
// person's recipes until kept; a failed reading can be read again.
//
// A reading is its "wait" row in AiUsage (also the statistics): purpose
// "reading" while it runs (readTitles: the titles read so far), then "ok"
// with the recipes (readResult), or the error code. One cut off by a restart
// ends as "unknown" after a while.
// Server-only.
import { prisma } from "@/lib/prisma";
import { refundImport } from "@/lib/aiBudget";
import { cropDish } from "@/lib/dishCrop";
import { generateRecipePicture } from "@/lib/dishImage";
import { extractRecipesFromPhotos } from "@/lib/extractRecipe";
import { listedRecipes, visibleRecipes } from "@/lib/features";
import type { ReadingItem, ReadingListData } from "@/lib/readingList";
import { parseList } from "@/lib/recipes";
import { loadStoredPhoto, preparePhoto, saveImageBuffer } from "@/lib/saveImage";
import { findDuplicate } from "@/lib/similarity";
import { enterUsage } from "@/lib/usageContext";
import { AppError, USER_MESSAGES, toUserMessage, type ErrorCode } from "@/lib/userErrors";

type Who = { userId: string; isGuest: boolean };
type Photo = { imagePath: string; dataUrl: string; buf: Buffer };
// A photo as it arrived, before it is converted and stored.
export type Upload = { buf: Buffer; type: string; name: string };
// One saved recipe of a reading; like: the id of an older recipe it resembles.
type Saved = { id: string; like?: string };

// A reading still running after this was cut off (each model call gives up
// after 150 s, three of them at most, plus cropping).
const READING_STALE_MS = 15 * 60 * 1000;

// photos: already stored (reading again); none when they still need preparing.
export async function startReading(who: Who, photos: Photo[] = []): Promise<string> {
  const row = await prisma.aiUsage.create({
    data: { kind: "wait", ...who, purpose: "reading", photoPaths: JSON.stringify(photos.map((p) => p.imagePath)) },
  });
  return row.id;
}

// Convert and store the photos as they arrived (HEIC decoded, downscaled;
// ~1.5 s each — so after answering, not while the person waits), then read
// them. One that can't be opened fails the reading. Never throws.
export async function prepareAndRead(
  readingId: string,
  importId: string,
  who: Who,
  uploads: Upload[],
  startedAt: number,
): Promise<void> {
  const photos: Photo[] = [];
  for (const u of uploads) {
    const prepared = await preparePhoto(u.buf, u.type, u.name).catch(() => null);
    if (!prepared) {
      console.warn(`Photo ${u.name} (${u.type || "no type"}) could not be opened.`);
      await refundImport(importId);
      await prisma.aiUsage
        .update({ where: { id: readingId }, data: { purpose: "bad-photo", durationMs: Date.now() - startedAt } })
        .catch(() => {});
      return;
    }
    photos.push({ imagePath: await saveImageBuffer(prepared.buf, prepared.ext), dataUrl: prepared.dataUrl, buf: prepared.buf });
  }
  await prisma.aiUsage
    .update({ where: { id: readingId }, data: { photoPaths: JSON.stringify(photos.map((p) => p.imagePath)) } })
    .catch(() => {});
  await readAndSave(readingId, importId, who, photos, startedAt);
}

// Read and save the drafts. `importId` is the day's import reservation (given back
// if the models were only busy); `startedAt` when the photos arrived (the
// statistics' wait). Never throws.
export async function readAndSave(
  readingId: string,
  importId: string,
  who: Who,
  photos: Photo[],
  startedAt: number,
): Promise<void> {
  // AI calls below are recorded for this person (statistics).
  enterUsage(who);
  let saved: Saved[] = [];
  let outcome: string;
  // The titles as they are read, one write after another.
  let titlesWritten = Promise.resolve();
  const onTitles = (titles: string[]) => {
    titlesWritten = titlesWritten
      .then(() => prisma.aiUsage.update({ where: { id: readingId }, data: { readTitles: JSON.stringify(titles) } }))
      .then(() => {}, () => {});
  };
  try {
    const recipes = await extractRecipesFromPhotos(photos.map((p) => p.dataUrl), undefined, onTitles);
    for (const r of recipes) {
      // Before saving: does it look like a recipe they already have?
      const like = await resemblance(who.userId, r);
      // No dish photo that passes the check: no picture rather than a wrong
      // one — a generated one is drawn after saving.
      const others = recipes.filter((o) => o !== r).map((o) => o.title);
      const crop = await cropDish(r, photos, others);
      // The scans: the photos with its text and its dish (all, if unsure).
      const used = [...new Set([...r.photos, ...(r.dish ? [r.dish.photo] : [])])].sort();
      const recipe = await prisma.recipe.create({
        data: {
          userId: who.userId,
          title: r.title || "Recept z fotky",
          ingredients: JSON.stringify(r.ingredients),
          instructions: JSON.stringify(r.instructions),
          sourceType: "photo",
          imagePath: crop ? await saveImageBuffer(crop, "jpg") : null,
          scanPaths: JSON.stringify((used.length ? used : photos.map((_, i) => i)).map((i) => photos[i].imagePath)),
          readingId,
        },
      });
      saved.push(like ? { id: recipe.id, like } : { id: recipe.id });
    }
    outcome = "ok";
  } catch (err) {
    toUserMessage(err); // logs it
    outcome = err instanceof AppError ? err.code : "unknown";
    if (outcome === "busy") await refundImport(importId);
    saved = [];
  }
  await titlesWritten;
  await prisma.aiUsage
    .update({
      where: { id: readingId },
      data: {
        purpose: outcome,
        durationMs: Date.now() - startedAt,
        readResult: saved.length ? JSON.stringify(saved) : null,
        readTitles: null,
      },
    })
    .catch(() => {});
  // Pictures for the recipes without a dish photo (~30 s each), last.
  for (const { id } of saved) {
    const r = await prisma.recipe.findUnique({ where: { id }, select: { imagePath: true } });
    if (r && !r.imagePath) await generateRecipePicture(id, who).catch(() => {});
  }
}

// The id of the person's recipe this one looks like (lib/similarity.ts), if any.
async function resemblance(userId: string, r: { title: string; ingredients: string[]; instructions: string[] }) {
  const others = await prisma.recipe.findMany({
    where: { userId, deletedAt: null, ...listedRecipes },
    select: { id: true, title: true, ingredients: true, instructions: true },
  });
  const verdict = findDuplicate(
    r,
    others.map((o) => ({ ...o, ingredients: parseList(o.ingredients), instructions: parseList(o.instructions) })),
  );
  return verdict?.match.id;
}

// Read the photos of a failed reading once more, as a new reading: its id,
// and the work for the caller to run after answering. Its import counts
// against the day's limit like any other (the caller reserved it). null if
// it can't be retried (not theirs, not failed, photos gone).
export async function retryReading(
  readingId: string,
  importId: string,
  who: Who,
): Promise<{ readingId: string; run: () => Promise<void> } | null> {
  const row = await prisma.aiUsage.findFirst({
    where: { id: readingId, kind: "wait", userId: who.userId, purpose: { notIn: ["reading", "ok"] }, dismissed: false },
    select: { photoPaths: true },
  });
  const paths = JSON.parse(row?.photoPaths ?? "[]") as string[];
  const photos = (await Promise.all(paths.map(loadStoredPhoto))).filter((p) => p !== null);
  if (!paths.length || photos.length !== paths.length) return null;
  // The new reading replaces the failed one in the list.
  await dismissReading(readingId, who.userId);
  const id = await startReading(who, photos);
  const startedAt = Date.now();
  return { readingId: id, run: () => readAndSave(id, importId, who, photos, startedAt) };
}

const errorMessage = (code: string) => USER_MESSAGES[code as ErrorCode] ?? USER_MESSAGES.unknown;
// Failures worth reading the same photos again for (not "no recipe there").
const RETRYABLE = new Set(["busy", "unknown"]);

// A failed reading stays in the list this long (its photos are kept a day).
const FAILED_SHOWN_MS = 24 * 60 * 60 * 1000;

// The photo page's list: the person's readings still running, failed ones
// they haven't closed, and the drafts waiting to be kept — newest first,
// each reading's recipes together (in the order read).
export async function readingList(userId: string): Promise<ReadingItem[]> {
  await closeStaleReadings();
  const drafts = await prisma.recipe.findMany({
    where: { userId, readingId: { not: null }, deletedAt: null, ...visibleRecipes },
    select: { id: true, title: true, imagePath: true, readingId: true },
    orderBy: { createdAt: "asc" },
  });
  const rows = await prisma.aiUsage.findMany({
    where: {
      kind: "wait",
      userId,
      OR: [
        { purpose: "reading" },
        { purpose: { not: "ok" }, dismissed: false, createdAt: { gt: new Date(Date.now() - FAILED_SHOWN_MS) } },
        { id: { in: [...new Set(drafts.map((d) => d.readingId!))] } },
      ],
    },
    select: { id: true, purpose: true, readTitles: true, readResult: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });
  // The older recipes the drafts look like.
  const likeOf = new Map<string, string>();
  for (const r of rows) for (const s of JSON.parse(r.readResult ?? "[]") as Saved[]) if (s.like) likeOf.set(s.id, s.like);
  const liked = await prisma.recipe.findMany({
    where: { id: { in: [...likeOf.values()] }, userId, deletedAt: null, ...listedRecipes },
    select: { id: true, title: true },
  });
  const likeById = new Map(liked.map((l) => [l.id, l]));

  return rows.flatMap((r): ReadingItem[] => {
    const at = r.createdAt.getTime();
    if (r.purpose === "reading") {
      const titles = JSON.parse(r.readTitles ?? "[]") as string[];
      return titles.length
        ? titles.map((title, i) => ({ kind: "reading", key: `${r.id}-${i}`, readingId: r.id, at, title }))
        : [{ kind: "reading", key: r.id, readingId: r.id, at, title: null }];
    }
    if (r.purpose !== "ok") {
      const code = r.purpose ?? "unknown";
      return [{ kind: "failed", key: r.id, readingId: r.id, at, error: errorMessage(code), canRetry: RETRYABLE.has(code) }];
    }
    return drafts
      .filter((d) => d.readingId === r.id)
      .map((d) => {
        const like = likeById.get(likeOf.get(d.id) ?? "");
        return {
          kind: "ready",
          key: d.id,
          readingId: r.id,
          at,
          id: d.id,
          title: d.title,
          imagePath: d.imagePath,
          ...(like ? { like } : {}),
        };
      });
  });
}

// The list with the server's clock (the photo page and its updates).
export async function readingListData(userId: string | null): Promise<ReadingListData> {
  return { items: userId ? await readingList(userId) : [], now: Date.now() };
}

// Keep drafts as they are (all of the person's, or those of `ids`): they join
// their recipes. How many were kept.
export async function keepDrafts(who: Who, ids?: string[]): Promise<number> {
  const { count } = await prisma.recipe.updateMany({
    where: { userId: who.userId, readingId: { not: null }, deletedAt: null, ...(ids ? { id: { in: ids } } : {}) },
    data: { readingId: null },
  });
  if (count) await prisma.activity.createMany({ data: Array.from({ length: count }, () => ({ kind: "created", ...who })) });
  return count;
}

// Close a failed reading in the list.
export async function dismissReading(readingId: string, userId: string): Promise<void> {
  await prisma.aiUsage.updateMany({
    where: { id: readingId, kind: "wait", userId, purpose: { notIn: ["reading", "ok"] } },
    data: { dismissed: true },
  });
}

// Readings cut off (a restart during a deploy) end as failed, so nobody is
// told "still reading" forever; their photos can be read again.
export async function closeStaleReadings(): Promise<number> {
  const { count } = await prisma.aiUsage.updateMany({
    where: { kind: "wait", purpose: "reading", createdAt: { lt: new Date(Date.now() - READING_STALE_MS) } },
    data: { purpose: "unknown" },
  });
  return count;
}
