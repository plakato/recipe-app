// Quick check of image extraction + download only (no model call).
import { fetchUrlText } from "@/lib/fetchUrlText";
import { downloadImageToUploads } from "@/lib/saveImage";

const url = process.argv[2] ?? "https://www.recipetineats.com/banana-bread/";
(async () => {
  const { imageUrl } = await fetchUrlText(url);
  console.log("imageUrl:", imageUrl ?? "(none)");
  if (!imageUrl) return;
  const saved = await downloadImageToUploads(imageUrl);
  console.log("saved   :", saved ?? "(failed)");
})().catch((e) => console.error("FAILED:", e.message));
