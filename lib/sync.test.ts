import { describe, expect, it } from "vitest";
import { planSync, syncedFiles, type SyncedRecipe } from "./sync";

const recipe = (id: string, updatedAt: string, extra: Partial<SyncedRecipe> = {}): SyncedRecipe => ({
  id,
  title: `Recipe ${id}`,
  ingredients: "[]",
  instructions: "[]",
  sourceType: "photo",
  sourceUrl: null,
  imagePath: null,
  scanPaths: null,
  copiedFromId: null,
  createdAt: "2026-09-01T00:00:00.000Z",
  updatedAt,
  ...extra,
});

describe("planSync", () => {
  const live = new Map([
    ["older-there", new Date("2026-10-01T00:00:00Z")],
    ["same", new Date("2026-10-05T00:00:00Z")],
    ["newer-there", new Date("2026-10-09T00:00:00Z")],
  ]);
  const plan = planSync(
    [
      recipe("new", "2026-10-10T00:00:00Z"),
      recipe("older-there", "2026-10-08T00:00:00Z"),
      recipe("same", "2026-10-05T00:00:00Z"),
      recipe("newer-there", "2026-10-02T00:00:00Z"),
    ],
    live,
  );

  it("adds recipes the live site doesn't have", () => {
    expect(plan.create.map((r) => r.id)).toEqual(["new"]);
  });

  it("overwrites only recipes changed here more recently", () => {
    expect(plan.update.map((r) => r.id)).toEqual(["older-there"]);
    expect(plan.unchanged).toBe(1);
  });

  it("keeps edits made on the live site since", () => {
    expect(plan.keptLive).toEqual(["Recipe newer-there"]);
  });
});

describe("syncedFiles", () => {
  it("lists the picture and the scans once each, uploads only", () => {
    const r = { imagePath: "/uploads/a.jpg", scanPaths: JSON.stringify(["/uploads/a.jpg", "/uploads/b.jpg", "https://x/y.jpg"]) };
    expect(syncedFiles(r)).toEqual(["/uploads/a.jpg", "/uploads/b.jpg"]);
  });

  it("copes with no files or broken JSON", () => {
    expect(syncedFiles({ imagePath: null, scanPaths: null })).toEqual([]);
    expect(syncedFiles({ imagePath: null, scanPaths: "{" })).toEqual([]);
  });
});
