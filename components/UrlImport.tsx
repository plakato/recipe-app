"use client";

import { useState } from "react";
import RecipeForm from "@/components/RecipeForm";
import { createRecipe, importRecipeFromUrl } from "@/app/actions";
import type { RecipeDraft } from "@/lib/recipes";

const inputClass =
  "w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-stone-900 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100";

export default function UrlImport() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<RecipeDraft | null>(null);

  async function handleImport() {
    setLoading(true);
    setError(null);
    const result = await importRecipeFromUrl(url);
    setLoading(false);
    if (result.ok) {
      setDraft(result.draft);
    } else {
      setError(result.error);
    }
  }

  // Once we have a draft, show the normal recipe form pre-filled for review.
  if (draft) {
    return (
      <div className="space-y-4">
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">
          Imported from the link. <strong>Check everything below</strong> —
          AI can miss or misread things — then save.
        </div>
        <RecipeForm
          action={createRecipe}
          initial={draft}
          sourceType="url"
          submitLabel="Save recipe"
        />
        <button
          type="button"
          onClick={() => {
            setDraft(null);
            setError(null);
          }}
          className="text-sm text-stone-500 hover:text-stone-800 dark:hover:text-stone-200"
        >
          ← Try a different link
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <label
          className="block text-sm font-medium text-stone-700 dark:text-stone-300"
          htmlFor="url"
        >
          Recipe URL
        </label>
        <input
          id="url"
          type="url"
          inputMode="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && url.trim() && !loading) handleImport();
          }}
          placeholder="https://example.com/best-apple-pie"
          className={inputClass}
        />
      </div>

      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={handleImport}
        disabled={loading || !url.trim()}
        className="rounded-lg bg-amber-600 px-5 py-2.5 font-medium text-white shadow-sm transition hover:bg-amber-700 disabled:opacity-60"
      >
        {loading ? "Reading the page…" : "Import recipe"}
      </button>

      {loading && (
        <p className="text-sm text-stone-500">
          Fetching the page and asking the AI to extract the recipe. Free models
          can take a few seconds.
        </p>
      )}
    </div>
  );
}
