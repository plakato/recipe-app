"use client";

// Starts the demo without asking: as soon as the invisible bot check has a
// token (or straight away when it's off), the form submits itself and the
// visitor lands on what they wanted — editing their copy, adding a recipe.
// Only if that fails do they see a message and a "Try again" button.
import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { startDemo, type DemoState } from "@/app/demo/actions";
import Turnstile from "@/components/Turnstile";

function RetryButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-olive-600 px-5 py-2.5 font-medium text-white transition hover:bg-olive-700 disabled:opacity-60"
    >
      {pending ? "Opening…" : "Try again"}
    </button>
  );
}

export default function DemoStart({ next, siteKey }: { next: string; siteKey: string | null }) {
  const [state, action] = useActionState<DemoState, FormData>(startDemo, null);
  const form = useRef<HTMLFormElement>(null);
  // Submit by itself once; after a failure the visitor retries by hand (so a
  // limit or a failed check never loops).
  const auto = useRef(true);
  const submitOnce = () => {
    if (!auto.current) return;
    auto.current = false;
    form.current?.requestSubmit();
  };
  useEffect(() => {
    if (!siteKey) submitOnce();
  });

  return (
    <form ref={form} action={action} className="space-y-4">
      <input type="hidden" name="next" value={next} />
      {state?.error ? (
        <>
          <p className="rounded-lg border border-brick-200 bg-brick-50 px-4 py-3 text-sm text-brick-700 dark:border-brick-900/50 dark:bg-brick-950/30 dark:text-brick-300">
            {state.error}
          </p>
          <RetryButton />
        </>
      ) : (
        <p className="text-stone-500" aria-live="polite">
          Opening your demo copy…
        </p>
      )}
      {/* Invisible bot check; a new one after each failed try (fresh token). */}
      {siteKey && <Turnstile key={state?.at ?? 0} siteKey={siteKey} action="demo" onToken={submitOnce} />}
    </form>
  );
}
