// The dish picture of a recipe read from photos (lib/extractRecipe.ts →
// extractRecipesFromPhotos): cut it out of the photo where the model saw it,
// and check it really shows food. Models sometimes draw the box on text; then
// the dish is looked for once more, on its own, before giving up. A crop from
// a page photographed sideways is turned upright. Server-only.

import { checkCrop, locateDish, type PageRecipe, type Turn } from "@/lib/extractRecipe";
import { cropPhoto, smallDataUrl } from "@/lib/saveImage";

type Photo = { buf: Buffer; dataUrl: string };

// The cropped JPEG, or null (no dish photo, or none that passed the check).
// `others`: titles of the other recipes read from the same photos.
export async function cropDish(recipe: PageRecipe, photos: Photo[], others: string[]): Promise<Buffer | null> {
  if (!recipe.dish) return null;
  const photo = photos[recipe.dish.photo];
  const first = await checked(await cropPhoto(photo.buf, recipe.dish.box), recipe.title);
  if (first) return first;
  const box = await locateDish(photo.dataUrl, recipe.title, others);
  return box ? checked(await cropPhoto(photo.buf, box), recipe.title) : null;
}

// The crop if it shows the dish (turned upright), else null.
async function checked(crop: Buffer | null, title: string): Promise<Buffer | null> {
  if (!crop) return null;
  const { dish, turn } = await checkCrop(await smallDataUrl(crop), title);
  if (!dish) return null;
  return turn ? turned(crop, turn) : crop;
}

async function turned(buf: Buffer, turn: Turn): Promise<Buffer> {
  const { default: sharp } = await import("sharp");
  return sharp(buf).rotate(turn).jpeg({ quality: 88 }).toBuffer();
}
