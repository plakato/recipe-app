// On the live server: merge recipes packed by scripts/sync-export.ts into the
// account with the same email (rules in lib/sync.ts). Their photos must
// already be in UPLOAD_DIR (scripts/deploy.sh copies them first); a recipe
// whose photo is missing is skipped. Statistics rows the server doesn't have
// yet are added. --dry-run only prints the plan.
//
// Run: npx tsx --env-file=.env scripts/sync-apply.ts <file.json> [--dry-run]
import { access, readFile } from "node:fs/promises";
import { prisma } from "@/lib/prisma";
import { uploadFilePath } from "@/lib/saveImage";
import { newRows, planSync, syncedFiles, type SyncedActivity, type SyncedRecipe, type SyncedUsage } from "@/lib/sync";

async function main() {
  const argv = process.argv.slice(2);
  const dryRun = argv.includes("--dry-run");
  const file = argv.find((a) => !a.startsWith("--"));
  if (!file) throw new Error("Usage: sync-apply.ts <file.json> [--dry-run]");
  const { email, recipes, usage = [], activity = [] } = JSON.parse(await readFile(file, "utf8")) as {
    email: string;
    recipes: SyncedRecipe[];
    usage?: SyncedUsage[];
    activity?: SyncedActivity[];
  };
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new Error(`No account ${email} on this server.`);

  // Ids are global: a recipe of another account with the same id is never touched.
  const existing = await prisma.recipe.findMany({
    where: { id: { in: recipes.map((r) => r.id) } },
    select: { id: true, userId: true, updatedAt: true },
  });
  const foreign = new Set(existing.filter((r) => r.userId !== user.id).map((r) => r.id));
  const live = new Map(existing.filter((r) => r.userId === user.id).map((r) => [r.id, r.updatedAt]));
  const missingPhoto = async (r: SyncedRecipe) => {
    for (const p of syncedFiles(r)) {
      try {
        await access(uploadFilePath(p));
      } catch {
        return true;
      }
    }
    return false;
  };
  const usable: SyncedRecipe[] = [];
  const skipped: string[] = [];
  for (const r of recipes) {
    if (foreign.has(r.id) || (await missingPhoto(r))) skipped.push(r.title);
    else usable.push(r);
  }
  const plan = planSync(usable, live);
  console.log(
    `${plan.create.length} new, ${plan.update.length} updated, ${plan.unchanged} unchanged, ` +
      `${plan.keptLive.length} kept (edited here since), ${skipped.length} skipped (photo missing or another account's)`,
  );
  const ids = async (table: "aiUsage" | "activity", rows: { id: string }[]) =>
    new Set(
      (table === "aiUsage"
        ? await prisma.aiUsage.findMany({ where: { id: { in: rows.map((r) => r.id) } }, select: { id: true } })
        : await prisma.activity.findMany({ where: { id: { in: rows.map((r) => r.id) } }, select: { id: true } })
      ).map((r) => r.id),
    );
  const newUsage = newRows(usage, await ids("aiUsage", usage));
  const newActivity = newRows(activity, await ids("activity", activity));
  console.log(`statistics: ${newUsage.length} AI/import rows and ${newActivity.length} recipe-change rows to add`);
  for (const t of plan.keptLive) console.log(`  kept as edited here: ${t}`);
  for (const t of skipped) console.log(`  skipped: ${t}`);
  if (dryRun) return;

  const data = (r: SyncedRecipe) => ({
    title: r.title,
    ingredients: r.ingredients,
    instructions: r.instructions,
    sourceType: r.sourceType,
    sourceUrl: r.sourceUrl,
    imagePath: r.imagePath,
    scanPaths: r.scanPaths,
    copiedFromId: r.copiedFromId,
    // Kept as on the other machine, so the next sync sees them as unchanged.
    updatedAt: new Date(r.updatedAt),
  });
  await prisma.$transaction([
    ...plan.create.map((r) =>
      prisma.recipe.create({ data: { id: r.id, userId: user.id, createdAt: new Date(r.createdAt), ...data(r) } }),
    ),
    ...plan.update.map((r) => prisma.recipe.update({ where: { id: r.id }, data: data(r) })),
    prisma.aiUsage.createMany({
      data: newUsage.map(({ mine, createdAt, ...u }) => ({
        ...u,
        userId: mine ? user.id : null,
        createdAt: new Date(createdAt),
      })),
    }),
    prisma.activity.createMany({
      data: newActivity.map((a) => ({ ...a, userId: user.id, createdAt: new Date(a.createdAt) })),
    }),
  ]);
  console.log("Done.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
