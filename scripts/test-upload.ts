// Test the full upload pipeline (HEIC convert + downscale) without the browser.
// Run: npx tsx scripts/test-upload.ts <image>
import { readFile } from "node:fs/promises";
import { saveUploadedImage } from "@/lib/saveImage";

const path = process.argv[2];
if (!path) {
  console.error("Usage: npx tsx scripts/test-upload.ts <image>");
  process.exit(1);
}

(async () => {
  const buf = await readFile(path);
  const name = path.split("/").pop() ?? "photo";
  const type = /\.hei[cf]$/i.test(name) ? "image/heic" : "image/jpeg";
  const file = new File([buf], name, { type });
  console.log(`input: ${name} (${type}), ${buf.byteLength} bytes`);

  const before = process.memoryUsage().rss;
  const result = await saveUploadedImage(file);
  const after = process.memoryUsage().rss;

  if (!result) {
    console.log("RESULT: null (rejected)");
    return;
  }
  const b64 = result.dataUrl.length;
  console.log("saved path      :", result.imagePath);
  console.log("dataUrl length  :", b64, "chars (~", Math.round(b64 / 1024), "KB )");
  console.log("peak RSS delta  :", Math.round((after - before) / 1024 / 1024), "MB");
})().catch((e) => {
  console.error("FAILED:", e.message);
  process.exit(1);
});
