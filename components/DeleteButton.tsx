"use client";

// "Move to Trash" on a recipe page. For visitors browsing the showcase it also
// carries the background bot check: their demo starts on this click and only
// their own copy is deleted (app/actions.ts → softDeleteRecipe).
import { useActionState, useState } from "react";
import { softDeleteRecipe } from "@/app/actions";
import { TrashIcon } from "@/components/Icons";
import Turnstile from "@/components/Turnstile";
import ConfirmButton from "@/components/ConfirmButton";

export default function DeleteButton({
  id,
  className,
  botCheckKey,
}: {
  id: string;
  className: string;
  botCheckKey?: string | null; // set for visitors: the check must pass first
}) {
  const [state, action, pending] = useActionState(softDeleteRecipe, null);
  const [ready, setReady] = useState(!botCheckKey);
  return (
    <form action={action}>
      <input type="hidden" name="id" value={id} />
      {botCheckKey && (
        <Turnstile key={state?.at ?? 0} siteKey={botCheckKey} action="demo" onToken={(t) => setReady(!!t)} />
      )}
      <ConfirmButton
        confirm="Zmazať tento recept? Nájdete ho potom v koši."
        disabled={pending || !ready}
        title="Presunúť do koša"
        aria-label="Presunúť do koša"
        className={`${className} disabled:opacity-60`}
      >
        <TrashIcon />
      </ConfirmButton>
      {state?.error && (
        <p role="alert" className="absolute right-3 top-16 z-10 max-w-xs rounded-lg bg-white p-3 text-sm text-brick-700 shadow-lg dark:bg-stone-900 dark:text-brick-300">
          {state.error}
        </p>
      )}
    </form>
  );
}
