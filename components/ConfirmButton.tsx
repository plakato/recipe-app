"use client";

import { useRef, useState } from "react";
import { createPortal } from "react-dom";

// A submit button that asks first ("Zmazať tento recept?") — for deleting, so
// a misclick doesn't delete anything. The question shows in a small dialog in
// the app's own style (on top of everything, hence the portal); "Zmazať"
// then submits the button's form.
export default function ConfirmButton({
  confirm,
  confirmLabel = "Zmazať",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { confirm: string; confirmLabel?: string }) {
  const button = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  return (
    <>
      <button ref={button} type="button" {...props} onClick={() => setOpen(true)} />
      {open &&
        createPortal(
          <div
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
            onClick={() => setOpen(false)}
          >
            <div
              role="alertdialog"
              aria-modal="true"
              aria-label={confirm}
              className="w-full max-w-sm rounded-2xl bg-white p-5 text-stone-900 shadow-xl dark:bg-stone-900 dark:text-stone-100"
              onClick={(e) => e.stopPropagation()}
            >
              <p className="text-base">{confirm}</p>
              <div className="mt-5 flex justify-end gap-2">
                <button
                  type="button"
                  autoFocus
                  onClick={() => setOpen(false)}
                  className="rounded-lg px-4 py-2 font-medium text-stone-700 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-800"
                >
                  Zrušiť
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    button.current?.form?.requestSubmit();
                  }}
                  className="rounded-lg bg-brick-600 px-4 py-2 font-medium text-white hover:bg-brick-700"
                >
                  {confirmLabel}
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
