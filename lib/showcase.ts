// Public browsing: visitors without an account see one account's recipes —
// the one marked isShowcase in the database (scripts/set-showcase.ts) —
// read-only. No account marked means off: visitors are sent to sign in.
// Server-only.
import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";

export const getShowcaseUserId = cache(async (): Promise<string | null> => {
  const user = await prisma.user.findFirst({ where: { isShowcase: true }, select: { id: true } });
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
