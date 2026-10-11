"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { Camera } from "lucide-react";
import type { RecipeDraft } from "@/lib/recipes";
import { listToLines } from "@/lib/recipes";
import RecipeImage from "@/components/RecipeImage";
import Turnstile from "@/components/Turnstile";
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
  // Reviewing several imported recipes in a row: save without leaving the
  // page, then report the new recipe's id.
  onSaved?: (id: string) => void;
  // Replaces the Cancel link (e.g. "Skip this one" in a multi-recipe import).
  secondaryAction?: React.ReactNode;
  // Visitors (demo): Cloudflare site key for the background bot check; saving
  // waits until it has passed.
  botCheckKey?: string | null;
};

function SubmitButton({ label, waiting = false }: { label: string; waiting?: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending || waiting}
      className="rounded-lg bg-olive-600 px-5 py-2.5 font-medium text-white shadow-sm transition hover:bg-olive-700 disabled:opacity-60"
    >
      {pending ? "Ukladám…" : label}
    </button>
  );
}

const inputClass =
  "w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-stone-900 outline-none focus:border-olive-500 focus:ring-2 focus:ring-olive-200 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100";
const labelClass = "block text-sm font-medium text-stone-700 dark:text-stone-300";

export default function RecipeForm({
  action,
  initial,
  recipeId,
  sourceType = "manual",
  submitLabel = "Uložiť recept",
  onSaved,
  secondaryAction,
  botCheckKey,
}: Props) {
  const [botCheckReady, setBotCheckReady] = useState(!botCheckKey);
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

  // Tell the parent once, when a "stay" save succeeds.
  const reported = useRef<string | null>(null);
  const savedId = state?.saved?.id;
  useEffect(() => {
    if (savedId && reported.current !== savedId) {
      reported.current = savedId;
      onSaved?.(savedId);
    }
  }, [savedId, onSaved]);

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
          className="space-y-2 rounded-lg border border-olive-300 bg-olive-50 px-4 py-3 text-sm text-olive-900 dark:border-olive-700 dark:bg-olive-950 dark:text-olive-100"
        >
          <p className="font-medium">
            Tento recept je veľmi podobný receptu „{dup.match.title}“ (zhoda {Math.round(dup.score * 100)} %).
          </p>
          {dup.sameTitle ? (
            <p>
              Má aj rovnaký názov. Prosím,{" "}
              <Link href={`/recipes/${dup.match.id}`} target="_blank" className="underline">
                pozrite si existujúci recept
              </Link>{" "}
              a ak je to naozaj iná verzia, dajte jej názov, podľa ktorého ich rozlíšite
              (napr. „{title} bez čierneho korenia“), a uložte znova.
            </p>
          ) : (
            <>
              <p>
                <Link href={`/recipes/${dup.match.id}`} target="_blank" className="underline">
                  Otvorte ho a skontrolujte
                </Link>
                . Ak je to naozaj iná verzia, nech ich názov rozlíši, a potom ho uložte aj tak.
              </p>
              <button
                type="submit"
                name="confirmDuplicate"
                value="1"
                className="rounded-lg border border-olive-400 px-3 py-1.5 font-medium hover:bg-olive-100 dark:hover:bg-olive-900"
              >
                Uložiť aj tak, je to iný recept
              </button>
            </>
          )}
        </div>
      )}
      {recipeId && <input type="hidden" name="id" value={recipeId} />}
      <input type="hidden" name="sourceType" value={sourceType} />
      {onSaved && <input type="hidden" name="stay" value="1" />}
      {initial?.sourceUrl && (
        <input type="hidden" name="sourceUrl" value={initial.sourceUrl} />
      )}
      <input type="hidden" name="imagePath" value={imagePath} />
      {!recipeId && !!initial?.scanPaths?.length && (
        <input type="hidden" name="scanPaths" value={JSON.stringify(initial.scanPaths)} />
      )}

      <div className="space-y-2">
        {/* The whole picture is the button for choosing another one. */}
        <label className="group relative block cursor-pointer overflow-hidden rounded-xl">
          <RecipeImage src={shownImage} alt={title || "Fotka receptu"} className="aspect-video w-full" />
          <span className="absolute inset-0 flex items-center justify-center bg-black/0 transition group-hover:bg-black/25">
            <span className="flex items-center gap-2 rounded-full bg-black/55 px-4 py-2 text-sm font-medium text-white backdrop-blur-sm transition group-hover:bg-black/70">
              <Camera className="h-4 w-4" />
              {shownImage ? "Zmeniť fotku" : "Pridať fotku"}
            </span>
          </span>
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
        <div className="flex flex-wrap items-center gap-3 text-sm">
          {newFile && (
            <button
              type="button"
              onClick={() => chooseFile(null)}
              className="text-stone-500 hover:underline"
            >
              Ponechať pôvodnú fotku
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
              Odstrániť fotku
            </label>
          )}
        </div>
      </div>

      {!recipeId && !!initial?.scanPaths?.length && (
        <div className="space-y-1">
          <p className={labelClass}>Prečítané z fotiek — porovnajte s textom nižšie</p>
          <div className="flex flex-wrap gap-2">
            {initial.scanPaths.map((p, i) => (
              <a key={p} href={p} target="_blank" rel="noopener noreferrer" title={`Fotka ${i + 1}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={p}
                  alt={`Fotka ${i + 1}`}
                  className="h-24 w-auto rounded-lg border border-stone-200 object-cover dark:border-stone-700"
                />
              </a>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-1">
        <label className={labelClass} htmlFor="title">
          Názov
        </label>
        <input
          id="title"
          name="title"
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className={inputClass}
          placeholder="Babkin jablkový koláč"
        />
      </div>

      <div className="space-y-1">
        <label className={labelClass} htmlFor="ingredients">
          Suroviny{" "}
          <span className="text-stone-400">(každá na samostatný riadok; skupinu začnite názvom s dvojbodkou, napr. „Cesto:“)</span>
        </label>
        <textarea
          id="ingredients"
          name="ingredients"
          value={ingredients}
          onChange={(e) => setIngredients(e.target.value)}
          rows={8}
          className={`${inputClass} font-mono text-sm`}
          placeholder={"Cesto:\n300 g hladkej múky\n1 lyžička soli\nPlnka:\n3 jablká, olúpané a nakrájané"}
        />
      </div>

      <div className="space-y-1">
        <label className={labelClass} htmlFor="instructions">
          Postup <span className="text-stone-400">(každý krok na samostatný riadok)</span>
        </label>
        <textarea
          id="instructions"
          name="instructions"
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          rows={8}
          className={inputClass}
          placeholder={"Rúru predhrejeme na 180 °C.\nZmiešame suché suroviny.\nPečieme 45 minút."}
        />
      </div>

      <div className="flex items-center gap-3 pt-2">
        {botCheckKey && (
          <Turnstile key={state?.at ?? 0} siteKey={botCheckKey} action="demo" onToken={(t) => setBotCheckReady(!!t)} />
        )}
        <SubmitButton label={submitLabel} waiting={!botCheckReady} />
        {secondaryAction ?? (
          <Link
            href={recipeId ? `/recipes/${recipeId}` : "/"}
            className="rounded-lg px-4 py-2.5 font-medium text-stone-600 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-800"
          >
            Zrušiť
          </Link>
        )}
      </div>
    </form>
  );
}
