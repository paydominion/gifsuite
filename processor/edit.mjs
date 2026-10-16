// Edit pipeline shared by the Trim, Speed & reverse and Captions tools. One ffmpeg run:
//   trim → caption overlay → speed → direction (forward / reverse / boomerang) → size and frame rate → encode
// Captions arrive as a transparent PNG drawn by the browser at the clip's own size, so what people see
// in the preview is exactly what they get, and no fonts or text rendering are needed here.
import { inputArgs } from "./presets.mjs";

export const EDIT = {
  speeds: [0.25, 0.5, 0.75, 1, 1.5, 2, 3, 4],
  directions: ["forward", "reverse", "boomerang"],
  formats: { gif: "image/gif", mp4: "video/mp4" },
  minClipMs: 100,
  maxReverseMs: 20_000, // reverse and boomerang hold every frame in memory
  maxOutputMs: 60_000,
  maxWidth: 1080,
  gifMaxFps: 20,
  mp4MaxFps: 60,
};

/**
 * Checks the settings against the clip. Returns { settings } or { error } (a message for people).
 * @param {unknown} raw @param {{ durationMs: number, hasAudio: boolean }} info
 */
export function parseEdit(raw, info) {
  const s = typeof raw === "object" && raw !== null ? raw : {};
  const start = Math.round(Number(s.start ?? 0));
  const end = Math.round(Number(s.end ?? info.durationMs));
  const speed = Number(s.speed ?? 1);
  const direction = s.direction ?? "forward";
  const format = s.format ?? "gif";
  if (!Number.isFinite(start) || !Number.isFinite(end) || start < 0 || end > info.durationMs + 50 || end - start < EDIT.minClipMs) {
    return { error: "Pick a start and end inside the clip, at least 0.1 seconds apart." };
  }
  if (!EDIT.speeds.includes(speed)) return { error: "Pick a speed between 0.25× and 4×." };
  if (!EDIT.directions.includes(direction)) return { error: "Pick forward, reverse or boomerang." };
  if (!Object.hasOwn(EDIT.formats, format)) return { error: "Pick GIF or MP4." };
  const clipMs = Math.min(end, info.durationMs) - start;
  if (direction !== "forward" && clipMs > EDIT.maxReverseMs) {
    return { error: "Reverse and boomerang work on up to 20 seconds. Trim the clip first." };
  }
  const outputMs = (clipMs / speed) * (direction === "boomerang" ? 2 : 1);
  if (outputMs > EDIT.maxOutputMs) return { error: "The result would be longer than 60 seconds. Trim it or speed it up." };
  return { settings: { start, end: Math.min(end, info.durationMs), speed, direction, format, outputMs } };
}

/** atempo only takes 0.5–2 per step on older ffmpeg, so bigger changes are chained. */
export function atempoChain(speed) {
  const steps = [];
  let left = speed;
  while (left > 2) {
    steps.push(2);
    left /= 2;
  }
  while (left < 0.5) {
    steps.push(0.5);
    left /= 0.5;
  }
  if (Math.abs(left - 1) > 1e-9) steps.push(Number(left.toFixed(4)));
  return steps.map((t) => `atempo=${t}`).join(",");
}

/**
 * ffmpeg arguments for an edit.
 * @param {{ start: number, end: number, speed: number, direction: string, format: string }} s
 * @param {{ width: number, fps: number, hasAudio: boolean }} info
 * @param {string | null} overlay path of the caption PNG, or null
 */
export function editArgs(s, info, src, input, overlay, out) {
  const t = (ms) => (ms / 1000).toFixed(3);
  const chain = [];
  let graph = `[0:v]trim=start=${t(s.start)}:end=${t(s.end)},setpts=PTS-STARTPTS[v0];`;
  let last = "v0";
  if (overlay) {
    graph += `[${last}][1:v]overlay=0:0:format=auto[v1];`;
    last = "v1";
  }
  if (s.speed !== 1) chain.push(`setpts=PTS/${s.speed}`);
  if (s.direction === "reverse") chain.push("reverse");

  // Frame rate after speeding up, capped so GIFs stay small and MP4s stay playable everywhere.
  const fps = (info.fps || 25) * s.speed;
  const maxFps = s.format === "gif" ? EDIT.gifMaxFps : EDIT.mp4MaxFps;
  const size = [];
  if (fps > maxFps) size.push(`fps=${maxFps}`);
  if (info.width > EDIT.maxWidth) size.push(`scale=${EDIT.maxWidth}:-2:flags=lanczos`);
  if (s.format === "mp4") size.push("scale=trunc(iw/2)*2:trunc(ih/2)*2");

  if (s.direction === "boomerang") {
    // Play it, then play it backwards; the reversed half skips its first frame so the turn doesn't stutter.
    graph += `[${last}]${[...chain, "split"].join(",")}[f][b];[b]reverse,trim=start_frame=1,setpts=PTS-STARTPTS[r];[f][r]concat=n=2:v=1:a=0[v2];`;
    last = "v2";
    chain.length = 0;
  }
  const tail = [...chain, ...size];
  graph += `[${last}]${tail.length ? tail.join(",") : "null"}[v]`;

  // Sound: MP4 only, playing forward, sped up or slowed down to match.
  const audio = s.format === "mp4" && s.direction === "forward" && info.hasAudio;
  if (audio) {
    const tempo = s.speed !== 1 ? `,${atempoChain(s.speed)}` : "";
    graph += `;[0:a]atrim=start=${t(s.start)}:end=${t(s.end)},asetpts=PTS-STARTPTS${tempo}[a]`;
  }

  const inputs = [...inputArgs(input, src), ...(overlay ? ["-protocol_whitelist", "file", "-f", "png_pipe", "-i", overlay] : [])];
  if (s.format === "gif") {
    return [...inputs, "-filter_complex",
      `${graph};[v]split[p1][p2];[p1]palettegen=stats_mode=diff[p];[p2][p]paletteuse=dither=bayer:bayer_scale=4:diff_mode=rectangle[g]`,
      "-map", "[g]", "-loop", "0", "-f", "gif", out];
  }
  return [...inputs, "-filter_complex", graph, "-map", "[v]", ...(audio ? ["-map", "[a]", "-c:a", "aac", "-b:a", "128k"] : []),
    "-c:v", "libx264", "-crf", "20", "-preset", "veryfast", "-pix_fmt", "yuv420p", "-movflags", "+faststart", "-f", "mp4", out];
}
