// Pack one account's recipes on this machine for the live site (scripts/
// deploy.sh copies them; lib/sync.ts has the rules). Writes <out>.json (the
// recipes, without the trash) and <out>.files (the photos they use, one file
// name per line, for rsync --files-from). Changes nothing.
//
// Run: npx tsx --env-file=.env scripts/sync-export.ts --user <email> <out>
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { prisma } from "@/lib/prisma";
import { stripUserArg, userIdForScript } from "@/lib/script-user";
import { syncedFiles, type SyncedRecipe } from "@/lib/sync";

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
  const files = [...new Set(recipes.flatMap(syncedFiles))].map((p) => path.basename(p));
  await writeFile(`${out}.json`, JSON.stringify({ email: user.email, recipes }));
  await writeFile(`${out}.files`, files.join("\n") + "\n");
  console.log(`${recipes.length} recipes, ${files.length} photos packed`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
