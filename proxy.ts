// Optimistic auth gate: redirect visitors without a session cookie to /login
// before anything renders. This only checks that the cookie exists — the real
// verification against the database happens in lib/auth.ts (requireUser),
// which every page and Server Action calls.
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth-constants";

const PUBLIC_PATHS = ["/login", "/signup", "/api/auth/login", "/api/auth/signup"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSession = request.cookies.has(SESSION_COOKIE);
  const isPublic = PUBLIC_PATHS.includes(pathname);

  if (!hasSession && !isPublic) {
    const login = new URL("/login", request.url);
    if (pathname !== "/") login.searchParams.set("next", pathname);
    return NextResponse.redirect(login);
  }
  if (hasSession && (pathname === "/login" || pathname === "/signup")) {
    return NextResponse.redirect(new URL("/", request.url));
  }
  return NextResponse.next();
}

export const config = {
  // Everything except Next's own static assets and the favicon. Uploaded
  // recipe photos under /uploads are deliberately NOT excluded: they need a
  // session too.
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
