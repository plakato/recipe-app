"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSessionUser, requireUser } from "@/lib/auth";
import type { User } from "@prisma/client";
import { userForChange } from "@/lib/demoSession";
import { enterUsage } from "@/lib/usageContext";
import { isUploadPath, linesToList, type RecipeDraft } from "@/lib/recipes";
import { fetchUrlText } from "@/lib/fetchUrlText";
import { pickRecipeImages } from "@/lib/pickImage";
import { runHousekeeping } from "@/lib/housekeeping";
import { refundImport, startImport } from "@/lib/aiBudget";
import { clientIp } from "@/lib/clientIp";
import { AppError, USER_MESSAGES, toUserMessage } from "@/lib/userErrors";
import { extractRecipesFromText } from "@/lib/extractRecipe";
import { saveUploadedImage, uploadFilePath } from "@/lib/saveImage";
import { dismissReading, keepDrafts, readAndSave, readingList, retryReading, startReading } from "@/lib/photoReading";
import type { ReadingItem } from "@/lib/readingList";
import { generateRecipePicture } from "@/lib/dishImage";
import { access, unlink } from "node:fs/promises";
import { parseList } from "@/lib/recipes";
import { findDuplicate, type DuplicateVerdict } from "@/lib/similarity";
import { listedRecipes, MAX_PHOTOS, URL_IMPORT_ENABLED, visibleRecipes } from "@/lib/features";

// Read the recipe fields shared by create and update out of submitted FormData.
function readRecipeFields(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  const ingredients = linesToList(String(formData.get("ingredients") ?? ""));
  const instructions = linesToList(String(formData.get("instructions") ?? ""));
  const sourceType = String(formData.get("sourceType") ?? "manual").trim();
  const sourceUrl = String(formData.get("sourceUrl") ?? "").trim();
  const imagePath = String(formData.get("imagePath") ?? "").trim();

  return {
    title,
    ingredients: JSON.stringify(ingredients),
    instructions: JSON.stringify(instructions),
    sourceType: sourceType || "manual",
    sourceUrl: sourceUrl || null,
    imagePath: imagePath || null,
  };
}

// The scans of an imported recipe (photo import), from the form's hidden
// field: only stored upload paths, at most a few. Set once, when the recipe is
// created; editing never changes them.
function readScanPaths(formData: FormData): string | null {
  let list: unknown;
  try {
    list = JSON.parse(String(formData.get("scanPaths") ?? "[]"));
  } catch {
    return null;
  }
  const paths = Array.isArray(list)
    ? list.filter((p): p is string => typeof p === "string" && isUploadPath(p)).slice(0, MAX_PHOTOS)
    : [];
  return paths.length ? JSON.stringify(paths) : null;
}

// Reserve one AI import for the signed-in person against the daily limits
// (lib/aiBudget.ts). Checks the session for real — the proxy only checks that
// a cookie exists. Returns the reservation id or a message to show.
async function reserveImport(user: User): Promise<{ id: string; userId: string; isGuest: boolean } | { error: string }> {
  // Demo guests get the smaller per-visitor allowance.
  const slot = await startImport({ userId: user.id, ip: await clientIp(), anonymous: user.isGuest });
  if ("limit" in slot) return { error: USER_MESSAGES[slot.limit] };
  return { id: slot.id, userId: user.id, isGuest: user.isGuest };
}

// Record recipe activity for the daily statistics (never blocks the action).
async function logActivity(kind: string, user: Pick<User, "id" | "isGuest">): Promise<void> {
  await prisma.activity
    .create({ data: { kind, userId: user.id, isGuest: user.isGuest } })
    .catch((err) => console.warn("Could not record activity:", err));
}

// After a failed import: give the reservation back when nothing was spent
// (the models were only busy), and return a kind message.
async function importFailed(slotId: string, err: unknown): Promise<string> {
  if (err instanceof AppError && err.code === "busy") await refundImport(slotId);
  return toUserMessage(err);
}

// URL import: a page may hold several recipes (e.g. "5 no-bake desserts").
export type UrlImportResult =
  | { ok: true; drafts: RecipeDraft[] }
  | { ok: false; error: string };

// URL import: fetch the page, reduce it to text, extract every recipe on it
// via OpenRouter, pick each one's photo, and hand the drafts back to the
// client to review one by one before anything is saved.
export async function importRecipesFromUrl(url: string): Promise<UrlImportResult> {
  // Paused: refuse even direct calls, so no AI tokens are spent on it.
  if (!URL_IMPORT_ENABLED) {
    return { ok: false, error: "Pridávanie receptov z odkazu teraz nie je dostupné." };
  }
  const trimmed = url.trim();
  if (!trimmed) return { ok: false, error: "Zadajte prosím adresu stránky." };
  const slot = await reserveImport(await requireUser());
  if ("error" in slot) return { ok: false, error: slot.error };
  // AI calls below are recorded for this person (statistics).
  enterUsage({ userId: slot.userId, isGuest: slot.isGuest });
  // Imports leave photos of skipped drafts behind; tidy up after responding.
  after(runHousekeeping);
  let page: Awaited<ReturnType<typeof fetchUrlText>>;
  try {
    page = await fetchUrlText(trimmed);
  } catch (err) {
    // Our own messages ("That doesn't look like a valid URL." …); no AI used.
    await refundImport(slot.id);
    return { ok: false, error: err instanceof Error ? err.message : USER_MESSAGES.unknown };
  }
  try {
    const { text, title, imageCandidates } = page;
    const drafts = await extractRecipesFromText(text);
    // Then choose the photos — after extraction, not alongside it, so the two
    // model calls don't compete for the free models' rate limit. Photos are
    // best-effort: if picking fails, the recipes just show a placeholder.
    const images = await pickRecipeImages(
      drafts.map((d) => d.title || title),
      imageCandidates,
    ).catch(() => drafts.map(() => null));
    return {
      ok: true,
      drafts: drafts.map((d, i) => ({
        ...d,
        sourceUrl: trimmed,
        imagePath: images[i] ?? undefined,
      })),
    };
  } catch (err) {
    return { ok: false, error: await importFailed(slot.id, err) };
  }
}

// Photo import: saves the photos and starts reading them in the background
// (lib/photoReading.ts) — reading takes a minute or more. Every recipe found
// is saved as a draft, listed on the photo page to review or keep; the person
// can add the next photos meanwhile.
export type PhotoImportResult = { ok: true; readingId: string } | { ok: false; error: string };

export async function importRecipesFromPhotos(formData: FormData): Promise<PhotoImportResult> {
  const startedAt = Date.now();
  const files = formData.getAll("photo").filter((f): f is File => f instanceof File && f.size > 0);
  if (files.length === 0) return { ok: false, error: "Najprv prosím vyberte fotku." };
  if (files.length > MAX_PHOTOS) {
    return { ok: false, error: `Naraz najviac ${MAX_PHOTOS} fotiek, prosím.` };
  }
  // A visitor's demo starts here, at their first change (lib/demoSession.ts).
  const who = await userForChange(formData);
  if (!who) redirect("/login");
  if ("error" in who) return { ok: false, error: who.error };
  // One import, however many photos (they are read in one request).
  const slot = await reserveImport(who.user);
  if ("error" in slot) return { ok: false, error: slot.error };
  after(runHousekeeping);
  const photos: NonNullable<Awaited<ReturnType<typeof saveUploadedImage>>>[] = [];
  for (const file of files) {
    const saved = await saveUploadedImage(file);
    if (!saved) {
      await refundImport(slot.id);
      return {
        ok: false,
        error: `Fotku ${file.name} nevieme otvoriť: tento typ nepodporujeme alebo je príliš veľká (najviac 8 MB).`,
      };
    }
    photos.push(saved);
  }
  const reader = { userId: slot.userId, isGuest: slot.isGuest };
  const readingId = await startReading(reader, photos);
  after(() => readAndSave(readingId, slot.id, reader, photos, startedAt));
  return { ok: true, readingId };
}

// The photo page's reading list (components/ReadingList.tsx): the person's
// readings and drafts. [] when signed out.
export async function photoReadings(): Promise<ReadingItem[]> {
  const user = await getSessionUser();
  return user ? readingList(user.id) : [];
}

// Read a failed reading's photos again ("Skúsiť znova" in the list): a new
// reading in its place, counted as a new import.
export async function retryPhotoReading(readingId: string): Promise<PhotoImportResult> {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const slot = await reserveImport(user);
  if ("error" in slot) return { ok: false, error: slot.error };
  const retry = await retryReading(String(readingId), slot.id, { userId: user.id, isGuest: user.isGuest });
  if (!retry) {
    await refundImport(slot.id);
    return { ok: false, error: "Fotky už nemáme. Pridajte ich prosím znova." };
  }
  after(retry.run);
  return { ok: true, readingId: retry.readingId };
}

// Keep drafts read from photos without reviewing them: those of `ids`, or
// all of them (null).
export async function keepReadRecipes(ids: string[] | null): Promise<void> {
  const user = await getSessionUser();
  if (!user) return;
  const only = Array.isArray(ids) ? ids.filter((id) => typeof id === "string") : undefined;
  if (await keepDrafts({ userId: user.id, isGuest: user.isGuest }, only)) revalidatePath("/");
}

// "Uložiť recept" on a draft's page: keep it, then back to the list.
export async function keepReadRecipe(formData: FormData): Promise<void> {
  const user = await requireUser();
  if (await keepDrafts({ userId: user.id, isGuest: user.isGuest }, [String(formData.get("id") ?? "")])) {
    revalidatePath("/");
  }
  redirect("/recipes/import/photo");
}

// Close a failed reading in the list.
export async function dismissPhotoReading(readingId: string): Promise<void> {
  const user = await getSessionUser();
  if (user) await dismissReading(String(readingId), user.id);
}

// Result of a save attempt, consumed by RecipeForm via useActionState.
// On success the action redirects — unless the form asked to stay (reviewing
// several imported recipes in a row), in which case it returns `saved`.
export type SaveState = {
  error?: string;
  duplicate?: NonNullable<DuplicateVerdict>;
  saved?: { id: string };
  at?: number; // set when a visitor's bot check failed: the form gets a fresh token
} | null;

// Compare the submitted recipe with the user's other recipes. Returns a
// SaveState to show instead of saving, or null when saving may proceed.
// A near-duplicate can be overridden by resubmitting with confirmDuplicate=1
// (the "Save anyway" button) unless it also has the same name — then it must
// be renamed so the two versions can be told apart.
async function duplicateCheck(
  userId: string,
  fields: ReturnType<typeof readRecipeFields>,
  formData: FormData,
  excludeId?: string,
): Promise<SaveState> {
  const others = await prisma.recipe.findMany({
    where: {
      userId,
      deletedAt: null,
      ...listedRecipes,
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
    select: { id: true, title: true, ingredients: true, instructions: true },
  });
  const verdict = findDuplicate(
    {
      title: fields.title,
      ingredients: parseList(fields.ingredients),
      instructions: parseList(fields.instructions),
    },
    others.map((r) => ({
      id: r.id,
      title: r.title,
      ingredients: parseList(r.ingredients),
      instructions: parseList(r.instructions),
    })),
  );
  if (!verdict) return null;
  if (!verdict.sameTitle && formData.get("confirmDuplicate") === "1") {
    return null;
  }
  return { duplicate: verdict };
}

// Apply the form's photo controls: a new file replaces the image (uploaded
// and downscaled like a photo import); the "Remove photo" box clears it.
// Returns the image path to store, or an error message.
async function resolveImage(
  formData: FormData,
  current: string | null,
): Promise<{ imagePath: string | null } | { error: string }> {
  const file = formData.get("photo");
  if (file instanceof File && file.size > 0) {
    const saved = await saveUploadedImage(file);
    if (!saved) {
      return { error: "Tento typ obrázka nepodporujeme alebo je príliš veľký (najviac 8 MB)." };
    }
    return { imagePath: saved.imagePath };
  }
  if (formData.get("removeImage") === "1") return { imagePath: null };
  // A draft left open for over a day may have lost its photo to the cleanup
  // (lib/cleanUploads.ts): save without it rather than point at nothing.
  if (current && !(await access(uploadFilePath(current)).then(() => true, () => false))) {
    return { imagePath: null };
  }
  return { imagePath: current };
}

// Delete an image file once no recipe (including Trash) references it, as a
// picture or a scan. Several recipes can share one photo (a page with two
// recipes, demo copies), hence the check.
async function deleteImageIfUnused(imagePath: string | null) {
  if (!imagePath) return;
  const stillUsed = await prisma.recipe.count({
    where: { OR: [{ imagePath }, { scanPaths: { contains: JSON.stringify(imagePath) } }] },
  });
  if (stillUsed === 0) await unlink(uploadFilePath(imagePath)).catch(() => {});
}

export async function createRecipe(
  _prev: SaveState,
  formData: FormData,
): Promise<SaveState> {
  const fields = readRecipeFields(formData);
  if (!fields.title) return { error: "Zadajte prosím názov receptu." };
  const user = await requireUser();
  const userId = user.id;
  const blocked = await duplicateCheck(userId, fields, formData);
  if (blocked) return blocked;
  const image = await resolveImage(formData, fields.imagePath);
  if ("error" in image) return { error: image.error };
  const recipe = await prisma.recipe.create({
    data: { ...fields, imagePath: image.imagePath, scanPaths: readScanPaths(formData), userId },
  });
  await logActivity("created", user);
  // A photo recipe without a dish picture gets a generated one, after the
  // response (it takes ~30 s); the recipe page shows it once it is there.
  if (fields.sourceType === "photo" && !image.imagePath) {
    after(() => generateRecipePicture(recipe.id, { userId, isGuest: user.isGuest }));
  }
  revalidatePath("/");
  if (formData.get("stay") === "1") return { saved: { id: recipe.id } };
  redirect(`/recipes/${recipe.id}`);
}

export async function updateRecipe(
  _prev: SaveState,
  formData: FormData,
): Promise<SaveState> {
  const fields = readRecipeFields(formData);
  if (!fields.title) return { error: "Zadajte prosím názov receptu." };
  // A visitor editing a showcase recipe gets their demo now and edits their
  // own copy of it; the original is never touched.
  const who = await userForChange(formData);
  if (!who) redirect("/login");
  if ("error" in who) return { error: who.error, at: Date.now() };
  const user = who.user;
  const userId = user.id;
  const formId = String(formData.get("id") ?? "");
  const id = who.copies?.get(formId) ?? formId;
  if (!id) return { error: "Chýba identifikátor receptu." };
  const blocked = await duplicateCheck(userId, fields, formData, id);
  if (blocked) return blocked;
  const existing = await prisma.recipe.findFirst({
    where: { id, userId, ...visibleRecipes },
    select: { imagePath: true },
  });
  if (!existing) return { error: "Recept sa nenašiel." };
  const image = await resolveImage(formData, existing.imagePath);
  if ("error" in image) return { error: image.error };
  // Scope by userId so only the owner's recipes can be edited. A draft read
  // from photos stays a draft: it is kept only from its page or the list.
  const edited = await prisma.recipe.updateMany({
    where: { id, userId, ...visibleRecipes },
    data: { ...fields, imagePath: image.imagePath },
  });
  if (edited.count) await logActivity("edited", user);
  if (existing.imagePath && existing.imagePath !== image.imagePath) {
    await deleteImageIfUnused(existing.imagePath);
  }
  revalidatePath("/");
  revalidatePath(`/recipes/${id}`);
  redirect(`/recipes/${id}`);
}

// Soft delete: move to Trash by stamping deletedAt. Recoverable via restore.
// Returns a message only when nothing was deleted (e.g. a visitor's bot
// check failed); otherwise redirects home.
export async function softDeleteRecipe(_prev: { error: string; at: number } | null, formData: FormData) {
  // A visitor deleting a showcase recipe gets their demo now and deletes
  // their own copy of it; the original is never touched.
  const who = await userForChange(formData);
  if (!who) redirect("/login");
  if ("error" in who) return { error: who.error, at: Date.now() };
  const formId = String(formData.get("id") ?? "");
  const id = who.copies?.get(formId) ?? formId;
  if (!id) throw new Error("Chýba identifikátor receptu.");
  const draft = await prisma.recipe.count({ where: { id, userId: who.user.id, readingId: { not: null } } });
  const deleted = await prisma.recipe.updateMany({
    where: { id, userId: who.user.id, ...visibleRecipes },
    data: { deletedAt: new Date() },
  });
  if (deleted.count) await logActivity("deleted", who.user);
  revalidatePath("/");
  revalidatePath("/trash");
  // A draft was deleted while reviewing: back to the rest of the list.
  redirect(draft ? "/recipes/import/photo" : "/");
}

export async function restoreRecipe(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Chýba identifikátor receptu.");
  const user = await requireUser();
  const userId = user.id;
  const restored = await prisma.recipe.updateMany({
    where: { id, userId, ...visibleRecipes },
    data: { deletedAt: null },
  });
  if (restored.count) await logActivity("restored", user);
  revalidatePath("/");
  revalidatePath("/trash");
  redirect(`/recipes/${id}`);
}

// Permanent delete: only from Trash, deliberate. Not recoverable in-app
// (but recoverable from backups — see the backup strategy).
export async function permanentlyDeleteRecipe(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Chýba identifikátor receptu.");
  const user = await requireUser();
  const userId = user.id;
  const erased = await prisma.recipe.deleteMany({
    where: { id, userId, deletedAt: { not: null }, ...visibleRecipes },
  });
  if (erased.count) await logActivity("erased", user);
  revalidatePath("/trash");
  redirect("/trash");
}
