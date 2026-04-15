import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "m.media-amazon.com",
      },
    ],
  },
  eslint: {
    dirs: ["src/app", "src/components", "src/db"],
  },
};

export default nextConfig;
