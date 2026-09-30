import { describe, it, expect } from "vitest";
import {
  stripTags,
  extractVideoDescription,
  compactJsonLd,
  extractImageUrl,
  extractImageCandidates,
  extractJsonLd,
} from "@/lib/fetchUrlText";

const BASE = "https://site.com/recipes/cake";

describe("extractImageUrl", () => {
  it("unescapes JSON-LD forward slashes (regression for //tachyon// bug)", () => {
    const html =
      '<script type="application/ld+json">{"@type":"Recipe","image":"https:\\/\\/site.com\\/img\\/cake.jpg"}</script>';
    expect(extractImageUrl(html, BASE)).toBe("https://site.com/img/cake.jpg");
  });
  it("reads image as a JSON-LD array", () => {
    const html =
      '<script type="application/ld+json">{"image":["https://site.com/a.jpg","https://site.com/b.jpg"]}</script>';
    expect(extractImageUrl(html, BASE)).toBe("https://site.com/a.jpg");
  });
  it("reads image as a JSON-LD object with url", () => {
    const html =
      '<script type="application/ld+json">{"image":{"@type":"ImageObject","url":"https://site.com/o.jpg"}}</script>';
    expect(extractImageUrl(html, BASE)).toBe("https://site.com/o.jpg");
  });
  it("falls back to og:image (either attribute order)", () => {
    const a =
      '<meta property="og:image" content="https://site.com/og.jpg" />';
    const b =
      '<meta content="https://site.com/og2.jpg" property="og:image" />';
    expect(extractImageUrl(a, BASE)).toBe("https://site.com/og.jpg");
    expect(extractImageUrl(b, BASE)).toBe("https://site.com/og2.jpg");
  });
  it("resolves a relative og:image against the base URL", () => {
    const html = '<meta property="og:image" content="/img/rel.jpg">';
    expect(extractImageUrl(html, BASE)).toBe("https://site.com/img/rel.jpg");
  });
  it("returns null when there is no image", () => {
    expect(extractImageUrl("<html><body>no image</body></html>", BASE)).toBeNull();
  });
});

describe("stripTags", () => {
  it("removes script/style, tags, and decodes entities", () => {
    const html =
      "<style>x{color:red}</style><p>Hello&nbsp;&amp; world</p><script>evil()</script>";
    const out = stripTags(html);
    expect(out).toBe("Hello & world");
    expect(out).not.toContain("evil");
    expect(out).not.toContain("color");
  });
});

describe("extractJsonLd", () => {
  it("keeps recipe blocks and drops non-recipe ones", () => {
    const html = `
      <script type="application/ld+json">{"@type":"Recipe","name":"Cake"}</script>
      <script type="application/ld+json">{"@type":"BreadcrumbList"}</script>
    `;
    const out = extractJsonLd(html);
    expect(out).toContain("Recipe");
    expect(out).not.toContain("BreadcrumbList");
  });
});

describe("extractVideoDescription", () => {
  it("decodes the embedded YouTube description", () => {
    const html =
      'var x = {"videoDetails":{"shortDescription":"Mousse au chocolat\\n\\n200 g chocolate\\n4 eggs \\u2013 separated","title":"t"}};';
    expect(extractVideoDescription(html)).toBe(
      "Mousse au chocolat\n\n200 g chocolate\n4 eggs – separated",
    );
  });
  it("returns empty when absent", () => {
    expect(extractVideoDescription("<html>no video</html>")).toBe("");
  });
});

describe("compactJsonLd", () => {
  it("drops galleries/reviews/authors but keeps recipe fields", () => {
    const out = compactJsonLd(
      JSON.stringify({
        "@type": "Recipe",
        name: "Cake",
        image: { url: "x.jpg" },
        hasPart: { "@type": "ImageGallery", image: ["a", "b", "c"] },
        review: [{ reviewBody: "great" }],
        author: { name: "Someone" },
        recipeIngredient: ["1 egg"],
        recipeInstructions: [{ text: "Bake." }],
      }),
    );
    expect(out).toContain('"recipeIngredient"');
    expect(out).toContain("Bake.");
    expect(out).not.toContain("ImageGallery");
    expect(out).not.toContain("Someone");
    expect(out).not.toContain("great");
  });
  it("leaves unparseable input alone", () => {
    expect(compactJsonLd("{not json")).toBe("{not json");
  });
});

describe("extractImageCandidates", () => {
  it("lists recipe JSON-LD images, then share images, then page photos", () => {
    const html = `
      <meta property="og:image" content="https://site.com/og.jpg">
      <script type="application/ld+json">{"@type":"Recipe","image":["https:\\/\\/site.com\\/dish-1.jpg","https://site.com/dish-2.jpg"]}</script>
      <img src="/photos/step.jpg" width="800">`;
    expect(extractImageCandidates(html, BASE)).toEqual([
      "https://site.com/dish-1.jpg",
      "https://site.com/dish-2.jpg",
      "https://site.com/og.jpg",
      "https://site.com/photos/step.jpg",
    ]);
  });

  it("skips logos, avatars, icons, tiny images, SVGs and GIFs", () => {
    const html = `
      <img src="/img/site-logo.png" width="800">
      <img src="/img/a.jpg" class="author-avatar">
      <img src="/img/b.jpg" width="64">
      <img src="/img/c.svg">
      <img src="/img/d.gif">
      <img src="/img/silicone-mold.jpg" width="900">`;
    expect(extractImageCandidates(html, BASE)).toEqual(["https://site.com/img/silicone-mold.jpg"]);
  });

  it("uses the real URL of lazy-loaded images and the largest srcset entry", () => {
    const html = `
      <img src="data:image/gif;base64,R0lGOD" data-src="/lazy.jpg">
      <img srcset="/s.jpg 300w, /l.jpg 1200w, /m.jpg 768w">`;
    expect(extractImageCandidates(html, BASE)).toEqual([
      "https://site.com/lazy.jpg",
      "https://site.com/l.jpg",
    ]);
  });

  it("skips JSON-LD #references, headshots and other sizes of the same photo", () => {
    const html = `
      <script type="application/ld+json">{"@type":"Recipe","image":{"@id":"https://site.com/cake/#primaryimage"}}</script>
      <img src="/up/cook-headshot.jpg" width="400">
      <img src="/up/cake.jpg"><img src="/up/cake-500x375.jpg"><img src="/up/cake-96x96.jpg">
      <img src="/up/slice-768x512.jpg">`;
    expect(extractImageCandidates(html, BASE)).toEqual([
      "https://site.com/up/cake.jpg",
      "https://site.com/up/slice-768x512.jpg",
    ]);
  });

  it("de-duplicates and respects the limit", () => {
    const html = `<meta property="og:image" content="/a.jpg"><img src="/a.jpg"><img src="/b.jpg"><img src="/c.jpg">`;
    expect(extractImageCandidates(html, BASE, 2)).toEqual(["https://site.com/a.jpg", "https://site.com/b.jpg"]);
  });
});
