import type { MetadataRoute } from "next";

// Lets people add Receptík to their phone's home screen: it then opens on its
// own, without the browser's address bar. The icons are the plugin's pot on
// cream (public/brand/); the pot stays inside the safe zone, so Android may
// crop it to a circle ("maskable"). iPhones use app/apple-icon.png instead.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Receptík",
    short_name: "Receptík",
    description: "Naša rodinná zbierka receptov",
    lang: "sk",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#f4f1e6",
    theme_color: "#ffffff",
    icons: [
      { src: "/brand/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/brand/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/brand/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
