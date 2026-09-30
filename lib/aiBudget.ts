// Limits on AI use, so a busy day or an attack can't run up costs or hog the
// free models: daily import quotas (per account, per anonymous visitor, per
// IP address, for everyone together) and a monthly/daily budget for the paid
// model. Usage is recorded in the AiUsage table. Server-only.

import { prisma } from "@/lib/prisma";
import type { ErrorCode } from "@/lib/userErrors";

const num = (value: string | undefined, fallback: number) => {
  const n = Number(value);
  return value && Number.isFinite(n) && n >= 0 ? n : fallback;
};

// Defaults agreed 2026-09-30; each can be overridden in .env.
export const LIMITS = {
  importsPerAccount: num(process.env.AI_IMPORTS_PER_ACCOUNT_DAY, 10),
  importsPerVisitor: num(process.env.AI_IMPORTS_PER_VISITOR_DAY, 3),
  importsPerIp: num(process.env.AI_IMPORTS_PER_IP_DAY, 20),
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
  const row = await prisma.aiUsage.create({ data: { kind: "import", userId, ip } });
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
      .aggregate({ where: { kind: "paid", createdAt: { gte: since } }, _sum: { costUsd: true } })
      .then((r) => r._sum.costUsd ?? 0);
  const [month, day] = await Promise.all([spent(monthStart), spent(dayStart)]);
  return month < LIMITS.paidUsdPerMonth && day < LIMITS.paidUsdPerDay;
}

// Record what a paid-model call cost (OpenRouter reports it; 1 credit = $1).
export async function recordPaidCall(model: string, costUsd: number): Promise<void> {
  await prisma.aiUsage
    .create({ data: { kind: "paid", model, costUsd } })
    .catch((err) => console.warn("Could not record paid AI call:", err));
}
