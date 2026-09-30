// Remove stored photos that no recipe uses. Imports save photos before the
// recipe is saved (so the review form can show them); drafts that are
// skipped or abandoned leave their photos behind. Photos of recipes in the
// Trash still count as used. Server-only (filesystem + database).

import { readdir, stat, unlink } from "node:fs/promises";
import path from "node:path";
import { prisma } from "@/lib/prisma";
import { UPLOAD_DIR } from "@/lib/saveImage";

// A draft may sit in the review form for a while before it's saved, so only
// photos older than this are considered abandoned.
export const GRACE_MS = 24 * 60 * 60 * 1000;
// Automatic sweeps run at most this often.
const SWEEP_EVERY_MS = 60 * 60 * 1000;

// Only files the app itself stored: "<uuid>.<ext>".
const STORED = /^[0-9a-f-]{36}\.[a-z0-9]+$/i;

export type StoredFile = { name: string; mtimeMs: number };

// Which files are unused: stored by the app, not referenced by any recipe,
// and older than the grace period.
export function unusedUploads(
  files: StoredFile[],
  referenced: Set<string>,
  now: number,
  graceMs = GRACE_MS,
): string[] {
  return files
    .filter((f) => STORED.test(f.name))
    .filter((f) => !referenced.has(f.name))
    .filter((f) => now - f.mtimeMs > graceMs)
    .map((f) => f.name);
}

// Delete unused photos (or, with dryRun, just list them). Returns their names.
export async function removeUnusedUploads({
  dryRun = false,
  graceMs = GRACE_MS,
}: { dryRun?: boolean; graceMs?: number } = {}): Promise<string[]> {
  let names: string[];
  try {
    names = await readdir(UPLOAD_DIR);
  } catch {
    return []; // no uploads folder yet
  }
  const files = await Promise.all(
    names.filter((n) => STORED.test(n)).map(async (name) => ({
      name,
      mtimeMs: (await stat(path.join(UPLOAD_DIR, name))).mtimeMs,
    })),
  );
  // Every recipe, all users, Trash included.
  const rows = await prisma.recipe.findMany({
    where: { imagePath: { not: null } },
    select: { imagePath: true },
  });
  const referenced = new Set(rows.map((r) => path.basename(r.imagePath!)));

  const unused = unusedUploads(files, referenced, Date.now(), graceMs);
  if (!dryRun) {
    await Promise.all(unused.map((n) => unlink(path.join(UPLOAD_DIR, n)).catch(() => {})));
  }
  return unused;
}

// Run a sweep unless one ran within the last hour (per server process).
let lastSweep = 0;
export async function sweepUnusedUploads(): Promise<void> {
  if (Date.now() - lastSweep < SWEEP_EVERY_MS) return;
  lastSweep = Date.now();
  try {
    const removed = await removeUnusedUploads();
    if (removed.length) console.info(`Removed ${removed.length} unused photo(s) from uploads.`);
  } catch (err) {
    console.warn("Cleaning unused uploads failed:", err);
  }
}
