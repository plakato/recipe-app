// Daily usage statistics: imports, recipe activity, demos, and AI tokens and
// cost per model — from the AiUsage and Activity tables. Days follow the
// STATS_TIME_ZONE (default Europe/Bratislava). Server-only (the loader).
import { prisma } from "@/lib/prisma";

export const ACTIVITY_KINDS = ["created", "edited", "deleted", "restored", "erased"] as const;
export type ActivityKind = (typeof ACTIVITY_KINDS)[number];

type Split = { accounts: number; demo: number };
export type ModelStats = {
  model: string;
  calls: number;
  promptTokens: number;
  completionTokens: number;
  costUsd: number;
};
// AI calls per purpose (lib/usageContext.ts): reading a recipe, finding its
// dish photo, describing or drawing a dish. "scripts": calls made without an
// account (test and maintenance scripts), already counted in their purpose.
export type PurposeStats = {
  purpose: string;
  calls: number;
  scriptCalls: number;
  costUsd: number;
};
export type DayStats = {
  day: string; // YYYY-MM-DD in the stats time zone
  imports: Split;
  demosStarted: number;
  signups: number;
  activity: Record<ActivityKind, Split>;
  models: ModelStats[]; // most expensive first, then most used
  purposes: PurposeStats[]; // most used first
  calls: number;
  promptTokens: number;
  completionTokens: number;
  costUsd: number;
};

export type UsageRow = {
  kind: string;
  isGuest: boolean;
  userId?: string | null;
  model: string | null;
  purpose?: string | null;
  promptTokens: number;
  completionTokens: number;
  costUsd: number;
  createdAt: Date;
};
export type ActivityRow = { kind: string; isGuest: boolean; createdAt: Date };

export const TIME_ZONE = process.env.STATS_TIME_ZONE || "Europe/Bratislava";

// "2026-10-06" for a moment, in the given time zone.
export function dayKey(date: Date, timeZone = TIME_ZONE): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}

const split = (): Split => ({ accounts: 0, demo: 0 });
const emptyDay = (day: string): DayStats => ({
  day,
  imports: split(),
  demosStarted: 0,
  signups: 0,
  activity: Object.fromEntries(ACTIVITY_KINDS.map((k) => [k, split()])) as Record<ActivityKind, Split>,
  models: [],
  purposes: [],
  calls: 0,
  promptTokens: 0,
  completionTokens: 0,
  costUsd: 0,
});

// Add the rows up per day, newest day first. Only days with something in them.
export function summarize(usage: UsageRow[], activity: ActivityRow[], timeZone = TIME_ZONE): DayStats[] {
  const days = new Map<string, DayStats>();
  const models = new Map<string, Map<string, ModelStats>>();
  const purposes = new Map<string, Map<string, PurposeStats>>();
  const day = (d: Date) => {
    const key = dayKey(d, timeZone);
    if (!days.has(key)) {
      days.set(key, emptyDay(key));
      models.set(key, new Map());
      purposes.set(key, new Map());
    }
    return days.get(key)!;
  };

  for (const row of usage) {
    const d = day(row.createdAt);
    if (row.kind === "import") d.imports[row.isGuest ? "demo" : "accounts"]++;
    else if (row.kind === "guest") d.demosStarted++;
    else if (row.kind === "signup") d.signups++;
    else if (row.kind === "call" || row.kind === "paid") {
      const name = row.model ?? "unknown";
      const perModel = models.get(d.day)!;
      if (!perModel.has(name)) {
        perModel.set(name, { model: name, calls: 0, promptTokens: 0, completionTokens: 0, costUsd: 0 });
      }
      for (const s of [perModel.get(name)!, d]) {
        s.calls++;
        s.promptTokens += row.promptTokens;
        s.completionTokens += row.completionTokens;
        s.costUsd += row.costUsd;
      }
      const why = row.purpose ?? "unknown";
      const perPurpose = purposes.get(d.day)!;
      if (!perPurpose.has(why)) perPurpose.set(why, { purpose: why, calls: 0, scriptCalls: 0, costUsd: 0 });
      const p = perPurpose.get(why)!;
      p.calls++;
      if (row.userId === null) p.scriptCalls++;
      p.costUsd += row.costUsd;
    }
  }
  for (const row of activity) {
    if ((ACTIVITY_KINDS as readonly string[]).includes(row.kind)) {
      day(row.createdAt).activity[row.kind as ActivityKind][row.isGuest ? "demo" : "accounts"]++;
    }
  }
  for (const [key, d] of days) {
    d.models = [...models.get(key)!.values()].sort((a, b) => b.costUsd - a.costUsd || b.calls - a.calls);
    d.purposes = [...purposes.get(key)!.values()].sort((a, b) => b.calls - a.calls);
  }
  return [...days.values()].sort((a, b) => b.day.localeCompare(a.day));
}

// Totals over several days (same shape; `day` is the range).
export function total(days: DayStats[]): DayStats {
  const sum = emptyDay(days.length ? `${days[days.length - 1].day} – ${days[0].day}` : "");
  const models = new Map<string, ModelStats>();
  const purposes = new Map<string, PurposeStats>();
  for (const d of days) {
    sum.imports.accounts += d.imports.accounts;
    sum.imports.demo += d.imports.demo;
    sum.demosStarted += d.demosStarted;
    sum.signups += d.signups;
    for (const k of ACTIVITY_KINDS) {
      sum.activity[k].accounts += d.activity[k].accounts;
      sum.activity[k].demo += d.activity[k].demo;
    }
    for (const m of d.models) {
      const t = models.get(m.model) ?? { model: m.model, calls: 0, promptTokens: 0, completionTokens: 0, costUsd: 0 };
      t.calls += m.calls;
      t.promptTokens += m.promptTokens;
      t.completionTokens += m.completionTokens;
      t.costUsd += m.costUsd;
      models.set(m.model, t);
    }
    for (const p of d.purposes) {
      const t = purposes.get(p.purpose) ?? { purpose: p.purpose, calls: 0, scriptCalls: 0, costUsd: 0 };
      t.calls += p.calls;
      t.scriptCalls += p.scriptCalls;
      t.costUsd += p.costUsd;
      purposes.set(p.purpose, t);
    }
    sum.calls += d.calls;
    sum.promptTokens += d.promptTokens;
    sum.completionTokens += d.completionTokens;
    sum.costUsd += d.costUsd;
  }
  sum.models = [...models.values()].sort((a, b) => b.costUsd - a.costUsd || b.calls - a.calls);
  sum.purposes = [...purposes.values()].sort((a, b) => b.calls - a.calls);
  return sum;
}

// The last `days` days (today included), newest first.
export async function loadDailyStats(days = 30): Promise<DayStats[]> {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const [usage, activity] = await Promise.all([
    prisma.aiUsage.findMany({
      where: { createdAt: { gte: since } },
      select: { kind: true, isGuest: true, userId: true, model: true, purpose: true, promptTokens: true, completionTokens: true, costUsd: true, createdAt: true },
    }),
    prisma.activity.findMany({
      where: { createdAt: { gte: since } },
      select: { kind: true, isGuest: true, createdAt: true },
    }),
  ]);
  return summarize(usage, activity);
}
