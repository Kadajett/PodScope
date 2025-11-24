import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // Externalize pino and related packages to avoid bundling Node.js-only code
  serverExternalPackages: ["pino", "pino-pretty", "thread-stream"],
};

export default nextConfig;
