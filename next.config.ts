import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Lets the test server build into its own folder while `npm run dev` keeps running.
  distDir: process.env.NEXT_DIST_DIR ?? ".next",
};

export default nextConfig;
