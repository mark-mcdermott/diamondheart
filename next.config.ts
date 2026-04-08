import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {},
  eslint: {
    dirs: ["src/app", "src/components", "src/db"],
  },
};

export default nextConfig;
