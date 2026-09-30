import { describe, expect, it, vi } from "vitest";

// shadowColor is pure; stub the server-only imports it sits next to.
vi.mock("@/lib/prisma", () => ({ prisma: {} }));
vi.mock("@/lib/saveImage", () => ({ uploadFilePath: (p: string) => p }));
const { shadowColor } = await import("./imageColor");

function lightness(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  return (Math.max(...c) + Math.min(...c)) / 2 / 255;
}

describe("shadowColor", () => {
  it("darkens light colours enough for white text", () => {
    expect(lightness(shadowColor("#f5e6c8"))).toBeLessThanOrEqual(0.21);
    expect(lightness(shadowColor("#ffffff"))).toBeLessThanOrEqual(0.21);
  });

  it("keeps the hue of the photo", () => {
    const c = shadowColor("#c0392b"); // tomato red
    const n = parseInt(c.slice(1), 16);
    expect((n >> 16) & 255).toBeGreaterThan(n & 255); // still red, not blue
    expect(shadowColor("#2e7d32")).toMatch(/^#[0-9a-f]{2}[3-9a-f][0-9a-f][0-9a-f]{2}$/); // green channel leads
  });

  it("leaves already dark colours dark", () => {
    expect(shadowColor("#000000")).toBe("#000000");
  });
});
