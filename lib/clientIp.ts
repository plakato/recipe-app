// The visitor's IP address, for per-IP limits. In production the app sits
// behind a Cloudflare Tunnel and only listens on localhost, so Cloudflare's
// header is trustworthy; the others cover local development. Server-only.
import { headers } from "next/headers";

// The host the visitor used (e.g. recepty.brezinovi.sk), without the port.
export async function requestHost(): Promise<string | null> {
  const h = await headers();
  return (h.get("x-forwarded-host") ?? h.get("host"))?.split(",")[0]?.trim() ?? null;
}

export async function clientIp(): Promise<string | null> {
  const h = await headers();
  return (
    h.get("cf-connecting-ip") ??
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    h.get("x-real-ip") ??
    null
  );
}
