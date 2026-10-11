import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({ prisma: {} }));
const { summarize, total, dayKey } = await import("./stats");

const TZ = "Europe/Bratislava";
const at = (iso: string) => new Date(iso);
const call = (model: string, cost: number, iso: string, isGuest = false) => ({
  kind: "call",
  isGuest,
  model,
  promptTokens: 1000,
  completionTokens: 50,
  costUsd: cost,
  createdAt: at(iso),
});
const row = (kind: string, iso: string, isGuest = false) => ({
  kind,
  isGuest,
  model: null,
  promptTokens: 0,
  completionTokens: 0,
  costUsd: 0,
  createdAt: at(iso),
});

describe("dayKey", () => {
  it("uses the local day, not UTC", () => {
    // 23:30 UTC on 5 Oct is already 6 Oct in Bratislava (UTC+2 in October).
    expect(dayKey(at("2026-10-05T23:30:00Z"), TZ)).toBe("2026-10-06");
  });
});

describe("summarize", () => {
  const days = summarize(
    [
      row("import", "2026-10-06T08:00:00Z"),
      row("import", "2026-10-06T09:00:00Z", true),
      row("guest", "2026-10-06T09:00:00Z"),
      row("signup", "2026-10-06T10:00:00Z"),
      call("gemma:free", 0, "2026-10-06T08:00:01Z"),
      call("gemini", 0.0015, "2026-10-06T08:00:05Z"),
      call("gemini", 0.0015, "2026-10-06T09:00:05Z", true),
      { ...row("paid", "2026-10-05T10:00:00Z"), model: "gemini", costUsd: 0.002 },
    ],
    [
      { kind: "created", isGuest: false, createdAt: at("2026-10-06T08:10:00Z") },
      { kind: "edited", isGuest: true, createdAt: at("2026-10-06T09:10:00Z") },
      { kind: "edited", isGuest: true, createdAt: at("2026-10-06T09:11:00Z") },
    ],
    TZ,
  );

  it("adds everything up per day, newest first", () => {
    expect(days.map((d) => d.day)).toEqual(["2026-10-06", "2026-10-05"]);
    const d = days[0];
    expect(d.imports).toEqual({ accounts: 1, demo: 1 });
    expect(d.demosStarted).toBe(1);
    expect(d.signups).toBe(1);
    expect(d.activity.created).toEqual({ accounts: 1, demo: 0 });
    expect(d.activity.edited).toEqual({ accounts: 0, demo: 2 });
    expect(d.calls).toBe(3);
    expect(d.promptTokens).toBe(3000);
    expect(d.costUsd).toBeCloseTo(0.003);
  });

  it("breaks AI use down per model, most expensive first", () => {
    expect(days[0].models.map((m) => [m.model, m.calls])).toEqual([
      ["gemini", 2],
      ["gemma:free", 1],
    ]);
  });

  it("counts older 'paid' rows as calls", () => {
    expect(days[1].calls).toBe(1);
    expect(days[1].costUsd).toBeCloseTo(0.002);
  });

  it("totals a range", () => {
    const t = total(days);
    expect(t.calls).toBe(4);
    expect(t.costUsd).toBeCloseTo(0.005);
    expect(t.models.find((m) => m.model === "gemini")?.calls).toBe(3);
  });
});

describe("summarize per purpose", () => {
  const days = summarize(
    [
      { ...call("gemini", 0.003, "2026-10-06T08:00:00Z"), userId: "u1", purpose: "read-recipe" },
      { ...call("gemini", 0.0004, "2026-10-06T08:00:10Z"), userId: "u1", purpose: "choose-photos" },
      { ...call("gemini", 0.0004, "2026-10-06T09:00:00Z"), userId: null, purpose: "choose-photos" },
      call("gemma:free", 0, "2026-10-05T09:00:00Z"),
    ],
    [],
    TZ,
  );

  it("counts calls, script calls (no account) and cost per purpose, most used first", () => {
    expect(days[0].purposes).toEqual([
      { purpose: "choose-photos", calls: 2, scriptCalls: 1, costUsd: 0.0008, models: [{ model: "gemini", calls: 2, costUsd: 0.0008 }] },
      { purpose: "read-recipe", calls: 1, scriptCalls: 0, costUsd: 0.003, models: [{ model: "gemini", calls: 1, costUsd: 0.003 }] },
    ]);
    expect(days[1].purposes.map((p) => p.purpose)).toEqual(["unknown"]);
  });

  it("totals purposes over a range", () => {
    expect(total(days).purposes.map((p) => [p.purpose, p.calls])).toEqual([
      ["choose-photos", 2],
      ["read-recipe", 1],
      ["unknown", 1],
    ]);
    expect(total(days).purposes.find((p) => p.purpose === "unknown")?.models).toEqual([
      { model: "gemma:free", calls: 1, costUsd: 0 },
    ]);
  });
});
