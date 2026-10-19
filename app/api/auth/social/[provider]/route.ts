// Off to Google/Facebook to sign in (lib/socialLogin.ts).
import { NextResponse, type NextRequest } from "next/server";
import { safeNext, siteUrl } from "@/lib/auth-forms";
import { FLOW_COOKIE, isProvider, startFlow } from "@/lib/socialLogin";

export async function GET(request: NextRequest, ctx: RouteContext<"/api/auth/social/[provider]">) {
  const { provider } = await ctx.params;
  const next = safeNext(request.nextUrl.searchParams.get("next"));
  const start = isProvider(provider) ? startFlow(provider, siteUrl(request, "/").origin, next) : null;
  if (!start) return NextResponse.redirect(siteUrl(request, "/login"), 303);
  const res = NextResponse.redirect(start.url, 303);
  res.cookies.set(FLOW_COOKIE, JSON.stringify(start.flow), {
    httpOnly: true,
    // lax: the cookie must come along when the provider sends people back.
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/api/auth/social",
    maxAge: 10 * 60,
  });
  return res;
}
