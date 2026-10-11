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

// Pages visitors may open without an account: the recipe list, a recipe and
// its photos, editing a recipe and adding one from a photo (their demo starts
// at their first change — lib/demoSession.ts). The pages themselves decide
// what to show; with no showcase account (lib/showcase.ts) they send visitors
// to sign in. Trash and link import still need an account.
function isBrowsable(pathname: string): boolean {
  return (
    pathname === "/" ||
    /^\/recipes\/[^/]+(\/edit)?$/.test(pathname) ||
    pathname === "/recipes/import/photo" ||
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
  // Everything except Next's own static assets and the tab icons. Uploaded
  // recipe photos under /uploads are deliberately NOT excluded: they need a
  // session too.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg|apple-icon.png).*)"],
};
