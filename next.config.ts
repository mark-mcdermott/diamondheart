import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "image.tmdb.org",
      },
    ],
  },
  eslint: {
    dirs: ["src/app", "src/components", "src/db"],
  },
};

export default nextConfig;
