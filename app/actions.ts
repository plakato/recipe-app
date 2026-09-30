"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth";
import { linesToList, type RecipeDraft } from "@/lib/recipes";
import { fetchUrlText } from "@/lib/fetchUrlText";
import { pickRecipeImages } from "@/lib/pickImage";
import { sweepUnusedUploads } from "@/lib/cleanUploads";
import { refundImport, startImport } from "@/lib/aiBudget";
import { clientIp } from "@/lib/clientIp";
import { AppError, USER_MESSAGES, toUserMessage } from "@/lib/userErrors";
import { extractRecipeFromImage, extractRecipesFromText } from "@/lib/extractRecipe";
import { saveUploadedImage, uploadFilePath } from "@/lib/saveImage";
import { access, unlink } from "node:fs/promises";
import { parseList } from "@/lib/recipes";
import { findDuplicate, type DuplicateVerdict } from "@/lib/similarity";
import { URL_IMPORT_ENABLED, visibleRecipes } from "@/lib/features";

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

// Result of an AI import attempt, returned to the client for review before
// anything is saved. The user always edits/confirms in the form afterward.
export type ImportResult =
  | { ok: true; draft: RecipeDraft }
  | { ok: false; error: string };

// Reserve one AI import for the signed-in person against the daily limits
// (lib/aiBudget.ts). Checks the session for real — the proxy only checks that
// a cookie exists. Returns the reservation id or a message to show.
async function reserveImport(): Promise<{ id: string } | { error: string }> {
  const userId = await requireUserId();
  const slot = await startImport({ userId, ip: await clientIp() });
  return "limit" in slot ? { error: USER_MESSAGES[slot.limit] } : slot;
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
    return { ok: false, error: "Adding recipes from a link is not available right now." };
  }
  const trimmed = url.trim();
  if (!trimmed) return { ok: false, error: "Please enter a URL." };
  const slot = await reserveImport();
  if ("error" in slot) return { ok: false, error: slot.error };
  // Imports leave photos of skipped drafts behind; tidy up after responding.
  after(sweepUnusedUploads);
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

// Photo import (Phase 3): save the uploaded photo, send it to a vision model,
// and hand the draft (with the photo as its image) back for review.
export async function importRecipeFromPhoto(
  formData: FormData,
): Promise<ImportResult> {
  const file = formData.get("photo");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Please choose a photo first." };
  }
  const slot = await reserveImport();
  if ("error" in slot) return { ok: false, error: slot.error };
  after(sweepUnusedUploads);
  const language = String(formData.get("language") ?? "").trim() || undefined;
  try {
    const saved = await saveUploadedImage(file);
    if (!saved) {
      await refundImport(slot.id);
      return {
        ok: false,
        error: "That image type isn't supported, or it's too large (max 8 MB).",
      };
    }
    // Free models first; the paid one only as a budget-capped fallback.
    const draft = await extractRecipeFromImage(saved.dataUrl, language);
    return {
      ok: true,
      draft: { ...draft, imagePath: saved.imagePath },
    };
  } catch (err) {
    return { ok: false, error: await importFailed(slot.id, err) };
  }
}

// Result of a save attempt, consumed by RecipeForm via useActionState.
// On success the action redirects — unless the form asked to stay (reviewing
// several imported recipes in a row), in which case it returns `saved`.
export type SaveState = {
  error?: string;
  duplicate?: NonNullable<DuplicateVerdict>;
  saved?: { id: string };
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
      ...visibleRecipes,
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
      return { error: "That image type isn't supported, or it's too large (max 8 MB)." };
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

// Delete an image file once no recipe (including Trash) references it.
// Split imports share one photo between several recipes, hence the check.
async function deleteImageIfUnused(imagePath: string | null) {
  if (!imagePath) return;
  const stillUsed = await prisma.recipe.count({ where: { imagePath } });
  if (stillUsed === 0) await unlink(uploadFilePath(imagePath)).catch(() => {});
}

export async function createRecipe(
  _prev: SaveState,
  formData: FormData,
): Promise<SaveState> {
  const fields = readRecipeFields(formData);
  if (!fields.title) return { error: "A title is required." };
  const userId = await requireUserId();
  const blocked = await duplicateCheck(userId, fields, formData);
  if (blocked) return blocked;
  const image = await resolveImage(formData, fields.imagePath);
  if ("error" in image) return { error: image.error };
  const recipe = await prisma.recipe.create({
    data: { ...fields, imagePath: image.imagePath, userId },
  });
  revalidatePath("/");
  if (formData.get("stay") === "1") return { saved: { id: recipe.id } };
  redirect(`/recipes/${recipe.id}`);
}

export async function updateRecipe(
  _prev: SaveState,
  formData: FormData,
): Promise<SaveState> {
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Missing recipe id." };
  const fields = readRecipeFields(formData);
  if (!fields.title) return { error: "A title is required." };
  const userId = await requireUserId();
  const blocked = await duplicateCheck(userId, fields, formData, id);
  if (blocked) return blocked;
  const existing = await prisma.recipe.findFirst({
    where: { id, userId, ...visibleRecipes },
    select: { imagePath: true },
  });
  if (!existing) return { error: "Recipe not found." };
  const image = await resolveImage(formData, existing.imagePath);
  if ("error" in image) return { error: image.error };
  // Scope by userId so only the owner's recipes can be edited.
  await prisma.recipe.updateMany({
    where: { id, userId, ...visibleRecipes },
    data: { ...fields, imagePath: image.imagePath },
  });
  if (existing.imagePath && existing.imagePath !== image.imagePath) {
    await deleteImageIfUnused(existing.imagePath);
  }
  revalidatePath("/");
  revalidatePath(`/recipes/${id}`);
  redirect(`/recipes/${id}`);
}

// Soft delete: move to Trash by stamping deletedAt. Recoverable via restore.
export async function softDeleteRecipe(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Missing recipe id.");
  const userId = await requireUserId();
  await prisma.recipe.updateMany({
    where: { id, userId, ...visibleRecipes },
    data: { deletedAt: new Date() },
  });
  revalidatePath("/");
  revalidatePath("/trash");
  redirect("/");
}

export async function restoreRecipe(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Missing recipe id.");
  const userId = await requireUserId();
  await prisma.recipe.updateMany({
    where: { id, userId, ...visibleRecipes },
    data: { deletedAt: null },
  });
  revalidatePath("/");
  revalidatePath("/trash");
  redirect(`/recipes/${id}`);
}

// Permanent delete: only from Trash, deliberate. Not recoverable in-app
// (but recoverable from backups — see the backup strategy).
export async function permanentlyDeleteRecipe(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Missing recipe id.");
  const userId = await requireUserId();
  await prisma.recipe.deleteMany({
    where: { id, userId, deletedAt: { not: null }, ...visibleRecipes },
  });
  revalidatePath("/trash");
  redirect("/trash");
}
