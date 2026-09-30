"use client";

// Avatar button in the header that opens a small menu with Trash and
// Sign out, so those don't need their own (easily misread) icons.
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { LogoutIcon, TrashIcon } from "@/components/Icons";

const item =
  "flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-stone-700 transition hover:bg-sage-50 hover:text-sage-800 dark:text-stone-200 dark:hover:bg-stone-800 dark:hover:text-sage-300";

export default function UserMenu({ email }: { email: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Account menu"
        title={email}
        className="font-display flex h-10 w-10 items-center justify-center rounded-full bg-sage-200 text-lg font-semibold text-sage-900 ring-2 ring-white transition hover:scale-105 hover:bg-sage-300 dark:bg-sage-900/60 dark:text-sage-100 dark:ring-stone-900"
      >
        {email.charAt(0).toUpperCase()}
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-60 origin-top-right rounded-2xl bg-white p-2 shadow-xl ring-1 ring-black/5 dark:bg-stone-900 dark:ring-white/10"
        >
          <p className="truncate px-3 pb-2 pt-1 text-xs text-stone-500 dark:text-stone-400">{email}</p>
          <Link href="/trash" role="menuitem" className={item} onClick={() => setOpen(false)}>
            <TrashIcon className="h-4 w-4" /> Trash
          </Link>
          <form method="post" action="/api/auth/logout">
            <button type="submit" role="menuitem" className={item}>
              <LogoutIcon className="h-4 w-4" /> Sign out
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
