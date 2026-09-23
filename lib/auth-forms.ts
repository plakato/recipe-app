// Helpers shared by the auth Route Handlers (plain HTML form posts, so login
// works without JavaScript and is easy to test with curl).
import { NextResponse } from "next/server";

// Only allow same-site relative paths as post-login destinations.
export function safeNext(value: string | null | undefined): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/";
  return value;
}

export function redirectWithError(request: Request, page: string, error: string, extra: Record<string, string> = {}) {
  const url = new URL(page, request.url);
  url.searchParams.set("error", error);
  for (const [k, v] of Object.entries(extra)) if (v) url.searchParams.set(k, v);
  return NextResponse.redirect(url, 303);
}

// Tiny in-memory throttle: after 5 failed attempts for an email, block for a
// minute. Good enough for a family app behind one server process.
const failures = new Map<string, { count: number; until: number }>();
const MAX_FAILURES = 5;
const LOCK_MS = 60_000;

export function isLocked(key: string): boolean {
  const f = failures.get(key);
  if (!f) return false;
  if (f.until && f.until > Date.now()) return true;
  if (f.until && f.until <= Date.now()) failures.delete(key);
  return false;
}

export function recordFailure(key: string) {
  const f = failures.get(key) ?? { count: 0, until: 0 };
  f.count += 1;
  if (f.count >= MAX_FAILURES) {
    f.until = Date.now() + LOCK_MS;
    f.count = 0;
  }
  failures.set(key, f);
}

export function clearFailures(key: string) {
  failures.delete(key);
}
