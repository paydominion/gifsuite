"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card, SectionLabel } from "@/components/ui/Card";
import { Input } from "@/components/ui/Field";
import { Segmented } from "@/components/ui/Segmented";
import { Switch } from "@/components/ui/Switch";
import {
  MAX_CAPTION_CHARS,
  captionPng,
  drawCaptions,
  hasCaption,
  loadCaptionFonts,
  type CaptionColor,
  type CaptionFont,
  type CaptionSize,
  type CaptionStyle,
} from "@/lib/captions";
import { isVideoFile } from "./shared";
import { ClipCard, EDIT_FORMATS, ResultCard, useClip, useEditRun, type EditFormat } from "./edit";

const FONTS: { value: CaptionFont; label: string }[] = [
  { value: "meme", label: "Meme" },
  { value: "fun", label: "Fun" },
  { value: "clean", label: "Clean" },
];
const SIZES: { value: CaptionSize; label: string }[] = [
  { value: "s", label: "Small" },
  { value: "m", label: "Medium" },
  { value: "l", label: "Large" },
];
const COLORS: { value: CaptionColor; label: string }[] = [
  { value: "white", label: "White" },
  { value: "yellow", label: "Yellow" },
  { value: "black", label: "Black" },
];

/** Meme-style top and bottom text on a GIF or video, with a live preview. */
export function CaptionTool({ maxUploadMb, initialFormat }: { maxUploadMb: number; initialFormat?: EditFormat }) {
  const { clip, info, error: clipError, choose, fromVideo, reset } = useClip(maxUploadMb);
  const { busy, error, result, run, clearResult } = useEditRun("captions");
  const [style, setStyle] = useState<CaptionStyle>({ top: "", bottom: "", font: "meme", size: "m", color: "white", outline: true, uppercase: true });
  const [format, setFormat] = useState<EditFormat>(initialFormat ?? "gif");
  const [fontsLoaded, setFontsLoaded] = useState(false);
  const preview = useRef<HTMLCanvasElement>(null);
  const video = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    loadCaptionFonts().then(() => setFontsLoaded(true), () => setFontsLoaded(true));
  }, []);
  // Videos default to MP4, which keeps the sound.
  function pick(file: File) {
    if (!initialFormat) setFormat(isVideoFile(file) ? "mp4" : "gif");
    choose(file);
  }

  // Redraw the preview whenever the text, style or layout changes. It's drawn at the clip's own size
  // and scaled by CSS, exactly like the final caption layer.
  useEffect(() => {
    const canvas = preview.current;
    if (!canvas || !info) return;
    canvas.width = info.width;
    canvas.height = info.height;
    drawCaptions(canvas.getContext("2d")!, style, info.width, info.height);
  }, [style, info, fontsLoaded]);

  const update = (patch: Partial<CaptionStyle>) => {
    clearResult();
    setStyle((s) => ({ ...s, ...patch }));
  };

  async function make() {
    if (!clip || !info) return;
    const overlay = await captionPng(style, info.width, info.height);
    await run(clip, { format }, overlay);
  }

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
      <div className="space-y-4">
        <ClipCard
          clip={clip}
          info={info}
          maxUploadMb={maxUploadMb}
          busy={busy}
          onChoose={pick}
          onReset={reset}
          onVideo={fromVideo}
          videoRef={video}
          overlay={info && <canvas ref={preview} aria-label="Caption preview" className="pointer-events-none absolute inset-0 size-full" />}
        />
        <ResultCard result={result} />
      </div>

      <Card className="space-y-5 p-5 lg:sticky lg:top-20">
        <div className="space-y-2">
          <label htmlFor="caption-top"><SectionLabel>Top text</SectionLabel></label>
          <Input id="caption-top" value={style.top} maxLength={MAX_CAPTION_CHARS} placeholder="When the GIF loads first try" disabled={busy} onChange={(e) => update({ top: e.target.value })} />
          <label htmlFor="caption-bottom" className="block pt-1"><SectionLabel>Bottom text</SectionLabel></label>
          <Input id="caption-bottom" value={style.bottom} maxLength={MAX_CAPTION_CHARS} placeholder="Optional" disabled={busy} onChange={(e) => update({ bottom: e.target.value })} />
        </div>
        <div className="space-y-2">
          <SectionLabel>Style</SectionLabel>
          <Segmented label="Font" options={FONTS} value={style.font} onChange={(font) => update({ font })} disabled={busy} />
          <Segmented label="Size" options={SIZES} value={style.size} onChange={(size) => update({ size })} disabled={busy} />
          <Segmented label="Colour" options={COLORS} value={style.color} onChange={(color) => update({ color })} disabled={busy} />
          <Switch checked={style.outline} onChange={(outline) => update({ outline })} disabled={busy} label="Outline" hint="Keeps text readable on any background." className="w-full" />
          <Switch checked={style.uppercase} onChange={(uppercase) => update({ uppercase })} disabled={busy} label="ALL CAPS" className="w-full" />
        </div>
        <div className="space-y-2">
          <SectionLabel>Save as</SectionLabel>
          <Segmented label="Format" options={EDIT_FORMATS} value={format} onChange={setFormat} disabled={busy} />
        </div>
        <Button variant="primary" size="lg" className="w-full" disabled={!clip || !info || busy || !hasCaption(style)} onClick={make}>
          {busy ? "Adding your text…" : "Add text & download"}
        </Button>
        {(error || clipError) && <p role="alert" className="text-sm font-medium text-danger">{error ?? clipError}</p>}
      </Card>
    </div>
  );
}
