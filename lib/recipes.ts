import type { Recipe } from "@prisma/client";

// ingredients/instructions are stored in SQLite as JSON-encoded string arrays.
// These helpers convert between the stored form, the textarea form (one item
// per line), and a real string[].

export function parseList(json: string | null | undefined): string[] {
  if (!json) return [];
  try {
    const value = JSON.parse(json);
    return Array.isArray(value)
      ? value.filter((x): x is string => typeof x === "string")
      : [];
  } catch {
    return [];
  }
}

export function linesToList(text: string | null | undefined): string[] {
  if (!text) return [];
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

export function listToLines(list: string[]): string {
  return list.join("\n");
}

// Shape used to pre-fill the recipe form. All three AI import methods and the
// manual path produce this same shape.
export type RecipeDraft = {
  title: string;
  description?: string;
  ingredients: string[];
  instructions: string[];
  servings?: string;
  prepTime?: string;
  cookTime?: string;
  sourceUrl?: string;
  // Local path under /public (e.g. "/uploads/abc.jpg"), or a placeholder shown
  // when empty. Populated by URL import (downloaded) or later by AI generation.
  imagePath?: string;
};

// Convert a stored Recipe row into a draft for the edit form.
export function recipeToDraft(recipe: Recipe): RecipeDraft {
  return {
    title: recipe.title,
    description: recipe.description ?? undefined,
    ingredients: parseList(recipe.ingredients),
    instructions: parseList(recipe.instructions),
    servings: recipe.servings ?? undefined,
    prepTime: recipe.prepTime ?? undefined,
    cookTime: recipe.cookTime ?? undefined,
    sourceUrl: recipe.sourceUrl ?? undefined,
    imagePath: recipe.imagePath ?? undefined,
  };
}
