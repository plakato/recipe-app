import type { MetadataRoute } from "next";

// Keep search engines out for now (roadmap step 2): the recipes are public to
// visitors but not meant to be found through search. Pages also carry noindex.
export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: "*", disallow: "/" } };
}
