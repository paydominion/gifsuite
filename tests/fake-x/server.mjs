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
const CLIPS = {
  "cat.mp4": ["testsrc=size=320x240:rate=10", 2],
  "dog.mp4": ["testsrc2=size=480x360:rate=25", 2],
  "big.mp4": ["mandelbrot=size=640x480:rate=30", 3],
};
fs.mkdirSync(FIXTURES, { recursive: true });
for (const [name, [source, seconds]] of Object.entries(CLIPS)) {
  const file = path.join(FIXTURES, name);
  if (!fs.existsSync(file)) {
    execFileSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-f", "lavfi", "-i", source,
      "-t", String(seconds), "-pix_fmt", "yuv420p", "-c:v", "libx264", "-y", file]);
  }
}

const gif = (clip, w, h, ms) => ({
  type: "animated_gif",
  original_info: { width: w, height: h },
  video_info: { duration_millis: ms, variants: [{ bitrate: 0, content_type: "video/mp4", url: `${ORIGIN}/video/${clip}` }] },
});
const photo = { type: "photo", original_info: { width: 100, height: 100 } };
const post = (id, handle, text, media, likes = 1234) => ({
  __typename: "Tweet", id_str: id, text, favorite_count: likes,
  user: { screen_name: handle, name: handle.toUpperCase() }, mediaDetails: media,
});

const POSTS = {
  "111": post("111", "gifmaker", "a test pattern that dances https://t.co/abc123", [gif("cat.mp4", 320, 240, 2000)]),
  "112": post("112", "reporter", "gets reported", [gif("dog.mp4", 480, 360, 2000)]),
  "113": post("113", "vanishing", "about to be deleted", [gif("cat.mp4", 320, 240, 2000)]),
  "114": post("114", "multi", "photo first, gif second", [photo, gif("big.mp4", 640, 480, 3000)]),
  "115": post("115", "uiuser", "used by the browser tests", [gif("dog.mp4", 480, 360, 2000)]),
  "116": post("116", "uivanish", "deleted during the browser tests", [gif("cat.mp4", 320, 240, 2000)]),
  "117": post("117", "firstgrab", "grabbed exactly once, by the grab test https://t.co/abc123", [gif("cat.mp4", 320, 240, 2000)]),
  "200": post("200", "talker", "just words, no media", []),
  "600": post("600", "longvid", "way too long", [gif("cat.mp4", 320, 240, 90_000)]),
};
const deleted = new Set();

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

    // Test control: POST /__delete?id=113 makes a post disappear, like a real deletion.
    if (url.pathname === "/__delete" && req.method === "POST") {
      deleted.add(url.searchParams.get("id"));
      return res.writeHead(204).end();
    }
    if (url.pathname === "/health") return res.writeHead(200).end("ok");
    res.writeHead(404).end();
  })
  .listen(PORT, "127.0.0.1", () => console.log(`fake X listening on ${ORIGIN}`));
