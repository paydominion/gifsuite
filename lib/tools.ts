/**
 * Every tool in the suite. The header's Tools menu, the /tools page and the home page
 * all render from this list, so a new tool only needs an entry here (and its page).
 */
export type Tool = {
  slug: string;
  name: string;
  description: string;
  href: string;
  status: "live" | "soon";
};

export const TOOLS: Tool[] = [
  { slug: "grab", name: "Grab from any link", description: "Paste a link from X, Giphy, Reddit or any site and get its GIF.", href: "/", status: "live" },
  { slug: "convert", name: "Upload & convert", description: "Turn a GIF or video into GIF, MP4, WebM or WebP.", href: "/tools/convert", status: "live" },
  { slug: "compress", name: "Compress & resize", description: "Shrink a GIF to fit X, Discord or any size limit.", href: "/tools/compress", status: "live" },
  { slug: "speed", name: "Speed & reverse", description: "Speed up, slow down, reverse or boomerang a GIF.", href: "/tools", status: "soon" },
  { slug: "trim", name: "Trim", description: "Cut a GIF down to the best moment.", href: "/tools", status: "soon" },
  { slug: "photo", name: "Photo to GIF", description: "Bring a still photo to life with zoom, pan or shake.", href: "/tools", status: "soon" },
  { slug: "screenshots", name: "Screenshots to GIF", description: "Turn a set of screenshots into a slideshow GIF.", href: "/tools", status: "soon" },
  { slug: "crop", name: "Crop", description: "Crop to square, portrait or widescreen.", href: "/tools", status: "soon" },
  { slug: "captions", name: "Text captions", description: "Add meme-style text to any GIF.", href: "/tools", status: "soon" },
];
