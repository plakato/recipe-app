"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { readingStatus } from "@/app/actions";
import { pendingReadings, READINGS_CHANGED, removePendingReading } from "@/lib/pendingReadings";
import { notice, type ReadingStatus } from "@/lib/readingNotice";

const EVERY_MS = 5000;

// On every page: while this browser has photo readings running in the
// background (lib/pendingReadings.ts), asks every few seconds how they're
// doing and shows a notice when one is done — "Recept je prečítaný ·
// Zobraziť". The phone notification (public/sw.js) covers the time the app
// isn't open; the notice still comes the next time it is.
export default function ReadingNotifier() {
  const router = useRouter();
  const [done, setDone] = useState<ReadingStatus[]>([]);

  const check = useCallback(async () => {
    const ids = pendingReadings();
    if (!ids.length || document.visibilityState !== "visible") return;
    const statuses = await readingStatus(ids).catch(() => null);
    if (!statuses) return;
    // Not this account's (signed in as someone else since): forget them.
    for (const id of ids) if (!statuses.some((s) => s.id === id)) removePendingReading(id);
    const finished = statuses.filter((s) => s.state !== "reading");
    if (!finished.length) return;
    setDone((shown) => [...shown, ...finished.filter((f) => !shown.some((s) => s.id === f.id))]);
    // New recipes: the list behind the notice shows them.
    if (finished.some((s) => s.state === "done")) router.refresh();
  }, [router]);

  useEffect(() => {
    const first = setTimeout(check, 0);
    const timer = setInterval(check, EVERY_MS);
    window.addEventListener(READINGS_CHANGED, check);
    document.addEventListener("visibilitychange", check);
    return () => {
      clearTimeout(first);
      clearInterval(timer);
      window.removeEventListener(READINGS_CHANGED, check);
      document.removeEventListener("visibilitychange", check);
    };
  }, [check]);

  const close = (id: string) => {
    removePendingReading(id);
    setDone((shown) => shown.filter((s) => s.id !== id));
  };

  if (!done.length) return null;
  return (
    <div className="fixed inset-x-4 top-16 z-40 space-y-2 sm:left-auto sm:w-96">
      {done.map((s) => {
        const n = notice(s);
        return (
          <div
            key={s.id}
            role="status"
            className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-sm shadow-lg ${
              s.state === "failed"
                ? "border-brick-200 bg-brick-50 text-brick-700 dark:border-brick-900/50 dark:bg-brick-950 dark:text-brick-300"
                : "border-olive-200 bg-olive-50 text-olive-900 dark:border-olive-900/50 dark:bg-olive-950 dark:text-olive-100"
            }`}
          >
            <div className="min-w-0 flex-1">
              <p className="font-semibold">{n.title}</p>
              {n.body && <p className="mt-0.5 line-clamp-3">{n.body}</p>}
              <button
                type="button"
                onClick={() => {
                  close(s.id);
                  router.push(n.url);
                }}
                className="mt-1.5 font-semibold underline-offset-2 hover:underline"
              >
                {s.state === "failed" ? (s.canRetry ? "Skúsiť znova" : "Podrobnosti") : "Zobraziť"}
              </button>
            </div>
            <button type="button" onClick={() => close(s.id)} title="Zavrieť" aria-label="Zavrieť" className="opacity-60 hover:opacity-100">
              <X className="h-4 w-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
