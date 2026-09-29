import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

const nextConfig: NextConfig = {
  // Lets the bundle leak check build into its own folder while `npm run dev` keeps running.
  distDir: process.env.NEXT_DIST_DIR ?? ".next",
  poweredByHeader: false,
  // Build with 2 workers instead of one per CPU core: slower, but keeps builds from filling RAM.
  experimental: { cpus: 2 },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
          { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
        ],
      },
    ];
  },
};

// `npm run dev`: give Next.js the Cloudflare bindings (local D1 and R2) from wrangler.jsonc's "dev" environment.
if (process.env.NODE_ENV === "development") {
  initOpenNextCloudflareForDev({ environment: "dev" });
}

export default nextConfig;
