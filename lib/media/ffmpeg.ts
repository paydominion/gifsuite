import { spawn } from "node:child_process";

const FFMPEG = process.env.FFMPEG_PATH ?? "ffmpeg";
const FFPROBE = process.env.FFPROBE_PATH ?? "ffprobe";

function run(bin: string, args: string[], timeoutMs: number): Promise<string> {
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

export function ffmpeg(args: string[], timeoutMs = 120_000) {
  return run(FFMPEG, ["-hide_banner", "-loglevel", "error", "-y", ...args], timeoutMs);
}

export type Probe = { width: number; height: number; durationMs: number; hasAudio: boolean };

export async function probe(file: string): Promise<Probe> {
  const out = await run(
    FFPROBE,
    ["-v", "error", "-show_entries", "stream=codec_type,width,height:format=duration", "-of", "json", file],
    20_000,
  );
  const info = JSON.parse(out) as {
    streams: { codec_type: string; width?: number; height?: number }[];
    format: { duration?: string };
  };
  const video = info.streams.find((s) => s.codec_type === "video");
  if (!video) throw new Error("no video stream");
  return {
    width: video.width ?? 0,
    height: video.height ?? 0,
    durationMs: Math.round(Number(info.format.duration ?? 0) * 1000),
    hasAudio: info.streams.some((s) => s.codec_type === "audio"),
  };
}
