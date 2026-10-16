// A stand-in for X used by the test suite: the embed endpoint (tweet-result)
// plus the video files it points at. Tests never touch the real X.
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";

const PORT = Number(process.env.FAKE_X_PORT ?? 3298);
const ORIGIN = `http://127.0.0.1:${PORT}`;
const FIXTURES = path.join(import.meta.dirname, "..", ".fixtures");

// Small generated clips, so no binary files live in git.
const lavfi = (source, seconds, ...encode) => ["-f", "lavfi", "-i", source, "-t", String(seconds), ...encode];
const h264 = ["-pix_fmt", "yuv420p", "-c:v", "libx264"];
const CLIPS = {
  // Served by the fake X.
  "cat.mp4": lavfi("testsrc=size=320x240:rate=10", 2, ...h264),
  "dog.mp4": lavfi("testsrc2=size=480x360:rate=25", 2, ...h264),
  "big.mp4": lavfi("mandelbrot=size=640x480:rate=30", 3, ...h264),
  // Uploads for the convert tests.
  "odd.gif": lavfi("testsrc=size=301x201:rate=10", 2),
  "clip.webm": lavfi("testsrc=size=320x240:rate=10", 2, "-c:v", "libvpx-vp9"),
  "long.mp4": lavfi("color=c=blue:size=64x64:rate=1", 70, ...h264),
  // Still pictures for the GIF maker.
  "wide.png": ["-f", "lavfi", "-i", "testsrc=size=400x300", "-frames:v", "1"],
  "tall.jpg": ["-f", "lavfi", "-i", "testsrc2=size=300x400", "-frames:v", "1"],
  "square.png": ["-f", "lavfi", "-i", "mandelbrot=size=320x320", "-frames:v", "1"],
};
fs.mkdirSync(FIXTURES, { recursive: true });
for (const [name, args] of Object.entries(CLIPS)) {
  const file = path.join(FIXTURES, name);
  if (!fs.existsSync(file)) execFileSync("ffmpeg", ["-hide_banner", "-loglevel", "error", ...args, "-y", file]);
}
// A still WebP for the GIF maker (cwebp comes with the webp tools, like gif2webp).
const stillWebp = path.join(FIXTURES, "still.webp");
if (!fs.existsSync(stillWebp)) execFileSync("cwebp", ["-quiet", path.join(FIXTURES, "square.png"), "-o", stillWebp]);
// An animated WebP for the "not supported yet" case (gif2webp comes with the webp tools).
const webp = path.join(FIXTURES, "anim.webp");
if (!fs.existsSync(webp)) execFileSync("gif2webp", ["-quiet", path.join(FIXTURES, "odd.gif"), "-o", webp]);
// Hostile upload: a playlist pointing at the fake X and a local file, dressed up with a .gif name.
fs.writeFileSync(path.join(FIXTURES, "evil.gif"),
  `#EXTM3U\n#EXT-X-TARGETDURATION:1\n#EXTINF:1,\n${"http://127.0.0.1:" + PORT}/__leak\n#EXTINF:1,\nfile:///etc/passwd\n#EXT-X-ENDLIST\n`);

const gif = (clip, w, h, ms) => ({
  type: "animated_gif",
  original_info: { width: w, height: h },
  video_info: { duration_millis: ms, variants: [{ bitrate: 0, content_type: "video/mp4", url: `${ORIGIN}/video/${clip}` }] },
});
const photo = { type: "photo", original_info: { width: 100, height: 100 } };
const post = (id, handle, text, media, likes = 1234, extra = {}) => ({
  __typename: "Tweet", id_str: id, text, favorite_count: likes,
  user: { screen_name: handle, name: handle.toUpperCase() }, mediaDetails: media, ...extra,
});
// X's "possibly sensitive" mark, which the author or X sets on adult content.
const sensitive = { possibly_sensitive: true };

const POSTS = {
  "111": post("111", "gifmaker", "a test pattern that dances https://t.co/abc123", [gif("cat.mp4", 320, 240, 2000)]),
  "112": post("112", "reporter", "gets reported", [gif("dog.mp4", 480, 360, 2000)]),
  "113": post("113", "vanishing", "about to be deleted", [gif("cat.mp4", 320, 240, 2000)]),
  "114": post("114", "multi", "photo first, gif second", [photo, gif("big.mp4", 640, 480, 3000)]),
  "115": post("115", "uiuser", "used by the browser tests", [gif("dog.mp4", 480, 360, 2000)]),
  "116": post("116", "uivanish", "deleted during the browser tests", [gif("cat.mp4", 320, 240, 2000)]),
  "117": post("117", "firstgrab", "grabbed exactly once, by the grab test https://t.co/abc123", [gif("cat.mp4", 320, 240, 2000)]),
  "118": post("118", "spicy", "marked sensitive by X", [gif("cat.mp4", 320, 240, 2000)], 10, sensitive),
  "119": post("119", "quiet", "grabbed as private", [gif("cat.mp4", 320, 240, 2000)]),
  "120": post("120", "switcher", "made public, then private again", [gif("cat.mp4", 320, 240, 2000)]),
  "121": post("121", "uiprivate", "grabbed as private in the browser tests", [gif("dog.mp4", 480, 360, 2000)]),
  "122": post("122", "uispicy", "sensitive, opened in the browser tests", [gif("dog.mp4", 480, 360, 2000)], 10, sensitive),
  "123": post("123", "cleared", "flagged, then cleared by an admin", [gif("cat.mp4", 320, 240, 2000)], 10, sensitive),
  "124": post("124", "scanned", "checked by the NSFW model", [gif("dog.mp4", 480, 360, 2000)]),
  "125": post("125", "latebloomer", "grabbed as private, made public later", [gif("cat.mp4", 320, 240, 2000)]),
  "200": post("200", "talker", "just words, no media", []),
  "600": post("600", "longvid", "way too long", [gif("cat.mp4", 320, 240, 90_000)]),
};
const deleted = new Set();
let leaks = 0;

http
  .createServer((req, res) => {
    const url = new URL(req.url, ORIGIN);

    if (url.pathname === "/tweet-result") {
      const id = url.searchParams.get("id");
      if (id === "500") return res.writeHead(500).end("X is having a moment");
      if (id === "405") {
        res.writeHead(200, { "content-type": "application/json" });
        return res.end(JSON.stringify({ __typename: "TweetTombstone" }));
      }
      const found = POSTS[id];
      if (!found || deleted.has(id)) return res.writeHead(404).end();
      res.writeHead(200, { "content-type": "application/json" });
      return res.end(JSON.stringify(found));
    }

    if (url.pathname.startsWith("/video/")) {
      const file = path.join(FIXTURES, path.basename(url.pathname));
      if (!fs.existsSync(file)) return res.writeHead(404).end();
      res.writeHead(200, { "content-type": "video/mp4", "content-length": fs.statSync(file).size });
      return fs.createReadStream(file).pipe(res);
    }

    // ── Other sites, for grabbing from any link ──
    // Direct files, with the content type a real file host would send.
    if (url.pathname.startsWith("/files/")) {
      const name = path.basename(url.pathname);
      if (name === "huge.mp4") {
        // Claims to be 60 MB: the grabber must refuse before downloading it.
        res.writeHead(200, { "content-type": "video/mp4", "content-length": String(60 * 1024 * 1024) });
        return res.end();
      }
      if (name === "notes.txt") return res.writeHead(200, { "content-type": "text/plain" }).end("just text");
      const file = path.join(FIXTURES, name);
      if (!fs.existsSync(file)) return res.writeHead(404).end();
      const type = { ".gif": "image/gif", ".webp": "image/webp", ".webm": "video/webm" }[path.extname(name)] ?? "video/mp4";
      res.writeHead(200, { "content-type": type, "content-length": fs.statSync(file).size });
      return fs.createReadStream(file).pipe(res);
    }
    // Web pages; tests/fake-ytdlp.mjs plays yt-dlp's part for these.
    if (url.pathname.startsWith("/page/")) {
      return res.writeHead(200, { "content-type": "text/html" }).end(`<html><body>${url.pathname}</body></html>`);
    }
    // A link that redirects to a private address the grabber must not reach.
    if (url.pathname === "/redirect-private") {
      return res.writeHead(302, { location: "http://127.0.0.1:3296/health" }).end();
    }
    if (url.pathname === "/redirect-ok") return res.writeHead(302, { location: "/files/odd.gif" }).end();

    // Test control: POST /__delete?id=113 makes a post disappear, like a real deletion.
    if (url.pathname === "/__delete" && req.method === "POST") {
      deleted.add(url.searchParams.get("id"));
      return res.writeHead(204).end();
    }
    // Counts requests that a hostile upload tricked the processor into making (must stay 0).
    if (url.pathname === "/__leak") {
      leaks++;
      return res.writeHead(200).end("leaked");
    }
    if (url.pathname === "/__leaks") return res.writeHead(200, { "content-type": "application/json" }).end(String(leaks));
    if (url.pathname === "/health") return res.writeHead(200).end("ok");
    res.writeHead(404).end();
  })
  .listen(PORT, "127.0.0.1", () => console.log(`fake X listening on ${ORIGIN}`));
