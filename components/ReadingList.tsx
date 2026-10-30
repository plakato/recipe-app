"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Check, LoaderCircle, Trash2, X } from "lucide-react";
import ConfirmButton from "@/components/ConfirmButton";
import { dismissPhotoReading, keepReadRecipes, photoReadings, retryPhotoReading, trashReadRecipe } from "@/app/actions";
import type { ReadingItem, ReadingListData, Sending } from "@/lib/readingList";

const EVERY_MS = 3000;

// Under the photo page's button: the photos sent for reading
// (lib/photoReading.ts), newest first. Photos still on their way
// (`sending`, from components/PhotoImport.tsx) show "Nahrávam…" — or, if
// that failed, why, with onResend / onForget. Then each reading shows
// "Nový recept · Čítam…", its title as soon as that is read, then — read —
// "Skontrolovať" (the recipe's page, where it can be edited, kept or thrown
// away) or ✓ to keep it as read, quietly. "Uložiť všetky" keeps every read
// one. A bin only for one that looks like a recipe they already have, and on
// that line — never next to ✓, where a slip would do the opposite. Drafts
// stay here, not among the recipes, until kept. Asks every few seconds while
// something is being read; `sent` changes when new photos were sent.
export default function ReadingList({
  initial,
  sent,
  sending,
  onResend,
  onForget,
}: {
  initial: ReadingListData;
  sent: number;
  sending: Sending[];
  onResend: (key: string) => void;
  onForget: (key: string) => void;
}) {
  const [items, setItems] = useState(initial.items);
  // The server's clock minus the browser's, to order the reading list's
  // times among the photos sent from here.
  const [offset, setOffset] = useState(() => initial.now - Date.now());
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const list = await photoReadings().catch(() => null);
    if (!list) return;
    setItems(list.items);
    setOffset(list.now - Date.now());
  }, []);

  // Photos on their way, until the list has their reading; all newest first
  // (a reading's recipes stay together, in the order read).
  const uploads = sending.filter((s) => !s.readingId || !items.some((i) => i.readingId === s.readingId));
  const sentAt = new Map(sending.flatMap((s) => (s.readingId ? [[s.readingId, s.at] as const] : [])));
  const rows: ({ upload: Sending; at: number } | { item: ReadingItem; at: number })[] = [
    ...uploads.map((upload) => ({ upload, at: upload.at })),
    // Sent from here: by when it was sent (the server's time is when the photos
    // arrived), so a slow upload doesn't jump above later ones once it lands.
    ...items.map((item) => ({ item, at: sentAt.get(item.readingId) ?? item.at - offset })),
  ].sort((a, b) => b.at - a.at);
  const reading = items.some((i) => i.kind === "reading") || uploads.some((s) => s.readingId);
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
    await keepReadRecipes(ids).catch(() => setError("Spojenie so serverom sa prerušilo. Skúste to prosím znova."));
    refresh();
  }

  async function trash(id: string, key: string) {
    setItems((list) => list.filter((i) => i.key !== key));
    await trashReadRecipe(id).catch(() => {});
    refresh();
  }

  async function dismiss(readingId: string, key: string) {
    setItems((list) => list.filter((i) => i.key !== key));
    await dismissPhotoReading(readingId).catch(() => {});
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

  if (!items.length && !uploads.length) return null;
  const iconBtn = "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition";
  const spinner = (
    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-stone-100 dark:bg-stone-800">
      <LoaderCircle className="h-5 w-5 animate-spin text-stone-400" />
    </span>
  );
  const uploadLine = (u: Sending) => (
    <li key={u.key} className="flex items-center gap-3 px-3 py-2.5">
      {u.error ? (
        <>
          <div className="min-w-0 flex-1">
            <p className="font-medium text-brick-700 dark:text-brick-300">Fotky sa nepodarilo poslať</p>
            <p className="text-sm text-stone-500">{u.error}</p>
          </div>
          <button
            type="button"
            onClick={() => onResend(u.key)}
            className="shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium text-olive-700 hover:bg-olive-50 dark:text-olive-400 dark:hover:bg-olive-950/40"
          >
            Skúsiť znova
          </button>
          <button
            type="button"
            onClick={() => onForget(u.key)}
            title="Zavrieť"
            aria-label="Zavrieť"
            className={`${iconBtn} text-stone-400 hover:bg-stone-100 hover:text-stone-700 dark:hover:bg-stone-800`}
          >
            <X className="h-4 w-4" />
          </button>
        </>
      ) : (
        <>
          {spinner}
          <span className="min-w-0 flex-1 text-stone-500">Nový recept</span>
          <span className="shrink-0 text-sm text-stone-500">
            {u.readingId ? "Čítam…" : `Nahrávam… ${u.progress} %`}
          </span>
        </>
      )}
    </li>
  );

  const itemLine = (item: ReadingItem) => (
    <li key={item.key} className="flex items-center gap-3 px-3 py-2.5">
      {item.kind === "reading" && (
        <>
          {spinner}
          <span className={`line-clamp-2 min-w-0 flex-1 break-words ${item.title ? "font-medium" : "text-stone-500"}`}>
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
            onClick={() => dismiss(item.readingId, item.key)}
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
              <Link href={`/recipes/${item.id}`} className="line-clamp-2 break-words font-medium hover:underline">
                {item.title}
              </Link>
              {item.like && (
                <p className="text-sm text-brick-700 dark:text-brick-300">
                  Vyzerá ako{" "}
                  <Link href={`/recipes/${item.like.id}`} className="font-medium underline underline-offset-2">
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
              {/* Throwing away one that looks like a recipe they have: in the
                  same row and size as ✓, but red and well apart from it (far
                  right on phones) — a slip must not do the opposite. */}
              {item.like && (
                <form action={() => trash(item.id, item.key)} className="ml-auto sm:ml-8">
                  <ConfirmButton
                    confirm={`Zahodiť recept „${item.title}“? Nájdete ho potom v koši.`}
                    confirmLabel="Zahodiť"
                    title="Zahodiť"
                    aria-label={`Zahodiť ${item.title}`}
                    className={`${iconBtn} text-brick-600 hover:bg-brick-50 dark:text-brick-300 dark:hover:bg-brick-950/40`}
                  >
                    <Trash2 className="h-5 w-5" />
                  </ConfirmButton>
                </form>
              )}
              {/* Side by side (wide screens): the same space without a bin, so
                  every row's buttons line up. */}
              {!item.like && ready.some((r) => r.kind === "ready" && r.like) && (
                <span aria-hidden className="hidden h-9 w-9 shrink-0 sm:ml-8 sm:block" />
              )}
            </div>
          </div>
        </>
      )}
    </li>
  );

  return (
    <section className="space-y-3">
      {ready.length > 1 && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => keep(null)}
            className="flex items-center gap-1.5 rounded-lg border border-olive-300 px-3 py-1.5 text-sm font-medium text-olive-800 hover:bg-olive-50 dark:border-olive-800 dark:text-olive-300 dark:hover:bg-olive-950/40"
          >
            <Check className="h-4 w-4" /> Uložiť všetky bez kontroly
          </button>
        </div>
      )}

      {error && <p className="text-sm text-brick-700 dark:text-brick-300">{error}</p>}

      {(items.length > 0 || uploads.length > 0) && (
        <ul className="divide-y divide-stone-200 rounded-xl border border-stone-200 dark:divide-stone-800 dark:border-stone-800">
          {rows.map((row) => ("upload" in row ? uploadLine(row.upload) : itemLine(row.item)))}
        </ul>
      )}
    </section>
  );
}
