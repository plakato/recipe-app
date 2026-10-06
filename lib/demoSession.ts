// "Who is making this change?" for Server Actions. A signed-in person is
// themselves. A visitor browsing the showcase gets their demo started right
// here, at their first change: the invisible bot check that ran in the
// background on the page is verified, a temporary guest account with copies
// of the recipes is created (lib/demo.ts) and signed in. Server-only.
import { cookies } from "next/headers";
import type { User } from "@prisma/client";
import { createSession, getSessionUser } from "@/lib/auth";
import { clientIp, requestHost } from "@/lib/clientIp";
import { createGuest } from "@/lib/demo";
import { prisma } from "@/lib/prisma";
import { getShowcaseUserId } from "@/lib/showcase";
import { verifyTurnstile } from "@/lib/turnstile";
import { USER_MESSAGES } from "@/lib/userErrors";

export const BOT_CHECK_FAILED =
  "Nepodarilo sa overiť, že ste človek (automatická kontrola neprešla). Skúste to prosím znova.";

export type ChangeUser =
  // copies: showcase recipe id → this visitor's copy (only when just created).
  | { user: User; copies?: Map<string, string> }
  | { error: string }
  | null; // nobody signed in and no public browsing: they need to sign in

export async function userForChange(formData: FormData): Promise<ChangeUser> {
  const user = await getSessionUser();
  if (user) return { user };
  if (!(await getShowcaseUserId())) return null;

  const ip = await clientIp();
  const human = await verifyTurnstile(formData.get("cf-turnstile-response"), "demo", {
    ip,
    host: await requestHost(),
  });
  if (!human) return { error: BOT_CHECK_FAILED };

  const guest = await createGuest(ip);
  if ("limit" in guest) return { error: USER_MESSAGES[guest.limit] };
  // Short-lived session: the guest account itself expires a day after last use.
  const cookie = await createSession(guest.userId, 2);
  (await cookies()).set(cookie.name, cookie.value, cookie.options);
  const created = await prisma.user.findUniqueOrThrow({ where: { id: guest.userId } });
  return { user: created, copies: guest.copies };
}
