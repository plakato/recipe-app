"use client";

// Cloudflare Turnstile widget (see lib/turnstile.ts). Runs in the background
// while people use the page. Inside a <form> it adds the hidden
// "cf-turnstile-response" field itself; `onToken` also hands the token over
// (or null when it expires) so buttons can wait for it. The widget stays
// hidden unless Cloudflare needs the visitor to click it. Each token works once:
// after a failed submit, remount it (change its React `key`) for a fresh one.
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
  className,
}: {
  siteKey: string;
  action: "signup" | "demo";
  // Called with the token when it's ready, and with null when it expires.
  onToken?: (token: string | null) => void;
  className?: string;
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
          appearance: "interaction-only",
          // Tokens expire after a few minutes: get a new one quietly.
          "refresh-expired": "auto",
          callback: (token: string) => tokenReady.current?.(token),
          "expired-callback": () => tokenReady.current?.(null),
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

  return <div ref={box} className={className} />;
}
