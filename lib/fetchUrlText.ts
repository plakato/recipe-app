// Fetch a web page and reduce it to text suitable for recipe extraction.
// Recipe sites usually embed a schema.org Recipe as JSON-LD; that is the
// cleanest signal, so we surface it first, then fall back to visible text.
// Server-only (uses fetch against arbitrary URLs).

import { safeFetch } from "@/lib/safeFetch";

const MAX_CHARS = 12000;

export function stripTags(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n\s*\n+/g, "\n\n")
    .trim();
}

// Find the recipe's lead image: prefer the schema.org JSON-LD "image", then the
// Open Graph og:image meta tag. Returns an absolute URL or null.
export function extractImageUrl(html: string, base: string): string | null {
  const pick = (raw: string | undefined | null): string | null => {
    if (!raw) return null;
    // JSON-LD escapes forward slashes as \/ and may use & for &.
    const cleaned = raw
      .trim()
      .replace(/\\\//g, "/")
      .replace(/\\u0026/gi, "&");
    try {
      return new URL(cleaned, base).href;
    } catch {
      return null;
    }
  };

  // JSON-LD: "image" can be a string, an object with "url", or an array of those.
  const ld = html.match(
    /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/i,
  )?.[1];
  if (ld) {
    const m =
      ld.match(/"image"\s*:\s*"([^"]+)"/i) ||
      ld.match(/"image"\s*:\s*\[\s*"([^"]+)"/i) ||
      ld.match(/"image"\s*:\s*\{[^}]*?"url"\s*:\s*"([^"]+)"/i);
    const found = pick(m?.[1]);
    if (found) return found;
  }

  // Open Graph fallback (property/content in either order).
  const og =
    html.match(
      /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i,
    ) ||
    html.match(
      /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i,
    );
  return pick(og?.[1]);
}

// Things in an image's URL or tag that mean it isn't a photo of the dish.
const NOT_FOOD =
  /(?:^|[^a-z])(?:logo|avatar|icons?|badge|banner|sprite|pixel|author|profile|headshot|gravatar|emoji|spacer|placeholder|ads?)(?:[^a-z]|$)|1x1/i;

// Every plausible photo of the recipe on the page, best guesses first:
// images in the schema.org Recipe data, then the share images (og:/twitter:),
// then large <img> photos in the page (including lazy-loaded ones).
// Returns absolute, de-duplicated URLs, at most `limit`.
export function extractImageCandidates(html: string, base: string, limit = 10): string[] {
  const out: string[] = [];
  const add = (raw?: string | null) => {
    if (!raw || out.length >= limit) return;
    const cleaned = raw.trim().replace(/\\\//g, "/").replace(/\\u0026/gi, "&").replace(/&amp;/g, "&");
    if (!cleaned || cleaned.startsWith("data:")) return;
    let url: URL;
    try {
      url = new URL(cleaned, base);
    } catch {
      return; // not a URL
    }
    // "#primaryimage"-style values are references inside the JSON-LD, not images.
    if (!/^https?:$/.test(url.protocol) || url.hash) return;
    const u = url.href;
    if (/\.svg($|\?)/i.test(u) || NOT_FOOD.test(u)) return;
    // WordPress-style size suffix ("dish-500x375.jpg"): skip thumbnails, and
    // treat other sizes of an image already listed as the same photo.
    const size = url.pathname.match(/-(\d+)x(\d+)(\.\w+)$/);
    if (size && (Number(size[1]) < 250 || Number(size[2]) < 200)) return;
    const photo = (href: string) => href.replace(/-\d+x\d+(\.\w+)(\?.*)?$/, "$1");
    if (out.some((o) => photo(o) === photo(u))) return;
    out.push(u);
  };

  // 1. JSON-LD "image" values (string, array of strings, or {url}) in Recipe blocks first.
  const ldBlocks = [
    ...html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi),
  ].map((m) => m[1]);
  ldBlocks.sort((a, b) => Number(/"Recipe"/.test(b)) - Number(/"Recipe"/.test(a)));
  for (const ld of ldBlocks) {
    for (const m of ld.matchAll(/"image"\s*:\s*(\[[^\]]*\]|\{[^}]*\}|"[^"]*")/gi)) {
      for (const u of m[1].matchAll(/(?:"url"\s*:\s*)?"(https?:[^"]+|\/[^"]+)"/gi)) add(u[1]);
    }
  }

  // 2. Share images, attributes in either order.
  for (const m of html.matchAll(/<meta[^>]+(?:property|name)=["'](?:og:image|twitter:image)(?::src)?["'][^>]+content=["']([^"']+)["']/gi)) add(m[1]);
  for (const m of html.matchAll(/<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["'](?:og:image|twitter:image)(?::src)?["']/gi)) add(m[1]);

  // 3. Large photos in the page. Lazy loaders keep the real URL in data-*.
  for (const m of html.matchAll(/<img\b[^>]*>/gi)) {
    const tag = m[0];
    const attrs = [...tag.matchAll(/\b(?:class|id|alt)=["']([^"']*)["']/gi)].map((a) => a[1]).join(" ");
    if (NOT_FOOD.test(attrs)) continue;
    const w = Number(tag.match(/\bwidth=["']?(\d+)/i)?.[1] ?? 0);
    const h = Number(tag.match(/\bheight=["']?(\d+)/i)?.[1] ?? 0);
    if ((w && w < 250) || (h && h < 200)) continue;
    const srcset = tag.match(/\b(?:data-)?srcset=["']([^"']+)["']/i)?.[1];
    const largest = srcset
      ?.split(",")
      .map((c) => c.trim().split(/\s+/))
      .sort((a, b) => parseInt(b[1] ?? "0") - parseInt(a[1] ?? "0"))[0]?.[0];
    const src =
      tag.match(/\bdata-(?:lazy-)?src=["']([^"']+)["']/i)?.[1] ??
      largest ??
      tag.match(/\bsrc=["']([^"']+)["']/i)?.[1];
    if (src && /\.gif($|\?)/i.test(src)) continue;
    add(src);
  }
  return out;
}

// Collect the contents of any <script type="application/ld+json"> blocks.
export function extractJsonLd(html: string): string {
  const blocks: string[] = [];
  const re =
    /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const body = m[1].trim();
    if (body.toLowerCase().includes("recipe")) blocks.push(compactJsonLd(body));
  }
  return blocks.join("\n\n");
}

// Keys that never carry recipe content but can be enormous (photo galleries,
// hundreds of reviews, author bios). Dropping them keeps the recipe itself
// inside the MAX_CHARS budget sent to the model.
const NOISY_LD_KEYS = new Set([
  "image", "thumbnailUrl", "hasPart", "video", "review", "aggregateRating",
  "comment", "author", "publisher", "mainEntityOfPage", "isPartOf",
  "potentialAction", "breadcrumb", "sameAs", "logo",
]);

function stripNoisy(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stripNoisy);
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (!NOISY_LD_KEYS.has(k)) out[k] = stripNoisy(v);
    }
    return out;
  }
  return value;
}

// Re-serialize a JSON-LD block without its noisy keys. If it doesn't parse,
// return it unchanged.
export function compactJsonLd(body: string): string {
  try {
    return JSON.stringify(stripNoisy(JSON.parse(body)), null, 1);
  } catch {
    return body;
  }
}

// Video pages (YouTube) render almost no visible text server-side, but the
// recipe is usually in the description, which the page embeds as JSON
// ("shortDescription"). Pull it out so the extractor sees it first.
export function extractVideoDescription(html: string): string {
  const m = html.match(/"shortDescription":"((?:[^"\\]|\\.)*)"/);
  if (!m) return "";
  try {
    return String(JSON.parse(`"${m[1]}"`)).trim();
  } catch {
    return "";
  }
}

export type FetchedPage = {
  text: string;
  // The page's main image by its own markup (JSON-LD/og:image) — may not be food.
  imageUrl: string | null;
  // Every plausible recipe photo on the page, best guesses first.
  imageCandidates: string[];
  // The page's <title>, a good description of the dish for picking a photo.
  title: string;
};

export async function fetchUrlText(url: string): Promise<FetchedPage> {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error("That doesn't look like a valid URL.");
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("Only http(s) URLs are supported.");
  }

  let res: Response;
  try {
    // safeFetch refuses private/internal addresses and checks each redirect.
    res = await safeFetch(parsed, {
      headers: {
        // Some sites block requests without a browser-like User-Agent.
        "User-Agent":
          "Mozilla/5.0 (compatible; FamilyRecipes/1.0; +http://localhost)",
        Accept: "text/html,application/xhtml+xml",
      },
    });
  } catch (err) {
    if (err instanceof Error && /reachable|resolve|redirects|supported/.test(err.message)) {
      throw err;
    }
    throw new Error("Could not reach that URL.");
  }
  if (!res.ok) {
    throw new Error(`The page returned HTTP ${res.status}.`);
  }

  const html = await res.text();
  const jsonLd = extractJsonLd(html);
  const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.trim() ?? "";
  const visible = stripTags(html);
  const imageUrl = extractImageUrl(html, res.url || parsed.href);
  const imageCandidates = extractImageCandidates(html, res.url || parsed.href);

  const videoDescription = extractVideoDescription(html);

  const parts = [
    title && `Page title: ${title}`,
    videoDescription && `Video description:\n${videoDescription}`,
    jsonLd && `Structured recipe data (JSON-LD):\n${jsonLd}`,
    `Page text:\n${visible}`,
  ].filter(Boolean);

  const combined = parts.join("\n\n");
  const text =
    combined.length > MAX_CHARS ? combined.slice(0, MAX_CHARS) : combined;
  return { text, imageUrl, imageCandidates, title: stripTags(title) };
}
