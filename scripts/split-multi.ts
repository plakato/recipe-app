// Find imported recipes whose source (a photo or a URL) actually holds several
// recipes, and split them: the existing row becomes the first recipe, the
// rest are created alongside it with the same source and image.
//
// Run: npx tsx --env-file=.env scripts/split-multi.ts [model] [--photos <folder> [file ...]] [--urls]
//   --photos recipe_photos IMG_8075.HEIC   re-check just these photos (all in folder if none given)
//   --urls                                 re-check every URL-imported recipe
import { readFile } from "node:fs/promises";
import path from "node:path";
import { prisma } from "@/lib/prisma";
import { fetchUrlText } from "@/lib/fetchUrlText";
import { extractRecipesFromImage, extractRecipesFromText } from "@/lib/extractRecipe";
import type { RecipeDraft } from "@/lib/recipes";

const args = process.argv.slice(2);
const model = args[0] && !args[0].startsWith("--") ? args.shift() : undefined;
const photosIdx = args.indexOf("--photos");
const doUrls = args.includes("--urls");
const photoFolder = photosIdx >= 0 ? args[photosIdx + 1] : undefined;
const photoFiles =
  photosIdx >= 0 ? args.slice(photosIdx + 2).filter((a) => !a.startsWith("--")) : [];

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function fields(d: RecipeDraft) {
  return {
    title: d.title,
    description: d.description ?? null,
    ingredients: JSON.stringify(d.ingredients),
    instructions: JSON.stringify(d.instructions),
    servings: d.servings ?? null,
    prepTime: d.prepTime ?? null,
    cookTime: d.cookTime ?? null,
  };
}

// Replace one row with N drafts sharing its source/image. Returns titles created.
async function split(recipeId: string, drafts: RecipeDraft[]): Promise<string[]> {
  const row = await prisma.recipe.findUniqueOrThrow({ where: { id: recipeId } });
  await prisma.recipe.update({ where: { id: recipeId }, data: fields(drafts[0]) });
  const created: string[] = [];
  for (const d of drafts.slice(1)) {
    await prisma.recipe.create({
      data: {
        ...fields(d),
        userId: row.userId,
        sourceType: row.sourceType,
        sourceUrl: row.sourceUrl,
        imagePath: row.imagePath,
      },
    });
    created.push(d.title);
  }
  return created;
}

(async () => {
  let splits = 0;

  if (photoFolder) {
    const manifest: Record<string, { recipeId: string }> = JSON.parse(
      await readFile(path.join(photoFolder, ".imported.json"), "utf8"),
    );
    const names = photoFiles.length ? photoFiles : Object.keys(manifest);
    for (const name of names) {
      const entry = manifest[name];
      if (!entry) {
        console.log(`${name}: not in manifest, skipped`);
        continue;
      }
      const row = await prisma.recipe.findUnique({ where: { id: entry.recipeId } });
      if (!row?.imagePath) {
        console.log(`${name}: recipe missing or without image, skipped`);
        continue;
      }
      process.stdout.write(`${name} ("${row.title}") … `);
      const buf = await readFile(path.join("public", row.imagePath));
      const dataUrl = `data:image/jpeg;base64,${buf.toString("base64")}`;
      const drafts = await extractRecipesFromImage(dataUrl, "Slovak", model);
      if (drafts.length > 1) {
        const made = await split(row.id, drafts);
        splits++;
        console.log(`${drafts.length} recipes -> "${drafts[0].title}" + ${made.map((t) => `"${t}"`).join(", ")}`);
      } else {
        console.log("1 recipe, unchanged");
      }
    }
  }

  if (doUrls) {
    const rows = await prisma.recipe.findMany({
      where: { sourceType: "url", deletedAt: null, sourceUrl: { not: null } },
      orderBy: { createdAt: "asc" },
    });
    // A URL that already has several rows was split before — never redo it.
    const perUrl = new Map<string, number>();
    for (const r of rows) perUrl.set(r.sourceUrl as string, (perUrl.get(r.sourceUrl as string) ?? 0) + 1);
    const singles = rows.filter((r) => perUrl.get(r.sourceUrl as string) === 1);
    for (const [i, row] of singles.entries()) {
      process.stdout.write(`[${i + 1}/${singles.length}] "${row.title}" … `);
      try {
        const { text } = await fetchUrlText(row.sourceUrl as string);
        const drafts = await extractRecipesFromText(text, undefined, model);
        if (drafts.length > 1) {
          const made = await split(row.id, drafts);
          splits++;
          console.log(`${drafts.length} recipes -> "${drafts[0].title}" + ${made.map((t) => `"${t}"`).join(", ")}`);
        } else {
          console.log("1 recipe, unchanged");
        }
      } catch (err) {
        console.log(`FAILED: ${err instanceof Error ? err.message.slice(0, 120) : err}`);
      }
      await sleep(1500);
    }
  }

  console.log(`\nDone: ${splits} source(s) split.`);
  await prisma.$disconnect();
})().catch((e) => {
  console.error("FAILED:", e);
  process.exit(1);
});
