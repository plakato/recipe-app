// Creating an account, for both sign-up with a password (app/api/auth/signup)
// and the first sign-in with Google or Facebook (lib/socialLogin.ts). The
// caller checks the sign-up limits first. Server-only.
import type { User } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { copyShowcaseRecipes } from "@/lib/demo";
import { recordSignup } from "@/lib/signupLimits";

// The placeholder owner that held every recipe before accounts existed. The
// first real account adopts it (and therefore all existing recipes).
const LEGACY_OWNER_EMAIL = "owner@local";

export async function createAccount(
  p: { email: string; name: string | null; password: string | null },
  current: User | null,
  ip: string | null,
): Promise<User> {
  const data = { email: p.email, name: p.name || null, password: p.password };
  const legacy = await prisma.user.findUnique({ where: { email: LEGACY_OWNER_EMAIL } });
  // Signing up from the demo turns the guest account into this account, so
  // the visitor keeps everything they changed.
  const guest = current?.isGuest ? current : null;
  const user = guest
    ? await prisma.user.update({
        where: { id: guest.id },
        data: { ...data, isGuest: false, guestExpiresAt: null },
      })
    : legacy && !legacy.password
      ? await prisma.user.update({ where: { id: legacy.id }, data })
      : await prisma.user.create({ data });

  // A brand-new account starts with its own copy of the showcase recipes
  // (edit or delete them freely). A demo visitor keeps their demo copy; the
  // legacy owner already has the recipes.
  if (!guest && user.id !== legacy?.id) await copyShowcaseRecipes(user.id);
  await recordSignup(user.id, ip);
  return user;
}
