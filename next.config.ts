import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@eyepop.ai/eyepop"],
  experimental: {
    serverActions: {
      bodySizeLimit: "12mb",
    },
  },
};

export default nextConfig;
