"use client";

import { useState } from "react";
import Link from "next/link";
import { Check } from "lucide-react";
import RecipeForm from "@/components/RecipeForm";
import { createRecipe, importRecipesFromUrl } from "@/app/actions";
import type { RecipeDraft } from "@/lib/recipes";

const inputClass =
  "w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-stone-900 outline-none focus:border-olive-500 focus:ring-2 focus:ring-olive-200 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100";

const notice =
  "rounded-lg border border-olive-200 bg-olive-50 px-4 py-3 text-sm text-olive-900 dark:border-olive-900/50 dark:bg-olive-950/30 dark:text-olive-200";

type Status = { saved?: string; skipped?: boolean };

// A page with several recipes: review them one at a time. Each is saved
// (without leaving the page) or skipped; the row of names shows progress.
function MultiReview({ drafts, onRestart }: { drafts: RecipeDraft[]; onRestart: () => void }) {
  const [current, setCurrent] = useState(0);
  const [status, setStatus] = useState<Status[]>(() => drafts.map(() => ({})));

  // The next recipe not yet saved or skipped, after `from` (wrapping round).
  const nextOpen = (s: Status[], from: number) => {
    for (let k = 1; k <= s.length; k++) {
      const i = (from + k) % s.length;
      if (!s[i].saved && !s[i].skipped) return i;
    }
    return -1;
  };
  const settle = (i: number, change: Status) => {
    const next = status.map((st, j) => (j === i ? { ...st, ...change } : st));
    setStatus(next);
    setCurrent(nextOpen(next, i));
  };
  const onSaved = (id: string) => settle(current, { saved: id });

  const savedCount = status.filter((s) => s.saved).length;
  const done = current === -1;

  return (
    <div className="space-y-5">
      <div className={notice}>
        This page has <strong>{drafts.length} recipes</strong>. Check each one — AI can miss or
        misread things — then save it or skip it.
      </div>

      <ol className="flex flex-wrap gap-2 text-sm">
        {drafts.map((d, i) => {
          const s = status[i];
          const base = "flex items-center gap-1.5 rounded-lg border px-3 py-1.5";
          if (s.saved) {
            return (
              <li key={i}>
                <Link
                  href={`/recipes/${s.saved}`}
                  className={`${base} border-olive-200 bg-olive-50 text-olive-800 dark:border-olive-900 dark:bg-olive-950/40 dark:text-olive-200`}
                >
                  <Check className="h-4 w-4" /> {d.title || `Recipe ${i + 1}`}
                </Link>
              </li>
            );
          }
          return (
            <li key={i}>
              <button
                type="button"
                onClick={() => setCurrent(i)}
                aria-current={i === current ? "step" : undefined}
                className={`${base} ${
                  i === current
                    ? "border-stone-900 font-medium dark:border-stone-100"
                    : "border-stone-200 text-stone-600 hover:border-stone-400 dark:border-stone-700 dark:text-stone-400"
                } ${s.skipped ? "line-through opacity-60" : ""}`}
              >
                {d.title || `Recipe ${i + 1}`}
              </button>
            </li>
          );
        })}
      </ol>

      {done ? (
        <div className="space-y-4 py-4">
          <p className="text-lg font-semibold">
            Done — {savedCount} of {drafts.length} saved.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/"
              className="rounded-lg bg-olive-600 px-5 py-2.5 font-medium text-white hover:bg-olive-700"
            >
              See your recipes
            </Link>
            <button
              type="button"
              onClick={onRestart}
              className="rounded-lg px-4 py-2.5 font-medium text-stone-600 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-800"
            >
              Import another link
            </button>
          </div>
        </div>
      ) : (
        <>
          <p className="text-sm font-medium text-stone-500">
            Recipe {current + 1} of {drafts.length}
          </p>
          <RecipeForm
            key={current}
            action={createRecipe}
            initial={drafts[current]}
            sourceType="url"
            submitLabel={nextOpen(status, current) === -1 ? "Save recipe" : "Save and next"}
            onSaved={onSaved}
            secondaryAction={
              <button
                type="button"
                onClick={() => settle(current, { skipped: true })}
                className="rounded-lg px-4 py-2.5 font-medium text-stone-600 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-800"
              >
                Skip this one
              </button>
            }
          />
        </>
      )}
    </div>
  );
}

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
    return <MultiReview drafts={drafts} onRestart={restart} />;
  }

  // One recipe: show the normal recipe form pre-filled for review.
  if (drafts) {
    return (
      <div className="space-y-4">
        <div className={notice}>
          Imported from the link. <strong>Check everything below</strong> —
          AI can miss or misread things — then save.
        </div>
        <RecipeForm
          action={createRecipe}
          initial={drafts[0]}
          sourceType="url"
          submitLabel="Save recipe"
        />
        <button
          type="button"
          onClick={restart}
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
        {loading ? "Reading the page…" : "Import recipe"}
      </button>

      {loading && (
        <p className="text-sm text-stone-500">
          Fetching the page, asking the AI to find every recipe on it and
          matching each one with its photo. This can take up to a minute.
        </p>
      )}
    </div>
  );
}
