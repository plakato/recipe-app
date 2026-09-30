// Pick the photo that best shows the recipe from the candidate images on its
// web page (URL import). The page's own "main image" is often the author, a
// logo or a banner, so a vision model looks at the candidates and chooses.
// Server-only (network + filesystem + sharp).

import { chooseRecipeImage } from "@/lib/extractRecipe";
import { fetchImage, saveImageBuffer } from "@/lib/saveImage";

// How many candidates to download and show the model (one request).
const MAX_CANDIDATES = 6;
// Size of the copies sent to the model: enough to recognise a dish, cheap to send.
const THUMB_SIZE = 384;

type Usable = { buf: Buffer; ext: string; thumb: string };

// Download a candidate and make a small JPEG copy for the model. Skips images
// too small or too stretched to be a photo of the dish (icons, banners).
async function prepare(url: string): Promise<Usable | null> {
  const image = await fetchImage(url);
  if (!image) return null;
  try {
    const { default: sharp } = await import("sharp");
    const { width = 0, height = 0 } = await sharp(image.buf).metadata();
    if (width < 250 || height < 200) return null;
    if (width / height > 3 || height / width > 3) return null;
    const thumb = await sharp(image.buf)
      .rotate()
      .resize(THUMB_SIZE, THUMB_SIZE, { fit: "inside" })
      .jpeg({ quality: 70 })
      .toBuffer();
    return { ...image, thumb: `data:image/jpeg;base64,${thumb.toString("base64")}` };
  } catch {
    return null; // not decodable
  }
}

// Returns the stored image path, or null when no candidate shows the dish.
export async function pickRecipeImage(dish: string, candidates: string[]): Promise<string | null> {
  const usable = (await Promise.all(candidates.slice(0, MAX_CANDIDATES).map(prepare))).filter(
    (u): u is Usable => u !== null,
  );
  if (usable.length === 0) return null;

  const pick = await chooseRecipeImage(
    dish,
    usable.map((u) => u.thumb),
  );
  if (pick === -1) return null; // the model saw no photo of this dish
  // If no model answered, fall back to the page's first usable image.
  const chosen = usable[pick ?? 0];
  return saveImageBuffer(chosen.buf, chosen.ext);
}
