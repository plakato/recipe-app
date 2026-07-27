import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Photos are uploaded to a Server Action; the default 1MB cap is smaller
      // than a real phone photo. We accept up to ~8MB files (see saveImage).
      bodySizeLimit: "12mb",
    },
  },
};

export default nextConfig;
