import { after } from "next/server";
import { userForChange } from "@/lib/demoSession";
import { refundImport, reserveImport } from "@/lib/aiBudget";
import { isSameOrigin } from "@/lib/auth-forms";
import { runHousekeeping } from "@/lib/housekeeping";
import { MAX_PHOTOS } from "@/lib/features";
import { prepareAndRead, startReading } from "@/lib/photoReading";
import type { PhotoImportResult } from "@/app/actions";

// Photo import (components/PhotoImport.tsx): takes the photos and starts
// reading them in the background (lib/photoReading.ts) — converting and
// reading happen after the answer. A Route Handler, not a Server Action: the
// browser sends Server Actions one at a time, so a slow upload would hold up
// the next photos, the reading list and its buttons.
export async function POST(request: Request): Promise<Response> {
  const answer = (result: PhotoImportResult | (PhotoImportResult & { signIn: true }), status = 200) =>
    Response.json(result, { status });
  if (!isSameOrigin(request)) return answer({ ok: false, error: "Požiadavka z inej stránky." }, 403);
  const startedAt = Date.now();
  const formData = await request.formData().catch(() => null);
  if (!formData) {
    return answer({ ok: false, error: "Fotky neprišli celé. Skúste to prosím znova." }, 400);
  }
  const files = formData.getAll("photo").filter((f): f is File => f instanceof File && f.size > 0);
  if (files.length === 0) return answer({ ok: false, error: "Najprv prosím vyberte fotku." }, 400);
  if (files.length > MAX_PHOTOS) return answer({ ok: false, error: `Naraz najviac ${MAX_PHOTOS} fotiek, prosím.` }, 400);
  // A visitor's demo starts here, at their first change (lib/demoSession.ts).
  const who = await userForChange(formData);
  if (!who) return answer({ ok: false, error: "Prihláste sa prosím.", signIn: true }, 401);
  if ("error" in who) return answer({ ok: false, error: who.error }, 403);
  // One import, however many photos (they are read in one request).
  const slot = await reserveImport(who.user);
  if ("error" in slot) return answer({ ok: false, error: slot.error }, 429);
  after(runHousekeeping);
  const uploads = await Promise.all(
    files.map(async (f) => ({ buf: Buffer.from(await f.arrayBuffer()), type: f.type, name: f.name })),
  ).catch(() => null);
  if (!uploads) {
    await refundImport(slot.id);
    return answer({ ok: false, error: "Fotky neprišli celé. Skúste to prosím znova." }, 400);
  }
  const reader = { userId: slot.userId, isGuest: slot.isGuest };
  const readingId = await startReading(reader);
  after(() => prepareAndRead(readingId, slot.id, reader, uploads, startedAt));
  return answer({ ok: true, readingId });
}
