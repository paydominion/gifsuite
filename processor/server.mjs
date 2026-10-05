// GifSuite media processor: the only place ffmpeg, gif2webp and yt-dlp run.
// Production: inside a Cloudflare Container, reachable only from the app's Worker.
// Development and tests: `node processor/server.mjs` on 127.0.0.1.
//
//   GET  /health
//   POST /probe?input=…                           body: video → { width, height, durationMs, fps, hasAudio }
//   POST /render?name=poster|preview              body: MP4 → image/video bytes
//   POST /convert?input=…&format=…&quality=…      body: video → converted bytes
//        (&maxDurationMs=… rejects longer inputs with 413)
//   POST /compress?input=…&targetBytes=…&maxWidth=…  body: video → GIF at or under the target size
//        (result settings come back in x-gifsuite-* headers; x-gifsuite-target-met says if it fit)
//
// input is the container: gif, mov (MP4/MOV) or matroska (WebM). Defaults to mov.
//   POST /nsfw                                    body: MP4 → { porn, hentai, sexy, frames } (worst frame's scores, 0–1)
//   GET  /ytdlp?tweetId=…&slot=…         → yt-dlp's JSON for an X post (fallback fetcher)
//   GET  /fetch?url=…&maxBytes=…&maxDurationMs=…  → the GIF/video behind any link, as MP4
//        (what the source says about it comes back base64url JSON in x-gifsuite-info)
import { spawn } from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { pipeline } from "node:stream/promises";
import {
  COMPRESS, FORMATS, QUALITIES, RENDERS, ffmpegArgs, firstAttempt, gifArgs, growAttempt, inputArgs, isFormat, isInput, isQuality,
  nextAttempt, normalizeArgs, nsfwFrameArgs,
} from "./presets.mjs";
import { FetchError, fetchMedia } from "./fetch.mjs";
import { scanFrames } from "./nsfw.mjs";

const PORT = Number(process.env.PORT ?? 8080);
const HOST = process.env.HOST ?? "0.0.0.0";
const MAX_BODY = Number(process.env.MAX_BODY_MB ?? 60) * 1024 * 1024;
const MAX_JOBS = Number(process.env.MAX_JOBS ?? 2);
const BIN = {
  ffmpeg: process.env.FFMPEG_PATH ?? "ffmpeg",
  ffprobe: process.env.FFPROBE_PATH ?? "ffprobe",
  gif2webp: process.env.GIF2WEBP_PATH ?? "gif2webp",
  ytdlp: process.env.YTDLP_PATH ?? "yt-dlp",
};

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function run(bin, args, timeoutMs = 120_000) {
  return new Promise((resolve, reject) => {
    const child = spawn(bin, args, { stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (d) => (stdout += d));
    child.stderr.on("data", (d) => (stderr = (stderr + d).slice(-4000)));
    const timer = setTimeout(() => child.kill("SIGKILL"), timeoutMs);
    child.on("error", (err) => {
      clearTimeout(timer);
      reject(err);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      if (code === 0) resolve(stdout);
      else reject(new Error(`${bin} exited with ${code}: ${stderr}`));
    });
  });
}
const ffmpeg = (args) => run(BIN.ffmpeg, ["-hide_banner", "-loglevel", "error", "-y", ...args]);

async function probe(file, input = "mov") {
  let out;
  try {
    // Same locked-down input as ffmpeg: forced container, local file only.
    const [, , , demuxer] = inputArgs(input, file);
    out = await run(BIN.ffprobe, ["-v", "error", "-protocol_whitelist", "file", "-f", demuxer, "-show_entries",
      "stream=codec_type,width,height,avg_frame_rate:format=duration", "-of", "json", file], 20_000);
  } catch {
    throw new HttpError(422, "not a readable video or GIF");
  }
  const info = JSON.parse(out);
  const video = info.streams.find((s) => s.codec_type === "video");
  if (!video) throw new HttpError(422, "not a video");
  const [num, den] = (video.avg_frame_rate ?? "0/1").split("/").map(Number);
  return {
    width: video.width ?? 0,
    height: video.height ?? 0,
    durationMs: Math.round(Number(info.format.duration ?? 0) * 1000),
    fps: den ? num / den : 0,
    hasAudio: info.streams.some((s) => s.codec_type === "audio"),
  };
}

async function encode(src, out, input, format, quality, fps) {
  if (format === "webp") {
    // Re-encode the palette-optimised GIF; lossy WebP is typically far smaller.
    const gif = `${out}.gif`;
    await ffmpeg(ffmpegArgs("gif", quality, fps, src, gif, input));
    await run(BIN.gif2webp, ["-quiet", "-lossy", "-q", String(QUALITIES[quality].webpQ), "-m", "4", "-mt", gif, "-o", out]);
  } else {
    await ffmpeg(ffmpegArgs(format, quality, fps, src, out, input));
  }
}

// A few ffmpeg jobs at a time; the rest wait their turn.
let active = 0;
const waiting = [];
async function withSlot(fn) {
  if (active >= MAX_JOBS) await new Promise((resolve) => waiting.push(resolve));
  active++;
  try {
    return await fn();
  } finally {
    active--;
    waiting.shift()?.();
  }
}

async function saveBody(req, file) {
  if (Number(req.headers["content-length"] ?? 0) > MAX_BODY) throw new HttpError(413, "input too large");
  let bytes = 0;
  req.on("data", (chunk) => {
    bytes += chunk.length;
    if (bytes > MAX_BODY) req.destroy(new HttpError(413, "input too large"));
  });
  await pipeline(req, fs.createWriteStream(file));
  if (bytes === 0) throw new HttpError(400, "empty input");
}

function sendFile(res, file, mime, headers = {}) {
  res.writeHead(200, { "content-type": mime, "content-length": fs.statSync(file).size, ...headers });
  return pipeline(fs.createReadStream(file), res);
}

async function handle(req, res, url) {
  if (req.method === "GET" && url.pathname === "/health") {
    res.writeHead(200, { "content-type": "text/plain" });
    return res.end("ok");
  }

  if (req.method === "GET" && url.pathname === "/ytdlp") {
    const tweetId = url.searchParams.get("tweetId") ?? "";
    const slot = Number(url.searchParams.get("slot") ?? 1);
    if (!/^\d{1,25}$/.test(tweetId) || !Number.isInteger(slot) || slot < 1 || slot > 4) {
      throw new HttpError(400, "bad post");
    }
    const out = await run(BIN.ytdlp, ["-j", "--no-warnings", "-f", "best[ext=mp4]/best",
      "--playlist-items", String(slot), `https://x.com/i/status/${tweetId}`], 30_000);
    res.writeHead(200, { "content-type": "application/json" });
    return res.end(out.trim().split("\n")[0]);
  }

  if (req.method === "GET" && url.pathname === "/fetch") {
    const link = url.searchParams.get("url") ?? "";
    const maxBytes = Number(url.searchParams.get("maxBytes") ?? 50 * 1024 * 1024);
    const maxDurationMs = Number(url.searchParams.get("maxDurationMs") ?? 60_000);
    if (!/^https?:\/\//i.test(link) || link.length > 2048) throw new HttpError(400, "bad link");
    if (!Number.isInteger(maxBytes) || maxBytes < 1 || maxBytes > MAX_BODY) throw new HttpError(400, "bad size limit");
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "gifsuite-fetch-"));
    try {
      const { file, input, info } = await fetchMedia(link, dir, { maxBytes, ytdlp: BIN.ytdlp, spawn });
      return await withSlot(async () => {
        const media = await probe(file, input);
        if (maxDurationMs && media.durationMs > maxDurationMs) throw new HttpError(413, "too long");
        const out = path.join(dir, "out.mp4");
        try {
          await ffmpeg(normalizeArgs(input, file, out));
        } catch (err) {
          console.warn(`[processor] could not normalise ${input} from a link:`, String(err).slice(0, 300));
          throw new HttpError(422, "could not decode input");
        }
        const final = await probe(out, "mov");
        const header = Buffer.from(JSON.stringify({ ...info, ...final, hasAudio: final.hasAudio })).toString("base64url");
        return sendFile(res, out, "video/mp4", { "x-gifsuite-info": header });
      });
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  }

  if (req.method !== "POST") throw new HttpError(404, "not found");

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "gifsuite-"));
  try {
    const src = path.join(dir, "in");
    await saveBody(req, src);
    const input = url.searchParams.get("input") ?? "mov";
    if (!isInput(input)) throw new HttpError(400, "unknown input type");

    return await withSlot(async () => {
      if (url.pathname === "/probe") {
        res.writeHead(200, { "content-type": "application/json" });
        return res.end(JSON.stringify(await probe(src, input)));
      }

      if (url.pathname === "/render") {
        const name = url.searchParams.get("name") ?? "";
        if (!Object.hasOwn(RENDERS, name)) throw new HttpError(400, "unknown render");
        const render = RENDERS[name];
        const out = path.join(dir, "out");
        await ffmpeg(render.args(src, out));
        return sendFile(res, out, render.mime);
      }

      if (url.pathname === "/nsfw") {
        const { durationMs } = await probe(src, "mov");
        const frames = path.join(dir, "frames.rgb");
        await ffmpeg(nsfwFrameArgs(src, frames, durationMs));
        const scores = await scanFrames(frames);
        res.writeHead(200, { "content-type": "application/json" });
        return res.end(JSON.stringify(scores));
      }

      if (url.pathname === "/convert") {
        const format = url.searchParams.get("format");
        const quality = url.searchParams.get("quality") ?? "medium";
        if (!isFormat(format) || !isQuality(quality)) throw new HttpError(400, "unknown format or quality");
        const { fps, durationMs } = await probe(src, input);
        const maxDurationMs = Number(url.searchParams.get("maxDurationMs") ?? 0);
        if (maxDurationMs && durationMs > maxDurationMs) throw new HttpError(413, "too long");
        const out = path.join(dir, `out.${format}`);
        try {
          await encode(src, out, input, format, quality, fps);
        } catch (err) {
          // The input probed as valid but won't decode (truncated, or junk after a real header).
          // That's a problem with the file, not the server.
          console.warn(`[processor] could not convert ${input} → ${format}:`, String(err).slice(0, 300));
          throw new HttpError(422, "could not decode input");
        }
        return sendFile(res, out, FORMATS[format].mime);
      }

      if (url.pathname === "/compress") {
        const targetBytes = Number(url.searchParams.get("targetBytes"));
        const maxWidth = Number(url.searchParams.get("maxWidth") ?? 0);
        if (!Number.isInteger(targetBytes) || targetBytes < 10_000 || targetBytes > 100 * 1024 * 1024) {
          throw new HttpError(400, "bad target size");
        }
        if (!Number.isInteger(maxWidth) || maxWidth < 0 || maxWidth > 4096) throw new HttpError(400, "bad width");
        const info = await probe(src, input);
        const maxDurationMs = Number(url.searchParams.get("maxDurationMs") ?? 0);
        if (maxDurationMs && info.durationMs > maxDurationMs) throw new HttpError(413, "too long");

        const meta = (s, attempts, met, unchanged = false) => ({
          "x-gifsuite-width": String(s.width), "x-gifsuite-fps": String(s.fps), "x-gifsuite-colors": String(s.colors),
          "x-gifsuite-attempts": String(attempts), "x-gifsuite-target-met": String(met), "x-gifsuite-unchanged": String(unchanged),
        });

        // A GIF that already fits and needs no resize goes back untouched.
        const sourceSize = fs.statSync(src).size;
        if (input === "gif" && sourceSize <= targetBytes && (!maxWidth || info.width <= maxWidth)) {
          return sendFile(res, src, "image/gif", meta({ width: info.width, fps: Math.round(info.fps), colors: 256 }, 0, true, true));
        }

        const first = firstAttempt(info, maxWidth);
        let settings = first;
        let fits = null; // the biggest (best-looking) result that is within the target
        let smallest = null; // fallback if nothing fits
        let attempts = 0;
        while (settings && attempts < COMPRESS.maxAttempts) {
          attempts++;
          const out = path.join(dir, `try-${attempts}.gif`);
          try {
            await ffmpeg(gifArgs(settings, src, out, input));
          } catch (err) {
            console.warn(`[processor] could not compress ${input}:`, String(err).slice(0, 300));
            throw new HttpError(422, "could not decode input");
          }
          const result = { out, size: fs.statSync(out).size, settings };
          if (!smallest || result.size < smallest.size) smallest = result;
          if (result.size <= targetBytes) {
            if (!fits || result.size > fits.size) fits = result;
            // Well under the target? Spend the spare room on a wider picture.
            settings = growAttempt(settings, result.size, targetBytes, first.width);
          } else {
            settings = nextAttempt(settings, result.size, targetBytes);
          }
        }
        const best = fits ?? smallest;
        return sendFile(res, best.out, "image/gif", meta(best.settings, attempts, !!fits));
      }

      throw new HttpError(404, "not found");
    });
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

http
  .createServer(async (req, res) => {
    const url = new URL(req.url ?? "/", "http://processor");
    try {
      await handle(req, res, url);
    } catch (err) {
      const known = err instanceof HttpError || err instanceof FetchError;
      const status = known ? err.status : 500;
      if (status === 500) console.error(`[processor] ${req.method} ${url.pathname} failed:`, err);
      if (!res.headersSent) res.writeHead(status, { "content-type": "application/json" });
      res.end(JSON.stringify({ error: known ? err.message : "processing failed" }));
    }
  })
  .listen(PORT, HOST, () => console.log(`processor listening on ${HOST}:${PORT}`));
