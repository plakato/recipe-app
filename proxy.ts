// Optimistic auth gate: redirect visitors without a session cookie to /login
// before anything renders. This only checks that the cookie exists — the real
// verification against the database happens in lib/auth.ts (requireUser),
// which every page and Server Action calls. It must never redirect *away*
// from /login: an expired cookie would then bounce between / and /login
// forever. The login/signup pages send truly signed-in people home instead.
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth-constants";

const PUBLIC_PATHS = ["/login", "/signup", "/api/auth/login", "/api/auth/signup", "/robots.txt"];

// Pages visitors may open without an account when public browsing is on
// (SHOWCASE_EMAIL): the recipe list, a recipe, its photos, and the demo
// start page. The pages
// themselves decide what to show; everything else (adding, editing, Trash,
// imports) still needs an account.
function isBrowsable(pathname: string): boolean {
  if (!process.env.SHOWCASE_EMAIL) return false;
  return (
    pathname === "/" ||
    pathname === "/demo" ||
    (/^\/recipes\/[^/]+$/.test(pathname) && pathname !== "/recipes/new") ||
    pathname.startsWith("/uploads/")
  );
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSession = request.cookies.has(SESSION_COOKIE);
  const isPublic = PUBLIC_PATHS.includes(pathname) || isBrowsable(pathname);

  if (!hasSession && !isPublic) {
    const login = new URL("/login", request.url);
    if (pathname !== "/") login.searchParams.set("next", pathname);
    return NextResponse.redirect(login);
  }
  return NextResponse.next();
}

export const config = {
  // Everything except Next's own static assets and the favicon. Uploaded
  // recipe photos under /uploads are deliberately NOT excluded: they need a
  // session too.
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
