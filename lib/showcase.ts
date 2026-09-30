// Public browsing: visitors without an account see one account's recipes —
// the one named by SHOWCASE_EMAIL — read-only. Unset means off: visitors are
// sent to sign in, as before. Server-only.
import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { normalizeEmail } from "@/lib/password";

export const getShowcaseUserId = cache(async (): Promise<string | null> => {
  const email = normalizeEmail(process.env.SHOWCASE_EMAIL ?? "");
  if (!email) return null;
  const user = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  return user?.id ?? null;
});

// Whose recipes this visitor sees: their own when signed in, otherwise the
// showcase account's (read-only). Null: neither — they need to sign in.
export async function currentViewer(): Promise<{ userId: string; signedIn: boolean } | null> {
  const user = await getSessionUser();
  if (user) return { userId: user.id, signedIn: true };
  const showcase = await getShowcaseUserId();
  return showcase ? { userId: showcase, signedIn: false } : null;
}
