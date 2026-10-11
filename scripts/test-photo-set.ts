// Try photo import on the private test set (test_photos/, not in git): each
// folder is one batch of photos taken together (a recipe over two pages, a
// page plus a picture of the dish…); a single image file is a batch of one.
// Reads them like the app does (lib/extractRecipe.ts → extractRecipesFromPhotos),
// crops each recipe's dish picture, and writes everything to
// photo-import-review/ (index.html covers every case run so far). Nothing is
// saved to the database. Prints what the run cost.
//
// Run: npx tsx --env-file=.env scripts/test-photo-set.ts <case> [<case>…] [--model <id>]
//   <case>: a folder name in test_photos/ (e.g. "butter chicken") or a path to
//   one image (e.g. test_photos/one-image-recipes/IMG_8147.HEIC).
// Without a case it lists the cases.
//
// Save the reviewed results into an account (no AI calls; the recipes come
// from photo-import-review/, as they were read; a recipe of the same title is
// skipped, so it can be re-run; one without a dish photo gets a drawn picture):
//   npx tsx --env-file=.env scripts/test-photo-set.ts --save --user <email> [<case>…]
import { mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { prisma } from "@/lib/prisma";
import { extractRecipesFromPhotos, type PageRecipe } from "@/lib/extractRecipe";
import { cropDish } from "@/lib/dishCrop";
import { preparePhoto, saveImageBuffer } from "@/lib/saveImage";
import { stripUserArg, userIdForScript } from "@/lib/script-user";
import { generateRecipePicture } from "@/lib/dishImage";

const SET = path.resolve("test_photos");
const OUT = path.resolve("photo-import-review");
const IMAGE = /\.(heic|heif|jpe?g|png|webp)$/i;

type CaseResult = {
  name: string;
  photos: string[]; // file names in OUT/<slug>/
  recipes: (PageRecipe & { crop: string | null })[];
  error?: string;
  seconds: number;
  model?: string;
  costUsd: number;
};

const slug = (s: string) => s.replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "").toLowerCase();

async function caseFiles(name: string): Promise<string[]> {
  const asPath = path.resolve(name);
  const target = (await stat(asPath).catch(() => null)) ? asPath : path.join(SET, name);
  const info = await stat(target);
  if (!info.isDirectory()) return [target];
  const names = (await readdir(target)).filter((n) => IMAGE.test(n)).sort();
  return names.map((n) => path.join(target, n));
}

async function runCase(name: string, model?: string): Promise<CaseResult> {
  const files = await caseFiles(name);
  const dir = path.join(OUT, slug(name));
  await mkdir(dir, { recursive: true });
  const prepared: NonNullable<Awaited<ReturnType<typeof preparePhoto>>>[] = [];
  for (const f of files) {
    const p = await preparePhoto(await readFile(f), "", path.basename(f));
    if (!p) throw new Error(`Could not prepare ${f}`);
    prepared.push(p);
  }
  const photos = await Promise.all(
    prepared.map(async (p, i) => {
      const file = `photo-${i + 1}.jpg`;
      await writeFile(path.join(dir, file), p.buf);
      return file;
    }),
  );

  const started = new Date();
  const result: CaseResult = { name, photos, recipes: [], seconds: 0, costUsd: 0 };
  try {
    const recipes = await extractRecipesFromPhotos(prepared.map((p) => p.dataUrl), model);
    result.recipes = await Promise.all(
      recipes.map(async (r, i) => {
        // As in the app: checked, looked for again if wrong, else dropped.
        const others = recipes.filter((o) => o !== r).map((o) => o.title);
        const buf = await cropDish(r, prepared, others);
        if (!buf) return { ...r, crop: null };
        const crop = `dish-${i + 1}.jpg`;
        await writeFile(path.join(dir, crop), buf);
        return { ...r, crop };
      }),
    );
  } catch (err) {
    const detail = (err as { detail?: string }).detail;
    result.error = (err instanceof Error ? err.message : String(err)) + (detail ? ` [${detail}]` : "");
  }
  result.seconds = Math.round((Date.now() - started.getTime()) / 1000);
  const calls = await prisma.aiUsage.findMany({
    where: { kind: "call", createdAt: { gte: started } },
    select: { model: true, costUsd: true },
  });
  result.model = [...new Set(calls.map((c) => c.model))].join(", ");
  result.costUsd = calls.reduce((sum, c) => sum + c.costUsd, 0);
  await writeFile(path.join(dir, "result.json"), JSON.stringify(result, null, 2));
  return result;
}

const esc = (s: string) =>
  s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

function list(items: string[]): string {
  return items
    .map((l) => (/^[^:]{1,60}:$/.test(l.trim()) && !/\d/.test(l) ? `<li class="h">${esc(l)}</li>` : `<li>${esc(l)}</li>`))
    .join("");
}

async function writeIndex() {
  const results: CaseResult[] = [];
  for (const d of (await readdir(OUT)).sort()) {
    const json = await readFile(path.join(OUT, d, "result.json"), "utf8").catch(() => null);
    if (json) results.push(JSON.parse(json) as CaseResult);
  }
  const sections = results.map((r) => {
    const dir = slug(r.name);
    const recipes = r.recipes
      .map(
        (x) => `<article>
  <div class="dish">${x.crop ? `<img src="${dir}/${x.crop}">` : `<span>no dish photo</span>`}</div>
  <div><h3>${esc(x.title)}</h3>
  <p class="meta">text on photo ${x.photos.map((n) => n + 1).join(", ") || "?"}${
    x.dish ? ` · dish from photo ${x.dish.photo + 1}` : ""
  }</p>
  <div class="cols"><ul>${list(x.ingredients)}</ul><ol>${list(x.instructions)}</ol></div></div>
</article>`,
      )
      .join("");
    return `<section><h2>${esc(r.name)}</h2>
<p class="meta">${r.recipes.length} recipe(s) · ${r.seconds} s · ${esc(r.model || "?")} · $${r.costUsd.toFixed(4)}</p>
${r.error ? `<p class="err">${esc(r.error)}</p>` : ""}
<div class="photos">${r.photos.map((p) => `<a href="${dir}/${p}"><img src="${dir}/${p}"></a>`).join("")}</div>
${recipes}</section>`;
  });
  await writeFile(
    path.join(OUT, "index.html"),
    `<!doctype html><meta charset="utf-8"><title>Photo import test set</title>
<style>
body{font:14px/1.45 system-ui,sans-serif;margin:24px;background:#fafaf7;color:#222;max-width:1200px}
section{border-top:2px solid #ccc;padding:12px 0 24px}h2{margin:0}
.photos{display:flex;gap:8px;margin:8px 0}.photos img{height:180px;border:1px solid #ccc}
article{display:grid;grid-template-columns:300px 1fr;gap:16px;background:#fff;border:1px solid #ddd;padding:12px;margin:10px 0}
.dish img{width:100%}.dish span{color:#999}h3{margin:0 0 4px}
.cols{display:grid;grid-template-columns:1fr 2fr;gap:16px}ul,ol{margin:0;padding-left:18px}
.h{list-style:none;font-weight:600;margin-left:-18px;margin-top:6px}
.meta{color:#777;font-size:12px}.err{color:#b22}
</style>${sections.join("\n")}`,
  );
}

// Store the recipes of the saved results (all, or the named cases) as photo
// recipes of this account: the dish crop as the picture, the photos as scans.
async function save(userId: string, names: string[]) {
  const wanted = new Set(names.map(slug));
  for (const d of (await readdir(OUT)).sort()) {
    if (wanted.size && !wanted.has(d)) continue;
    const json = await readFile(path.join(OUT, d, "result.json"), "utf8").catch(() => null);
    if (!json) continue;
    const r = JSON.parse(json) as CaseResult;
    const photoPaths = await Promise.all(
      r.photos.map(async (p) => saveImageBuffer(await readFile(path.join(OUT, d, p)), "jpg")),
    );
    for (const x of r.recipes) {
      const existing = await prisma.recipe.findFirst({ where: { userId, title: x.title, deletedAt: null } });
      if (existing) {
        console.log(`${r.name}: "${x.title}" already there, skipped`);
        continue;
      }
      const used = [...new Set([...x.photos, ...(x.dish ? [x.dish.photo] : [])])].sort();
      const recipe = await prisma.recipe.create({
        data: {
          userId,
          title: x.title,
          ingredients: JSON.stringify(x.ingredients),
          instructions: JSON.stringify(x.instructions),
          sourceType: "photo",
          imagePath: x.crop ? await saveImageBuffer(await readFile(path.join(OUT, d, x.crop)), "jpg") : null,
          scanPaths: JSON.stringify((used.length ? used : r.photos.map((_, i) => i)).map((i) => photoPaths[i])),
        },
      });
      // As in the app: no dish photo, so a picture is drawn from the text.
      if (!x.crop) await generateRecipePicture(recipe.id, { userId, isGuest: false });
      const drawn = !x.crop && (await prisma.recipe.findUnique({ where: { id: recipe.id } }))?.imagePath;
      console.log(`${r.name}: "${x.title}" saved (${recipe.id})${x.crop ? "" : drawn ? ", picture drawn" : ", no picture"}`);
    }
  }
}

async function main() {
  const raw = process.argv.slice(2);
  if (raw.includes("--save")) {
    const userId = await userIdForScript(raw);
    return save(userId, stripUserArg(raw).filter((a) => a !== "--save"));
  }
  const argv = raw;
  const mi = argv.indexOf("--model");
  const model = mi >= 0 ? argv[mi + 1] : undefined;
  const cases = mi >= 0 ? [...argv.slice(0, mi), ...argv.slice(mi + 2)] : argv;
  if (cases.length === 0) {
    const entries = await readdir(SET, { withFileTypes: true });
    console.log("Cases (folders in test_photos/):");
    for (const e of entries) if (e.isDirectory()) console.log(`  ${e.name}`);
    return;
  }
  await mkdir(OUT, { recursive: true });
  let total = 0;
  for (const name of cases) {
    const r = await runCase(name, model);
    total += r.costUsd;
    console.log(
      `${name}: ${r.error ? `FAILED ${r.error}` : r.recipes.map((x) => `"${x.title}"${x.crop ? " +dish" : ""}`).join(", ") || "no recipe"} ` +
        `(${r.seconds} s, ${r.model || "?"}, $${r.costUsd.toFixed(4)})`,
    );
    await writeIndex();
  }
  console.log(`Total cost $${total.toFixed(4)}. Open ${path.join(OUT, "index.html")}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
