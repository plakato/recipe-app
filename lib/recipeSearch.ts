// Search on the home page: the recipes' titles and ingredients, filtered in
// the browser as you type. Accents and case don't matter ("sisky" finds
// Šišky, "cibul" finds cibuľa); every word typed has to appear somewhere.
// Recipes whose name matches come first, then those found by an ingredient.
import { normalizeTitle } from "@/lib/similarity";

// The text a recipe is searched by, built once on the server.
export function searchText(title: string, ingredients: string[]): string {
  return normalizeTitle([title, ...ingredients].join(" "));
}

export function matches(text: string, query: string): boolean {
  const words = normalizeTitle(query).split(" ").filter(Boolean);
  return words.every((w) => text.includes(w));
}

// The recipes that match, those matching by name first (each group keeps its order).
export function search<T extends { title: string; search: string }>(recipes: T[], query: string): T[] {
  const found = recipes.filter((r) => matches(r.search, query));
  const byName = found.filter((r) => matches(normalizeTitle(r.title), query));
  return [...byName, ...found.filter((r) => !byName.includes(r))];
}
