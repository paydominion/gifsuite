"use client";

import { humanFetch } from "@/lib/human";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { ErrorMessage } from "@/components/ui/Alert";
import { Card, SectionLabel } from "@/components/ui/Card";
import { Checkbox } from "@/components/ui/Checkbox";
import { Dropzone } from "@/components/ui/Dropzone";
import { Segmented } from "@/components/ui/Segmented";
import { ResultPanel, saveAs } from "./shared";

const MAX_IMAGES = 30;
const MAX_IMAGE_MB = 10;
const IMAGE_ACCEPT = "image/jpeg,image/png,image/webp,image/gif,.jpg,.jpeg,.png,.webp,.gif";

type Effect = "none" | "zoom" | "pan" | "pulse" | "shake";
type Format = "gif" | "mp4";
type Item = { id: string; file: File; url: string };

const EFFECTS: { value: Effect; label: string }[] = [
  { value: "zoom", label: "Zoom" },
  { value: "pan", label: "Pan" },
  { value: "pulse", label: "Pulse" },
  { value: "shake", label: "Shake" },
  { value: "none", label: "Still" },
];
const EFFECT_HINT: Record<Effect, string> = {
  zoom: "A slow push in, like a documentary.",
  pan: "Slides across the picture.",
  pulse: "A gentle beat, about once a second.",
  shake: "A quick wobble.",
  none: "The picture as it is.",
};
const LENGTHS = [
  { value: "2000", label: "2s" },
  { value: "3000", label: "3s" },
  { value: "5000", label: "5s" },
];
const FRAME_TIMES = [
  { value: "200", label: "0.2s" },
  { value: "500", label: "0.5s" },
  { value: "1000", label: "1s" },
  { value: "2000", label: "2s" },
];
const WIDTHS = [
  { value: "320", label: "320px" },
  { value: "480", label: "480px" },
  { value: "640", label: "640px" },
];
const FITS = [
  { value: "contain", label: "Fit" },
  { value: "cover", label: "Fill" },
];
const FORMATS: { value: Format; label: string }[] = [
  { value: "gif", label: "GIF" },
  { value: "mp4", label: "MP4" },
];

let nextId = 0;

/** GIF maker: one picture with an effect, or several as a slideshow. */
export function MakerTool({ maxUploadMb }: { maxUploadMb: number }) {
  const [items, setItems] = useState<Item[]>([]);
  const [effect, setEffect] = useState<Effect>("zoom");
  const [length, setLength] = useState("3000");
  const [frameTime, setFrameTime] = useState("500");
  const [crossfade, setCrossfade] = useState(false);
  const [width, setWidth] = useState("480");
  const [fit, setFit] = useState("contain");
  const [format, setFormat] = useState<Format>("gif");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ url: string; name: string; size: number; format: Format } | null>(null);
  const dragging = useRef<string | null>(null);

  // Free preview memory when pictures are removed or the page closes.
  const urls = useRef(new Set<string>());
  useEffect(() => () => urls.current.forEach((u) => URL.revokeObjectURL(u)), []);
  useEffect(() => () => {
    if (result) URL.revokeObjectURL(result.url);
  }, [result]);

  function add(files: File[]) {
    setError(null);
    setResult(null);
    const room = MAX_IMAGES - items.length;
    const picked = files.filter((f) => /^image\/(jpeg|png|webp|gif)$/.test(f.type) || /\.(jpe?g|png|webp|gif)$/i.test(f.name));
    if (picked.length === 0) {
      const video = files.some((f) => /^video\//.test(f.type) || /\.(mp4|mov|m4v|webm)$/i.test(f.name));
      return setError(video ? "The GIF maker takes pictures. To turn a video into a GIF, use Upload & convert." : "Only JPEG, PNG, WebP and GIF pictures work here.");
    }
    if (picked.length < files.length) setError("Some files were skipped: only JPEG, PNG, WebP and GIF pictures work here.");
    const tooBig = picked.find((f) => f.size > MAX_IMAGE_MB * 1024 * 1024);
    if (tooBig) return setError(`${tooBig.name} is over ${MAX_IMAGE_MB} MB.`);
    const total = [...items.map((i) => i.file), ...picked].reduce((n, f) => n + f.size, 0);
    if (total > maxUploadMb * 1024 * 1024) return setError(`Those pictures add up to more than ${maxUploadMb} MB. Use fewer or smaller ones.`);
    if (picked.length > room) setError(`Up to ${MAX_IMAGES} pictures; the rest were left out.`);
    const added = picked.slice(0, room).map((file) => {
      const url = URL.createObjectURL(file);
      urls.current.add(url);
      return { id: `img-${nextId++}`, file, url };
    });
    setItems((prev) => [...prev, ...added]);
  }

  function remove(id: string) {
    setResult(null);
    setItems((prev) => {
      const gone = prev.find((i) => i.id === id);
      if (gone) {
        URL.revokeObjectURL(gone.url);
        urls.current.delete(gone.url);
      }
      return prev.filter((i) => i.id !== id);
    });
  }

  function move(from: number, to: number) {
    if (to < 0 || to >= items.length || from === to) return;
    setResult(null);
    setItems((prev) => {
      const next = [...prev];
      const [it] = next.splice(from, 1);
      next.splice(to, 0, it);
      return next;
    });
  }

  const slideshow = items.length > 1;

  async function run() {
    // The button stays enabled and explains what's missing, rather than greying out with no reason.
    if (items.length === 0) return setError("Choose at least one picture first.");
    setBusy(true);
    setError(null);
    setResult(null);
    const settings = slideshow
      ? { frameMs: Number(frameTime), crossfade, width: Number(width), fit, format }
      : { effect, durationMs: Number(length), width: Number(width), fit, format };
    const form = new FormData();
    for (const item of items) form.append("image", item.file);
    form.append("settings", JSON.stringify(settings));
    try {
      const res = await humanFetch("/api/make", { method: "POST", body: form, headers: { "x-gifsuite-images": String(items.length) } });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? "Couldn't make your GIF. Try again, or try different pictures.");
      }
      const blob = await res.blob();
      const next = { url: URL.createObjectURL(blob), name: `gifsuite-maker.${format}`, size: blob.size, format };
      setResult(next);
      saveAs(next.url, next.name);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const label = format === "gif" ? "GIF" : "MP4";

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
      <div className="space-y-4">
        {items.length < MAX_IMAGES && (
          <Dropzone
            accept={IMAGE_ACCEPT}
            title={items.length === 0 ? "Drag pictures here" : "Drag more pictures here"}
            button={items.length === 0 ? "Choose pictures" : "Add more pictures"}
            hint={`One picture for an effect, or up to ${MAX_IMAGES} for a slideshow. JPEG, PNG, WebP or GIF. Nothing is stored.`}
            onFiles={add}
            disabled={busy}
          />
        )}

        {items.length > 0 && (
          <Card className="space-y-4 p-6">
            <div className="space-y-1">
              <SectionLabel>{slideshow ? `${items.length} pictures, in this order` : "Your picture"}</SectionLabel>
              {slideshow && <p className="text-sm text-muted">Drag to reorder, or use the arrows.</p>}
            </div>
            <ol className="grid grid-cols-2 gap-2 min-[400px]:grid-cols-3 md:grid-cols-4" aria-label="Pictures">
              {items.map((item, i) => (
                <li
                  key={item.id}
                  draggable={slideshow && !busy}
                  onDragStart={() => (dragging.current = item.id)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const from = items.findIndex((x) => x.id === dragging.current);
                    if (from >= 0) move(from, i);
                    dragging.current = null;
                  }}
                  className="group relative overflow-hidden rounded-xl border border-line bg-panel"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element -- a local blob preview */}
                  <img src={item.url} alt={`Picture ${i + 1}`} className="aspect-square w-full object-cover" />
                  <span className="absolute left-1.5 top-1.5 grid size-6 place-items-center rounded-full bg-bg/80 text-xs font-bold">
                    {i + 1}
                  </span>
                  {/* Touch screens get 48px buttons, like the rest of the site. */}
                  <button type="button" aria-label={`Remove picture ${i + 1}`} disabled={busy} onClick={() => remove(item.id)}
                    className="absolute right-1 top-1 grid size-10 place-items-center rounded-full bg-bg/80 text-fg hover:bg-bg pointer-coarse:size-12">✕</button>
                  {slideshow && (
                    <div className="flex items-center justify-between bg-bg/80 p-1">
                      <button type="button" aria-label={`Move picture ${i + 1} earlier`} disabled={busy || i === 0} onClick={() => move(i, i - 1)}
                        className="grid size-10 place-items-center rounded-lg hover:bg-panel disabled:opacity-30 pointer-coarse:size-12">←</button>
                      <button type="button" aria-label={`Move picture ${i + 1} later`} disabled={busy || i === items.length - 1} onClick={() => move(i, i + 1)}
                        className="grid size-10 place-items-center rounded-lg hover:bg-panel disabled:opacity-30 pointer-coarse:size-12">→</button>
                    </div>
                  )}
                </li>
              ))}
            </ol>
          </Card>
        )}

        {result && <ResultPanel name={result.name} bytes={result.size} url={result.url} isVideo={result.format === "mp4"} label="Your GIF" />}
      </div>

      <Card className="space-y-6 p-6 lg:sticky lg:top-20">
        {slideshow ? (
          <>
            <div className="space-y-2">
              <SectionLabel>Time per picture</SectionLabel>
              <Segmented label="Time per picture" options={FRAME_TIMES} value={frameTime} onChange={setFrameTime} disabled={busy} />
            </div>
            {/* A checkbox, not a switch: it only takes effect when the GIF is made. */}
            <Checkbox checked={crossfade} onChange={setCrossfade} disabled={busy} label="Crossfade between pictures" hint="Blend smoothly from one picture to the next." className="w-full" />
          </>
        ) : (
          <>
            <div className="space-y-2">
              <SectionLabel>Effect</SectionLabel>
              <Segmented label="Effect" options={EFFECTS} value={effect} onChange={setEffect} disabled={busy} />
              <p className="text-sm text-muted">{EFFECT_HINT[effect]} Add more pictures for a slideshow.</p>
            </div>
            <div className="space-y-2">
              <SectionLabel>Length</SectionLabel>
              <Segmented label="Length" options={LENGTHS} value={length} onChange={setLength} disabled={busy} />
            </div>
          </>
        )}
        <div className="space-y-2">
          <SectionLabel>Size</SectionLabel>
          <Segmented label="Width" options={WIDTHS} value={width} onChange={setWidth} disabled={busy} />
          <Segmented label="Fit" options={FITS} value={fit} onChange={setFit} disabled={busy} />
          <p className="text-sm text-muted">{fit === "cover" ? "Fills the frame, trimming the edges." : "Shows the whole picture, with bars if needed."} The shape follows your first picture.</p>
        </div>
        <div className="space-y-2">
          <SectionLabel>Save as</SectionLabel>
          <Segmented label="Format" options={FORMATS} value={format} onChange={setFormat} disabled={busy} />
        </div>
        <Button variant="primary" size="lg" className="w-full" disabled={busy} onClick={run}>
          {busy ? `Making your ${label}…` : `Make ${label}`}
        </Button>
        {error && <ErrorMessage>{error}</ErrorMessage>}
      </Card>
    </div>
  );
}
