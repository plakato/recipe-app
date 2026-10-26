"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import Turnstile from "@/components/Turnstile";
import { importRecipesFromPhotos } from "@/app/actions";
import { MAX_PHOTOS } from "@/lib/features";
import { addPendingReading } from "@/lib/pendingReadings";
import { enableNotifications } from "@/lib/pushClient";

const MAX_BYTES = 8 * 1024 * 1024; // per photo, as on the server (lib/saveImage.ts)

type Picked = { file: File; url: string | null };

const pickButton =
  "flex-1 rounded-xl border-2 border-dashed border-stone-300 px-4 py-8 text-center text-stone-500 transition hover:border-olive-400 hover:text-stone-700 disabled:opacity-50 dark:border-stone-700 dark:hover:text-stone-300";

// Photo import: one or more photos taken together — a recipe over several
// pages, a page plus a picture of the dish, a page with several recipes.
// Sending them starts a reading in the background (lib/photoReading.ts): the
// recipes are saved as read and the person is told when it's done
// (components/ReadingNotifier.tsx, and a phone notification — asked for on
// the first send, when pushKey is set). They can send the next photos at once.
// botCheckKey: set for visitors (demo). The invisible bot check runs while
// they pick photos; reading starts only once it has passed, and their demo
// begins with that first reading (app/actions.ts → importRecipesFromPhotos).
export default function PhotoImport({
  botCheckKey = null,
  pushKey = null,
}: {
  botCheckKey?: string | null;
  pushKey?: string | null;
}) {
  const [botToken, setBotToken] = useState<string | null>(null);
  const [botAttempt, setBotAttempt] = useState(0);
  // After the first reading the visitor is signed in to their demo.
  const [needsBotCheck, setNeedsBotCheck] = useState(!!botCheckKey);
  const [picked, setPicked] = useState<Picked[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // How many readings this page sent (the note under the button).
  const [sent, setSent] = useState(0);
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  // Free the previews when leaving the page.
  const pickedRef = useRef(picked);
  useEffect(() => {
    pickedRef.current = picked;
  }, [picked]);
  useEffect(() => () => pickedRef.current.forEach((p) => p.url && URL.revokeObjectURL(p.url)), []);

  function add(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = ""; // the same photo can be picked again after removing it
    if (!files.length) return;
    setError(null);
    const tooBig = files.find((f) => f.size > MAX_BYTES);
    if (tooBig) setError(`Fotka ${tooBig.name} je príliš veľká (najviac 8 MB).`);
    const usable = files.filter((f) => f.size <= MAX_BYTES);
    const room = MAX_PHOTOS - picked.length;
    if (usable.length > room) setError(`Naraz najviac ${MAX_PHOTOS} fotiek.`);
    setPicked([
      ...picked,
      ...usable.slice(0, Math.max(0, room)).map((file) => ({
        file,
        // HEIC often can't be previewed by the browser; show its name instead.
        url: /\.hei[cf]$/i.test(file.name) ? null : URL.createObjectURL(file),
      })),
    ]);
  }

  function remove(i: number) {
    const p = picked[i];
    if (p.url) URL.revokeObjectURL(p.url);
    setPicked(picked.filter((_, j) => j !== i));
    setError(null);
  }

  async function handleExtract() {
    if (!picked.length) return;
    // First, while it's still the tap itself: Safari asks only then.
    enableNotifications(pushKey);
    setLoading(true);
    setError(null);
    const formData = new FormData();
    for (const p of picked) formData.append("photo", p.file);
    if (needsBotCheck && botToken) formData.append("cf-turnstile-response", botToken);
    // The answer can fail to arrive at all (connection lost, the server
    // restarted by a deploy): say so instead of reading forever.
    const result = await importRecipesFromPhotos(formData).catch(() => ({
      ok: false as const,
      error: "Spojenie so serverom sa prerušilo a recept sa neprečítal. Skúste to prosím znova.",
    }));
    setLoading(false);
    if (result.ok) {
      setNeedsBotCheck(false);
      addPendingReading(result.readingId);
      picked.forEach((p) => p.url && URL.revokeObjectURL(p.url));
      setPicked([]);
      setSent((n) => n + 1);
    } else {
      setError(result.error);
      // The token was used: get a fresh one for the next try.
      setBotToken(null);
      setBotAttempt((n) => n + 1);
    }
  }

  const full = picked.length >= MAX_PHOTOS;
  return (
    <div className="space-y-4">
      {/* On phones the first opens the camera; the second the photo library. */}
      <input ref={cameraRef} type="file" accept="image/*,.heic,.heif" capture="environment" onChange={add} className="hidden" />
      <input ref={galleryRef} type="file" accept="image/*,.heic,.heif" multiple onChange={add} className="hidden" />

      <div className="flex flex-wrap gap-3">
        <button type="button" onClick={() => cameraRef.current?.click()} disabled={full || loading} className={pickButton}>
          📷 {picked.length ? "Odfotiť ďalšiu" : "Odfotiť"}
        </button>
        <button type="button" onClick={() => galleryRef.current?.click()} disabled={full || loading} className={pickButton}>
          🖼️ Vybrať z galérie
        </button>
      </div>
      <p className="text-sm text-stone-500">
        Ak recept pokračuje na ďalšej strane alebo máte aj fotku hotového jedla, pridajte všetky
        fotky naraz (najviac {MAX_PHOTOS}).
      </p>

      {sent > 0 && !picked.length && (
        <p role="status" className="rounded-lg border border-olive-200 bg-olive-50 px-4 py-3 text-sm text-olive-900 dark:border-olive-900/50 dark:bg-olive-950/30 dark:text-olive-200">
          {sent > 1 ? "Recepty sa čítajú" : "Recept sa číta"}. Dáme vám vedieť, keď bude hotový — medzitým
          môžete pridať ďalší.
        </p>
      )}

      {picked.length > 0 && (
        <ol className="grid grid-cols-3 gap-3 sm:grid-cols-5">
          {picked.map((p, i) => (
            <li key={p.url ?? `${p.file.name}-${i}`} className="relative">
              {p.url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.url} alt={`Fotka ${i + 1}`} className="aspect-[3/4] w-full rounded-lg object-cover" />
              ) : (
                <div className="flex aspect-[3/4] w-full items-center justify-center break-all rounded-lg bg-stone-100 p-2 text-center text-xs text-stone-500 dark:bg-stone-800">
                  {p.file.name}
                </div>
              )}
              <span className="absolute left-1.5 top-1.5 rounded bg-black/60 px-1.5 text-xs font-medium text-white">
                {i + 1}
              </span>
              {!loading && (
                <button
                  type="button"
                  onClick={() => remove(i)}
                  title="Odstrániť"
                  aria-label={`Odstrániť fotku ${i + 1}`}
                  className="absolute right-1.5 top-1.5 rounded bg-black/60 p-0.5 text-white hover:bg-black/80"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </li>
          ))}
        </ol>
      )}

      {error && (
        <p className="rounded-lg border border-brick-200 bg-brick-50 px-4 py-3 text-sm text-brick-700 dark:border-brick-900/50 dark:bg-brick-950/30 dark:text-brick-300">
          {error}
        </p>
      )}

      {botCheckKey && needsBotCheck && (
        <Turnstile key={botAttempt} siteKey={botCheckKey} action="demo" onToken={setBotToken} />
      )}
      <button
        type="button"
        onClick={handleExtract}
        disabled={loading || !picked.length || (needsBotCheck && !botToken)}
        className="rounded-lg bg-olive-600 px-5 py-2.5 font-medium text-white shadow-sm transition hover:bg-olive-700 disabled:opacity-60"
      >
        {loading
          ? "Posielam fotky…"
          : picked.length > 1
            ? `Prečítať recept z ${picked.length} fotiek`
            : "Prečítať recept z fotky"}
      </button>

      <p className="text-sm text-stone-500">
        Recept prečítame a uložíme na pozadí. Keď bude hotový, dáme vám vedieť.
      </p>
    </div>
  );
}
