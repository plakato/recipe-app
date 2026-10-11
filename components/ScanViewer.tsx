"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { PhotoIcon } from "@/components/Icons";

// The photos a recipe was read from, behind one button: rarely needed, only to
// check the text against the page. Opens full screen; arrows (or ← →) page
// through them, Esc or ✕ closes. Drawn over the whole page (a portal), not
// inside the hero.
export default function ScanViewer({
  scans,
  className,
}: {
  scans: string[];
  className: string;
}) {
  const [open, setOpen] = useState<number | null>(null);
  const count = scans.length;
  const label = count > 1 ? `Pôvodné fotky (${count})` : "Pôvodná fotka";

  useEffect(() => {
    if (open === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(null);
      if (e.key === "ArrowRight")
        setOpen((i) => (i === null ? i : (i + 1) % count));
      if (e.key === "ArrowLeft")
        setOpen((i) => (i === null ? i : (i - 1 + count) % count));
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, count]);

  const navBtn =
    "rounded-full bg-white/15 p-2 text-white transition hover:bg-white/30";
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(0)}
        title={label}
        aria-label={label}
        className={className}
      >
        <PhotoIcon />
      </button>
      {open !== null &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-label={label}
            onClick={() => setOpen(null)}
            className="fixed inset-0 z-[100] flex flex-col bg-black/95"
          >
            <div className="flex items-center justify-between p-3 text-sm text-white/80">
              <span>
                {count > 1
                  ? `Pôvodná fotka ${open + 1} z ${count}`
                  : "Pôvodná fotka"}
              </span>
              <div
                className="flex items-center gap-2"
                onClick={(e) => e.stopPropagation()}
              >
                <a
                  href={scans[open]}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded px-2 py-1 hover:bg-white/15"
                >
                  Otvoriť
                </a>
                <button
                  type="button"
                  onClick={() => setOpen(null)}
                  aria-label="Zavrieť"
                  className={navBtn}
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            <div className="relative flex min-h-0 flex-1 items-center justify-center px-2 pb-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={scans[open]}
                alt={`Pôvodná fotka ${open + 1}`}
                onClick={(e) => e.stopPropagation()}
                className="max-h-full max-w-full object-contain"
              />
              {count > 1 && (
                <>
                  <button
                    type="button"
                    aria-label="Predchádzajúca"
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpen((open - 1 + count) % count);
                    }}
                    className={`absolute left-3 ${navBtn}`}
                  >
                    <ChevronLeft className="h-6 w-6" />
                  </button>
                  <button
                    type="button"
                    aria-label="Ďalšia"
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpen((open + 1) % count);
                    }}
                    className={`absolute right-3 ${navBtn}`}
                  >
                    <ChevronRight className="h-6 w-6" />
                  </button>
                </>
              )}
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
