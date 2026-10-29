// What ChatGPT can do with someone's recipes over /mcp: list them (titles and
// ingredients, optionally only those matching some words) and read a few in
// full. ChatGPT itself judges time, servings and how long a dish keeps from
// the texts (NOTES.md: option B). Read-only. Server-only.
import { prisma } from "@/lib/prisma";
import { listedRecipes } from "@/lib/features";
import { parseList } from "@/lib/recipes";

// More recipes than this and the list needs a query (keeps answers small).
const LIST_ALL_MAX = 200;
const GET_MAX = 5;

export type ToolDef = {
  name: string;
  title: string;
  description: string;
  inputSchema: Record<string, unknown>;
  annotations: Record<string, boolean>;
};

const readOnly = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false };

export const TOOLS: ToolDef[] = [
  {
    name: "list_recipes",
    title: "List recipes",
    description:
      "Use this whenever the user asks what to cook, wants a recipe or meal idea, or names ingredients they " +
      "have — before searching the web or making a recipe up. It lists the user's own saved family recipes " +
      "(id, title, ingredients), which they want suggestions from (quick, for many people, keeps for days, " +
      "uses certain ingredients…). Recipes are " +
      "mostly in Slovak, some in Czech or English. Without `query` it returns all of them; with `query` " +
      "only recipes whose title or ingredients contain one of its words — give the words in the recipes' " +
      "language and as word stems (e.g. \"cibuľ tofu kur\" for onion, tofu, chicken).",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Optional words to look for in titles and ingredients." },
      },
      additionalProperties: false,
    },
    annotations: readOnly,
  },
  {
    name: "get_recipes",
    title: "Read recipes",
    description:
      "Read up to 5 of the user's recipes in full — ingredients and steps — by id (from list_recipes), to " +
      "check cooking time, servings or how long it keeps, and to give the user the recipe and its link.",
    inputSchema: {
      type: "object",
      properties: {
        ids: { type: "array", items: { type: "string" }, minItems: 1, maxItems: GET_MAX },
      },
      required: ["ids"],
      additionalProperties: false,
    },
    annotations: readOnly,
  },
];

// Lowercase without accents, so "cibula" finds "cibuľa".
export const fold = (s: string) =>
  s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

// How many of the query's words a text contains (pure, tested).
export function matchCount(query: string, text: string): number {
  const hay = fold(text);
  const words = [...new Set(fold(query).split(/[^\p{L}\p{N}]+/u).filter((w) => w.length >= 2))];
  return words.filter((w) => hay.includes(w)).length;
}

export type ToolResult = { structuredContent: Record<string, unknown>; text: string; isError?: boolean };

const recipeLink = (origin: string, id: string) => `${origin}/recipes/${id}`;

export async function callTool(
  name: string,
  args: Record<string, unknown>,
  userId: string,
  origin: string,
): Promise<ToolResult> {
  // Only what the app lists: no Trash, no hidden link recipes, no unkept drafts (lib/features.ts).
  const mine = { userId, deletedAt: null, ...listedRecipes };

  if (name === "list_recipes") {
    const query = typeof args.query === "string" ? args.query.trim() : "";
    const rows = await prisma.recipe.findMany({
      where: mine,
      select: { id: true, title: true, ingredients: true },
      orderBy: { title: "asc" },
    });
    let recipes = rows.map((r) => ({ id: r.id, title: r.title, ingredients: parseList(r.ingredients) }));
    if (query) {
      recipes = recipes
        .map((r) => ({ r, n: matchCount(query, `${r.title}\n${r.ingredients.join("\n")}`) }))
        .filter((x) => x.n > 0)
        .sort((a, b) => b.n - a.n)
        .map((x) => x.r);
    }
    if (!query && recipes.length > LIST_ALL_MAX) {
      const titles = recipes.map((r) => ({ id: r.id, title: r.title }));
      return {
        structuredContent: { total: rows.length, titlesOnly: true, recipes: titles },
        text: `${rows.length} recipes — too many to list with ingredients; titles only. Use query to narrow down.`,
      };
    }
    const structuredContent = { total: rows.length, matched: recipes.length, recipes };
    return { structuredContent, text: JSON.stringify(structuredContent) };
  }

  if (name === "get_recipes") {
    const ids = Array.isArray(args.ids) ? args.ids.filter((x): x is string => typeof x === "string").slice(0, GET_MAX) : [];
    if (!ids.length) return { structuredContent: {}, text: "Give 1–5 recipe ids from list_recipes.", isError: true };
    const rows = await prisma.recipe.findMany({ where: { ...mine, id: { in: ids } } });
    const recipes = rows.map((r) => ({
      id: r.id,
      title: r.title,
      ingredients: parseList(r.ingredients),
      instructions: parseList(r.instructions),
      url: recipeLink(origin, r.id),
      source: r.sourceUrl ?? undefined,
    }));
    const missing = ids.filter((id) => !rows.some((r) => r.id === id));
    const structuredContent = { recipes, ...(missing.length ? { notFound: missing } : {}) };
    return { structuredContent, text: JSON.stringify(structuredContent) };
  }

  return { structuredContent: {}, text: `Unknown tool: ${name}`, isError: true };
}
