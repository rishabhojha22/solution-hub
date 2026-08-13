import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Creates a minimal runtime bundle for the production Docker image.
  output: "standalone",
};
export default nextConfig;
