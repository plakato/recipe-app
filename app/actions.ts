"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getDefaultUserId } from "@/lib/user";
import { linesToList, type RecipeDraft } from "@/lib/recipes";
import { fetchUrlText } from "@/lib/fetchUrlText";
import { extractRecipeFromText, extractRecipeFromImage } from "@/lib/extractRecipe";
import { downloadImageToUploads, saveUploadedImage } from "@/lib/saveImage";

// Read the recipe fields shared by create and update out of submitted FormData.
function readRecipeFields(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const ingredients = linesToList(String(formData.get("ingredients") ?? ""));
  const instructions = linesToList(String(formData.get("instructions") ?? ""));
  const servings = String(formData.get("servings") ?? "").trim();
  const prepTime = String(formData.get("prepTime") ?? "").trim();
  const cookTime = String(formData.get("cookTime") ?? "").trim();
  const sourceType = String(formData.get("sourceType") ?? "manual").trim();
  const sourceUrl = String(formData.get("sourceUrl") ?? "").trim();
  const imagePath = String(formData.get("imagePath") ?? "").trim();

  return {
    title,
    description: description || null,
    ingredients: JSON.stringify(ingredients),
    instructions: JSON.stringify(instructions),
    servings: servings || null,
    prepTime: prepTime || null,
    cookTime: cookTime || null,
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

// URL import (Phase 2): fetch the page, reduce it to text, extract via
// OpenRouter, and hand the draft back to the client to pre-fill the form.
export async function importRecipeFromUrl(url: string): Promise<ImportResult> {
  const trimmed = url.trim();
  if (!trimmed) return { ok: false, error: "Please enter a URL." };
  try {
    const { text, imageUrl } = await fetchUrlText(trimmed);
    const draft = await extractRecipeFromText(text);
    // Best-effort: download the page's image locally. Failure is non-fatal —
    // the recipe just shows a placeholder.
    const imagePath = imageUrl
      ? (await downloadImageToUploads(imageUrl)) ?? undefined
      : undefined;
    return { ok: true, draft: { ...draft, sourceUrl: trimmed, imagePath } };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Import failed. Please try again.";
    return { ok: false, error: message };
  }
}

// Text import (Phase 4): used by voice (a spoken-then-transcribed recipe) and
// by pasting plain text. Extracts a draft for review.
export async function importRecipeFromText(
  rawText: string,
  languageHint?: string,
): Promise<ImportResult> {
  const text = rawText.trim();
  if (!text) {
    return { ok: false, error: "Please record or type the recipe first." };
  }
  try {
    const draft = await extractRecipeFromText(text, languageHint);
    return { ok: true, draft };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Import failed. Please try again.";
    return { ok: false, error: message };
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
  const language = String(formData.get("language") ?? "").trim() || undefined;
  try {
    const saved = await saveUploadedImage(file);
    if (!saved) {
      return {
        ok: false,
        error: "That image type isn't supported, or it's too large (max 8 MB).",
      };
    }
    const draft = await extractRecipeFromImage(saved.dataUrl, language);
    return {
      ok: true,
      draft: { ...draft, imagePath: saved.imagePath },
    };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Import failed. Please try again.";
    return { ok: false, error: message };
  }
}

export async function createRecipe(formData: FormData) {
  const fields = readRecipeFields(formData);
  if (!fields.title) {
    throw new Error("A title is required.");
  }
  const userId = await getDefaultUserId();
  const recipe = await prisma.recipe.create({
    data: { ...fields, userId },
  });
  revalidatePath("/");
  redirect(`/recipes/${recipe.id}`);
}

export async function updateRecipe(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Missing recipe id.");
  const fields = readRecipeFields(formData);
  if (!fields.title) {
    throw new Error("A title is required.");
  }
  const userId = await getDefaultUserId();
  // Scope by userId so only the owner's recipes can be edited.
  await prisma.recipe.updateMany({
    where: { id, userId },
    data: fields,
  });
  revalidatePath("/");
  revalidatePath(`/recipes/${id}`);
  redirect(`/recipes/${id}`);
}

// Soft delete: move to Trash by stamping deletedAt. Recoverable via restore.
export async function softDeleteRecipe(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Missing recipe id.");
  const userId = await getDefaultUserId();
  await prisma.recipe.updateMany({
    where: { id, userId },
    data: { deletedAt: new Date() },
  });
  revalidatePath("/");
  revalidatePath("/trash");
  redirect("/");
}

export async function restoreRecipe(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Missing recipe id.");
  const userId = await getDefaultUserId();
  await prisma.recipe.updateMany({
    where: { id, userId },
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
  const userId = await getDefaultUserId();
  await prisma.recipe.deleteMany({
    where: { id, userId, deletedAt: { not: null } },
  });
  revalidatePath("/trash");
  redirect("/trash");
}
