// Bulk-import recipes from a list of URLs (one per line, e.g. exported from
// browser bookmarks) using the same pipeline as the URL import page:
// fetchUrlText -> extractRecipeFromText -> download image -> save.
//
// Idempotent: a URL that already exists as a recipe's sourceUrl is skipped, so
// re-running only retries failures. Non-recipe pages fail extraction and are
// simply reported.
//
// Run: npx tsx --env-file=.env scripts/import-urls.ts <urls.txt> [model]
import { readFile } from "node:fs/promises";
import { prisma } from "@/lib/prisma";
import { getDefaultUserId } from "@/lib/user";
import { fetchUrlText } from "@/lib/fetchUrlText";
import { extractRecipeFromText } from "@/lib/extractRecipe";
import { downloadImageToUploads } from "@/lib/saveImage";

const listFile = process.argv[2];
if (!listFile) {
  console.error("Usage: npx tsx --env-file=.env scripts/import-urls.ts <urls.txt> [model]");
  process.exit(1);
}
const model = process.argv[3] || undefined;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const urls = (await readFile(listFile, "utf8"))
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("#"));

  const existing = new Set(
    (
      await prisma.recipe.findMany({
        where: { sourceUrl: { not: null } },
        select: { sourceUrl: true },
      })
    ).map((r) => r.sourceUrl as string),
  );
  const todo = urls.filter((u) => !existing.has(u));
  console.log(
    `${urls.length} URL(s), ${urls.length - todo.length} already imported, ` +
      `${todo.length} to do (model: ${model ?? "default free"})`,
  );

  const userId = await getDefaultUserId();
  const failed: { url: string; reason: string }[] = [];

  for (const [i, url] of todo.entries()) {
    const started = Date.now();
    process.stdout.write(`[${i + 1}/${todo.length}] ${url.slice(0, 80)} … `);
    try {
      const { text, imageUrl } = await fetchUrlText(url);
      const draft = await extractRecipeFromText(text, undefined, model);
      const imagePath = imageUrl
        ? ((await downloadImageToUploads(imageUrl)) ?? null)
        : null;
      const recipe = await prisma.recipe.create({
        data: {
          userId,
          title: draft.title,
          description: draft.description ?? null,
          ingredients: JSON.stringify(draft.ingredients),
          instructions: JSON.stringify(draft.instructions),
          servings: draft.servings ?? null,
          prepTime: draft.prepTime ?? null,
          cookTime: draft.cookTime ?? null,
          sourceType: "url",
          sourceUrl: url,
          imagePath,
        },
      });
      console.log(
        `"${recipe.title}" (${draft.ingredients.length} ingr, ` +
          `${draft.instructions.length} steps${imagePath ? ", image" : ""}, ` +
          `${Math.round((Date.now() - started) / 1000)}s)`,
      );
    } catch (err) {
      const reason = err instanceof Error ? err.message.slice(0, 120) : String(err);
      failed.push({ url, reason });
      console.log(`FAILED: ${reason}`);
    }
    if (i < todo.length - 1) await sleep(2000);
  }

  console.log(`\nDone: ${todo.length - failed.length} imported, ${failed.length} failed`);
  for (const f of failed) console.log(`  ${f.url}\n      ${f.reason}`);
  await prisma.$disconnect();
  process.exit(failed.length ? 2 : 0);
})();
