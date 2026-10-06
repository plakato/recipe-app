"use client";

import { useRef, useState } from "react";
import RecipeForm from "@/components/RecipeForm";
import Turnstile from "@/components/Turnstile";
import { createRecipe, importRecipeFromPhoto } from "@/app/actions";
import type { RecipeDraft } from "@/lib/recipes";

// botCheckKey: set for visitors (demo). The invisible bot check runs while
// they pick a photo; reading starts only once it has passed, and their demo
// begins with that first reading (app/actions.ts → importRecipeFromPhoto).
export default function PhotoImport({ botCheckKey = null }: { botCheckKey?: string | null }) {
  const [botToken, setBotToken] = useState<string | null>(null);
  const [botAttempt, setBotAttempt] = useState(0);
  // After the first reading the visitor is signed in to their demo.
  const [needsBotCheck, setNeedsBotCheck] = useState(!!botCheckKey);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<RecipeDraft | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  // HEIC files often can't be previewed by the browser; note it instead.
  const isHeic = !!file && /\.hei[cf]$/i.test(file.name);

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = e.target.files?.[0] ?? null;
    setFile(picked);
    setError(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(picked ? URL.createObjectURL(picked) : null);
  }

  async function handleExtract() {
    if (!file) return;
    setLoading(true);
    setError(null);
    const formData = new FormData();
    formData.append("photo", file);
    if (needsBotCheck && botToken) formData.append("cf-turnstile-response", botToken);
    const result = await importRecipeFromPhoto(formData);
    setLoading(false);
    if (result.ok) {
      setNeedsBotCheck(false);
      setDraft(result.draft);
    } else {
      setError(result.error);
      // The token was used: get a fresh one for the next try.
      setBotToken(null);
      setBotAttempt((n) => n + 1);
    }
  }

  // After extraction, review in the normal form (pre-filled, photo attached).
  if (draft) {
    return (
      <div className="space-y-4">
        <div className="rounded-lg border border-olive-200 bg-olive-50 px-4 py-3 text-sm text-olive-900 dark:border-olive-900/50 dark:bg-olive-950/30 dark:text-olive-200">
          Prečítané z vašej fotky. <strong>Všetko nižšie skontrolujte</strong> —
          rukopis a fotky sa ľahko prečítajú zle — a potom uložte.
        </div>
        <RecipeForm
          action={createRecipe}
          initial={draft}
          sourceType="photo"
          submitLabel="Uložiť recept"
        />
        <button
          type="button"
          onClick={() => {
            setDraft(null);
            setError(null);
          }}
          className="text-sm text-stone-500 hover:text-stone-800 dark:hover:text-stone-200"
        >
          ← Skúsiť inú fotku
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <input
        ref={inputRef}
        type="file"
        accept="image/*,.heic,.heif"
        // On phones this offers the camera directly.
        capture="environment"
        onChange={onPick}
        className="hidden"
      />

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex-1 rounded-xl border-2 border-dashed border-stone-300 px-6 py-10 text-center text-stone-500 transition hover:border-olive-400 hover:text-stone-700 dark:border-stone-700 dark:hover:text-stone-300"
        >
          {file ? "📷 Vybrať inú fotku" : "📷 Odfotiť alebo vybrať fotku"}
        </button>
      </div>

      {previewUrl && !isHeic && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={previewUrl}
          alt="Vybraný recept"
          className="max-h-96 w-full rounded-xl object-contain"
        />
      )}
      {isHeic && (
        <p className="text-sm text-stone-500">
          📎 Vybraná fotka {file?.name} (HEIC — bez náhľadu, ale prevedieme ju
          a prečítame).
        </p>
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
        disabled={loading || !file || (needsBotCheck && !botToken)}
        className="rounded-lg bg-olive-600 px-5 py-2.5 font-medium text-white shadow-sm transition hover:bg-olive-700 disabled:opacity-60"
      >
        {loading ? "Čítam fotku…" : "Prečítať recept z fotky"}
      </button>

      {loading && (
        <p className="text-sm text-stone-500">
          Posielam fotku umelej inteligencii. Môže to trvať aj niekoľko desiatok sekúnd.
        </p>
      )}
    </div>
  );
}
