"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { createSession, getSessionUser } from "@/lib/auth";
import { clientIp } from "@/lib/clientIp";
import { createGuest, demoTarget, safeNext } from "@/lib/demo";
import { runHousekeeping } from "@/lib/housekeeping";
import { getShowcaseUserId } from "@/lib/showcase";
import { USER_MESSAGES } from "@/lib/userErrors";

export type DemoState = { error: string } | null;

// Start the demo: a temporary guest account with its own copy of the
// showcase recipes, signed in by cookie, then on to what the visitor wanted
// to do (their copy of the recipe they were looking at).
export async function startDemo(_prev: DemoState, formData: FormData): Promise<DemoState> {
  const next = safeNext(String(formData.get("next") ?? ""));
  if (await getSessionUser()) redirect(next); // already signed in or in a demo
  if (!(await getShowcaseUserId())) redirect("/login"); // demo not set up

  after(runHousekeeping);
  const guest = await createGuest(await clientIp());
  if ("limit" in guest) return { error: USER_MESSAGES[guest.limit] };

  // Short-lived session: the guest account itself expires a day after last use.
  const cookie = await createSession(guest.userId, 2);
  (await cookies()).set(cookie.name, cookie.value, cookie.options);
  redirect(demoTarget(next, guest.copies));
}
