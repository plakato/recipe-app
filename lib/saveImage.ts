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
export async function saveUploadedImage(
  file: File,
): Promise<{ imagePath: string; dataUrl: string } | null> {
  let type = (file.type ?? "").split(";")[0].trim();
  let buf = Buffer.from(await file.arrayBuffer());
  if (buf.byteLength === 0 || buf.byteLength > MAX_BYTES) return null;

  // iPhone photos are often HEIC/HEIF. Browsers can't display them and many
  // models can't read them, so convert to JPEG first. The type is sometimes
  // empty on these, so also sniff the filename.
  const isHeic =
    type === "image/heic" ||
    type === "image/heif" ||
    /\.hei[cf]$/i.test(file.name ?? "");
  if (isHeic) {
    try {
      const { default: convert } = await import("heic-convert");
      const out = await convert({ buffer: buf, format: "JPEG", quality: 0.9 });
      buf = Buffer.from(out);
      type = "image/jpeg";
    } catch {
      return null; // conversion failed — treated as unsupported
    }
  }

  const ext = EXT_BY_TYPE[type];
  if (!ext) return null;

  const imagePath = await saveBuffer(buf, ext);
  const dataUrl = `data:${type};base64,${buf.toString("base64")}`;
  return { imagePath, dataUrl };
}
