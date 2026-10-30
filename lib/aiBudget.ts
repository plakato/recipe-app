// Limits on AI use, so a busy day or an attack can't run up costs or hog the
// free models: daily import quotas (per account, per anonymous visitor, per
// IP address, for everyone together) and a monthly/daily budget for the paid
// model. Usage is recorded in the AiUsage table. Server-only.

import { prisma } from "@/lib/prisma";
import { clientIp } from "@/lib/clientIp";
import { USER_MESSAGES, type ErrorCode } from "@/lib/userErrors";
import { currentUsage } from "@/lib/usageContext";

const num = (value: string | undefined, fallback: number) => {
  const n = Number(value);
  return value && Number.isFinite(n) && n >= 0 ? n : fallback;
};

// Defaults agreed 2026-09-30 (30 per account and 40 per IP since 2026-10-30,
// for adding many recipes in one go); each can be overridden in .env.
export const LIMITS = {
  importsPerAccount: num(process.env.AI_IMPORTS_PER_ACCOUNT_DAY, 30),
  importsPerVisitor: num(process.env.AI_IMPORTS_PER_VISITOR_DAY, 3),
  // Above one account's limit: a household shares an IP.
  importsPerIp: num(process.env.AI_IMPORTS_PER_IP_DAY, 40),
  importsForEveryone: num(process.env.AI_IMPORTS_ALL_DAY, 200),
  paidUsdPerMonth: num(process.env.AI_PAID_USD_PER_MONTH, 5),
  // At most a tenth of the month's budget in one day.
  paidUsdPerDay: num(process.env.AI_PAID_USD_PER_DAY, 0.5),
};

const DAY_MS = 24 * 60 * 60 * 1000;

export type ImportCounts = { account: number; ip: number; everyone: number };

// Which limit, if any, a new import would exceed. Quotas cover the last 24
// hours. `anonymous` visitors get the smaller per-visitor quota.
export function importLimitHit(
  counts: ImportCounts,
  anonymous: boolean,
  limits = LIMITS,
): ErrorCode | null {
  if (counts.everyone >= limits.importsForEveryone) return "limit-everyone";
  if (anonymous && counts.account >= limits.importsPerVisitor) return "limit-visitor";
  if (!anonymous && counts.account >= limits.importsPerAccount) return "limit-account";
  if (counts.ip >= limits.importsPerIp) return "limit-ip";
  return null;
}

// Reserve one import for this person. Returns the reservation id, or the
// limit that stops it. `userId` is the account (or temporary visitor account).
export async function startImport({
  userId,
  ip,
  anonymous = false,
}: {
  userId: string;
  ip: string | null;
  anonymous?: boolean;
}): Promise<{ id: string } | { limit: ErrorCode }> {
  const since = new Date(Date.now() - DAY_MS);
  const recent = { kind: "import", createdAt: { gte: since } };
  const [account, ipCount, everyone] = await Promise.all([
    prisma.aiUsage.count({ where: { ...recent, userId } }),
    ip ? prisma.aiUsage.count({ where: { ...recent, ip } }) : 0,
    prisma.aiUsage.count({ where: recent }),
  ]);
  const limit = importLimitHit({ account, ip: ipCount, everyone }, anonymous);
  if (limit) return { limit };
  const row = await prisma.aiUsage.create({
    data: { kind: "import", userId, ip, isGuest: anonymous },
  });
  return { id: row.id };
}

// Give an import back (e.g. it failed only because the models were busy).
export async function refundImport(id: string): Promise<void> {
  await prisma.aiUsage.delete({ where: { id } }).catch(() => {});
}

// Is there budget left for a paid-model call (this calendar month and today)?
export async function paidBudgetLeft(): Promise<boolean> {
  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const dayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const spent = (since: Date) =>
    prisma.aiUsage
      .aggregate({
        // Every model call records its cost (free ones 0); "paid" rows are
        // from before every call was recorded.
        where: { kind: { in: ["call", "paid"] }, createdAt: { gte: since } },
        _sum: { costUsd: true },
      })
      .then((r) => r._sum.costUsd ?? 0);
  const [month, day] = await Promise.all([spent(monthStart), spent(dayStart)]);
  return month < LIMITS.paidUsdPerMonth && day < LIMITS.paidUsdPerDay;
}

// Record one AI model call: tokens and cost (OpenRouter reports the cost in
// credits, 1 credit = $1; free models cost 0), plus who it was for and why
// (lib/usageContext.ts). Feeds the paid budget and the daily statistics.
export async function recordModelCall(call: {
  model: string;
  costUsd: number;
  promptTokens: number;
  completionTokens: number;
}): Promise<void> {
  const ctx = currentUsage();
  await prisma.aiUsage
    .create({
      data: {
        kind: "call",
        ...call,
        purpose: ctx.purpose,
        userId: ctx.userId,
        isGuest: ctx.isGuest ?? false,
      },
    })
    .catch((err) => console.warn("Could not record AI call:", err));
}

// Reserve one AI import for the person (Server Actions, app/api/photos)
// against the daily limits. Returns the reservation or a message to show.
export async function reserveImport(
  user: { id: string; isGuest: boolean },
): Promise<{ id: string; userId: string; isGuest: boolean } | { error: string }> {
  // Demo guests get the smaller per-visitor allowance.
  const slot = await startImport({ userId: user.id, ip: await clientIp(), anonymous: user.isGuest });
  if ("limit" in slot) return { error: USER_MESSAGES[slot.limit] };
  return { id: slot.id, userId: user.id, isGuest: user.isGuest };
}
