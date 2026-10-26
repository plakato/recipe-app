"use client";

import Link from "next/link";
import { useState } from "react";
import { Search, X } from "lucide-react";
import RecipeImage from "@/components/RecipeImage";
import { matches } from "@/lib/recipeSearch";

export type GridRecipe = { id: string; title: string; imagePath: string | null; search: string };

// The search box only appears once there are enough recipes to get lost in.
const SEARCH_FROM = 12;

// The home page's recipes, with a search box above them (lib/recipeSearch.ts).
// Someone who has connected ChatGPT gets a link to ask it when nothing is found.
export default function RecipeGrid({ recipes, chatgpt }: { recipes: GridRecipe[]; chatgpt: boolean }) {
  const [query, setQuery] = useState("");
  const searching = query.trim() !== "";
  const shown = searching ? recipes.filter((r) => matches(r.search, query)) : recipes;

  return (
    <div className="space-y-4">
      {recipes.length > SEARCH_FROM && (
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-stone-400" />
          {/* text-base: at 16px iOS doesn't zoom in when the box is tapped */}
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Escape" && setQuery("")}
            placeholder="Hľadať recept alebo surovinu…"
            aria-label="Hľadať recept alebo surovinu"
            enterKeyHint="search"
            className="w-full rounded-xl border border-stone-300 bg-white py-2.5 pl-10 pr-10 text-base text-stone-900 outline-none [&::-webkit-search-cancel-button]:hidden focus:border-olive-500 focus:ring-2 focus:ring-olive-200 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100"
          />
          {searching && (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="Vymazať hľadanie"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      )}

      {shown.length === 0 ? (
        <div className="py-12 text-center text-stone-500">
          <p>Nič sa nenašlo.</p>
          {chatgpt && (
            <a
              href={`https://chatgpt.com/?q=${encodeURIComponent(`V mojich receptoch nájdi: ${query.trim()}`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-block font-medium text-olive-600 underline-offset-2 hover:underline"
            >
              Skúste sa opýtať ChatGPT
            </a>
          )}
        </div>
      ) : (
        // Bento grid: the newest recipe takes a 2×2 tile, the rest are squares
        // (while searching, all are squares). Titles sit on a dark shadow
        // rising from the bottom of each photo.
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {shown.map((recipe, i) => {
            const big = i === 0 && !searching;
            return (
              <li key={recipe.id} className={big ? "col-span-2 row-span-2" : ""}>
                <Link
                  href={`/recipes/${recipe.id}`}
                  className="group relative block aspect-square overflow-hidden rounded-xl bg-stone-100 dark:bg-stone-800"
                >
                  <RecipeImage
                    seed={recipe.id}
                    src={recipe.imagePath}
                    alt=""
                    className="h-full w-full"
                    imgClassName="transition duration-500 group-hover:scale-105"
                  />
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/70 to-transparent" />
                  {/* Padding on the h2, clamp on the inner span: with both on one
                      element the clipped third line shows through the padding. */}
                  <h2
                    className={`absolute inset-x-0 bottom-0 font-semibold leading-snug text-white ${
                      big ? "p-4 text-xl sm:p-5 sm:text-3xl" : "p-3 text-sm"
                    }`}
                  >
                    <span className="line-clamp-2">{recipe.title}</span>
                  </h2>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
