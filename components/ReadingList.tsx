"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Check, LoaderCircle, Trash2, X } from "lucide-react";
import ConfirmButton from "@/components/ConfirmButton";
import { dismissPhotoReading, keepReadRecipes, photoReadings, retryPhotoReading, trashReadRecipe } from "@/app/actions";
import type { ReadingItem } from "@/lib/readingList";

const EVERY_MS = 3000;

const recipes = (n: number) => `${n} ${n === 1 ? "recept" : n < 5 ? "recepty" : "receptov"}`;

// Under the photo page's button: the photos sent for reading
// (lib/photoReading.ts). Each shows "Nový recept · Čítam…", its title as soon
// as that is read, then — read — "Skontrolovať" (the recipe's page, where it
// can be edited and kept) or ✓ to keep it as read. "Uložiť všetky" keeps every read one. Drafts
// stay here, not among the recipes, until kept. Asks every few seconds while
// something is being read; `sent` changes when new photos were sent.
export default function ReadingList({ initial, sent }: { initial: ReadingItem[]; sent: number }) {
  const [items, setItems] = useState(initial);
  const [kept, setKept] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const list = await photoReadings().catch(() => null);
    if (list) setItems(list);
  }, []);

  const reading = items.some((i) => i.kind === "reading");
  // Also on arrival: going back to this page shows it as first loaded (maybe
  // before these photos were sent), so ask how things are now.
  useEffect(() => {
    const now = setTimeout(refresh, 0);
    return () => clearTimeout(now);
  }, [sent, refresh]);
  useEffect(() => {
    if (!reading) return;
    const timer = setInterval(() => document.visibilityState === "visible" && refresh(), EVERY_MS);
    return () => clearInterval(timer);
  }, [reading, refresh]);
  useEffect(() => {
    const onVisible = () => document.visibilityState === "visible" && refresh();
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [refresh]);

  const ready = items.filter((i) => i.kind === "ready");

  async function keep(ids: string[] | null) {
    setError(null);
    const leaving = ids ?? ready.map((r) => r.key);
    setItems((list) => list.filter((i) => !leaving.includes(i.key)));
    setKept((n) => n + leaving.length);
    await keepReadRecipes(ids).catch(() => setError("Spojenie so serverom sa prerušilo. Skúste to prosím znova."));
    refresh();
  }

  async function drop(item: ReadingItem) {
    setItems((list) => list.filter((i) => i.key !== item.key));
    if (item.kind === "ready") await trashReadRecipe(item.id).catch(() => {});
    if (item.kind === "failed") await dismissPhotoReading(item.readingId).catch(() => {});
    refresh();
  }

  async function retry(readingId: string) {
    setError(null);
    const result = await retryPhotoReading(readingId).catch(() => ({
      ok: false as const,
      error: "Spojenie so serverom sa prerušilo. Skúste to prosím znova.",
    }));
    if (!result.ok) setError(result.error);
    refresh();
  }

  if (!items.length && !kept) return null;
  const iconBtn = "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition";
  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display text-xl">Čítané recepty</h2>
        {ready.length > 1 && (
          <button
            type="button"
            onClick={() => keep(null)}
            className="flex items-center gap-1.5 rounded-lg border border-olive-300 px-3 py-1.5 text-sm font-medium text-olive-800 hover:bg-olive-50 dark:border-olive-800 dark:text-olive-300 dark:hover:bg-olive-950/40"
          >
            <Check className="h-4 w-4" /> Uložiť všetky bez kontroly
          </button>
        )}
      </div>

      {kept > 0 && (
        <p role="status" className="text-sm text-stone-600 dark:text-stone-400">
          Uložené: {recipes(kept)}.{" "}
          <Link href="/" className="font-medium text-olive-700 underline-offset-2 hover:underline dark:text-olive-400">
            Všetky recepty
          </Link>
        </p>
      )}
      {error && <p className="text-sm text-brick-700 dark:text-brick-300">{error}</p>}

      {items.length > 0 && (
        <ul className="divide-y divide-stone-200 rounded-xl border border-stone-200 dark:divide-stone-800 dark:border-stone-800">
          {items.map((item) => (
            <li key={item.key} className="flex items-center gap-3 px-3 py-2.5">
              {item.kind === "reading" && (
                <>
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-stone-100 dark:bg-stone-800">
                    <LoaderCircle className="h-5 w-5 animate-spin text-stone-400" />
                  </span>
                  <span
                    className={`line-clamp-2 min-w-0 flex-1 break-words ${item.title ? "font-medium" : "text-stone-500"}`}
                  >
                    {item.title ?? "Nový recept"}
                  </span>
                  <span className="shrink-0 text-sm text-stone-500">Čítam…</span>
                </>
              )}

              {item.kind === "failed" && (
                <>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-brick-700 dark:text-brick-300">Recept sa nepodarilo prečítať</p>
                    <p className="text-sm text-stone-500">{item.error}</p>
                  </div>
                  {item.canRetry && (
                    <button
                      type="button"
                      onClick={() => retry(item.readingId)}
                      className="shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium text-olive-700 hover:bg-olive-50 dark:text-olive-400 dark:hover:bg-olive-950/40"
                    >
                      Skúsiť znova
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => drop(item)}
                    title="Zavrieť"
                    aria-label="Zavrieť"
                    className={`${iconBtn} text-stone-400 hover:bg-stone-100 hover:text-stone-700 dark:hover:bg-stone-800`}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </>
              )}

              {item.kind === "ready" && (
                <>
                  {item.imagePath ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.imagePath} alt="" className="h-12 w-12 shrink-0 rounded-lg object-cover" />
                  ) : (
                    <span className="h-12 w-12 shrink-0 rounded-lg bg-stone-100 dark:bg-stone-800" />
                  )}
                  {/* On phones the buttons go under the title, so the title can be read. */}
                  <div className="min-w-0 flex-1 sm:flex sm:items-center sm:gap-3">
                    <div className="min-w-0 sm:flex-1">
                      <Link
                        href={`/recipes/${item.id}`}
                        className="line-clamp-2 break-words font-medium hover:underline"
                      >
                        {item.title}
                      </Link>
                      {item.like && (
                        <p className="text-sm text-stone-500">
                          Vyzerá ako{" "}
                          <Link
                            href={`/recipes/${item.like.id}`}
                            className="text-olive-700 underline-offset-2 hover:underline dark:text-olive-400"
                          >
                            {item.like.title}
                          </Link>
                          , ktorý už máte.
                        </p>
                      )}
                    </div>
                    <div className="mt-1.5 flex items-center gap-1 sm:mt-0">
                      <Link
                        href={`/recipes/${item.id}`}
                        className="shrink-0 rounded-lg bg-olive-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-olive-700"
                      >
                        Skontrolovať
                      </Link>
                      <button
                        type="button"
                        onClick={() => keep([item.id])}
                        title="Uložiť bez kontroly"
                        aria-label={`Uložiť ${item.title} bez kontroly`}
                        className={`${iconBtn} text-olive-700 hover:bg-olive-50 dark:text-olive-400 dark:hover:bg-olive-950/40`}
                      >
                        <Check className="h-5 w-5" />
                      </button>
                      <form action={() => drop(item)}>
                        <ConfirmButton
                          confirm={`Zahodiť recept „${item.title}“? Nájdete ho potom v koši.`}
                          confirmLabel="Zahodiť"
                          title="Zahodiť"
                          aria-label={`Zahodiť ${item.title}`}
                          className={`${iconBtn} text-stone-400 hover:bg-brick-50 hover:text-brick-600 dark:hover:bg-brick-950/40`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </ConfirmButton>
                      </form>
                    </div>
                  </div>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
