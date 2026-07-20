"use client";

import { useRef, useState } from "react";
import RecipeForm from "@/components/RecipeForm";
import { createRecipe, importRecipeFromPhoto } from "@/app/actions";
import type { RecipeDraft } from "@/lib/recipes";

export default function PhotoImport() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<RecipeDraft | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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
        accept="image/*"
        // On phones this offers the camera directly.
        capture="environment"
        onChange={onPick}
        className="hidden"
      />

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="w-full rounded-xl border-2 border-dashed border-stone-300 px-6 py-10 text-center text-stone-500 transition hover:border-amber-400 hover:text-stone-700 dark:border-stone-700 dark:hover:text-stone-300"
      >
        {previewUrl ? "📷 Choose a different photo" : "📷 Take or choose a photo"}
      </button>

      {previewUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={previewUrl}
          alt="Selected recipe"
          className="max-h-96 w-full rounded-xl object-contain"
        />
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
