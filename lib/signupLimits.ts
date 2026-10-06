// Limits on creating accounts, now that sign-up is open to everyone: per IP
// address and for everyone together, over the last 24 hours. Each new account
// is recorded as an AiUsage row of kind "signup" (with the IP), which also
// feeds the daily statistics. Server-only.
import { prisma } from "@/lib/prisma";

const num = (value: string | undefined, fallback: number) => {
  const n = Number(value);
  return value && Number.isFinite(n) && n >= 0 ? n : fallback;
};

export const SIGNUP_LIMITS = {
  perIp: num(process.env.SIGNUPS_PER_IP_DAY, 5),
  everyone: num(process.env.SIGNUPS_ALL_DAY, 100),
};

const DAY_MS = 24 * 60 * 60 * 1000;

// Would one more account go over a limit?
export function signupLimitHit(
  counts: { ip: number; everyone: number },
  limits = SIGNUP_LIMITS,
): boolean {
  return counts.everyone >= limits.everyone || counts.ip >= limits.perIp;
}

export async function canSignUp(ip: string | null): Promise<boolean> {
  const recent = { kind: "signup", createdAt: { gte: new Date(Date.now() - DAY_MS) } };
  const [fromIp, everyone] = await Promise.all([
    ip ? prisma.aiUsage.count({ where: { ...recent, ip } }) : 0,
    prisma.aiUsage.count({ where: recent }),
  ]);
  return !signupLimitHit({ ip: fromIp, everyone });
}

export async function recordSignup(userId: string, ip: string | null): Promise<void> {
  await prisma.aiUsage.create({ data: { kind: "signup", userId, ip } }).catch(() => {});
}
