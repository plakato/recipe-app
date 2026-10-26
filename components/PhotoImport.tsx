"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import RecipeForm from "@/components/RecipeForm";
import MultiReview from "@/components/MultiReview";
import Turnstile from "@/components/Turnstile";
import { createRecipe, importRecipesFromPhotos } from "@/app/actions";
import { MAX_PHOTOS } from "@/lib/features";
import type { RecipeDraft } from "@/lib/recipes";

const MAX_BYTES = 8 * 1024 * 1024; // per photo, as on the server (lib/saveImage.ts)

type Picked = { file: File; url: string | null };

const pickButton =
  "flex-1 rounded-xl border-2 border-dashed border-stone-300 px-4 py-8 text-center text-stone-500 transition hover:border-olive-400 hover:text-stone-700 disabled:opacity-50 dark:border-stone-700 dark:hover:text-stone-300";

// Photo import: one or more photos taken together — a recipe over several
// pages, a page plus a picture of the dish, a page with several recipes.
// botCheckKey: set for visitors (demo). The invisible bot check runs while
// they pick photos; reading starts only once it has passed, and their demo
// begins with that first reading (app/actions.ts → importRecipesFromPhotos).
export default function PhotoImport({ botCheckKey = null }: { botCheckKey?: string | null }) {
  const [botToken, setBotToken] = useState<string | null>(null);
  const [botAttempt, setBotAttempt] = useState(0);
  // After the first reading the visitor is signed in to their demo.
  const [needsBotCheck, setNeedsBotCheck] = useState(!!botCheckKey);
  const [picked, setPicked] = useState<Picked[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<RecipeDraft[] | null>(null);
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
      setDrafts(result.drafts);
    } else {
      setError(result.error);
      // The token was used: get a fresh one for the next try.
      setBotToken(null);
      setBotAttempt((n) => n + 1);
    }
  }

  const restart = () => {
    picked.forEach((p) => p.url && URL.revokeObjectURL(p.url));
    setPicked([]);
    setDrafts(null);
    setError(null);
  };

  // Several recipes on the photos: review them one by one.
  if (drafts && drafts.length > 1) {
    return (
      <MultiReview
        drafts={drafts}
        sourceType="photo"
        intro={
          <>
            Na fotkách sú <strong>{drafts.length} recepty</strong>. Každý skontrolujte — fotky sa
            ľahko prečítajú zle — a potom ho uložte alebo preskočte.
          </>
        }
        restartLabel="Pridať ďalšie fotky"
        onRestart={restart}
      />
    );
  }

  // One recipe: review it in the normal form (pre-filled, pictures attached).
  if (drafts) {
    return (
      <div className="space-y-4">
        <div className="rounded-lg border border-olive-200 bg-olive-50 px-4 py-3 text-sm text-olive-900 dark:border-olive-900/50 dark:bg-olive-950/30 dark:text-olive-200">
          Prečítané z vašich fotiek. <strong>Všetko nižšie skontrolujte</strong> —
          rukopis a fotky sa ľahko prečítajú zle — a potom uložte.
        </div>
        <RecipeForm
          action={createRecipe}
          initial={drafts[0]}
          sourceType="photo"
          submitLabel="Uložiť recept"
        />
        <button
          type="button"
          onClick={restart}
          className="text-sm text-stone-500 hover:text-stone-800 dark:hover:text-stone-200"
        >
          ← Skúsiť iné fotky
        </button>
      </div>
    );
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
        fotky naraz (najviac {MAX_PHOTOS}). Keď je na stránke viac receptov, ukážeme vám ich jeden
        po druhom; ak pridáte aj fotku hotového jedla, prečítame len recept, ktorý je na nej.
      </p>

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
          ? "Čítam fotky…"
          : picked.length > 1
            ? `Prečítať recept z ${picked.length} fotiek`
            : "Prečítať recept z fotky"}
      </button>

      {loading && (
        <p className="text-sm text-stone-500">
          Posielam fotky umelej inteligencii. Môže to trvať aj minútu.
        </p>
      )}
    </div>
  );
}
