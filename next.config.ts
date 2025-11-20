import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  turbopack: {
    root: "/",
  },
  // Externalize pino and related packages to avoid bundling Node.js-only code
  serverExternalPackages: ["pino", "pino-pretty", "thread-stream"],
};

export default nextConfig;
