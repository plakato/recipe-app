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
  ingredients: string[];
  instructions: string[];
  sourceUrl?: string;
  // Local path under /public (e.g. "/uploads/abc.jpg"), or a placeholder shown
  // when empty. The dish photo (downloaded, cropped from a page photo) or a
  // generated picture.
  imagePath?: string;
  // Photo import: the photos the recipe was read from ("/uploads/…").
  scanPaths?: string[];
};

// Convert a stored Recipe row into a draft for the edit form.
export function recipeToDraft(recipe: Recipe): RecipeDraft {
  return {
    title: recipe.title,
    ingredients: parseList(recipe.ingredients),
    instructions: parseList(recipe.instructions),
    sourceUrl: recipe.sourceUrl ?? undefined,
    imagePath: recipe.imagePath ?? undefined,
    scanPaths: parseList(recipe.scanPaths),
  };
}

// A stored upload path as the app writes it: "/uploads/<random name>.<ext>".
export function isUploadPath(value: string): boolean {
  return /^\/uploads\/[a-zA-Z0-9-]+\.[a-z0-9]+$/.test(value);
}

// Every upload a recipe uses: its picture and its scans.
export function recipeUploads(recipe: { imagePath: string | null; scanPaths: string | null }): string[] {
  return [...(recipe.imagePath ? [recipe.imagePath] : []), ...parseList(recipe.scanPaths)];
}

// Recipes with several components (dough, filling, glaze…) keep one flat list
// but mark each component with a heading line that ends in a colon, e.g.
// "Cesto:". Works for ingredients and for instructions, in the textarea, in
// the AI output and in exports alike.
export function isSectionHeading(line: string): boolean {
  const t = line.trim();
  return /^[^:]{1,60}:$/.test(t) && !/\d/.test(t);
}

export type Section = { heading: string | null; items: string[] };

// Split a list into sections at heading lines. A list without headings is
// one section with heading null.
export function groupSections(lines: string[]): Section[] {
  const sections: Section[] = [];
  let current: Section = { heading: null, items: [] };
  for (const line of lines) {
    if (isSectionHeading(line)) {
      if (current.items.length || current.heading) sections.push(current);
      current = { heading: line.trim().replace(/:$/, ""), items: [] };
    } else {
      current.items.push(line);
    }
  }
  if (current.items.length || current.heading) sections.push(current);
  return sections;
}
