// Fetch a web page and reduce it to text suitable for recipe extraction.
// Recipe sites usually embed a schema.org Recipe as JSON-LD; that is the
// cleanest signal, so we surface it first, then fall back to visible text.
// Server-only (uses fetch against arbitrary URLs).

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

// Collect the contents of any <script type="application/ld+json"> blocks.
export function extractJsonLd(html: string): string {
  const blocks: string[] = [];
  const re =
    /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const body = m[1].trim();
    if (body.toLowerCase().includes("recipe")) blocks.push(body);
  }
  return blocks.join("\n\n");
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

export type FetchedPage = { text: string; imageUrl: string | null };

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
    res = await fetch(parsed, {
      redirect: "follow",
      headers: {
        // Some sites block requests without a browser-like User-Agent.
        "User-Agent":
          "Mozilla/5.0 (compatible; FamilyRecipes/1.0; +http://localhost)",
        Accept: "text/html,application/xhtml+xml",
      },
    });
  } catch {
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
  return { text, imageUrl };
}
