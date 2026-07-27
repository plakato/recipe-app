"use client";

import { useRef, useState } from "react";
import RecipeForm from "@/components/RecipeForm";
import { createRecipe, importRecipeFromPhoto } from "@/app/actions";
import type { RecipeDraft } from "@/lib/recipes";

// Language of the recipe text — sent to the model to improve reading accuracy,
// which matters most for handwriting.
const LANGS = [
  { code: "Slovak", label: "Slovenčina" },
  { code: "Czech", label: "Čeština" },
  { code: "English", label: "English" },
];

const selectClass =
  "rounded-lg border border-stone-300 bg-white px-3 py-2 text-stone-900 outline-none focus:border-amber-500 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100";

export default function PhotoImport() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [language, setLanguage] = useState("Slovak");
  const [highQuality, setHighQuality] = useState(false);
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
    formData.append("language", language);
    if (highQuality) formData.append("quality", "high");
    const result = await importRecipeFromPhoto(formData);
    setLoading(false);
    if (result.ok) {
      setDraft(result.draft);
    } else {
      setError(result.error);
    }
  }

  // After extraction, review in the normal form (pre-filled, photo attached).
  if (draft) {
    return (
      <div className="space-y-4">
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">
          Read from your photo. <strong>Check everything below</strong> —
          handwriting and photos are easy to misread — then save.
        </div>
        <RecipeForm
          action={createRecipe}
          initial={draft}
          sourceType="photo"
          submitLabel="Save recipe"
        />
        <button
          type="button"
          onClick={() => {
            setDraft(null);
            setError(null);
          }}
          className="text-sm text-stone-500 hover:text-stone-800 dark:hover:text-stone-200"
        >
          ← Try a different photo
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
          className="flex-1 rounded-xl border-2 border-dashed border-stone-300 px-6 py-10 text-center text-stone-500 transition hover:border-amber-400 hover:text-stone-700 dark:border-stone-700 dark:hover:text-stone-300"
        >
          {file ? "📷 Choose a different photo" : "📷 Take or choose a photo"}
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <label className="flex items-center gap-2 text-sm text-stone-600 dark:text-stone-400">
          Recipe language:
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className={selectClass}
          >
            {LANGS.map((l) => (
              <option key={l.code} value={l.code}>
                {l.label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex items-center gap-2 text-sm text-stone-600 dark:text-stone-400">
          <input
            type="checkbox"
            checked={highQuality}
            onChange={(e) => setHighQuality(e.target.checked)}
            className="h-4 w-4 accent-amber-600"
          />
          Better reading for handwriting{" "}
          <span className="text-stone-400">(paid, ~1¢)</span>
        </label>
      </div>

      {previewUrl && !isHeic && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={previewUrl}
          alt="Selected recipe"
          className="max-h-96 w-full rounded-xl object-contain"
        />
      )}
      {isHeic && (
        <p className="text-sm text-stone-500">
          📎 {file?.name} selected (HEIC — no preview, but it will be converted
          and read).
        </p>
      )}

      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={handleExtract}
        disabled={loading || !file}
        className="rounded-lg bg-amber-600 px-5 py-2.5 font-medium text-white shadow-sm transition hover:bg-amber-700 disabled:opacity-60"
      >
        {loading ? "Reading the photo…" : "Read recipe from photo"}
      </button>

      {loading && (
        <p className="text-sm text-stone-500">
          Sending the photo to the AI. Free models can take several seconds.
        </p>
      )}
    </div>
  );
}
