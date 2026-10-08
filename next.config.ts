import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Photos are uploaded to a Server Action; the default 1MB cap is smaller
      // than a real phone photo. We accept up to 5 photos of ~8MB each
      // (MAX_PHOTOS in lib/features.ts, saveImage), plus multipart overhead.
      bodySizeLimit: "42mb",
    },
  },
};

export default nextConfig;
