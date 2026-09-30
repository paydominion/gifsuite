import "server-only";
import { bindings, setting } from "@/lib/cloudflare";

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
    res = await getContainer(container).fetch(new Request(`http://processor${path}`, init));
  } else {
    throw new Error("No media processor: set PROCESSOR_URL or bind the PROCESSOR container");
  }
  if (!res.ok) throw new ProcessorError(res.status, await res.text());
  return res;
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
