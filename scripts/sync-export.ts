// Pack one account's recipes on this machine for the live site (scripts/
// deploy.sh copies them; lib/sync.ts has the rules). Writes <out>.json (the
// recipes, without the trash, and the usage statistics) and <out>.files (the photos they use, one file
// name per line, for rsync --files-from). Changes nothing.
//
// Run: npx tsx --env-file=.env scripts/sync-export.ts --user <email> <out>
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { prisma } from "@/lib/prisma";
import { stripUserArg, userIdForScript } from "@/lib/script-user";
import { SYNCED_USAGE_KINDS, syncedFiles, type SyncedActivity, type SyncedRecipe, type SyncedUsage } from "@/lib/sync";

async function main() {
  const raw = process.argv.slice(2);
  const userId = await userIdForScript(raw);
  const out = stripUserArg(raw)[0];
  if (!out) throw new Error("Usage: sync-export.ts --user <email> <out>");
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  const rows = await prisma.recipe.findMany({ where: { userId, deletedAt: null }, orderBy: { createdAt: "asc" } });
  const recipes: SyncedRecipe[] = rows.map((r) => ({
    id: r.id,
    title: r.title,
    ingredients: r.ingredients,
    instructions: r.instructions,
    sourceType: r.sourceType,
    sourceUrl: r.sourceUrl,
    imagePath: r.imagePath,
    scanPaths: r.scanPaths,
    copiedFromId: r.copiedFromId,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  }));
  const usageRows = await prisma.aiUsage.findMany({ where: { kind: { in: SYNCED_USAGE_KINDS } } });
  const usage: SyncedUsage[] = usageRows
    // Imports count only for this account; AI calls all cost the same money.
    .filter((u) => u.kind !== "import" || u.userId === userId)
    .map((u) => ({
      id: u.id,
      kind: u.kind,
      mine: u.userId === userId,
      isGuest: u.isGuest,
      model: u.model,
      purpose: u.purpose,
      promptTokens: u.promptTokens,
      completionTokens: u.completionTokens,
      costUsd: u.costUsd,
      createdAt: u.createdAt.toISOString(),
    }));
  const activity: SyncedActivity[] = (await prisma.activity.findMany({ where: { userId } })).map((a) => ({
    id: a.id,
    kind: a.kind,
    isGuest: a.isGuest,
    createdAt: a.createdAt.toISOString(),
  }));
  const files = [...new Set(recipes.flatMap(syncedFiles))].map((p) => path.basename(p));
  await writeFile(`${out}.json`, JSON.stringify({ email: user.email, recipes, usage, activity }));
  await writeFile(`${out}.files`, files.join("\n") + "\n");
  console.log(`${recipes.length} recipes, ${files.length} photos, ${usage.length + activity.length} statistics rows packed`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
