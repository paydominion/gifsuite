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
  { slug: "speed", name: "Speed & reverse", description: "Speed up, slow down, reverse or boomerang a GIF or video.", href: "/tools/speed", status: "live" },
  { slug: "trim", name: "Trim", description: "Cut a GIF or video down to the best moment.", href: "/tools/trim", status: "live" },
  { slug: "maker", name: "GIF maker", description: "Turn pictures into a slideshow GIF, or bring one to life with zoom, pan or shake.", href: "/tools/maker", status: "live" },
  { slug: "crop", name: "Crop", description: "Crop a GIF or video to square, portrait, widescreen or any shape.", href: "/tools/crop", status: "live" },
  { slug: "captions", name: "Add text", description: "Add meme-style top and bottom text to any GIF.", href: "/tools/captions", status: "live" },
];
