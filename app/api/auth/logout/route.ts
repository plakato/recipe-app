import { NextResponse } from "next/server";
import { isSameOrigin, siteUrl } from "@/lib/auth-forms";
import { cookies } from "next/headers";
import { destroySession, getSessionUser, SESSION_COOKIE } from "@/lib/auth";
import { removeGuest } from "@/lib/demo";

export async function POST(request: Request) {
  if (!isSameOrigin(request)) {
    return new NextResponse("Cross-site request refused.", { status: 403 });
  }
  const store = await cookies();
  // Leaving the demo deletes the visitor's temporary copy straight away.
  const user = await getSessionUser();
  if (user?.isGuest) await removeGuest(user.id);
  else await destroySession(store.get(SESSION_COOKIE)?.value);
  // With public browsing on, everyone lands back on the recipes.
  const home = process.env.SHOWCASE_EMAIL ? "/" : "/login";
  const res = NextResponse.redirect(siteUrl(request, home), 303);
  res.cookies.set(SESSION_COOKIE, "", { path: "/", maxAge: 0 });
  return res;
}
