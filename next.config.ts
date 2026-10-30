import { execSync } from "node:child_process";
import type { NextConfig } from "next";

// Each deploy is its own version (the commit it was built from): a page left
// open from an older one — the home-screen app keeps pages for days — reloads
// instead of calling the new server the old way (components/VersionCheck.tsx).
function commit(): string {
  try {
    return execSync("git rev-parse --short HEAD", { stdio: ["ignore", "pipe", "ignore"] }).toString().trim();
  } catch {
    return "dev";
  }
}

const version = process.env.NEXT_DEPLOYMENT_ID || commit();

const nextConfig: NextConfig = {
  deploymentId: version,
  // Built into both the server and the pages, to compare them.
  env: { APP_VERSION: version },
  experimental: {
    serverActions: {
      // Photos are uploaded to a Server Action; the default 1MB cap is smaller
      // than a real phone photo. We accept up to 5 photos of ~8MB each
      // (MAX_PHOTOS in lib/features.ts, saveImage), plus multipart overhead.
      bodySizeLimit: "42mb",
    },
    // proxy.ts makes Next.js hold a copy of every request body, cut off at
    // 10 MB by default: three phone photos already broke the send ("Unexpected
    // end of form"). The same limit as above.
    proxyClientMaxBodySize: "42mb",
  },
};

export default nextConfig;
