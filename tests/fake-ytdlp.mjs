#!/usr/bin/env node
// Stands in for yt-dlp in tests: knows the fake sites' /page/… links, and fails for everything
// else (including X, so the X fallback fails predictably). Writes the download where yt-dlp would
// and prints its JSON, like `yt-dlp -o … --print-json --no-simulate URL`.
import fs from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);
const link = args[args.length - 1];
const out = args[args.indexOf("-o") + 1];
const FIXTURES = path.join(import.meta.dirname, ".fixtures");

const PAGES = {
  "/page/clip": { file: "dog.mp4", id: "clip", title: "A dancing test pattern", uploader: "Fake Giphy", uploader_id: "fakegiphy", like_count: 42, age_limit: 0 },
  "/page/adult": { file: "cat.mp4", id: "adult", title: "Adults only", uploader: "Fake Adult Site", uploader_id: "fakeadult", like_count: 7, age_limit: 18 },
  "/page/ui": { file: "dog.mp4", id: "ui", title: "Grabbed in the browser tests", uploader: "Fake Reddit", uploader_id: "fakereddit", like_count: 3, age_limit: 0 },
};

let url;
try {
  url = new URL(link);
} catch {
  process.stderr.write(`ERROR: '${link}' is not a valid URL\n`);
  process.exit(1);
}
if (url.pathname === "/page/login") {
  process.stderr.write("ERROR: [fake] login: This post is private. Sign in to view it\n");
  process.exit(1);
}
const page = url.host === "127.0.0.1:3298" ? PAGES[url.pathname] : undefined;
if (!out || !page) {
  process.stderr.write(`ERROR: Unsupported URL: ${link}\n`);
  process.exit(1);
}
const { file, ...info } = page;
fs.copyFileSync(path.join(FIXTURES, file), out.replace("%(ext)s", "mp4"));
process.stdout.write(`${JSON.stringify({ ...info, webpage_url: link, url: `http://127.0.0.1:3298/files/${file}`, ext: "mp4" })}\n`);
