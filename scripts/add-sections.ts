// Add component section headings ("Cesto:", "Plnka:" …) to recipes that were
// imported before sections existed — WITHOUT re-importing. The model sees the
// stored lines plus the original page (URL imports) or photo (photo imports)
// and returns the lines with headings inserted.
//   URL recipes:   accepted only if the non-heading lines are identical.
//   Photo recipes: additionally, words that are crossed out on the page may be
//                  removed (the first OCR pass sometimes read them as if they
//                  were valid). Accepted only if every returned line is the
//                  stored line with zero or more words removed — nothing may be
//                  added or reworded.
//
// Run: npx tsx --env-file=.env scripts/add-sections.ts --user <email> [model] [--dry-run] [--only <title substring>]
import { readFile } from "node:fs/promises";
import { prisma } from "@/lib/prisma";
import { fetchUrlText } from "@/lib/fetchUrlText";
import { isSectionHeading, parseList } from "@/lib/recipes";
import { uploadFilePath } from "@/lib/saveImage";
import { stripUserArg, userIdForScript } from "@/lib/script-user";

const argv = stripUserArg(process.argv.slice(2));
const dryRun = argv.includes("--dry-run");
const onlyIdx = argv.indexOf("--only");
const only = onlyIdx >= 0 ? (argv[onlyIdx + 1] ?? "").toLowerCase() : "";
const model = argv.filter((a, i) => !a.startsWith("--") && argv[i - 1] !== "--only")[0] || "google/gemini-2.5-flash";
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

const PROMPT = `You are given a recipe's ingredient lines and instruction lines exactly as stored, plus the original source material.
If the source organises the recipe into separate components (e.g. dough, filling, cream, glaze, sauce, decoration), insert a heading line before each component's lines. A heading is a short name in the recipe's language followed by a colon, e.g. "Cesto:", "Plnka:", "Na ozdobu:".
Rules:
- Do NOT change, reorder, merge, split, translate or drop any existing line. Copy them verbatim.
- Only insert heading lines. If the source has no separate components, insert nothing.
- If the source labels one group and leaves the remaining lines unlabeled (e.g. a blank gap), give the remainder a neutral heading in the recipe's language, e.g. "Ostatné:" (Slovak), "Dále:" (Czech), "Other:" (English).
- Return ONLY JSON: {"ingredients": string[], "instructions": string[]}`;

const PHOTO_EXTRA = `
The source is a handwritten/printed page. Exception to the verbatim rule: if a word in a stored line corresponds to text that is CROSSED OUT (struck through) on the page, remove that word (the author deleted it). Remove only crossed-out words; never add, replace or reorder words. If an entire line is crossed out, drop it.`;

type Lines = { ingredients: string[]; instructions: string[] };

async function askModel(stored: Lines, source: { text?: string; imageDataUrl?: string }): Promise<Lines | null> {
  const content: unknown[] = [
    {
      type: "text",
      text:
        `Stored ingredient lines:\n${JSON.stringify(stored.ingredients, null, 1)}\n\n` +
        `Stored instruction lines:\n${JSON.stringify(stored.instructions, null, 1)}\n\n` +
        (source.text ? `Original source:\n${source.text}` : "Original source: the attached photo."),
    },
  ];
  if (source.imageDataUrl) content.push({ type: "image_url", image_url: { url: source.imageDataUrl } });
  const res = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: PROMPT + (source.imageDataUrl ? PHOTO_EXTRA : "") },
        { role: "user", content },
      ],
    }),
  });
  if (!res.ok) throw new Error(`OpenRouter ${res.status}`);
  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const raw = data.choices?.[0]?.message?.content ?? "";
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start < 0 || end < 0) return null;
  const parsed = JSON.parse(raw.slice(start, end + 1)) as Partial<Lines>;
  const asList = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string").map((x) => x.trim()) : []);
  return { ingredients: asList(parsed.ingredients), instructions: asList(parsed.instructions) };
}

// True if `proposed` equals `stored` once heading lines are removed.
function onlyAddsHeadings(stored: string[], proposed: string[]): boolean {
  const kept = proposed.filter((l) => !isSectionHeading(l));
  return kept.length === stored.length && kept.every((l, i) => l === stored[i].trim());
}

const words = (l: string) => l.trim().split(/\s+/).filter(Boolean);

// True if `line` is `original` with zero or more words removed (order kept).
function isReduction(original: string, line: string): boolean {
  const o = words(original);
  const w = words(line);
  let i = 0;
  for (const x of w) {
    while (i < o.length && o[i] !== x) i++;
    if (i === o.length) return false;
    i++;
  }
  return true;
}

// Photo mode: every non-heading returned line must be a reduction of the next
// unmatched stored line (lines may be dropped, never added or reworded).
function onlyRemovesWords(stored: string[], proposed: string[]): boolean {
  let i = 0;
  for (const line of proposed) {
    if (isSectionHeading(line)) continue;
    while (i < stored.length && !isReduction(stored[i], line)) i++;
    if (i === stored.length) return false;
    i++;
  }
  return true;
}

// A single heading as the very first line that just repeats the recipe name
// labels the whole list and adds nothing — drop it.
function meaningful(proposed: string[], title: string): string[] {
  const norm = (t: string) => t.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
  const first = proposed[0] ?? "";
  if (isSectionHeading(first) && norm(first.replace(/:$/, "")) === norm(title)) return proposed.slice(1);
  return proposed;
}

(async () => {
  const userId = await userIdForScript(process.argv);
  const rows = (
    await prisma.recipe.findMany({
      where: { userId, deletedAt: null, sourceType: { in: ["url", "photo"] } },
      orderBy: { createdAt: "asc" },
    })
  ).filter((r) => !only || r.title.toLowerCase().includes(only));
  let changed = 0, skipped = 0, failed = 0;
  for (const [i, r] of rows.entries()) {
    const stored = { ingredients: parseList(r.ingredients), instructions: parseList(r.instructions) };
    process.stdout.write(`[${i + 1}/${rows.length}] ${r.title} … `);
    if (r.sourceType === "url" && stored.ingredients.some(isSectionHeading)) {
      console.log("already sectioned");
      skipped++;
      continue;
    }
    try {
      const source: { text?: string; imageDataUrl?: string } = {};
      if (r.sourceType === "url" && r.sourceUrl) {
        source.text = (await fetchUrlText(r.sourceUrl)).text;
      } else if (r.imagePath) {
        const buf = await readFile(uploadFilePath(r.imagePath));
        source.imageDataUrl = `data:image/jpeg;base64,${buf.toString("base64")}`;
      } else {
        console.log("no source");
        skipped++;
        continue;
      }
      const proposed = await askModel(stored, source);
      if (!proposed) throw new Error("no JSON in answer");
      const check = source.imageDataUrl ? onlyRemovesWords : onlyAddsHeadings;
      const ingOk = check(stored.ingredients, proposed.ingredients);
      const insOk = check(stored.instructions, proposed.instructions);
      const newIng = ingOk ? meaningful(proposed.ingredients, r.title) : stored.ingredients;
      const newIns = insOk ? meaningful(proposed.instructions, r.title) : stored.instructions;
      const headings = [...newIng, ...newIns].filter(isSectionHeading);
      const removed = [
        ...stored.ingredients.filter((l) => !newIng.includes(l)),
        ...stored.instructions.filter((l) => !newIns.includes(l)),
      ];
      if (headings.length === 0 && removed.length === 0) {
        console.log(ingOk && insOk ? "no change" : "no change (answer altered lines, ignored)");
        skipped++;
        continue;
      }
      console.log(
        `${dryRun ? "would apply" : "applied"}: ` +
          (headings.length ? `headings ${headings.join(" | ")}` : "") +
          (removed.length ? ` ; crossed-out edits in ${removed.length} line(s)` : "") +
          (!ingOk || !insOk ? " (part ignored: lines altered)" : ""),
      );
      if (!dryRun) {
        await prisma.recipe.update({
          where: { id: r.id },
          data: { ingredients: JSON.stringify(newIng), instructions: JSON.stringify(newIns) },
        });
      }
      changed++;
    } catch (err) {
      failed++;
      console.log(`FAILED: ${err instanceof Error ? err.message.slice(0, 100) : err}`);
    }
  }
  console.log(`\nDone: ${changed} ${dryRun ? "would change" : "changed"}, ${skipped} unchanged, ${failed} failed.`);
  await prisma.$disconnect();
})();
