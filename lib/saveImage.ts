// Store recipe images under public/uploads and return their public path
// (e.g. "/uploads/abc123.jpg"). Used by URL import (remote download) and photo
// import (user upload). We keep a local copy so images are ours permanently.
// Server-only (filesystem + network).

import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");
const MAX_BYTES = 8 * 1024 * 1024; // 8 MB cap

const EXT_BY_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/avif": "avif",
  // Note: HEIC/HEIF aren't here on purpose — we convert them to JPEG first
  // (browsers can't display HEIC and many models can't read it).
};

// Write bytes to public/uploads with a random name; return the public path.
async function saveBuffer(buf: Buffer, ext: string): Promise<string> {
  await mkdir(UPLOAD_DIR, { recursive: true });
  const filename = `${randomUUID()}.${ext}`;
  await writeFile(path.join(UPLOAD_DIR, filename), buf);
  return `/uploads/${filename}`;
}

// Download a remote image (URL import). Returns public path or null on failure.
export async function downloadImageToUploads(
  imageUrl: string,
): Promise<string | null> {
  try {
    const res = await fetch(imageUrl, {
      redirect: "follow",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; FamilyRecipes/1.0; +http://localhost)",
        Accept: "image/*",
      },
    });
    if (!res.ok) return null;

    const type = (res.headers.get("content-type") ?? "").split(";")[0].trim();
    const ext = EXT_BY_TYPE[type];
    if (!ext) return null;

    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.byteLength === 0 || buf.byteLength > MAX_BYTES) return null;
    return await saveBuffer(buf, ext);
  } catch {
    return null;
  }
}

// Save an uploaded photo (photo import). Returns both the public path to store
// on the recipe and a base64 data URL to send to the vision model.
// Longest edge we downscale photos to. Big enough to read text/handwriting,
// small enough to keep memory, upload size, and model cost/latency low.
const MAX_DIMENSION = 2000;

export async function saveUploadedImage(
  file: File,
): Promise<{ imagePath: string; dataUrl: string } | null> {
  const type = (file.type ?? "").split(";")[0].trim();
  let buf = Buffer.from(await file.arrayBuffer());
  if (buf.byteLength === 0 || buf.byteLength > MAX_BYTES) return null;

  // iPhone photos are often HEIC/HEIF. Browsers can't display them and sharp's
  // libvips here can't decode HEVC, so convert to JPEG with heic-convert first.
  // The type is sometimes empty on these, so also sniff the filename.
  const isHeic =
    type === "image/heic" ||
    type === "image/heif" ||
    /\.hei[cf]$/i.test(file.name ?? "");
  if (isHeic) {
    try {
      const { default: convert } = await import("heic-convert");
      const out = await convert({ buffer: buf, format: "JPEG", quality: 0.92 });
      buf = Buffer.from(out);
    } catch {
      return null; // conversion failed — treated as unsupported
    }
  } else if (!EXT_BY_TYPE[type]) {
    return null; // not an image type we accept
  }

  // Downscale + re-encode to a modest JPEG. This is the single biggest fix for
  // "out of memory": full-res photos become huge base64 payloads. It also makes
  // reading faster and cheaper. Auto-rotate honors the photo's EXIF orientation.
  // isJpeg tracks the true output format so the file extension can't lie.
  let isJpeg = isHeic; // HEIC was already converted to JPEG above
  try {
    const { default: sharp } = await import("sharp");
    buf = await sharp(buf)
      .rotate()
      .resize(MAX_DIMENSION, MAX_DIMENSION, {
        fit: "inside",
        withoutEnlargement: true,
      })
      .jpeg({ quality: 82 })
      .toBuffer();
    isJpeg = true;
  } catch {
    // sharp couldn't process it: keep the buffer as-is. HEIC is already JPEG;
    // other accepted types keep their original extension/mime below.
  }

  const ext = isJpeg ? "jpg" : EXT_BY_TYPE[type] ?? "jpg";
  const outType = isJpeg ? "image/jpeg" : type;
  const imagePath = await saveBuffer(buf, ext);
  const dataUrl = `data:${outType};base64,${buf.toString("base64")}`;
  return { imagePath, dataUrl };
}
