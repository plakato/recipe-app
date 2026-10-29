// Try dish-picture generation (lib/dishImage.ts) on existing recipes, without
// changing them: for each recipe, ask the text model what the dish looks like,
// draw it, and write the pictures plus an index.html (title, the model's guess
// of the dish, prompt, picture, scan) into the output folder for review.
//
// Run: npx tsx --env-file=.env scripts/generate-dish-images.ts [--user <email>]
//        [--limit 3] [--out dish-image-review] [--title <part of a title>[|<another>…]]
// Without --user it takes the showcase account's recipes.
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { prisma } from "@/lib/prisma";
import { listedRecipes } from "@/lib/features";
import { parseList } from "@/lib/recipes";
import { getShowcaseUserId } from "@/lib/showcase";
import { describeDish, drawDish } from "@/lib/dishImage";
import { userIdForScript, stripUserArg } from "@/lib/script-user";

function arg(argv: string[], name: string): string | undefined {
  const i = argv.indexOf(name);
  return i >= 0 ? argv[i + 1] : undefined;
}

const esc = (s: string) =>
  s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

async function main() {
  const raw = process.argv.slice(2);
  const userId = raw.includes("--user") ? await userIdForScript(raw) : await getShowcaseUserId();
  if (!userId) throw new Error("No showcase account; pass --user <email>.");
  const argv = stripUserArg(raw);
  const limit = Number(arg(argv, "--limit") ?? 3);
  const out = path.resolve(arg(argv, "--out") ?? "dish-image-review");
  const title = arg(argv, "--title");
  await mkdir(out, { recursive: true });

  const recipes = await prisma.recipe.findMany({
    where: {
      userId,
      deletedAt: null,
      ...listedRecipes,
      ...(title ? { OR: title.split("|").map((t) => ({ title: { contains: t.trim() } })) } : {}),
    },
    orderBy: { createdAt: "asc" },
    take: limit,
  });
  console.log(`Generating pictures for ${recipes.length} recipes into ${out}`);

  const cards: string[] = [];
  for (const [i, r] of recipes.entries()) {
    const label = `[${i + 1}/${recipes.length}] ${r.title}`;
    const started = Date.now();
    try {
      const described = await describeDish({
        title: r.title,
        ingredients: parseList(r.ingredients),
        instructions: parseList(r.instructions),
      });
      if (!described) throw new Error("no text model described the dish");
      const drawn = await drawDish(described.prompt);
      const file = `${r.id}.jpg`;
      await writeFile(path.join(out, file), drawn.buf);
      const secs = ((Date.now() - started) / 1000).toFixed(0);
      console.log(`${label} -> ${described.dish} (${drawn.model}, ${secs}s)`);
      cards.push(`<figure>
  <img src="${file}" alt="">
  <figcaption><h2>${esc(r.title)}</h2>
  <p><b>Guess:</b> ${esc(described.dish)}</p>
  <p class="prompt">${esc(described.prompt)}</p>
  <p class="meta">${esc(drawn.model)} · ${secs} s${
    r.imagePath ? ` · <a href="http://localhost:3000${esc(r.imagePath)}">scan</a>` : ""
  }</p></figcaption>
</figure>`);
    } catch (err) {
      console.warn(`${label} FAILED: ${err instanceof Error ? err.message : err}`);
      cards.push(`<figure class="failed"><figcaption><h2>${esc(r.title)}</h2><p>${esc(
        err instanceof Error ? err.message : String(err),
      )}</p></figcaption></figure>`);
    }
    await writeFile(path.join(out, "index.html"), page(cards));
  }
  console.log(`Open ${path.join(out, "index.html")}`);
}

function page(cards: string[]): string {
  return `<!doctype html><meta charset="utf-8"><title>Dish pictures</title>
<style>
body{font:14px/1.45 system-ui,sans-serif;margin:24px;background:#fafaf7;color:#222}
main{display:grid;grid-template-columns:repeat(auto-fill,minmax(340px,1fr));gap:20px}
figure{margin:0;background:#fff;border:1px solid #ddd}
img{width:100%;aspect-ratio:4/3;object-fit:cover;display:block}
figcaption{padding:10px 12px}h2{font-size:16px;margin:0 0 6px}
.prompt{color:#555;font-size:12px}.meta{color:#888;font-size:12px}.failed{border-color:#c33}
</style><main>${cards.join("\n")}</main>`;
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
