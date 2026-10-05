import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enables the minimal standalone server build used by the production Dockerfile.
  output: "standalone",
};

export default nextConfig;
