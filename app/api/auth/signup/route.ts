import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createSession } from "@/lib/auth";
import { hashPassword, isValidEmail, MIN_PASSWORD_LENGTH, normalizeEmail } from "@/lib/password";
import { redirectWithError } from "@/lib/auth-forms";

// The placeholder owner that held every recipe before accounts existed. The
// first real account adopts it (and therefore all existing recipes).
const LEGACY_OWNER_EMAIL = "owner@local";

export async function POST(request: Request) {
  const form = await request.formData();
  const email = normalizeEmail(String(form.get("email") ?? ""));
  const name = String(form.get("name") ?? "").trim().slice(0, 80);
  const password = String(form.get("password") ?? "");
  const confirm = String(form.get("confirm") ?? "");
  const invite = String(form.get("invite") ?? "").trim();

  const expectedInvite = process.env.INVITE_CODE;
  if (!expectedInvite) {
    return redirectWithError(request, "/signup", "closed");
  }
  if (invite !== expectedInvite) {
    return redirectWithError(request, "/signup", "invite");
  }
  if (!isValidEmail(email)) {
    return redirectWithError(request, "/signup", "email");
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    return redirectWithError(request, "/signup", "short");
  }
  if (password !== confirm) {
    return redirectWithError(request, "/signup", "mismatch");
  }
  if (await prisma.user.findUnique({ where: { email } })) {
    return redirectWithError(request, "/signup", "exists");
  }

  const hashed = await hashPassword(password);
  const legacy = await prisma.user.findUnique({ where: { email: LEGACY_OWNER_EMAIL } });
  const user =
    legacy && !legacy.password
      ? await prisma.user.update({
          where: { id: legacy.id },
          data: { email, name: name || null, password: hashed },
        })
      : await prisma.user.create({
          data: { email, name: name || null, password: hashed },
        });

  const cookie = await createSession(user.id);
  const res = NextResponse.redirect(new URL("/", request.url), 303);
  res.cookies.set(cookie.name, cookie.value, cookie.options);
  return res;
}
