"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { retryPhotoReading } from "@/app/actions";
import { addPendingReading } from "@/lib/pendingReadings";

// "Skúsiť znova" on a failed reading's page: reads the same photos again in
// the background, as a new reading (app/actions.ts → retryPhotoReading).
export default function RetryReading({ readingId }: { readingId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function retry() {
    setBusy(true);
    setError(null);
    const result = await retryPhotoReading(readingId).catch(() => ({
      ok: false as const,
      error: "Spojenie so serverom sa prerušilo. Skúste to prosím znova.",
    }));
    if (result.ok) {
      addPendingReading(result.readingId);
      router.push(`/recipes/read/${result.readingId}`);
    } else {
      setError(result.error);
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={retry}
        disabled={busy}
        className="rounded-lg bg-olive-600 px-5 py-2.5 font-medium text-white shadow-sm transition hover:bg-olive-700 disabled:opacity-60"
      >
        {busy ? "Posielam…" : "Skúsiť znova"}
      </button>
      {error && <p className="text-sm text-brick-700 dark:text-brick-300">{error}</p>}
    </div>
  );
}
