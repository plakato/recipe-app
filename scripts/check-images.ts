// Make sure URL-imported recipes show food, not the blog author. For every
// URL recipe with an image, ask the vision model whether the picture shows
// food. If not, try the page's other candidate images; if none shows food,
// drop the image so the app shows its placeholder.
//
// Run: npx tsx --env-file=.env scripts/check-images.ts [model]
import { readFile, unlink } from "node:fs/promises";
import path from "node:path";
import { prisma } from "@/lib/prisma";
import { downloadImageToUploads } from "@/lib/saveImage";

const model = process.argv[2] || process.env.OPENROUTER_MODEL_HQ || "google/gemini-2.5-flash";
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

async function showsFood(dataUrl: string): Promise<boolean> {
  const res = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text:
                "Does this image mainly show food, a dish, a drink, baked goods or ingredients " +
                "(as opposed to people, a logo, a portrait, a kitchen, text or something else)? " +
                'Answer with JSON only: {"food": true} or {"food": false}.',
            },
            { type: "image_url", image_url: { url: dataUrl } },
          ],
        },
      ],
    }),
  });
  if (!res.ok) throw new Error(`OpenRouter ${res.status}`);
  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const raw = data.choices?.[0]?.message?.content ?? "";
  return /"food"\s*:\s*true/i.test(raw);
}

async function localImageToDataUrl(imagePath: string): Promise<string> {
  const buf = await readFile(path.join("public", imagePath));
  const ext = path.extname(imagePath).slice(1).toLowerCase();
  const mime = ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg";
  return `data:${mime};base64,${buf.toString("base64")}`;
}

// All plausible lead images on a page, best guesses first.
function candidateImages(html: string, base: string): string[] {
  const out: string[] = [];
  const add = (raw?: string | null) => {
    if (!raw) return;
    try {
      const u = new URL(raw.replace(/\\\//g, "/").replace(/\\u0026/gi, "&"), base).href;
      if (!out.includes(u) && !/\.svg($|\?)/i.test(u)) out.push(u);
    } catch {
      /* ignore */
    }
  };
  for (const m of html.matchAll(/"image"\s*:\s*(?:\[\s*)?(?:\{[^}]*?"url"\s*:\s*)?"([^"]+)"/gi)) add(m[1]);
  for (const m of html.matchAll(/<meta[^>]+(?:property|name)=["'](?:og:image|twitter:image)["'][^>]+content=["']([^"']+)["']/gi)) add(m[1]);
  for (const m of html.matchAll(/<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["'](?:og:image|twitter:image)["']/gi)) add(m[1]);
  for (const m of html.matchAll(/<img[^>]+src=["']([^"']+)["'][^>]*>/gi)) {
    const tag = m[0];
    if (/logo|avatar|icon|badge|banner|sprite|pixel|author|profile|1x1|\.gif/i.test(m[1] + tag)) continue;
    const w = Number(tag.match(/width=["']?(\d+)/i)?.[1] ?? 0);
    if (w && w < 300) continue;
    add(m[1]);
    if (out.length >= 8) break;
  }
  return out;
}

(async () => {
  const rows = await prisma.recipe.findMany({
    where: { sourceType: "url", deletedAt: null, imagePath: { not: null } },
    orderBy: { createdAt: "asc" },
  });
  let replaced = 0, cleared = 0;
  for (const [i, row] of rows.entries()) {
    process.stdout.write(`[${i + 1}/${rows.length}] "${row.title}" … `);
    try {
      if (await showsFood(await localImageToDataUrl(row.imagePath as string))) {
        console.log("food ✓");
        continue;
      }
      process.stdout.write("not food; trying other images on the page … ");
      let found: string | null = null;
      if (row.sourceUrl) {
        const html = await fetch(row.sourceUrl, {
          headers: { "User-Agent": "Mozilla/5.0 (compatible; FamilyRecipes/1.0)" },
        }).then((r) => (r.ok ? r.text() : ""));
        for (const url of candidateImages(html, row.sourceUrl).slice(0, 6)) {
          const saved = await downloadImageToUploads(url);
          if (!saved) continue;
          if (await showsFood(await localImageToDataUrl(saved))) {
            found = saved;
            break;
          }
          await unlink(path.join("public", saved)).catch(() => {});
        }
      }
      await unlink(path.join("public", row.imagePath as string)).catch(() => {});
      await prisma.recipe.update({ where: { id: row.id }, data: { imagePath: found } });
      if (found) {
        replaced++;
        console.log("replaced ✓");
      } else {
        cleared++;
        console.log("none found -> placeholder");
      }
    } catch (err) {
      console.log(`FAILED: ${err instanceof Error ? err.message.slice(0, 100) : err}`);
    }
  }
  console.log(`\nDone: ${rows.length} checked, ${replaced} replaced, ${cleared} set to placeholder.`);
  await prisma.$disconnect();
})().catch((e) => {
  console.error("FAILED:", e);
  process.exit(1);
});
