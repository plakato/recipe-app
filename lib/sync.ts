// Copying one account's recipes from this Mac to the live site (scripts/
// deploy.sh → sync-export.ts here, sync-apply.ts on the server). A merge, not
// a replacement: a recipe new here is added, one changed here more recently
// than there overwrites it, and everything else on the live site is left
// alone — recipes made only there, and ones edited there since.

export type SyncedRecipe = {
  id: string;
  title: string;
  ingredients: string; // JSON, as stored
  instructions: string; // JSON, as stored
  sourceType: string;
  sourceUrl: string | null;
  imagePath: string | null;
  scanPaths: string | null;
  copiedFromId: string | null;
  createdAt: string; // ISO
  updatedAt: string; // ISO
};

export type SyncPlan = {
  create: SyncedRecipe[];
  update: SyncedRecipe[];
  unchanged: number; // same version on both sides
  keptLive: string[]; // titles edited on the live site more recently
};

// What to do with each incoming recipe, given the live ones (by id, with
// their last change).
export function planSync(incoming: SyncedRecipe[], live: Map<string, Date>): SyncPlan {
  const plan: SyncPlan = { create: [], update: [], unchanged: 0, keptLive: [] };
  for (const r of incoming) {
    const there = live.get(r.id);
    const here = new Date(r.updatedAt).getTime();
    if (!there) plan.create.push(r);
    else if (here > there.getTime()) plan.update.push(r);
    else if (here === there.getTime()) plan.unchanged++;
    else plan.keptLive.push(r.title);
  }
  return plan;
}

// The uploaded files a recipe uses (its picture and the photos it was read
// from), as /uploads/... paths.
export function syncedFiles(r: Pick<SyncedRecipe, "imagePath" | "scanPaths">): string[] {
  let scans: unknown = [];
  try {
    scans = JSON.parse(r.scanPaths ?? "[]");
  } catch {}
  const all = [r.imagePath, ...(Array.isArray(scans) ? scans : [])];
  return [...new Set(all.filter((p): p is string => typeof p === "string" && p.startsWith("/uploads/")))];
}
