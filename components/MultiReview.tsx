"use client";

import { useState } from "react";
import Link from "next/link";
import { Check } from "lucide-react";
import RecipeForm from "@/components/RecipeForm";
import { createRecipe } from "@/app/actions";
import type { RecipeDraft } from "@/lib/recipes";

const notice =
  "rounded-lg border border-olive-200 bg-olive-50 px-4 py-3 text-sm text-olive-900 dark:border-olive-900/50 dark:bg-olive-950/30 dark:text-olive-200";

type Status = { saved?: string; skipped?: boolean };

// Several imported recipes (a web page, photos with two recipes): review them
// one at a time. Each is saved (without leaving the page) or skipped; the row
// of names shows progress.
export default function MultiReview({
  drafts,
  sourceType,
  intro,
  restartLabel,
  onRestart,
}: {
  drafts: RecipeDraft[];
  sourceType: string;
  intro: React.ReactNode;
  restartLabel: string;
  onRestart: () => void;
}) {
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
      <div className={notice}>{intro}</div>

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
                  <Check className="h-4 w-4" /> {d.title || `Recept ${i + 1}`}
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
                {d.title || `Recept ${i + 1}`}
              </button>
            </li>
          );
        })}
      </ol>

      {done ? (
        <div className="space-y-4 py-4">
          <p className="text-lg font-semibold">
            Hotovo — uložené {savedCount} z {drafts.length}.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/"
              className="rounded-lg bg-olive-600 px-5 py-2.5 font-medium text-white hover:bg-olive-700"
            >
              Zobraziť vaše recepty
            </Link>
            <button
              type="button"
              onClick={onRestart}
              className="rounded-lg px-4 py-2.5 font-medium text-stone-600 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-800"
            >
              {restartLabel}
            </button>
          </div>
        </div>
      ) : (
        <>
          <p className="text-sm font-medium text-stone-500">
            Recept {current + 1} z {drafts.length}
          </p>
          <RecipeForm
            key={current}
            action={createRecipe}
            initial={drafts[current]}
            sourceType={sourceType}
            submitLabel={nextOpen(status, current) === -1 ? "Uložiť recept" : "Uložiť a ďalší"}
            onSaved={onSaved}
            secondaryAction={
              <button
                type="button"
                onClick={() => settle(current, { skipped: true })}
                className="rounded-lg px-4 py-2.5 font-medium text-stone-600 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-800"
              >
                Preskočiť
              </button>
            }
          />
        </>
      )}
    </div>
  );
}

