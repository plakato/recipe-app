"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { startDemo, type DemoState } from "@/app/demo/actions";

function StartButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-olive-600 px-5 py-2.5 font-medium text-white transition hover:bg-olive-700 disabled:opacity-60"
    >
      {pending ? "Getting your copy ready…" : "Try it"}
    </button>
  );
}

export default function DemoStart({ next }: { next: string }) {
  const [state, action] = useActionState<DemoState, FormData>(startDemo, null);
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="next" value={next} />
      {state?.error && (
        <p className="rounded-lg border border-brick-200 bg-brick-50 px-4 py-3 text-sm text-brick-700 dark:border-brick-900/50 dark:bg-brick-950/30 dark:text-brick-300">
          {state.error}
        </p>
      )}
      <StartButton />
    </form>
  );
}
