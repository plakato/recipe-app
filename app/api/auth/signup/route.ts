import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createSession, getSessionUser } from "@/lib/auth";
import { hashPassword, isValidEmail, MIN_PASSWORD_LENGTH, normalizeEmail } from "@/lib/password";
import { redirectWithError, isSameOrigin, siteUrl } from "@/lib/auth-forms";
import { verifyTurnstile } from "@/lib/turnstile";
import { canSignUp, recordSignup } from "@/lib/signupLimits";
import { copyShowcaseRecipes } from "@/lib/demo";
import { clientIp, requestHost } from "@/lib/clientIp";

// The placeholder owner that held every recipe before accounts existed. The
// first real account adopts it (and therefore all existing recipes).
const LEGACY_OWNER_EMAIL = "owner@local";

export async function POST(request: Request) {
  if (!isSameOrigin(request)) {
    return new NextResponse("Cross-site request refused.", { status: 403 });
  }
  const form = await request.formData();
  // Invisible bot check first, before any other work (lib/turnstile.ts).
  const human = await verifyTurnstile(form.get("cf-turnstile-response"), "signup", {
    ip: await clientIp(),
    host: await requestHost(),
  });
  if (!human) return redirectWithError(request, "/signup", "bot");
  // Bot trap: a field people never see (hidden on the page), so only bots
  // fill it in.
  if (String(form.get("website") ?? "").trim()) {
    return redirectWithError(request, "/signup", "bot");
  }
  // Sign-up is open to everyone, with a daily limit per network and overall.
  const ip = await clientIp();
  if (!(await canSignUp(ip))) return redirectWithError(request, "/signup", "limit");
  const email = normalizeEmail(String(form.get("email") ?? ""));
  const name = String(form.get("name") ?? "").trim().slice(0, 80);
  const password = String(form.get("password") ?? "");
  const confirm = String(form.get("confirm") ?? "");

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
  // Signing up from the demo turns the guest account into this account, so
  // the visitor keeps everything they changed.
  const current = await getSessionUser();
  const guest = current?.isGuest ? current : null;
  const user = guest
    ? await prisma.user.update({
        where: { id: guest.id },
        data: { email, name: name || null, password: hashed, isGuest: false, guestExpiresAt: null },
      })
    : legacy && !legacy.password
      ? await prisma.user.update({
          where: { id: legacy.id },
          data: { email, name: name || null, password: hashed },
        })
      : await prisma.user.create({
          data: { email, name: name || null, password: hashed },
        });

  // A brand-new account starts with its own copy of the showcase recipes
  // (edit or delete them freely). A demo visitor keeps their demo copy; the
  // legacy owner already has the recipes.
  if (!guest && user.id !== legacy?.id) await copyShowcaseRecipes(user.id);
  await recordSignup(user.id, ip);

  const cookie = await createSession(user.id);
  const res = NextResponse.redirect(siteUrl(request, "/"), 303);
  res.cookies.set(cookie.name, cookie.value, cookie.options);
  return res;
}
