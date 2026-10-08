// The dish picture of a recipe read from photos (lib/extractRecipe.ts →
// extractRecipesFromPhotos): cut it out of the photo where the model saw it,
// and check it really shows food. Models sometimes draw the box on text; then
// the dish is looked for once more, on its own, before giving up. Server-only.

import { cropShowsDish, locateDish, type PageRecipe } from "@/lib/extractRecipe";
import { cropPhoto, smallDataUrl } from "@/lib/saveImage";

type Photo = { buf: Buffer; dataUrl: string };

// The cropped JPEG, or null (no dish photo, or none that passed the check).
// `others`: titles of the other recipes read from the same photos.
export async function cropDish(recipe: PageRecipe, photos: Photo[], others: string[]): Promise<Buffer | null> {
  if (!recipe.dish) return null;
  const photo = photos[recipe.dish.photo];
  const first = await cropPhoto(photo.buf, recipe.dish.box);
  if (first && (await cropShowsDish(await smallDataUrl(first), recipe.title))) return first;
  const box = await locateDish(photo.dataUrl, recipe.title, others);
  if (!box) return null;
  const second = await cropPhoto(photo.buf, box);
  return second && (await cropShowsDish(await smallDataUrl(second), recipe.title)) ? second : null;
}
