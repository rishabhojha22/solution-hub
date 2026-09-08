import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Creates a minimal runtime bundle for the production Docker image.
  output: "standalone",
  // Enables Hot Module Reloading when the app is opened via the local LAN IP.
  allowedDevOrigins: ["192.168.218.1"],
};
export default nextConfig;
