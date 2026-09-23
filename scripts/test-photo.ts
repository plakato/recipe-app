// Ad-hoc test of vision extraction from a local image file.
// Run: npx tsx scripts/test-photo.ts <path-to-image> [model] [language]
// e.g.  npx tsx scripts/test-photo.ts photo.jpg google/gemini-2.5-flash Slovak
import { readFile } from "node:fs/promises";
import { extractRecipeFromImage } from "@/lib/extractRecipe";

const path = process.argv[2];
if (!path) {
  console.error("Usage: npx tsx scripts/test-photo.ts <image> [model] [language]");
  process.exit(1);
}

(async () => {
  const buf = await readFile(path);
  const ext = path.split(".").pop()?.toLowerCase();
  const type = ext === "png" ? "image/png" : "image/jpeg";
  const dataUrl = `data:${type};base64,${buf.toString("base64")}`;
  const model = process.argv[3]; // optional model override
  const language = process.argv[4] ?? "English"; // optional language hint
  console.log(
    "Image bytes:",
    buf.byteLength,
    "-> extracting via",
    model ?? "default free model",
    `(language: ${language})`,
    "…",
  );
  const draft = await extractRecipeFromImage(dataUrl, language, model);
  console.log("\n=== EXTRACTED DRAFT ===");
  console.log("title       :", draft.title);
  console.log("servings    :", draft.servings ?? "");
  console.log("prep / bake :", draft.prepTime ?? "", "/", draft.cookTime ?? "");
  console.log("ingredients :", draft.ingredients.length);
  draft.ingredients.forEach((i) => console.log("   -", i));
  console.log("instructions:", draft.instructions.length);
  draft.instructions.forEach((s, n) => console.log(`   ${n + 1}. ${s}`));
})().catch((e) => {
  console.error("FAILED:", e.message);
  process.exit(1);
});
