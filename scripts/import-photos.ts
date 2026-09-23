// Bulk-import recipe photos from a folder straight into the database, using
// exactly the pipeline of the photo import page (HEIC convert + downscale via
// saveUploadedImage, vision extraction via extractRecipeFromImage). Each photo
// becomes one recipe with sourceType "photo" and the photo as its image, to be
// reviewed/edited in the app afterwards.
//
// Idempotent: a manifest (<folder>/.imported.json) records which files have
// already been imported, so re-running only processes new or failed ones.
//
// Run: npx tsx --env-file=.env scripts/import-photos.ts --user <email> <folder> [language] [model]
// e.g. npx tsx --env-file=.env scripts/import-photos.ts --user me@example.com recipe_photos Slovak
import { readdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { prisma } from "@/lib/prisma";
import { stripUserArg, userIdForScript } from "@/lib/script-user";
import { saveUploadedImage } from "@/lib/saveImage";
import { extractRecipeFromImage } from "@/lib/extractRecipe";

const argv = stripUserArg(process.argv.slice(2));
const folder = argv[0];
if (!folder) {
  console.error(
    "Usage: npx tsx --env-file=.env scripts/import-photos.ts --user <email> <folder> [language] [model]",
  );
  process.exit(1);
}
const language = argv[1] || undefined;
const model = argv[2] || undefined;

const MANIFEST = path.join(folder, ".imported.json");
type Manifest = Record<string, { recipeId: string; title: string; at: string }>;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

(async () => {
  let manifest: Manifest = {};
  try {
    manifest = JSON.parse(await readFile(MANIFEST, "utf8"));
  } catch {
    /* first run */
  }

  const files = (await readdir(folder))
    .filter((f) => /\.(hei[cf]|jpe?g|png|webp)$/i.test(f))
    .sort();
  const todo = files.filter((f) => !manifest[f]);
  console.log(
    `${files.length} photo(s) in ${folder}, ${todo.length} to import ` +
      `(language: ${language ?? "none"}, model: ${model ?? "default free"})`,
  );

  const userId = await userIdForScript(process.argv);
  const failed: string[] = [];

  for (const [i, name] of todo.entries()) {
    const started = Date.now();
    process.stdout.write(`[${i + 1}/${todo.length}] ${name} … `);
    let savedPath: string | undefined;
    try {
      const buf = await readFile(path.join(folder, name));
      const type = /\.hei[cf]$/i.test(name)
        ? "image/heic"
        : /\.png$/i.test(name)
          ? "image/png"
          : /\.webp$/i.test(name)
            ? "image/webp"
            : "image/jpeg";
      const saved = await saveUploadedImage(new File([buf], name, { type }));
      if (!saved) throw new Error("unsupported image or over 8 MB");
      savedPath = saved.imagePath;

      const draft = await extractRecipeFromImage(saved.dataUrl, language, model);
      const recipe = await prisma.recipe.create({
        data: {
          userId,
          title: draft.title || name,
          description: draft.description ?? null,
          ingredients: JSON.stringify(draft.ingredients),
          instructions: JSON.stringify(draft.instructions),
          servings: draft.servings ?? null,
          prepTime: draft.prepTime ?? null,
          cookTime: draft.cookTime ?? null,
          sourceType: "photo",
          imagePath: saved.imagePath,
        },
      });
      manifest[name] = {
        recipeId: recipe.id,
        title: recipe.title,
        at: new Date().toISOString(),
      };
      await writeFile(MANIFEST, JSON.stringify(manifest, null, 2));
      console.log(
        `"${recipe.title}" (${draft.ingredients.length} ingr, ` +
          `${draft.instructions.length} steps, ${Math.round((Date.now() - started) / 1000)}s)`,
      );
    } catch (err) {
      failed.push(name);
      console.log(`FAILED: ${err instanceof Error ? err.message.slice(0, 160) : err}`);
      // Don't leave an orphaned copy of the photo in public/uploads.
      if (savedPath) {
        await unlink(path.join("public", savedPath)).catch(() => {});
      }
    }
    // Be gentle with free-tier rate limits.
    if (i < todo.length - 1) await sleep(5000);
  }

  console.log(
    `\nDone: ${todo.length - failed.length} imported, ${failed.length} failed` +
      (failed.length ? `: ${failed.join(", ")}` : ""),
  );
  await prisma.$disconnect();
  process.exit(failed.length ? 2 : 0);
})();
