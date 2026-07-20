// Test text/voice extraction: feed a raw transcript, get a structured draft.
// Run: npx tsx scripts/test-text.ts "spoken run-on recipe text…"
import { extractRecipeFromText } from "@/lib/extractRecipe";

const text = process.argv[2];
if (!text) {
  console.error('Usage: npx tsx scripts/test-text.ts "transcript"');
  process.exit(1);
}

(async () => {
  console.log("Transcript length:", text.length, "chars -> extracting…");
  const d = await extractRecipeFromText(text);
  console.log("\n=== EXTRACTED DRAFT ===");
  console.log("title       :", d.title);
  console.log("servings    :", d.servings ?? "");
  console.log("prep / cook :", d.prepTime ?? "", "/", d.cookTime ?? "");
  console.log("ingredients :", d.ingredients.length);
  d.ingredients.forEach((i) => console.log("   -", i));
  console.log("instructions:", d.instructions.length);
  d.instructions.forEach((s, n) => console.log(`   ${n + 1}. ${s}`));
})().catch((e) => {
  console.error("FAILED:", e.message);
  process.exit(1);
});
