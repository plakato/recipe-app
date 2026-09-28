import { NextResponse } from "next/server";
import { isSameOrigin } from "@/lib/auth-forms";
import { cookies } from "next/headers";
import { destroySession, SESSION_COOKIE } from "@/lib/auth";

export async function POST(request: Request) {
  if (!isSameOrigin(request)) {
    return new NextResponse("Cross-site request refused.", { status: 403 });
  }
  const store = await cookies();
  await destroySession(store.get(SESSION_COOKIE)?.value);
  const res = NextResponse.redirect(new URL("/login", request.url), 303);
  res.cookies.set(SESSION_COOKIE, "", { path: "/", maxAge: 0 });
  return res;
}
