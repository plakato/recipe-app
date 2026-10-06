// Cloudflare Turnstile: an invisible "is this a real browser?" check on the
// forms that create something — sign-up and starting a demo. The page gets a
// one-time token from Cloudflare; the server confirms it here before acting.
// On when TURNSTILE_SITE_KEY and TURNSTILE_SECRET_KEY are both set (.env);
// otherwise the forms work without it. Server-only.

const SITEVERIFY = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export type TurnstileAction = "signup" | "demo";

// The public key the page needs, or null when Turnstile is off.
export function turnstileSiteKey(): string | null {
  return process.env.TURNSTILE_SITE_KEY && process.env.TURNSTILE_SECRET_KEY
    ? process.env.TURNSTILE_SITE_KEY
    : null;
}

type SiteverifyResponse = {
  success: boolean;
  action?: string;
  hostname?: string;
  "error-codes"?: string[];
};

// Accept a verified token only if it passed, was made for this form, and was
// made on this website (so a token from elsewhere — or localhost on the live
// site — is refused).
export function turnstileVerdict(
  res: SiteverifyResponse,
  action: TurnstileAction,
  allowedHosts: string[],
): boolean {
  return (
    res.success === true &&
    res.action === action &&
    !!res.hostname &&
    allowedHosts.includes(res.hostname.toLowerCase())
  );
}

// Cloudflare's documented test secrets ("1x000…AA" always passes, "2x…" fails, "3x…" spent).
export const isTestSecret = (secret: string) => /^[123]x0{30,}AA$/.test(secret);

// Hosts a token may come from: TURNSTILE_HOSTNAMES (comma-separated), or else
// the host this request was made to.
function allowedHosts(requestHost: string | null): string[] {
  const configured = process.env.TURNSTILE_HOSTNAMES?.split(",").map((h) => h.trim().toLowerCase());
  if (configured?.length && configured[0]) return configured;
  return requestHost ? [requestHost.toLowerCase().replace(/:\d+$/, "")] : [];
}

// Confirm a token with Cloudflare. True when Turnstile is off. Fails closed:
// if Cloudflare can't be reached, the answer is no (the form asks to retry).
export async function verifyTurnstile(
  token: FormDataEntryValue | null,
  action: TurnstileAction,
  { ip, host }: { ip: string | null; host: string | null },
): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!turnstileSiteKey() || !secret) return true;
  if (typeof token !== "string" || !token || token.length > 2048) return false;
  try {
    const body = new URLSearchParams({ secret, response: token });
    if (ip) body.set("remoteip", ip);
    const res = await fetch(SITEVERIFY, { method: "POST", body, signal: AbortSignal.timeout(10_000) });
    const data = (await res.json()) as SiteverifyResponse;
    // Cloudflare's public test secrets (development) answer without an
    // action and with hostname "example.com": only success means anything.
    const ok = isTestSecret(secret) ? data.success === true : turnstileVerdict(data, action, allowedHosts(host));
    if (!ok) console.warn(`Turnstile refused (${action}):`, data["error-codes"] ?? [], data.action, data.hostname);
    return ok;
  } catch (err) {
    console.warn("Turnstile check failed:", err);
    return false;
  }
}
