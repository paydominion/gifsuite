"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card, SectionLabel } from "@/components/ui/Card";
import { Dropzone } from "@/components/ui/Dropzone";
import { Segmented } from "@/components/ui/Segmented";
import { Preview, UPLOAD_ACCEPT, baseName, formatBytes, isVideoFile, saveAs } from "./shared";

type Aspect = "free" | "1:1" | "16:9" | "9:16" | "4:5";
type Format = "gif" | "mp4";
type Box = { x: number; y: number; w: number; h: number };
type Corner = "nw" | "ne" | "sw" | "se";
type Drag = { mode: "move" | Corner; startX: number; startY: number; box: Box };

const ASPECTS: { value: Aspect; label: string }[] = [
  { value: "free", label: "Free" },
  { value: "1:1", label: "1:1" },
  { value: "16:9", label: "16:9" },
  { value: "9:16", label: "9:16" },
  { value: "4:5", label: "4:5" },
];
const RATIOS: Record<Aspect, number | null> = { free: null, "1:1": 1, "16:9": 16 / 9, "9:16": 9 / 16, "4:5": 4 / 5 };
const FORMATS: { value: Format; label: string }[] = [
  { value: "gif", label: "GIF" },
  { value: "mp4", label: "MP4" },
];
const MIN = 16; // smallest crop, in source pixels

/** The largest box of this shape that fits the picture, centred. Free: 80% of it. */
export function presetBox(aspect: Aspect, W: number, H: number): Box {
  const r = RATIOS[aspect];
  let w: number, h: number;
  if (!r) [w, h] = [W * 0.8, H * 0.8];
  else if (W / H > r) [h, w] = [H, H * r];
  else [w, h] = [W, W / r];
  w = Math.max(MIN, Math.floor(w));
  h = Math.max(MIN, Math.floor(h));
  return { x: Math.floor((W - w) / 2), y: Math.floor((H - h) / 2), w, h };
}

/** Resizes from one corner, keeping the opposite corner still, the shape (if locked) and the picture's edges. */
export function resizeBox(corner: Corner, start: Box, dx: number, dy: number, ratio: number | null, W: number, H: number): Box {
  const sx = corner.includes("e") ? 1 : -1;
  const sy = corner.includes("s") ? 1 : -1;
  const ax = sx > 0 ? start.x : start.x + start.w; // the corner that stays put
  const ay = sy > 0 ? start.y : start.y + start.h;
  const maxW = sx > 0 ? W - ax : ax;
  const maxH = sy > 0 ? H - ay : ay;
  let w = start.w + sx * dx;
  let h = start.h + sy * dy;
  if (ratio) {
    w = Math.min(Math.max(w, MIN, MIN * ratio), maxW, maxH * ratio);
    h = w / ratio;
  } else {
    w = Math.min(Math.max(w, MIN), maxW);
    h = Math.min(Math.max(h, MIN), maxH);
  }
  w = Math.round(w);
  h = Math.round(h);
  return { x: sx > 0 ? ax : ax - w, y: sy > 0 ? ay : ay - h, w, h };
}

export function moveBox(start: Box, dx: number, dy: number, W: number, H: number): Box {
  return {
    ...start,
    x: Math.round(Math.min(Math.max(start.x + dx, 0), W - start.w)),
    y: Math.round(Math.min(Math.max(start.y + dy, 0), H - start.h)),
  };
}

/** Crop a GIF or short video: drag a box (or pick a shape) and download the cropped GIF or MP4. */
export function CropTool({ maxUploadMb, initialFormat }: { maxUploadMb: number; initialFormat?: Format }) {
  const [file, setFile] = useState<{ file: File; url: string; video: boolean } | null>(null);
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const [box, setBox] = useState<Box | null>(null);
  const [aspect, setAspect] = useState<Aspect>("free");
  const [format, setFormat] = useState<Format>(initialFormat ?? "gif");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ url: string; name: string; bytes: number; format: Format } | null>(null);
  const frame = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const drag = useRef<Drag | null>(null);

  useEffect(() => () => {
    if (file) URL.revokeObjectURL(file.url);
  }, [file]);
  useEffect(() => () => {
    if (result) URL.revokeObjectURL(result.url);
  }, [result]);

  // Screen pixels per source pixel, kept up to date as the layout changes.
  useEffect(() => {
    const el = frame.current;
    if (!el || !size) return;
    const update = () => setScale(el.clientWidth / size.w);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [size]);

  const choose = useCallback(
    (picked: File) => {
      setError(null);
      setResult(null);
      setSize(null);
      setBox(null);
      if (picked.size > maxUploadMb * 1024 * 1024) {
        setError(`That file is over ${maxUploadMb} MB. Try a smaller one.`);
        return;
      }
      const video = isVideoFile(picked);
      setFile({ file: picked, url: URL.createObjectURL(picked), video });
      if (!initialFormat) setFormat(video ? "mp4" : "gif");
    },
    [maxUploadMb, initialFormat],
  );

  function loaded(w: number, h: number) {
    if (!w || !h) return setError("Couldn't read that file's size. Try another one.");
    setSize({ w, h });
    setBox(presetBox(aspect, w, h));
  }

  function pickAspect(next: Aspect) {
    setAspect(next);
    setResult(null);
    if (size) setBox(presetBox(next, size.w, size.h));
  }

  function startDrag(mode: Drag["mode"], e: React.PointerEvent) {
    if (!box || busy) return;
    e.preventDefault();
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    drag.current = { mode, startX: e.clientX, startY: e.clientY, box };
  }

  function onDrag(e: React.PointerEvent) {
    const d = drag.current;
    if (!d || !size) return;
    const dx = (e.clientX - d.startX) / scale;
    const dy = (e.clientY - d.startY) / scale;
    setResult(null);
    setBox(d.mode === "move" ? moveBox(d.box, dx, dy, size.w, size.h) : resizeBox(d.mode, d.box, dx, dy, RATIOS[aspect], size.w, size.h));
  }

  // Arrow keys move the box: 1% of the picture per press, 10% with Shift.
  function onKey(e: React.KeyboardEvent) {
    if (!box || !size) return;
    const step = (e.shiftKey ? 0.1 : 0.01) * Math.max(size.w, size.h);
    const delta = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[e.key];
    if (!delta) return;
    e.preventDefault();
    setBox(moveBox(box, delta[0], delta[1], size.w, size.h));
  }

  async function run() {
    if (!file || !box) return;
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const q = new URLSearchParams({ format, x: String(box.x), y: String(box.y), w: String(box.w), h: String(box.h) });
      const res = await fetch(`/api/crop?${q}`, { method: "POST", body: file.file, headers: { "content-type": "application/octet-stream" } });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? "Something went wrong cropping that file.");
      }
      const blob = await res.blob();
      const next = { url: URL.createObjectURL(blob), name: `${baseName(file.file)}-cropped.${format}`, bytes: blob.size, format };
      setResult(next);
      saveAs(next.url, next.name);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const handle = (corner: Corner, pos: string) => (
    <span
      key={corner}
      role="presentation"
      onPointerDown={(e) => startDrag(corner, e)}
      className={`absolute ${pos} grid size-11 touch-none place-items-center`}
      style={{ cursor: corner === "nw" || corner === "se" ? "nwse-resize" : "nesw-resize" }}
    >
      <span className="size-3.5 rounded-sm border-2 border-bg bg-accent" />
    </span>
  );

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
      <div className="space-y-4">
        {!file ? (
          <Dropzone accept={UPLOAD_ACCEPT} hint={`GIF, MP4, MOV or WebM, up to ${maxUploadMb} MB. Your file isn't stored.`} onFile={choose} disabled={busy} />
        ) : (
          <Card className="space-y-3 p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-semibold">{file.file.name}</p>
                <p className="text-xs text-muted">
                  {formatBytes(file.file.size)}
                  {size && ` · ${size.w}×${size.h}`}
                </p>
              </div>
              <Button size="sm" variant="ghost" disabled={busy} onClick={() => { setFile(null); setResult(null); setError(null); setBox(null); setSize(null); }}>
                Choose another
              </Button>
            </div>
            {/* The picture with the crop box on top. Dimming outside the box is clipped to the picture; the
                corner handles sit on their own layer so they're never cut off at the edges. The margin
                leaves room for them. */}
            <div className="m-3 touch-none select-none" onPointerMove={onDrag} onPointerUp={() => (drag.current = null)}>
              <div ref={frame} className="relative w-full">
                <div className="overflow-hidden rounded-lg bg-panel">
                  {file.video ? (
                    <video src={file.url} autoPlay muted loop playsInline className="block h-auto w-full" onLoadedMetadata={(e) => loaded(e.currentTarget.videoWidth, e.currentTarget.videoHeight)} />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element -- a local blob preview
                    <img src={file.url} alt="" className="block h-auto w-full" onLoad={(e) => loaded(e.currentTarget.naturalWidth, e.currentTarget.naturalHeight)} />
                  )}
                  {box && (
                    <div
                      aria-hidden
                      className="pointer-events-none absolute shadow-[0_0_0_9999px_rgba(0,0,0,0.55)]"
                      style={{ left: box.x * scale, top: box.y * scale, width: box.w * scale, height: box.h * scale }}
                    />
                  )}
                </div>
                {box && (
                  <div
                    role="slider"
                    aria-label="Crop box"
                    aria-valuetext={`${box.w} by ${box.h} pixels, at ${box.x}, ${box.y}`}
                    aria-valuenow={box.x}
                    tabIndex={0}
                    onKeyDown={onKey}
                    onPointerDown={(e) => startDrag("move", e)}
                    className="absolute cursor-move border-2 border-accent outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    style={{ left: box.x * scale, top: box.y * scale, width: box.w * scale, height: box.h * scale }}
                  >
                    {handle("nw", "-left-[22px] -top-[22px]")}
                    {handle("ne", "-right-[22px] -top-[22px]")}
                    {handle("sw", "-bottom-[22px] -left-[22px]")}
                    {handle("se", "-bottom-[22px] -right-[22px]")}
                  </div>
                )}
              </div>
            </div>
            <p className="text-xs text-muted">Drag the box to move it, and its corners to resize. Arrow keys move it too.</p>
          </Card>
        )}

        {result && (
          <Card className="space-y-3 p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <SectionLabel>Result</SectionLabel>
                <p role="status" className="mt-1 truncate text-sm">Saved {result.name} ({formatBytes(result.bytes)})</p>
              </div>
              <Button size="sm" variant="secondary" onClick={() => saveAs(result.url, result.name)}>Download again</Button>
            </div>
            <Preview url={result.url} isVideo={result.format === "mp4"} label="Cropped file" />
          </Card>
        )}
      </div>

      <Card className="space-y-5 p-5 lg:sticky lg:top-20">
        <div className="space-y-2">
          <SectionLabel>Shape</SectionLabel>
          <Segmented label="Shape" options={ASPECTS} value={aspect} onChange={pickAspect} disabled={busy} />
          <p className="text-xs text-muted">
            {box ? `Crop: ${box.w}×${box.h} pixels` : "1:1 for profiles and posts, 9:16 for stories, 16:9 for widescreen."}
          </p>
        </div>
        <div className="space-y-2">
          <SectionLabel>Save as</SectionLabel>
          <Segmented label="Format" options={FORMATS} value={format} onChange={setFormat} disabled={busy} />
          <p className="text-xs text-muted">MP4 keeps any sound and is much smaller; GIF plays everywhere images do.</p>
        </div>
        <Button variant="primary" size="lg" className="w-full" disabled={!box || busy} onClick={run}>
          {busy ? "Cropping…" : "Crop & download"}
        </Button>
        {error && <p role="alert" className="text-sm font-medium text-danger">{error}</p>}
      </Card>
    </div>
  );
}
