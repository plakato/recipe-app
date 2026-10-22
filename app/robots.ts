import type { MetadataRoute } from "next";

// Keep search engines out for now (roadmap step 2): the recipes are public to
// visitors but not meant to be found through search. Pages also carry noindex.
// The privacy and data-deletion pages stay open: Facebook's checker obeys
// robots.txt and rejects links to pages it may not read.
export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: "*", allow: ["/privacy", "/data-deletion"], disallow: "/" } };
}
