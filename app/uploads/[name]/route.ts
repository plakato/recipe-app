// Serve stored recipe photos from UPLOAD_DIR. In development the files sit in
// public/uploads and Next serves them statically before this route is reached;
// in production UPLOAD_DIR points outside the checkout and this route serves
// them. Signed-in people may open photos; visitors only the photos of the
// public showcase recipes (lib/showcase.ts). Checked here, not just in proxy.ts.
import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { visibleRecipes } from "@/lib/features";
import { getShowcaseUserId } from "@/lib/showcase";
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
  const { name } = await params;
  if (!(await getSessionUser()) && !(await isShowcasePhoto(name))) {
    return new NextResponse("Sign in required.", { status: 401 });
  }
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

// Is this photo used by one of the public showcase recipes?
async function isShowcasePhoto(name: string): Promise<boolean> {
  const showcase = await getShowcaseUserId();
  if (!showcase) return false;
  const used = await prisma.recipe.count({
    where: { userId: showcase, deletedAt: null, ...visibleRecipes, imagePath: `/uploads/${name}` },
  });
  return used > 0;
}
