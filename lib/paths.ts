import path from "node:path";

export const DATA_DIR = process.env.DATA_DIR ?? path.join(process.cwd(), "data");
export const MEDIA_DIR = path.join(DATA_DIR, "media");
