import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createSession } from "@/lib/auth";
import { normalizeEmail, verifyPassword } from "@/lib/password";
import { clearFailures, isLocked, recordFailure, redirectWithError, safeNext } from "@/lib/auth-forms";

export async function POST(request: Request) {
  const form = await request.formData();
  const email = normalizeEmail(String(form.get("email") ?? ""));
  const password = String(form.get("password") ?? "");
  const next = safeNext(String(form.get("next") ?? ""));

  if (!email || !password) {
    return redirectWithError(request, "/login", "missing", { next });
  }
  if (isLocked(email)) {
    return redirectWithError(request, "/login", "locked", { next });
  }

  const user = await prisma.user.findUnique({ where: { email } });
  // Always run the hash check (even for unknown emails) so timing doesn't
  // reveal which addresses exist.
  const ok = await verifyPassword(password, user?.password ?? "scrypt$32768$AAAA$AAAA");
  if (!user || !user.password || !ok) {
    recordFailure(email);
    return redirectWithError(request, "/login", "invalid", { next });
  }

  clearFailures(email);
  const cookie = await createSession(user.id);
  const res = NextResponse.redirect(new URL(next, request.url), 303);
  res.cookies.set(cookie.name, cookie.value, cookie.options);
  return res;
}
