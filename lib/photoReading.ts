// Reading recipes from photos in the background: reading takes a free model
// a minute or more, so nobody waits on the page. The Server Action
// (app/actions.ts → importRecipesFromPhotos) saves the photos and starts a
// reading; this runs after its answer, saves every recipe as read and lets
// the person know — in the app (components/ReadingNotifier.tsx) and on their
// phone (lib/push.ts): one notification per reading, however many recipes.
// The reading's page (app/recipes/read/[id]) lists them, notes one that looks
// like a recipe they already have, and offers to read the photos again if it
// failed.
//
// A reading is its "wait" row in AiUsage (also the statistics): purpose
// "reading" while it runs, then "ok" with the recipes (readResult), or the
// error code. One cut off by a restart ends as "unknown" after a while.
// Server-only.
import { prisma } from "@/lib/prisma";
import { refundImport } from "@/lib/aiBudget";
import { cropDish } from "@/lib/dishCrop";
import { generateRecipePicture } from "@/lib/dishImage";
import { extractRecipesFromPhotos } from "@/lib/extractRecipe";
import { visibleRecipes } from "@/lib/features";
import { notifyUser } from "@/lib/push";
import { notice, type ReadingStatus } from "@/lib/readingNotice";
import { parseList } from "@/lib/recipes";
import { loadStoredPhoto, saveImageBuffer } from "@/lib/saveImage";
import { findDuplicate } from "@/lib/similarity";
import { enterUsage } from "@/lib/usageContext";
import { AppError, USER_MESSAGES, toUserMessage, type ErrorCode } from "@/lib/userErrors";

type Who = { userId: string; isGuest: boolean };
type Photo = { imagePath: string; dataUrl: string; buf: Buffer };
// One saved recipe of a reading; like: the id of an older recipe it resembles.
type Saved = { id: string; like?: string };

// A reading still running after this was cut off (each model call gives up
// after 150 s, three of them at most, plus cropping).
const READING_STALE_MS = 15 * 60 * 1000;

export async function startReading(who: Who, photos: Photo[]): Promise<string> {
  const row = await prisma.aiUsage.create({
    data: { kind: "wait", ...who, purpose: "reading", photoPaths: JSON.stringify(photos.map((p) => p.imagePath)) },
  });
  return row.id;
}

// Read, save, notify. `importId` is the day's import reservation (given back
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
  try {
    const recipes = await extractRecipesFromPhotos(photos.map((p) => p.dataUrl));
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
        },
      });
      saved.push(like ? { id: recipe.id, like } : { id: recipe.id });
      await prisma.activity.create({ data: { kind: "created", ...who } });
    }
    outcome = "ok";
  } catch (err) {
    toUserMessage(err); // logs it
    outcome = err instanceof AppError ? err.code : "unknown";
    if (outcome === "busy") await refundImport(importId);
    saved = [];
  }
  await prisma.aiUsage
    .update({
      where: { id: readingId },
      data: { purpose: outcome, durationMs: Date.now() - startedAt, readResult: saved.length ? JSON.stringify(saved) : null },
    })
    .catch(() => {});
  const status = await statusOf(readingId, who.userId);
  if (status) await notifyUser(who.userId, { ...notice(status), tag: readingId });
  // Pictures for the recipes without a dish photo (~30 s each), last.
  for (const { id } of saved) {
    const r = await prisma.recipe.findUnique({ where: { id }, select: { imagePath: true } });
    if (r && !r.imagePath) await generateRecipePicture(id, who).catch(() => {});
  }
}

// The id of the person's recipe this one looks like (lib/similarity.ts), if any.
async function resemblance(userId: string, r: { title: string; ingredients: string[]; instructions: string[] }) {
  const others = await prisma.recipe.findMany({
    where: { userId, deletedAt: null, ...visibleRecipes },
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
    where: { id: readingId, kind: "wait", userId: who.userId, purpose: { notIn: ["reading", "ok"] } },
    select: { photoPaths: true },
  });
  const paths = JSON.parse(row?.photoPaths ?? "[]") as string[];
  const photos = (await Promise.all(paths.map(loadStoredPhoto))).filter((p) => p !== null);
  if (!paths.length || photos.length !== paths.length) return null;
  const id = await startReading(who, photos);
  const startedAt = Date.now();
  return { readingId: id, run: () => readAndSave(id, importId, who, photos, startedAt) };
}

const errorMessage = (code: string) => USER_MESSAGES[code as ErrorCode] ?? USER_MESSAGES.unknown;
// Failures worth reading the same photos again for (not "no recipe there").
const RETRYABLE = new Set(["busy", "unknown"]);

// One reading of the person's, or null if it isn't theirs.
export async function statusOf(id: string, userId: string): Promise<ReadingStatus | null> {
  const [status] = await readingStatus(userId, [id]);
  return status ?? null;
}

// How the person's readings are doing (those of `ids` that are theirs).
export async function readingStatus(userId: string, ids: string[]): Promise<ReadingStatus[]> {
  await closeStaleReadings();
  const rows = await prisma.aiUsage.findMany({
    where: { id: { in: ids.slice(0, 20) }, kind: "wait", userId },
    select: { id: true, purpose: true, readResult: true },
  });
  return Promise.all(
    rows.map(async (r): Promise<ReadingStatus> => {
      if (r.purpose === "reading") return { id: r.id, state: "reading" };
      if (r.purpose !== "ok") {
        const code = r.purpose ?? "unknown";
        return { id: r.id, state: "failed", error: errorMessage(code), canRetry: RETRYABLE.has(code) };
      }
      const saved = JSON.parse(r.readResult ?? "[]") as Saved[];
      const found = await prisma.recipe.findMany({
        where: { id: { in: saved.flatMap((s) => (s.like ? [s.id, s.like] : [s.id])) }, userId, deletedAt: null },
        select: { id: true, title: true },
      });
      const byId = new Map(found.map((f) => [f.id, f]));
      const recipes = saved.flatMap((s) => {
        const recipe = byId.get(s.id);
        if (!recipe) return []; // deleted since
        const like = s.like ? byId.get(s.like) : undefined;
        return [like ? { ...recipe, like } : recipe];
      });
      return { id: r.id, state: "done", recipes };
    }),
  );
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
