// GIF maker: turns still images into a GIF or MP4.
//   - Several images: a slideshow, each shown for `frameMs`, optionally crossfading.
//   - One image: an effect over `durationMs`: zoom (Ken Burns), pan, pulse, shake, or none.
// Everything here builds ffmpeg arguments; server.mjs runs them.

export const MAKER = {
  maxImages: 30,
  widths: [320, 480, 640],
  frameMs: { min: 100, max: 5000 },
  durationMs: { min: 1000, max: 10000 },
  maxTotalMs: 60_000,
  effects: ["none", "zoom", "pan", "pulse", "shake"],
  fits: ["contain", "cover"],
  backgrounds: { black: "black", white: "white" },
  formats: ["gif", "mp4"],
};

/** Which ffmpeg demuxer reads an image, from its first bytes. Anything else is refused. */
export function imageDemuxer(bytes) {
  const ascii = (a, b) => String.fromCharCode(...bytes.subarray(a, b));
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "jpeg_pipe";
  if (bytes[0] === 0x89 && ascii(1, 4) === "PNG") return "png_pipe";
  if (ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") return "webp_pipe";
  if (ascii(0, 3) === "GIF") return "gif";
  return null;
}

/**
 * Checks and normalises the settings a visitor sent. Returns { settings } or { error }.
 * @param {unknown} raw @param {number} count number of images
 */
export function parseSettings(raw, count) {
  const s = typeof raw === "object" && raw !== null ? raw : {};
  const width = Number(s.width ?? 480);
  const fit = s.fit ?? "contain";
  const background = s.background ?? "black";
  const format = s.format ?? "gif";
  if (!MAKER.widths.includes(width)) return { error: "Pick a width of 320, 480 or 640." };
  if (!MAKER.fits.includes(fit)) return { error: "Pick fit or fill." };
  if (!Object.hasOwn(MAKER.backgrounds, background)) return { error: "Pick a black or white background." };
  if (!MAKER.formats.includes(format)) return { error: "Pick GIF or MP4." };
  if (count < 1) return { error: "Add at least one image." };
  if (count > MAKER.maxImages) return { error: `Use up to ${MAKER.maxImages} images.` };

  if (count === 1) {
    const effect = s.effect ?? "zoom";
    const durationMs = Number(s.durationMs ?? 3000);
    if (!MAKER.effects.includes(effect)) return { error: "Pick an effect." };
    if (!Number.isInteger(durationMs) || durationMs < MAKER.durationMs.min || durationMs > MAKER.durationMs.max) {
      return { error: "Pick a length between 1 and 10 seconds." };
    }
    return { settings: { mode: "effect", effect, durationMs, width, fit, background, format } };
  }

  const frameMs = Number(s.frameMs ?? 500);
  const crossfade = s.crossfade === true;
  if (!Number.isInteger(frameMs) || frameMs < MAKER.frameMs.min || frameMs > MAKER.frameMs.max) {
    return { error: "Pick a time per image between 0.1 and 5 seconds." };
  }
  if (count * frameMs > MAKER.maxTotalMs) return { error: "That would be longer than 60 seconds. Use fewer images or a shorter time." };
  return { settings: { mode: "slideshow", frameMs, crossfade, width, fit, background, format } };
}

/** Output height from the first image's shape, even (for MP4), and never taller than 2× the width. */
export function outputHeight(width, first) {
  const ratio = first.width > 0 && first.height > 0 ? first.height / first.width : 0.75;
  return Math.max(2, Math.min(width * 2, Math.round((width * ratio) / 2) * 2));
}

/** Scale one image into a W×H frame: letterboxed ("contain") or filled and cropped ("cover"). */
export function fitFilter(fit, w, h, background) {
  return fit === "cover"
    ? `scale=${w}:${h}:force_original_aspect_ratio=increase:flags=lanczos,crop=${w}:${h}`
    : `scale=${w}:${h}:force_original_aspect_ratio=decrease:flags=lanczos,pad=${w}:${h}:(ow-iw)/2:(oh-ih)/2:color=${MAKER.backgrounds[background]}`;
}

/** zoompan expressions for one-image effects. `n` is the frame count; zoompan's `on` is the frame number. */
export function effectExpr(effect, n, fps) {
  const centre = { x: "iw/2-(iw/zoom/2)", y: "ih/2-(ih/zoom/2)" };
  switch (effect) {
    case "zoom": // slow push in, Ken Burns style
      return { z: `1+0.25*on/${Math.max(n - 1, 1)}`, ...centre };
    case "pan": // slightly zoomed, sliding left to right
      return { z: "1.2", x: `(iw-iw/zoom)*on/${Math.max(n - 1, 1)}`, y: "ih/2-(ih/zoom/2)" };
    case "pulse": // gentle beat, about once a second
      return { z: `1.05+0.05*sin(2*PI*on/${fps})`, ...centre };
    case "shake": // quick wobble
      return { z: "1.08", x: `iw/2-(iw/zoom/2)+iw*0.02*sin(on*2.3)`, y: `ih/2-(ih/zoom/2)+ih*0.02*sin(on*3.7)` };
    default:
      return { z: "1", ...centre };
  }
}

/** One image as an ffmpeg input: a forced demuxer, local files only (never URLs or playlists). */
export const imageInput = (img) => ["-protocol_whitelist", "file", "-f", img.demuxer, "-i", img.file];

const DECODERS = { jpeg_pipe: "mjpeg", png_pipe: "png", webp_pipe: "webp", gif: "gif" };

/**
 * One image held still for `seconds` at `fps`, as an ffmpeg input. The image2 reader repeats it
 * with exact timestamps; the decoder is forced from the sniffed type, and only local files are read.
 * (A GIF gives its first frame.)
 */
export const heldImageInput = (img, fps, seconds) => [
  "-protocol_whitelist", "file", "-f", "image2", "-pattern_type", "none", "-loop", "1",
  "-framerate", String(fps), "-t", seconds.toFixed(3), "-c:v", DECODERS[img.demuxer], "-i", img.file,
];

const encode = (format, label, out, { statsMode }) =>
  format === "gif"
    ? [`${label}split[a][b];[a]palettegen=stats_mode=${statsMode}[p];[b][p]paletteuse=dither=bayer:bayer_scale=4:diff_mode=rectangle`,
      ["-loop", "0", "-f", "gif", out]]
    : [`${label}format=yuv420p`, ["-c:v", "libx264", "-crf", "22", "-preset", "veryfast", "-movflags", "+faststart", "-f", "mp4", out]];

/**
 * ffmpeg arguments for the whole job.
 * @param {{ file: string, demuxer: string }[]} images in order
 * @param {{ width: number, height: number }} size
 */
export function makeArgs(images, settings, size, out) {
  const { width: w, height: h } = size;
  const inputs = images.flatMap(imageInput);

  if (settings.mode === "effect") {
    // 15 fps keeps GIFs smaller (every pixel changes in a zoom); MP4 can afford smoother motion.
    const fps = settings.format === "gif" ? 15 : 24;
    const n = Math.round((settings.durationMs / 1000) * fps);
    const e = effectExpr(settings.effect, n, fps);
    // Work at twice the size so zooming stays sharp, then zoompan down to the output size.
    const big = `[0:v]trim=end_frame=1,${fitFilter(settings.fit, w * 2, h * 2, settings.background)},setsar=1`;
    const motion = `${big},zoompan=z='${e.z}':x='${e.x}':y='${e.y}':d=${n}:s=${w}x${h}:fps=${fps}[m];`;
    const [tail, outArgs] = encode(settings.format, "[m]", out, { statsMode: "diff" });
    return [...inputs, "-filter_complex", motion + tail, ...outArgs];
  }

  // Times are whole frames: 10 fps (0.1 s steps) for a plain slideshow, 15 fps for smooth crossfades.
  const fps = settings.crossfade ? 15 : 10;
  const clip = Math.max(1, Math.round((settings.frameMs / 1000) * fps)) / fps;
  const held = images.flatMap((img) => heldImageInput(img, fps, clip));
  // The inputs already run at `fps`. Only xfade needs it declared again, and the fps filter would
  // drop the single frame of a 0.1-second clip.
  const rate = settings.crossfade ? `,fps=${fps}` : "";
  const clips = images.map((_, i) => `[${i}:v]${fitFilter(settings.fit, w, h, settings.background)},setsar=1${rate}[c${i}];`);
  let joined;
  if (settings.crossfade && images.length > 1) {
    const fade = Math.min(0.5, clip / 2);
    joined = "";
    let prev = "c0";
    for (let i = 1; i < images.length; i++) {
      const label = i === images.length - 1 ? "j" : `x${i}`;
      joined += `[${prev}][c${i}]xfade=transition=fade:duration=${fade.toFixed(3)}:offset=${(i * (clip - fade)).toFixed(3)}[${label}];`;
      prev = label;
    }
  } else {
    // Renumber frame times after joining: a one-frame clip has no length of its own, so without this
    // the next image would land on the same timestamp and be dropped.
    joined = `${images.map((_, i) => `[c${i}]`).join("")}concat=n=${images.length}:v=1:a=0,setpts=N/(${fps}*TB)[j];`;
  }
  const [tail, outArgs] = encode(settings.format, "[j]", out, { statsMode: "full" });
  return [...held, "-filter_complex", clips.join("") + joined + tail, ...outArgs];
}
