import type { MetadataRoute } from "next";

/** Web app manifest: lets phones add GifSuite to the home screen with its own icon and colours. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "GifSuite",
    short_name: "GifSuite",
    description: "Grab, convert, compress and make GIFs.",
    start_url: "/",
    display: "standalone",
    background_color: "#111110",
    theme_color: "#111110",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
    ],
  };
}
