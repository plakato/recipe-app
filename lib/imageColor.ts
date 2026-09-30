// Tints the shadow behind recipe titles with the photo's own colour: we take
// the most common colour of the image's bottom part (where the title sits)
// and darken it just enough for white text to stay readable.
// Server-only (filesystem + sharp + database).

import { prisma } from "@/lib/prisma";
import { uploadFilePath } from "@/lib/saveImage";

// Fallback when an image has no colour (placeholder, unreadable file): a deep
// rose that matches the app's pink.
export const DEFAULT_SHADOW = "#4a2530";

// Darken a colour so white text on it stays readable: keep the hue, cap the
// saturation (so it doesn't glow) and the lightness.
export function shadowColor(hex: string): string {
  const n = parseInt(hex.replace("#", ""), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => v / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  let h = 0;
  let s = 0;
  if (d) {
    s = d / (1 - Math.abs(2 * l - 1));
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
  }
  return hslToHex(h, Math.min(s, 0.45), Math.min(l, 0.2));
}

function hslToHex(h: number, s: number, l: number): string {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  const [r, g, b] =
    h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] :
    h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return (
    "#" +
    [r, g, b]
      .map((v) => Math.round((v + m) * 255).toString(16).padStart(2, "0"))
      .join("")
  );
}

// Most common colour of the bottom third of the image, as shown in a square
// tile (centre-cropped, like object-cover).
async function bottomColor(imagePath: string): Promise<string | null> {
  try {
    const { default: sharp } = await import("sharp");
    const strip = await sharp(uploadFilePath(imagePath))
      .rotate()
      .resize(60, 60, { fit: "cover" })
      .extract({ left: 0, top: 40, width: 60, height: 20 })
      .png()
      .toBuffer();
    const { dominant } = await sharp(strip).stats();
    return (
      "#" +
      [dominant.r, dominant.g, dominant.b].map((v) => v.toString(16).padStart(2, "0")).join("")
    );
  } catch {
    return null;
  }
}

// Shadow colours for the given image paths. Cached in the ImageColor table;
// any missing ones are computed now (a few at a time) and saved.
export async function getShadowColors(paths: string[]): Promise<Map<string, string>> {
  const unique = [...new Set(paths)];
  const rows = await prisma.imageColor.findMany({ where: { path: { in: unique } } });
  const colors = new Map(rows.map((r) => [r.path, r.color]));

  const missing = unique.filter((p) => !colors.has(p));
  for (let i = 0; i < missing.length; i += 8) {
    await Promise.all(
      missing.slice(i, i + 8).map(async (path) => {
        const color = await bottomColor(path);
        if (!color) return;
        colors.set(path, color);
        await prisma.imageColor.upsert({
          where: { path },
          create: { path, color },
          update: { color },
        });
      }),
    );
  }

  return new Map([...colors].map(([p, c]) => [p, shadowColor(c)]));
}

// Bottom-up fade in the photo's own (darkened) colour, as a CSS background.
export function titleShade(color = DEFAULT_SHADOW) {
  return `linear-gradient(to top, ${color}f0, ${color}99 45%, ${color}00)`;
}
