// The demo: visitors without an account browse the showcase recipes
// (lib/showcase.ts) read-only. When they first edit, delete or add, they get
// a temporary guest account holding their own copy of those recipes — so they
// can change anything without touching the original account. Guest accounts
// are deleted a day after last use; signing up keeps them. Server-only.

import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { GUEST_TTL_MS } from "@/lib/auth";
import { visibleRecipes } from "@/lib/features";
import { getShowcaseUserId } from "@/lib/showcase";
import type { ErrorCode } from "@/lib/userErrors";

const num = (value: string | undefined, fallback: number) => {
  const n = Number(value);
  return value && Number.isFinite(n) && n >= 0 ? n : fallback;
};

// New demo accounts per 24 hours: per IP address, and for everyone together.
const GUESTS_PER_IP = num(process.env.DEMO_GUESTS_PER_IP_DAY, 10);
const GUESTS_ALL = num(process.env.DEMO_GUESTS_ALL_DAY, 500);
const DAY_MS = 24 * 60 * 60 * 1000;

// Copy the showcase account's visible recipes to another account (a demo
// guest now; new accounts later). Photos are shared, not copied. Returns
// showcase recipe id → copy id.
export async function copyShowcaseRecipes(toUserId: string): Promise<Map<string, string>> {
  const showcase = await getShowcaseUserId();
  if (!showcase) return new Map();
  const originals = await prisma.recipe.findMany({
    where: { userId: showcase, deletedAt: null, ...visibleRecipes },
  });
  const copies = await prisma.recipe.createManyAndReturn({
    data: originals.map((r) => ({
      userId: toUserId,
      title: r.title,
      ingredients: r.ingredients,
      instructions: r.instructions,
      sourceType: r.sourceType,
      sourceUrl: r.sourceUrl,
      imagePath: r.imagePath,
      scanPaths: r.scanPaths,
      copiedFromId: r.id,
      createdAt: r.createdAt, // keep the same order as the original
    })),
    select: { id: true, copiedFromId: true },
  });
  return new Map(copies.map((c) => [c.copiedFromId!, c.id]));
}

// Create a guest account with its own copy of the showcase recipes. Returns
// its id and the recipe id map, or the limit that stops it.
export async function createGuest(
  ip: string | null,
): Promise<{ userId: string; copies: Map<string, string> } | { limit: ErrorCode }> {
  const since = new Date(Date.now() - DAY_MS);
  const recent = { kind: "guest", createdAt: { gte: since } };
  const [fromIp, everyone] = await Promise.all([
    ip ? prisma.aiUsage.count({ where: { ...recent, ip } }) : 0,
    prisma.aiUsage.count({ where: recent }),
  ]);
  if (everyone >= GUESTS_ALL || fromIp >= GUESTS_PER_IP) return { limit: "limit-demo" };

  const user = await prisma.user.create({
    data: {
      // Never used to sign in; .invalid is a reserved, never-real domain.
      email: `guest-${randomBytes(9).toString("hex")}@guest.invalid`,
      isGuest: true,
      guestExpiresAt: new Date(Date.now() + GUEST_TTL_MS),
    },
  });
  // Counted with the AI usage so the same per-IP/daily window applies.
  await prisma.aiUsage.create({ data: { kind: "guest", userId: user.id, ip } });
  return { userId: user.id, copies: await copyShowcaseRecipes(user.id) };
}

// Delete guest accounts with their recipes and sessions. Only ever guests:
// the isGuest condition is repeated in every delete. Their photos become
// unused and the uploads cleanup removes them later.
async function removeGuests(ids: string[]): Promise<number> {
  if (ids.length === 0) return 0;
  const guestIds = (
    await prisma.user.findMany({ where: { id: { in: ids }, isGuest: true }, select: { id: true } })
  ).map((u) => u.id);
  await prisma.$transaction([
    prisma.recipe.deleteMany({ where: { userId: { in: guestIds }, user: { isGuest: true } } }),
    prisma.session.deleteMany({ where: { userId: { in: guestIds }, user: { isGuest: true } } }),
    prisma.user.deleteMany({ where: { id: { in: guestIds }, isGuest: true } }),
  ]);
  return guestIds.length;
}

// Guest accounts past their expiry.
export async function removeExpiredGuests(): Promise<number> {
  const expired = await prisma.user.findMany({
    where: { isGuest: true, guestExpiresAt: { lt: new Date() } },
    select: { id: true },
  });
  return removeGuests(expired.map((u) => u.id));
}

// A visitor leaving the demo: their copy goes right away.
export function removeGuest(id: string): Promise<number> {
  return removeGuests([id]);
}
