"use client";

import { useState } from "react";
import RecipeForm from "@/components/RecipeForm";
import MultiReview from "@/components/MultiReview";
import { createRecipe, importRecipesFromUrl } from "@/app/actions";
import type { RecipeDraft } from "@/lib/recipes";

const inputClass =
  "w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-stone-900 outline-none focus:border-olive-500 focus:ring-2 focus:ring-olive-200 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100";

const notice =
  "rounded-lg border border-olive-200 bg-olive-50 px-4 py-3 text-sm text-olive-900 dark:border-olive-900/50 dark:bg-olive-950/30 dark:text-olive-200";

export default function UrlImport() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<RecipeDraft[] | null>(null);

  async function handleImport() {
    setLoading(true);
    setError(null);
    const result = await importRecipesFromUrl(url);
    setLoading(false);
    if (result.ok) {
      setDrafts(result.drafts);
    } else {
      setError(result.error);
    }
  }
  const restart = () => {
    setDrafts(null);
    setError(null);
  };

  // Several recipes on the page: review them one by one.
  if (drafts && drafts.length > 1) {
    return (
      <MultiReview
        drafts={drafts}
        sourceType="url"
        intro={
          <>
            Na tejto stránke je <strong>{drafts.length} receptov</strong>. Každý skontrolujte — AI môže
            niečo vynechať alebo zle prečítať — a potom ho uložte alebo preskočte.
          </>
        }
        restartLabel="Importovať ďalší odkaz"
        onRestart={restart}
      />
    );
  }

  // One recipe: show the normal recipe form pre-filled for review.
  if (drafts) {
    return (
      <div className="space-y-4">
        <div className={notice}>
          Importované z odkazu. <strong>Všetko nižšie skontrolujte</strong> —
          AI môže niečo vynechať alebo zle prečítať — a potom uložte.
        </div>
        <RecipeForm
          action={createRecipe}
          initial={drafts[0]}
          sourceType="url"
          submitLabel="Uložiť recept"
        />
        <button
          type="button"
          onClick={restart}
          className="text-sm text-stone-500 hover:text-stone-800 dark:hover:text-stone-200"
        >
          ← Skúsiť iný odkaz
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
          Adresa stránky s receptom
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
        <p className="rounded-lg border border-brick-200 bg-brick-50 px-4 py-3 text-sm text-brick-700 dark:border-brick-900/50 dark:bg-brick-950/30 dark:text-brick-300">
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={handleImport}
        disabled={loading || !url.trim()}
        className="rounded-lg bg-olive-600 px-5 py-2.5 font-medium text-white shadow-sm transition hover:bg-olive-700 disabled:opacity-60"
      >
        {loading ? "Čítam stránku…" : "Importovať recept"}
      </button>

      {loading && (
        <p className="text-sm text-stone-500">
          Načítavam stránku, AI na nej hľadá všetky recepty a ku každému
          priraďuje fotku. Môže to trvať aj minútu.
        </p>
      )}
    </div>
  );
}
