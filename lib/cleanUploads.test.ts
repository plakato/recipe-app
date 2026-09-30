import { describe, expect, it, vi } from "vitest";

// unusedUploads is pure; stub the server-only imports next to it.
vi.mock("@/lib/prisma", () => ({ prisma: {} }));
vi.mock("@/lib/saveImage", () => ({ UPLOAD_DIR: "/tmp" }));
const { unusedUploads, GRACE_MS } = await import("./cleanUploads");

const NOW = 1_800_000_000_000;
const OLD = NOW - GRACE_MS - 1;
const NEW = NOW - 60_000;
const A = "0a1b2c3d-0000-4000-8000-000000000001.jpg";
const B = "0a1b2c3d-0000-4000-8000-000000000002.png";
const C = "0a1b2c3d-0000-4000-8000-000000000003.jpg";

describe("unusedUploads", () => {
  it("picks old files that no recipe references", () => {
    const files = [{ name: A, mtimeMs: OLD }, { name: B, mtimeMs: OLD }];
    expect(unusedUploads(files, new Set([A]), NOW)).toEqual([B]);
  });

  it("keeps recent files: a draft may still be under review", () => {
    expect(unusedUploads([{ name: C, mtimeMs: NEW }], new Set(), NOW)).toEqual([]);
  });

  it("only touches files the app stored (<uuid>.<ext>)", () => {
    const files = [{ name: ".DS_Store", mtimeMs: OLD }, { name: "notes.txt", mtimeMs: OLD }];
    expect(unusedUploads(files, new Set(), NOW)).toEqual([]);
  });
});
