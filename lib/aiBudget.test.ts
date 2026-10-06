import { describe, expect, it, vi } from "vitest";

// importLimitHit is pure; stub the database next to it.
vi.mock("@/lib/prisma", () => ({ prisma: {} }));
const { importLimitHit } = await import("./aiBudget");

const limits = {
  importsPerAccount: 10,
  importsPerVisitor: 3,
  importsPerIp: 20,
  importsForEveryone: 200,
  paidUsdPerMonth: 5,
  paidUsdPerDay: 0.5,
};
const counts = (account: number, ip = account, everyone = ip) => ({ account, ip, everyone });

describe("importLimitHit", () => {
  it("lets an account import up to its daily quota", () => {
    expect(importLimitHit(counts(9), false, limits)).toBeNull();
    expect(importLimitHit(counts(10), false, limits)).toBe("limit-account");
  });

  it("gives anonymous visitors the smaller quota", () => {
    expect(importLimitHit(counts(2), true, limits)).toBeNull();
    expect(importLimitHit(counts(3), true, limits)).toBe("limit-visitor");
  });

  it("caps one network, however many accounts it uses", () => {
    expect(importLimitHit(counts(1, 20), false, limits)).toBe("limit-ip");
  });

  it("caps everyone together first", () => {
    expect(importLimitHit(counts(0, 0, 200), false, limits)).toBe("limit-everyone");
  });
});

describe("signupLimitHit", async () => {
  const { signupLimitHit } = await import("./signupLimits");
  const limits = { perIp: 5, everyone: 100 };
  it("allows a few accounts per network per day", () => {
    expect(signupLimitHit({ ip: 4, everyone: 10 }, limits)).toBe(false);
    expect(signupLimitHit({ ip: 5, everyone: 10 }, limits)).toBe(true);
  });
  it("caps everyone together", () => {
    expect(signupLimitHit({ ip: 0, everyone: 100 }, limits)).toBe(true);
  });
});
