import "server-only";
import { bindings, setting } from "@/lib/cloudflare";
import type { NsfwScores } from "@/lib/nsfw";

export type Probe = { width: number; height: number; durationMs: number; fps: number; hasAudio: boolean };

export class ProcessorError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

/**
 * Calls the media processor (processor/server.mjs). Local dev and tests run it as a plain
 * process at PROCESSOR_URL; in production it's the Cloudflare Container behind PROCESSOR.
 */
async function call(path: string, init?: RequestInit): Promise<Response> {
  const url = setting("PROCESSOR_URL");
  const container = bindings().PROCESSOR;
  let res: Response;
  if (url) {
    res = await fetch(`${url.replace(/\/$/, "")}${path}`, init);
  } else if (container) {
    // Loaded only here: it depends on `cloudflare:workers`, which exists on Cloudflare but not in `next dev`.
    const { getContainer } = await import("@cloudflare/containers");
    res = await fromCurrentImage(container, getContainer, path, init);
  } else {
    throw new Error("No media processor: set PROCESSOR_URL or bind the PROCESSOR container");
  }
  if (!res.ok) throw new ProcessorError(res.status, await res.text());
  return res;
}

/**
 * The converter instance for this deploy. Each deploy uses instances named after its commit, and the
 * converter says which image answered (x-processor-version). Cloudflare publishes the Worker before the
 * new image and then rolls the image out gradually, so for a few minutes an instance may still run the
 * previous image. That's fine for anything the previous image can do. Only when it answers 404 (a route
 * it doesn't have yet) do we try one fresh instance, at most once a minute, so instances never pile up.
 */
let instanceSuffix = 0;
let lastFreshTry = 0;
export async function fromCurrentImage(
  container: NonNullable<CloudflareEnv["PROCESSOR"]>,
  getContainer: typeof import("@cloudflare/containers").getContainer,
  path: string,
  init?: RequestInit,
  now = Date.now(),
): Promise<Response> {
  const version = setting("PROCESSOR_VERSION");
  const name = () => `processor-${version ?? "default"}${instanceSuffix ? `-${instanceSuffix}` : ""}`;
  const res = await getContainer(container, name()).fetch(new Request(`http://processor${path}`, init));
  const answered = res.headers.get("x-processor-version");
  const older = !!version && !!answered && answered !== "dev" && !version.startsWith(answered) && !answered.startsWith(version);
  if (!older || res.status !== 404 || now - lastFreshTry < 60_000) return res;
  console.warn(`[processor] ${name()} runs image ${answered} and lacks ${path.split("?")[0]}; trying a fresh instance`);
  await res.body?.cancel();
  lastFreshTry = now;
  instanceSuffix++;
  return getContainer(container, name()).fetch(new Request(`http://processor${path}`, init));
}

const post = (body: ArrayBuffer): RequestInit => ({
  method: "POST",
  body,
  headers: { "content-type": "application/octet-stream" },
});

/** The processor's input container: gif, mov (MP4/MOV) or matroska (WebM). */
export type Input = "gif" | "mov" | "matroska";

export async function probe(video: ArrayBuffer, input: Input = "mov"): Promise<Probe> {
  return (await call(`/probe?input=${input}`, post(video))).json() as Promise<Probe>;
}

export async function render(video: ArrayBuffer, name: "poster" | "preview"): Promise<ArrayBuffer> {
  return (await call(`/render?name=${name}`, post(video))).arrayBuffer();
}

export async function convert(
  video: ArrayBuffer,
  format: string,
  quality: string,
  { input = "mov", maxDurationMs }: { input?: Input; maxDurationMs?: number } = {},
): Promise<ArrayBuffer> {
  const limit = maxDurationMs ? `&maxDurationMs=${maxDurationMs}` : "";
  return (await call(`/convert?input=${input}&format=${format}&quality=${quality}${limit}`, post(video))).arrayBuffer();
}

export type Compressed = {
  data: ArrayBuffer;
  width: number;
  fps: number;
  colors: number;
  /** false when even the smallest settings couldn't reach the target */
  targetMet: boolean;
  /** true when the upload already fit and was returned untouched */
  unchanged: boolean;
};

/** Makes a GIF at or under `targetBytes`, trying smaller settings until it fits. */
export async function compress(
  video: ArrayBuffer,
  { input, targetBytes, maxWidth = 0, maxDurationMs }: { input: Input; targetBytes: number; maxWidth?: number; maxDurationMs?: number },
): Promise<Compressed> {
  const limit = maxDurationMs ? `&maxDurationMs=${maxDurationMs}` : "";
  const res = await call(`/compress?input=${input}&targetBytes=${targetBytes}&maxWidth=${maxWidth}${limit}`, post(video));
  const h = (name: string) => res.headers.get(`x-gifsuite-${name}`);
  return {
    data: await res.arrayBuffer(),
    width: Number(h("width")),
    fps: Number(h("fps")),
    colors: Number(h("colors")),
    targetMet: h("target-met") === "true",
    unchanged: h("unchanged") === "true",
  };
}

/** yt-dlp's metadata for a post's media slot (1-based), used when X's embed endpoint fails. */
export async function ytdlpInfo(tweetId: string, slot: number): Promise<Record<string, unknown>> {
  return (await call(`/ytdlp?tweetId=${tweetId}&slot=${slot}`)).json() as Promise<Record<string, unknown>>;
}

/** Runs the NSFW model on frames sampled across the video; see processor/nsfw.mjs. */
export async function scanNsfw(video: ArrayBuffer): Promise<NsfwScores> {
  return (await call(`/nsfw`, post(video))).json() as Promise<NsfwScores>;
}

/** What the processor learned about a link's media (see processor/fetch.mjs). */
export type LinkInfo = Probe & {
  kind: "direct" | "page";
  webpageUrl: string;
  mediaUrl: string;
  title?: string;
  uploader?: string;
  uploaderId?: string;
  likes?: number;
  /** 18 when the site labels it adults-only. */
  ageLimit?: number;
};

/** Downloads the GIF or video behind any link, normalised to MP4. */
export async function fetchLink(
  link: string,
  { maxBytes, maxDurationMs }: { maxBytes: number; maxDurationMs: number },
): Promise<{ video: ArrayBuffer; info: LinkInfo }> {
  const params = new URLSearchParams({ url: link, maxBytes: String(maxBytes), maxDurationMs: String(maxDurationMs) });
  const res = await call(`/fetch?${params}`);
  const header = res.headers.get("x-gifsuite-info") ?? "";
  const info = JSON.parse(Buffer.from(header, "base64url").toString("utf8") || "{}") as LinkInfo;
  return { video: await res.arrayBuffer(), info };
}

/** Makes a GIF or MP4 from still images (processor/maker.mjs). `form` holds `image` files in order and `settings`. */
export async function make(form: FormData): Promise<{ data: ArrayBuffer; type: string }> {
  const res = await call("/make", { method: "POST", body: form });
  return { data: await res.arrayBuffer(), type: res.headers.get("content-type") ?? "image/gif" };
}

/** Crops a clip to a box in source pixels, as GIF or MP4 (processor/presets.mjs cropArgs). */
export async function crop(
  video: ArrayBuffer,
  { input, format, box, maxDurationMs }: { input: Input; format: "gif" | "mp4"; box: { x: number; y: number; w: number; h: number }; maxDurationMs: number },
): Promise<ArrayBuffer> {
  const q = new URLSearchParams({ input, format, maxDurationMs: String(maxDurationMs), x: String(box.x), y: String(box.y), w: String(box.w), h: String(box.h) });
  return (await call(`/crop?${q}`, post(video))).arrayBuffer();
}

/** Trim, speed, direction and captions in one go (processor/edit.mjs). `form` holds file, overlay? and settings. */
export async function edit(form: FormData, { input, maxDurationMs }: { input: Input; maxDurationMs: number }): Promise<{ data: ArrayBuffer; type: string }> {
  const res = await call(`/edit?input=${input}&maxDurationMs=${maxDurationMs}`, { method: "POST", body: form });
  return { data: await res.arrayBuffer(), type: res.headers.get("content-type") ?? "image/gif" };
}

/** True if the media processor answers its health check. */
export async function processorHealthy(): Promise<boolean> {
  try {
    return (await (await call("/health")).text()).trim() === "ok";
  } catch {
    return false;
  }
}
