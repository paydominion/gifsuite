// NSFW scanner: the open-source nsfwjs MobileNetV2 model (MIT), run with TensorFlow.js on its
// WebAssembly backend (many times faster than plain JavaScript, and no native build needed).
// The model files ship inside the nsfwjs package, so nothing is downloaded at runtime and no frame
// ever leaves this container.
import fs from "node:fs";
import { NSFW, worstFrame } from "./presets.mjs";

let modelPromise = null;

/** Loads the model once, on the first scan, and keeps it in memory. */
function model() {
  modelPromise ??= (async () => {
    const tf = await import("@tensorflow/tfjs");
    await import("@tensorflow/tfjs-backend-wasm");
    if (!(await tf.setBackend("wasm"))) await tf.setBackend("cpu");
    await tf.ready();
    console.log(`[nsfw] TensorFlow.js backend: ${tf.getBackend()}`);
    const nsfwjs = await import("nsfwjs");
    return { tf, model: await nsfwjs.load("MobileNetV2") };
  })().catch((err) => {
    modelPromise = null; // try again on the next scan
    throw err;
  });
  return modelPromise;
}

/** Scores raw 224×224 RGB frames (from nsfwFrameArgs) and returns the worst frame's scores. */
export async function scanFrames(rawFile) {
  const { tf, model: m } = await model();
  const bytes = fs.readFileSync(rawFile);
  const frameBytes = NSFW.size * NSFW.size * 3;
  const perFrame = [];
  for (let offset = 0; offset + frameBytes <= bytes.length; offset += frameBytes) {
    const image = tf.tensor3d(bytes.subarray(offset, offset + frameBytes), [NSFW.size, NSFW.size, 3], "int32");
    try {
      perFrame.push(await m.classify(image, 5));
    } finally {
      image.dispose();
    }
  }
  if (perFrame.length === 0) throw new Error("no frames to scan");
  return worstFrame(perFrame);
}
