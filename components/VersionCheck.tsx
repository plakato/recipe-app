"use client";

import { useEffect } from "react";

// A page left open from before a deploy (the home-screen app keeps pages for
// days) would call the new server the old way — a photo reading then looked
// like it did nothing. When the app comes back to the front, it checks the
// server's version (app/api/version) and reloads if it's newer.
export default function VersionCheck() {
  useEffect(() => {
    const check = async () => {
      if (document.visibilityState !== "visible") return;
      try {
        const res = await fetch("/api/version", { cache: "no-store" });
        const { version } = await res.json();
        if (version && version !== process.env.APP_VERSION) location.reload();
      } catch {}
    };
    document.addEventListener("visibilitychange", check);
    window.addEventListener("pageshow", check);
    return () => {
      document.removeEventListener("visibilitychange", check);
      window.removeEventListener("pageshow", check);
    };
  }, []);
  return null;
}
