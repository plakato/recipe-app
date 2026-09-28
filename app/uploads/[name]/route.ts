// Serve stored recipe photos from UPLOAD_DIR. In development the files sit in
// public/uploads and Next serves them statically before this route is reached;
// in production UPLOAD_DIR points outside the checkout and this route serves
// them. proxy.ts already requires a session for /uploads/*, and we verify it
// again here since this is application code.
import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { UPLOAD_DIR } from "@/lib/saveImage";

const TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  avif: "image/avif",
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ name: string }> },
) {
  if (!(await getSessionUser())) {
    return new NextResponse("Sign in required.", { status: 401 });
  }
  const { name } = await params;
  // Only plain "<uuid>.<ext>" names: no path separators, no traversal.
  if (!/^[a-zA-Z0-9-]+\.[a-z0-9]+$/.test(name)) {
    return new NextResponse("Not found.", { status: 404 });
  }
  const type = TYPES[path.extname(name).slice(1).toLowerCase()];
  if (!type) return new NextResponse("Not found.", { status: 404 });
  try {
    const buf = await readFile(path.join(UPLOAD_DIR, name));
    return new NextResponse(new Uint8Array(buf), {
      headers: {
        "Content-Type": type,
        "Cache-Control": "private, max-age=86400",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new NextResponse("Not found.", { status: 404 });
  }
}
