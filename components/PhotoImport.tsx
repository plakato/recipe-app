"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import Turnstile from "@/components/Turnstile";
import ReadingList from "@/components/ReadingList";
import { MAX_PHOTOS } from "@/lib/features";
import type { ReadingListData, Sending } from "@/lib/readingList";

const MAX_BYTES = 8 * 1024 * 1024; // per photo, as on the server (lib/saveImage.ts)

type Picked = { file: File; url: string | null };

const LOST = "Spojenie so serverom sa prerušilo. Skúste to prosím znova.";

// Send photos to app/api/photos (not a Server Action: the browser sends those
// one at a time, so a slow upload would hold up everything else), telling
// how far it got. Never throws.
function sendPhotos(
  form: FormData,
  onProgress: (percent: number) => void,
): Promise<{ ok: true; readingId: string } | { ok: false; error: string; signIn?: boolean }> {
  return new Promise((resolve) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/photos");
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(Math.round((e.loaded / e.total) * 100));
    xhr.onload = () => {
      try {
        const body = JSON.parse(xhr.responseText);
        if (body?.ok && typeof body.readingId === "string") return resolve({ ok: true, readingId: body.readingId });
        resolve({ ok: false, error: typeof body?.error === "string" ? body.error : LOST, signIn: !!body?.signIn });
      } catch {
        resolve({ ok: false, error: LOST });
      }
    };
    xhr.onerror = () => resolve({ ok: false, error: LOST });
    xhr.send(form);
  });
}

const pickButton =
  "flex-1 rounded-xl border-2 border-dashed border-stone-300 px-4 py-8 text-center text-stone-500 transition hover:border-olive-400 hover:text-stone-700 disabled:opacity-50 dark:border-stone-700 dark:hover:text-stone-300";

// Photo import: one or more photos taken together — a recipe over several
// pages, a page plus a picture of the dish, a page with several recipes.
// Sending them clears the photos at once for the next ones: they go on their
// way in the background ("Nahrávam…" at the top of the list), several at a
// time if need be; once there, a reading starts (lib/photoReading.ts). The
// readings are listed under the button (components/ReadingList.tsx), each to
// review or keep once read.
// botCheckKey: set for visitors (demo). The invisible bot check runs while
// they pick photos; reading starts only once it has passed, and their demo
// begins with that first reading (app/api/photos) — until it has, they wait.
export default function PhotoImport({
  botCheckKey = null,
  readings,
}: {
  botCheckKey?: string | null;
  readings: ReadingListData;
}) {
  const router = useRouter();
  const [botToken, setBotToken] = useState<string | null>(null);
  const [botAttempt, setBotAttempt] = useState(0);
  // After the first reading the visitor is signed in to their demo.
  const [needsBotCheck, setNeedsBotCheck] = useState(!!botCheckKey);
  const [picked, setPicked] = useState<Picked[]>([]);
  // Photos sent from this page, newest first, until the list has them.
  const [sending, setSending] = useState<Sending[]>([]);
  const [error, setError] = useState<string | null>(null);
  // How many readings this page sent (the list then asks for the new one).
  const [sent, setSent] = useState(0);
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  // Free the previews when leaving the page.
  const pickedRef = useRef(picked);
  useEffect(() => {
    pickedRef.current = picked;
  }, [picked]);
  useEffect(() => () => pickedRef.current.forEach((p) => p.url && URL.revokeObjectURL(p.url)), []);

  function add(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = ""; // the same photo can be picked again after removing it
    if (!files.length) return;
    setError(null);
    const tooBig = files.find((f) => f.size > MAX_BYTES);
    if (tooBig) setError(`Fotka ${tooBig.name} je príliš veľká (najviac 8 MB).`);
    const usable = files.filter((f) => f.size <= MAX_BYTES);
    const room = MAX_PHOTOS - picked.length;
    if (usable.length > room) setError(`Naraz najviac ${MAX_PHOTOS} fotiek.`);
    setPicked([
      ...picked,
      ...usable.slice(0, Math.max(0, room)).map((file) => ({
        file,
        // HEIC often can't be previewed by the browser; show its name instead.
        url: /\.hei[cf]$/i.test(file.name) ? null : URL.createObjectURL(file),
      })),
    ]);
  }

  function remove(i: number) {
    const p = picked[i];
    if (p.url) URL.revokeObjectURL(p.url);
    setPicked(picked.filter((_, j) => j !== i));
    setError(null);
  }

  const update = (key: string, change: Partial<Sending>) =>
    setSending((list) => list.map((s) => (s.key === key ? { ...s, ...change } : s)));

  async function send(key: string, files: File[]) {
    const formData = new FormData();
    for (const f of files) formData.append("photo", f);
    if (needsBotCheck && botToken) formData.append("cf-turnstile-response", botToken);
    update(key, { progress: 0, error: null });
    const result = await sendPhotos(formData, (progress) => update(key, { progress }));
    if (result.ok) {
      setNeedsBotCheck(false);
      // The photos are no longer needed here; the list shows the reading.
      update(key, { readingId: result.readingId, files: [] });
      setSent((n) => n + 1);
    } else {
      if (result.signIn) router.push("/login?next=%2Frecipes%2Fimport%2Fphoto");
      update(key, { error: result.error });
      // The token was used: get a fresh one for the next try.
      setBotToken(null);
      setBotAttempt((n) => n + 1);
    }
  }

  function handleExtract() {
    if (!picked.length) return;
    setError(null);
    const key = crypto.randomUUID();
    const files = picked.map((p) => p.file);
    setSending((list) => [{ key, files, at: Date.now(), progress: 0, error: null, readingId: null }, ...list]);
    picked.forEach((p) => p.url && URL.revokeObjectURL(p.url));
    setPicked([]);
    send(key, files);
  }

  function resend(key: string) {
    const s = sending.find((x) => x.key === key);
    if (s) send(key, s.files);
  }

  // A visitor's first photos start their demo: the next ones wait for that.
  const waitingForDemo = needsBotCheck && sending.some((s) => !s.readingId && !s.error);
  const full = picked.length >= MAX_PHOTOS;
  return (
    <div className="space-y-4">
      {/* On phones the first opens the camera; the second the photo library. */}
      <input ref={cameraRef} type="file" accept="image/*,.heic,.heif" capture="environment" onChange={add} className="hidden" />
      <input ref={galleryRef} type="file" accept="image/*,.heic,.heif" multiple onChange={add} className="hidden" />

      <div className="flex flex-wrap gap-3">
        <button type="button" onClick={() => cameraRef.current?.click()} disabled={full} className={pickButton}>
          📷 {picked.length ? "Odfotiť ďalšiu" : "Odfotiť"}
        </button>
        <button type="button" onClick={() => galleryRef.current?.click()} disabled={full} className={pickButton}>
          🖼️ Vybrať z galérie
        </button>
      </div>
      <p className="text-sm text-stone-500">
        Ak recept pokračuje na ďalšej strane alebo máte aj fotku hotového jedla, pridajte všetky
        fotky naraz (najviac {MAX_PHOTOS}).
      </p>

      {picked.length > 0 && (
        <ol className="grid grid-cols-3 gap-3 sm:grid-cols-5">
          {picked.map((p, i) => (
            <li key={p.url ?? `${p.file.name}-${i}`} className="relative">
              {p.url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.url} alt={`Fotka ${i + 1}`} className="aspect-[3/4] w-full rounded-lg object-cover" />
              ) : (
                <div className="flex aspect-[3/4] w-full items-center justify-center break-all rounded-lg bg-stone-100 p-2 text-center text-xs text-stone-500 dark:bg-stone-800">
                  {p.file.name}
                </div>
              )}
              <span className="absolute left-1.5 top-1.5 rounded bg-black/60 px-1.5 text-xs font-medium text-white">
                {i + 1}
              </span>
              <button
                type="button"
                onClick={() => remove(i)}
                title="Odstrániť"
                aria-label={`Odstrániť fotku ${i + 1}`}
                className="absolute right-1.5 top-1.5 rounded bg-black/60 p-0.5 text-white hover:bg-black/80"
              >
                <X className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ol>
      )}

      {error && (
        <p className="rounded-lg border border-brick-200 bg-brick-50 px-4 py-3 text-sm text-brick-700 dark:border-brick-900/50 dark:bg-brick-950/30 dark:text-brick-300">
          {error}
        </p>
      )}

      {botCheckKey && needsBotCheck && (
        <Turnstile key={botAttempt} siteKey={botCheckKey} action="demo" onToken={setBotToken} />
      )}
      <button
        type="button"
        onClick={handleExtract}
        disabled={!picked.length || waitingForDemo || (needsBotCheck && !botToken)}
        className="rounded-lg bg-olive-600 px-5 py-2.5 font-medium text-white shadow-sm transition hover:bg-olive-700 disabled:opacity-60"
      >
        {picked.length > 1 ? `Prečítať recept z ${picked.length} fotiek` : "Prečítať recept z fotky"}
      </button>

      <ReadingList
        initial={readings}
        sent={sent}
        sending={sending}
        onResend={resend}
        onForget={(key) => setSending((list) => list.filter((s) => s.key !== key))}
      />
    </div>
  );
}
