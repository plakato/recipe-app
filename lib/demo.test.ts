import { describe, expect, it, vi } from "vitest";

// safeNext/demoTarget are pure; stub the server-only imports next to them.
vi.mock("@/lib/prisma", () => ({ prisma: {} }));
vi.mock("@/lib/auth", () => ({ GUEST_TTL_MS: 86_400_000 }));
vi.mock("@/lib/showcase", () => ({ getShowcaseUserId: async () => null }));
const { safeNext, demoTarget } = await import("./demo");

describe("safeNext", () => {
  it("keeps paths inside the app", () => {
    expect(safeNext("/recipes/abc/edit")).toBe("/recipes/abc/edit");
  });

  it("sends anything else home (no redirects to other sites)", () => {
    for (const bad of [null, "", "https://evil.example", "//evil.example", "/\\evil.example", "recipes"]) {
      expect(safeNext(bad)).toBe("/");
    }
  });
});

describe("demoTarget", () => {
  const copies = new Map([["orig1", "copy1"]]);

  it("opens the visitor's own copy of the recipe they were looking at", () => {
    expect(demoTarget("/recipes/orig1", copies)).toBe("/recipes/copy1");
    expect(demoTarget("/recipes/orig1/edit", copies)).toBe("/recipes/copy1/edit");
  });

  it("leaves other pages alone", () => {
    expect(demoTarget("/recipes/new", copies)).toBe("/recipes/new");
    expect(demoTarget("/recipes/unknown/edit", copies)).toBe("/recipes/unknown/edit");
    expect(demoTarget("/", copies)).toBe("/");
  });
});
