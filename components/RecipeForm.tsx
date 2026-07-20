"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import type { RecipeDraft } from "@/lib/recipes";
import { listToLines } from "@/lib/recipes";
import RecipeImage from "@/components/RecipeImage";

type Props = {
  // A server action (createRecipe or updateRecipe).
  action: (formData: FormData) => void | Promise<void>;
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
      className="rounded-lg bg-amber-600 px-5 py-2.5 font-medium text-white shadow-sm transition hover:bg-amber-700 disabled:opacity-60"
    >
      {pending ? "Saving…" : label}
    </button>
  );
}

const inputClass =
  "w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-stone-900 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100";
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
  const [description, setDescription] = useState(initial?.description ?? "");
  const [ingredients, setIngredients] = useState(
    listToLines(initial?.ingredients ?? []),
  );
  const [instructions, setInstructions] = useState(
    listToLines(initial?.instructions ?? []),
  );
  const [servings, setServings] = useState(initial?.servings ?? "");
  const [prepTime, setPrepTime] = useState(initial?.prepTime ?? "");
  const [cookTime, setCookTime] = useState(initial?.cookTime ?? "");
  // Image is carried through the form (not edited here yet), so imports and
  // future AI-generated images are preserved on save.
  const imagePath = initial?.imagePath ?? "";

  return (
    <form action={action} className="space-y-5">
      {recipeId && <input type="hidden" name="id" value={recipeId} />}
      <input type="hidden" name="sourceType" value={sourceType} />
      {initial?.sourceUrl && (
        <input type="hidden" name="sourceUrl" value={initial.sourceUrl} />
      )}
      <input type="hidden" name="imagePath" value={imagePath} />

      <RecipeImage
        src={imagePath || null}
        alt={title || "Recipe image"}
        className="aspect-video w-full rounded-xl"
      />

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
        <label className={labelClass} htmlFor="description">
          Description <span className="text-stone-400">(optional)</span>
        </label>
        <textarea
          id="description"
          name="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          className={inputClass}
          placeholder="A short note about this recipe"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="space-y-1">
          <label className={labelClass} htmlFor="servings">
            Servings
          </label>
          <input
            id="servings"
            name="servings"
            value={servings}
            onChange={(e) => setServings(e.target.value)}
            className={inputClass}
            placeholder="4"
          />
        </div>
        <div className="space-y-1">
          <label className={labelClass} htmlFor="prepTime">
            Prep time
          </label>
          <input
            id="prepTime"
            name="prepTime"
            value={prepTime}
            onChange={(e) => setPrepTime(e.target.value)}
            className={inputClass}
            placeholder="20 min"
          />
        </div>
        <div className="space-y-1">
          <label className={labelClass} htmlFor="cookTime">
            Cook time
          </label>
          <input
            id="cookTime"
            name="cookTime"
            value={cookTime}
            onChange={(e) => setCookTime(e.target.value)}
            className={inputClass}
            placeholder="45 min"
          />
        </div>
      </div>

      <div className="space-y-1">
        <label className={labelClass} htmlFor="ingredients">
          Ingredients <span className="text-stone-400">(one per line)</span>
        </label>
        <textarea
          id="ingredients"
          name="ingredients"
          value={ingredients}
          onChange={(e) => setIngredients(e.target.value)}
          rows={8}
          className={`${inputClass} font-mono text-sm`}
          placeholder={"2 cups flour\n1 tsp salt\n3 apples, peeled and sliced"}
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
