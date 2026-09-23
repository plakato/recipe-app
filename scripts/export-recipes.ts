// Export every recipe (including Trash) to human-readable files, so the
// recipes survive even if the app or the SQLite file ever breaks.
// Writes <outDir>/recipes.json and <outDir>/markdown/<title>.md.
// Run: npx tsx scripts/export-recipes.ts [outDir]   (default: backups/export)
import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { prisma } from "@/lib/prisma";
import { parseList } from "@/lib/recipes";

const outDir = path.resolve(process.argv[2] ?? "backups/export");

function safeName(title: string, id: string): string {
  const base = title
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "") // strip diacritics for filenames
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase()
    .slice(0, 60);
  return `${base || "recipe"}-${id.slice(-6)}.md`;
}

(async () => {
  const recipes = await prisma.recipe.findMany({ orderBy: { createdAt: "asc" } });

  const mdDir = path.join(outDir, "markdown");
  await rm(mdDir, { recursive: true, force: true });
  await mkdir(mdDir, { recursive: true });

  const json = recipes.map((r) => ({
    ...r,
    ingredients: parseList(r.ingredients),
    instructions: parseList(r.instructions),
  }));
  await writeFile(
    path.join(outDir, "recipes.json"),
    JSON.stringify({ exportedAt: new Date().toISOString(), recipes: json }, null, 2),
  );

  for (const r of json) {
    const meta = [
      r.servings && `- Servings: ${r.servings}`,
      r.prepTime && `- Prep: ${r.prepTime}`,
      r.cookTime && `- Cook: ${r.cookTime}`,
      r.sourceUrl && `- Source: ${r.sourceUrl}`,
      r.imagePath && `- Photo: ${r.imagePath}`,
      r.deletedAt && `- IN TRASH since ${r.deletedAt.toISOString()}`,
    ].filter(Boolean);
    const md = [
      `# ${r.title}`,
      "",
      r.description ?? "",
      "",
      ...meta,
      "",
      "## Ingredients",
      "",
      ...r.ingredients.map((i) => `- ${i}`),
      "",
      "## Instructions",
      "",
      ...r.instructions.map((s, n) => `${n + 1}. ${s}`),
      "",
    ].join("\n");
    await writeFile(path.join(mdDir, safeName(r.title, r.id)), md);
  }

  console.log(`Exported ${recipes.length} recipe(s) to ${outDir}`);
  await prisma.$disconnect();
})().catch((e) => {
  console.error("EXPORT FAILED:", e);
  process.exit(1);
});
