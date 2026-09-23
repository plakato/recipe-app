import { describe, it, expect } from "vitest";
import {
  stripTags,
  extractVideoDescription,
  compactJsonLd,
  extractImageUrl,
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
