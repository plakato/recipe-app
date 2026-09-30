"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import type { RecipeDraft } from "@/lib/recipes";
import { listToLines } from "@/lib/recipes";
import RecipeImage from "@/components/RecipeImage";
import type { SaveState } from "@/app/actions";

type Props = {
  // A server action (createRecipe or updateRecipe). Returns a SaveState when
  // the recipe was NOT saved (validation error or duplicate), redirects otherwise.
  action: (prev: SaveState, formData: FormData) => Promise<SaveState>;
  initial?: Partial<RecipeDraft>;
  // For edit: the recipe id (rendered as a hidden field).
  recipeId?: string;
  sourceType?: string;
  submitLabel?: string;
};

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-sage-600 px-5 py-2.5 font-medium text-white shadow-sm transition hover:bg-sage-700 disabled:opacity-60"
    >
      {pending ? "Saving…" : label}
    </button>
  );
}

const inputClass =
  "w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-stone-900 outline-none focus:border-sage-500 focus:ring-2 focus:ring-sage-200 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100";
const labelClass = "block text-sm font-medium text-stone-700 dark:text-stone-300";

export default function RecipeForm({
  action,
  initial,
  recipeId,
  sourceType = "manual",
  submitLabel = "Save recipe",
}: Props) {
  // Controlled fields so AI import (later phases) can populate them via setState.
  const [title, setTitle] = useState(initial?.title ?? "");
  const [ingredients, setIngredients] = useState(
    listToLines(initial?.ingredients ?? []),
  );
  const [instructions, setInstructions] = useState(
    listToLines(initial?.instructions ?? []),
  );
  // The stored image travels as a hidden field. The user can pick a new file
  // (previewed locally, uploaded on save) or remove the current one.
  const imagePath = initial?.imagePath ?? "";
  const [newFile, setNewFile] = useState<File | null>(null);
  const [removeImage, setRemoveImage] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  function chooseFile(file: File | null) {
    if (preview) URL.revokeObjectURL(preview);
    setNewFile(file);
    setPreview(file ? URL.createObjectURL(file) : null);
  }
  const shownImage = preview ?? (removeImage ? null : imagePath || null);

  const [state, formAction] = useActionState(action, null);
  const dup = state?.duplicate;

  return (
    <form action={formAction} className="space-y-5">
      {state?.error && (
        <p role="alert" className="rounded-lg border border-brick-200 bg-brick-50 px-3 py-2 text-sm text-brick-700 dark:border-brick-900 dark:bg-brick-950 dark:text-brick-300">
          {state.error}
        </p>
      )}
      {dup && (
        <div
          role="alert"
          className="space-y-2 rounded-lg border border-sage-300 bg-sage-50 px-4 py-3 text-sm text-sage-900 dark:border-sage-700 dark:bg-sage-950 dark:text-sage-100"
        >
          <p className="font-medium">
            This looks very similar to “{dup.match.title}” ({Math.round(dup.score * 100)}% match).
          </p>
          {dup.sameTitle ? (
            <p>
              It also has the same name. Please{" "}
              <Link href={`/recipes/${dup.match.id}`} target="_blank" className="underline">
                check the existing recipe
              </Link>{" "}
              and, if this really is a different version, give it a name that tells them apart
              (e.g. “{title} bez čierneho korenia”), then save again.
            </p>
          ) : (
            <>
              <p>
                <Link href={`/recipes/${dup.match.id}`} target="_blank" className="underline">
                  Open it to check
                </Link>
                . If it really is a different version, make sure the name tells them apart, then save anyway.
              </p>
              <button
                type="submit"
                name="confirmDuplicate"
                value="1"
                className="rounded-lg border border-sage-400 px-3 py-1.5 font-medium hover:bg-sage-100 dark:hover:bg-sage-900"
              >
                Save anyway, it&apos;s a different recipe
              </button>
            </>
          )}
        </div>
      )}
      {recipeId && <input type="hidden" name="id" value={recipeId} />}
      <input type="hidden" name="sourceType" value={sourceType} />
      {initial?.sourceUrl && (
        <input type="hidden" name="sourceUrl" value={initial.sourceUrl} />
      )}
      <input type="hidden" name="imagePath" value={imagePath} />

      <div className="space-y-2">
        <RecipeImage
          src={shownImage}
          alt={title || "Recipe image"}
          className="aspect-video w-full rounded-xl"
        />
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <label className="cursor-pointer rounded-lg border border-stone-300 px-3 py-1.5 font-medium hover:bg-stone-100 dark:border-stone-700 dark:hover:bg-stone-800">
            {shownImage ? "Change photo" : "Add photo"}
            <input
              type="file"
              name="photo"
              accept="image/*,.heic,.heif"
              className="sr-only"
              onChange={(e) => {
                chooseFile(e.target.files?.[0] ?? null);
                setRemoveImage(false);
              }}
            />
          </label>
          {newFile && (
            <button
              type="button"
              onClick={() => chooseFile(null)}
              className="text-stone-500 hover:underline"
            >
              Keep the current photo instead
            </button>
          )}
          {!newFile && imagePath && (
            <label className="flex items-center gap-1.5 text-stone-600 dark:text-stone-400">
              <input
                type="checkbox"
                name="removeImage"
                value="1"
                checked={removeImage}
                onChange={(e) => setRemoveImage(e.target.checked)}
              />
              Remove photo
            </label>
          )}
        </div>
      </div>

      <div className="space-y-1">
        <label className={labelClass} htmlFor="title">
          Title
        </label>
        <input
          id="title"
          name="title"
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className={inputClass}
          placeholder="Grandma's apple pie"
        />
      </div>

      <div className="space-y-1">
        <label className={labelClass} htmlFor="ingredients">
          Ingredients{" "}
          <span className="text-stone-400">(one per line; a line ending with “:” like “Cesto:” starts a section)</span>
        </label>
        <textarea
          id="ingredients"
          name="ingredients"
          value={ingredients}
          onChange={(e) => setIngredients(e.target.value)}
          rows={8}
          className={`${inputClass} font-mono text-sm`}
          placeholder={"Cesto:\n2 cups flour\n1 tsp salt\nPlnka:\n3 apples, peeled and sliced"}
        />
      </div>

      <div className="space-y-1">
        <label className={labelClass} htmlFor="instructions">
          Instructions <span className="text-stone-400">(one step per line)</span>
        </label>
        <textarea
          id="instructions"
          name="instructions"
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          rows={8}
          className={inputClass}
          placeholder={"Preheat the oven to 180°C.\nMix the dry ingredients.\nBake for 45 minutes."}
        />
      </div>

      <div className="flex items-center gap-3 pt-2">
        <SubmitButton label={submitLabel} />
        <Link
          href={recipeId ? `/recipes/${recipeId}` : "/"}
          className="rounded-lg px-4 py-2.5 font-medium text-stone-600 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-800"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
