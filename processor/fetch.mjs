// Fetches the GIF or video behind any link, for grabbing from sites other than X.
//   - A direct file link (.gif, .mp4, .webm…) is downloaded as is.
//   - A web page: first the GIF/video its link-preview tags point at (how Giphy, Tenor, Imgur and most
//     GIF sites publish theirs), then yt-dlp, which knows how to dig media out of many more sites.
// Either way the result is normalised to one kind of MP4 (presets.mjs normalizeArgs).
//
// Links come from visitors, so this refuses to reach private or internal addresses (SSRF): every
// hostname is resolved and checked, and redirects are followed by hand so each hop is checked too.
// yt-dlp follows links on its own, so it may only go out through egressProxy(), which applies the
// same check to every connection it makes and connects to the address it checked.
import dns from "node:dns/promises";
import fs from "node:fs";
import http from "node:http";
import net from "node:net";
import path from "node:path";
import { pipeline } from "node:stream/promises";
import { Readable, Transform } from "node:stream";
import { mediaFromHtml, sniffMedia, ytdlpDownloadArgs, ytdlpFailure } from "./presets.mjs";

export class FetchError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

// Tests serve fake sites on 127.0.0.1; only they set this.
const ALLOWED_PRIVATE = new Set((process.env.ALLOW_PRIVATE_HOSTS ?? "").split(",").filter(Boolean));

const MEDIA_TYPES = /^(image\/gif|image\/webp|video\/)/i;

function isPrivateAddress(ip) {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split(".").map(Number);
    return a === 0 || a === 10 || a === 127 || (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 198 && (b === 18 || b === 19)) || a >= 224;
  }
  const v6 = ip.toLowerCase();
  if (v6.startsWith("::ffff:")) return isPrivateAddress(v6.slice(7));
  return v6 === "::" || v6 === "::1" || v6.startsWith("fc") || v6.startsWith("fd") || v6.startsWith("fe80");
}

/** Throws unless the link is http(s) and its host resolves only to public addresses. */
export async function assertPublicUrl(url) {
  if (url.protocol !== "https:" && url.protocol !== "http:") throw new FetchError(400, "only web links");
  if (url.username || url.password) throw new FetchError(400, "no credentials in links");
  if (ALLOWED_PRIVATE.has(url.host)) return;
  await checkedAddress(url.hostname, url.port || (url.protocol === "https:" ? "443" : "80"));
}

/**
 * The address to connect to for host:port, once it's known to be public. Throws a FetchError(400)
 * for private addresses and for ports other than 80 and 443 (except the test sites).
 */
async function checkedAddress(hostname, port) {
  const host = hostname.replace(/^\[|\]$/g, "");
  const hostPort = `${host.includes(":") ? `[${host}]` : host}:${port}`;
  if (ALLOWED_PRIVATE.has(hostPort)) return host;
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".internal")) throw new FetchError(400, "private address");
  const addresses = net.isIP(host) ? [{ address: host }] : await dns.lookup(host, { all: true }).catch(() => {
    throw new FetchError(404, "site not found");
  });
  if (addresses.length === 0 || addresses.some((a) => isPrivateAddress(a.address))) throw new FetchError(400, "private address");
  if (port !== "80" && port !== "443") throw new FetchError(400, "only web ports");
  return addresses[0].address;
}

let proxy;
/**
 * A local HTTP proxy for yt-dlp (--proxy): plain http:// requests and https:// tunnels (CONNECT)
 * both go to an address checkedAddress allowed, so the page, its redirects, the media and any
 * HLS segments are all held to the public-only rule. Resolves to the proxy's URL.
 */
export function egressProxy() {
  proxy ??= new Promise((resolve, reject) => {
    const server = http.createServer(async (req, res) => {
      try {
        const target = new URL(req.url ?? "");
        if (target.protocol !== "http:") throw new FetchError(400, "only web links");
        const address = await checkedAddress(target.hostname, target.port || "80");
        const headers = { ...req.headers, host: target.host };
        delete headers["proxy-connection"];
        delete headers["proxy-authorization"];
        const upstream = http.request(
          { host: address, port: Number(target.port || 80), method: req.method, path: `${target.pathname}${target.search}`, headers, setHost: false },
          (up) => {
            res.writeHead(up.statusCode ?? 502, up.headers);
            up.pipe(res);
          },
        );
        upstream.on("error", () => res.destroy());
        req.pipe(upstream);
      } catch {
        res.writeHead(403).end();
      }
    });
    server.on("connect", async (req, socket, head) => {
      socket.on("error", () => {});
      try {
        const target = new URL(`http://${req.url}`);
        const address = await checkedAddress(target.hostname, target.port || "443");
        const upstream = net.connect(Number(target.port || 443), address, () => {
          socket.write("HTTP/1.1 200 Connection Established\r\n\r\n");
          if (head.length) upstream.write(head);
          upstream.pipe(socket);
          socket.pipe(upstream);
        });
        upstream.on("error", () => socket.destroy());
        socket.on("close", () => upstream.destroy());
      } catch {
        socket.end("HTTP/1.1 403 Forbidden\r\n\r\n");
      }
    });
    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => resolve(`http://127.0.0.1:${server.address().port}`));
  });
  return proxy;
}

/** GET with redirects followed by hand (each hop checked), at most 5. */
async function get(url) {
  let current = new URL(url);
  for (let hop = 0; hop <= 5; hop++) {
    await assertPublicUrl(current);
    const res = await fetch(current, {
      redirect: "manual",
      headers: { "user-agent": "Mozilla/5.0 (compatible; GifSuite/1.0; +https://gifsuite.com)", accept: "*/*" },
      signal: AbortSignal.timeout(30_000),
    });
    if (res.status >= 300 && res.status < 400 && res.headers.get("location")) {
      await res.body?.cancel();
      current = new URL(res.headers.get("location"), current);
      continue;
    }
    return { res, finalUrl: current };
  }
  throw new FetchError(502, "too many redirects");
}

/** Streams a response body to a file, stopping as soon as it passes maxBytes. */
async function saveCapped(res, file, maxBytes) {
  if (Number(res.headers.get("content-length") ?? 0) > maxBytes) throw new FetchError(413, "too large");
  let size = 0;
  const cap = new Transform({
    transform(chunk, _enc, done) {
      size += chunk.length;
      done(size > maxBytes ? new FetchError(413, "too large") : null, chunk);
    },
  });
  await pipeline(Readable.fromWeb(res.body), cap, fs.createWriteStream(file));
}

/** Total size of the files in `dir`. */
function dirBytes(dir) {
  let total = 0;
  for (const f of fs.readdirSync(dir)) total += fs.statSync(path.join(dir, f), { throwIfNoEntry: false })?.size ?? 0;
  return total;
}

/**
 * Runs yt-dlp. Its --max-filesize can't stop downloads that don't say their size (chunked, HLS), so
 * the files it writes in `dir` are watched and it's killed once they pass maxBytes (tooLarge).
 * Also killed when the visitor gives up (signal).
 */
function run(bin, args, timeoutMs, spawn, { dir, maxBytes, signal } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(bin, args, { stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    let tooLarge = false;
    child.stdout.on("data", (d) => (stdout = (stdout + d).slice(-200_000)));
    child.stderr.on("data", (d) => (stderr = (stderr + d).slice(-4000)));
    const kill = () => child.kill("SIGKILL");
    const timer = setTimeout(kill, timeoutMs);
    const watch = dir && maxBytes
      ? setInterval(() => {
        // Room for yt-dlp's audio and video parts sitting side by side before it merges them.
        if (dirBytes(dir) > maxBytes * 2) {
          tooLarge = true;
          kill();
        }
      }, 200)
      : null;
    signal?.addEventListener("abort", kill, { once: true });
    const done = () => {
      clearTimeout(timer);
      if (watch) clearInterval(watch);
      signal?.removeEventListener("abort", kill);
    };
    child.on("error", (err) => {
      done();
      reject(err);
    });
    child.on("close", (code) => {
      done();
      resolve({ code, stdout, stderr, tooLarge });
    });
  });
}

/** Reads at most `max` bytes of a response as text. */
async function readText(res, max) {
  const reader = res.body.getReader();
  const chunks = [];
  let size = 0;
  while (size < max) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    size += value.byteLength;
  }
  await reader.cancel().catch(() => {});
  return Buffer.concat(chunks).toString("utf8");
}

/** Downloads the first candidate link that really is a GIF or video. */
async function firstMedia(candidates, file, maxBytes) {
  for (const candidate of candidates.slice(0, 4)) {
    try {
      const { res, finalUrl } = await get(new URL(candidate));
      if (!res.ok || !MEDIA_TYPES.test(res.headers.get("content-type") ?? "")) {
        await res.body?.cancel();
        continue;
      }
      await saveCapped(res, file, maxBytes);
      return finalUrl.href;
    } catch (err) {
      // Too big, or pointing at a private address: the grab stops here. A private address must not
      // fall through to yt-dlp, which would be asked to fetch the same page.
      if (err instanceof FetchError && (err.status === 413 || err.status === 400)) throw err;
    }
  }
  return null;
}

/**
 * Downloads the media behind `link` into `dir`. Returns the file, its kind (gif/mov/matroska) and
 * what the source says about it.
 */
export async function fetchMedia(link, dir, { maxBytes, ytdlp, spawn, signal }) {
  const url = new URL(link);
  const { res, finalUrl } = await get(url);
  if (res.status === 404 || res.status === 410) {
    await res.body?.cancel();
    throw new FetchError(404, `site answered ${res.status}`);
  }

  let file;
  let info = {};
  if (!res.ok) {
    // Many sites refuse plain requests (403, 429) but still work through yt-dlp below.
    await res.body?.cancel();
  } else if (MEDIA_TYPES.test(res.headers.get("content-type") ?? "")) {
    file = path.join(dir, "download");
    await saveCapped(res, file, maxBytes);
    info = { kind: "direct", mediaUrl: finalUrl.href, webpageUrl: link };
  } else {
    let page = (res.headers.get("content-type") ?? "").includes("html") ? mediaFromHtml(await readText(res, 2_000_000), finalUrl) : null;
    if (!page) await res.body?.cancel();
    // A page that only redirects with <meta http-equiv="refresh">: read the page it points at.
    if (page && page.candidates.length === 0 && page.refresh) {
      const next = await get(new URL(page.refresh)).catch(() => null);
      if (next?.res.ok && (next.res.headers.get("content-type") ?? "").includes("html")) {
        page = mediaFromHtml(await readText(next.res, 2_000_000), next.finalUrl);
      } else await next?.res.body?.cancel();
    }
    const viaTags = page && (await firstMedia(page.candidates, path.join(dir, "download"), maxBytes));
    if (viaTags) {
      file = path.join(dir, "download");
      info = { kind: "page", title: page.title, uploader: page.siteName, webpageUrl: link, mediaUrl: viaTags };
    }
  }

  if (!file) {
    // Nothing in the page's tags: let yt-dlp find the GIF or video.
    const args = ytdlpDownloadArgs(link, path.join(dir, "dl.%(ext)s"), maxBytes, await egressProxy());
    const { code, stdout, stderr, tooLarge } = await run(ytdlp, args, 120_000, spawn, { dir, maxBytes, signal });
    if (tooLarge) throw new FetchError(413, "too large");
    if (signal?.aborted) throw new FetchError(499, "cancelled");
    if (code !== 0) {
      const { status, message } = ytdlpFailure(stderr);
      console.warn(`[fetch] yt-dlp could not get ${url.hostname}: ${stderr.trim().split("\n").pop()?.slice(0, 200)}`);
      throw new FetchError(status, message);
    }
    const json = JSON.parse(stdout.trim().split("\n").pop() ?? "{}");
    file = fs.readdirSync(dir).map((f) => path.join(dir, f)).find((f) => path.basename(f).startsWith("dl."));
    if (!file) throw new FetchError(422, "no media");
    if (fs.statSync(file).size > maxBytes) throw new FetchError(413, "too large");
    // yt-dlp sometimes "downloads" a web page that only claimed to be a video.
    if (!sniffMedia(readHead(file))) throw new FetchError(422, "no media");
    info = {
      kind: "page",
      title: json.title ?? json.fulltitle ?? "",
      uploader: json.uploader ?? json.channel ?? "",
      uploaderId: json.uploader_id ?? json.channel_id ?? "",
      webpageUrl: json.webpage_url ?? link,
      mediaUrl: json.url ?? json.webpage_url ?? link,
      likes: Number(json.like_count ?? 0) || 0,
      ageLimit: Number(json.age_limit ?? 0) || 0,
    };
  }

  const kind = sniffMedia(readHead(file));
  if (kind === "webp") throw new FetchError(415, "animated webp");
  if (!kind) throw new FetchError(415, "not a gif or video");
  return { file, input: kind, info };
}

/** The first 16 bytes of a file, enough to tell what it is. */
function readHead(file) {
  const head = Buffer.alloc(16);
  const fd = fs.openSync(file, "r");
  try {
    fs.readSync(fd, head, 0, 16, 0);
  } finally {
    fs.closeSync(fd);
  }
  return head;
}
