// Ad-hoc test of the real URL-import pipeline (fetch -> extract).
// Run: npx tsx scripts/test-url-import.ts <url>
import { fetchUrlText } from "@/lib/fetchUrlText";
import { extractRecipeFromText } from "@/lib/extractRecipe";
import { downloadImageToUploads } from "@/lib/saveImage";

const url = process.argv[2];
if (!url) {
  console.error("Usage: npx tsx scripts/test-url-import.ts <url>");
  process.exit(1);
}

(async () => {
  console.log("Fetching:", url);
  const { text, imageUrl } = await fetchUrlText(url);
  console.log("Fetched text length:", text.length, "chars");
  console.log("Image URL found  :", imageUrl ?? "(none)");
  if (imageUrl) {
    const saved = await downloadImageToUploads(imageUrl);
    console.log("Downloaded to    :", saved ?? "(failed — placeholder will show)");
  }
  console.log("Extracting via OpenRouter…");
  const draft = await extractRecipeFromText(text);
  console.log("\n=== EXTRACTED DRAFT ===");
  console.log("title       :", draft.title);
  console.log("description :", draft.description ?? "");
  console.log("servings    :", draft.servings ?? "");
  console.log("prep / cook :", draft.prepTime ?? "", "/", draft.cookTime ?? "");
  console.log("ingredients :", draft.ingredients.length);
  draft.ingredients.slice(0, 6).forEach((i) => console.log("   -", i));
  if (draft.ingredients.length > 6) console.log("   … +", draft.ingredients.length - 6, "more");
  console.log("instructions:", draft.instructions.length);
  draft.instructions.slice(0, 3).forEach((s, n) => console.log(`   ${n + 1}. ${s}`));
  if (draft.instructions.length > 3) console.log("   … +", draft.instructions.length - 3, "more");
})().catch((e) => {
  console.error("FAILED:", e.message);
  process.exit(1);
});
