"use client";

// Cloudflare Turnstile widget (see lib/turnstile.ts). Put it inside a <form>:
// it adds the hidden "cf-turnstile-response" field with a one-time token.
// Invisible for people. Each token works once: after a failed submit, remount
// it (change its React `key`) to get a fresh one.
import { useEffect, useRef } from "react";

type TurnstileApi = {
  render: (el: HTMLElement, opts: Record<string, unknown>) => string;
  remove: (id: string) => void;
};
declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

const SCRIPT = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
let loading: Promise<TurnstileApi> | null = null;

// Load Cloudflare's script once per page.
function loadTurnstile(): Promise<TurnstileApi> {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  loading ??= new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = SCRIPT;
    s.async = true;
    s.onload = () => (window.turnstile ? resolve(window.turnstile) : reject(new Error("Turnstile missing")));
    s.onerror = () => {
      loading = null;
      reject(new Error("Could not load Turnstile"));
    };
    document.head.appendChild(s);
  });
  return loading;
}

export default function Turnstile({
  siteKey,
  action,
  onToken,
}: {
  siteKey: string;
  action: "signup" | "demo";
  // Called when a token is ready (e.g. to submit the form automatically).
  onToken?: () => void;
}) {
  const box = useRef<HTMLDivElement>(null);
  const widget = useRef<string | null>(null);
  const tokenReady = useRef(onToken);
  useEffect(() => {
    tokenReady.current = onToken;
  });

  useEffect(() => {
    let cancelled = false;
    loadTurnstile()
      .then((t) => {
        if (cancelled || !box.current) return;
        widget.current = t.render(box.current, {
          sitekey: siteKey,
          action,
          // Tokens expire after a few minutes: get a new one quietly.
          "refresh-expired": "auto",
          callback: () => tokenReady.current?.(),
        });
      })
      .catch(() => {
        // Without the script the server refuses the form and asks to retry.
      });
    return () => {
      cancelled = true;
      if (widget.current) window.turnstile?.remove(widget.current);
      widget.current = null;
    };
  }, [siteKey, action]);

  return <div ref={box} />;
}
