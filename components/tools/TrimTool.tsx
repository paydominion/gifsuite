"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card, SectionLabel } from "@/components/ui/Card";
import { Segmented } from "@/components/ui/Segmented";
import { isVideoFile } from "./shared";
import { ClipCard, EDIT_FORMATS, ResultCard, seconds, useClip, useEditRun, type EditFormat } from "./edit";

const STEP_MS = 100;

/** Keeps start and end inside the clip, in order, at least 0.1 s apart. */
export function clampRange(start: number, end: number, durationMs: number, moved: "start" | "end"): [number, number] {
  const s = Math.max(0, Math.min(start, durationMs - STEP_MS));
  const e = Math.max(STEP_MS, Math.min(end, durationMs));
  if (e - s >= STEP_MS) return [s, e];
  return moved === "start" ? [s, Math.min(durationMs, s + STEP_MS)] : [Math.max(0, e - STEP_MS), e];
}

/** Trim a GIF or video to the part you want. */
export function TrimTool({ maxUploadMb, initialFormat }: { maxUploadMb: number; initialFormat?: EditFormat }) {
  const { clip, info, error: clipError, choose, fromVideo, reset } = useClip(maxUploadMb);
  const { busy, error, result, run, clearResult } = useEditRun("trim");
  // null means "all of it", so a new clip starts fully selected.
  const [picked, setPicked] = useState<[number, number] | null>(null);
  const range: [number, number] = picked ?? [0, info?.durationMs ?? 0];
  const [format, setFormat] = useState<EditFormat>(initialFormat ?? "gif");
  const video = useRef<HTMLVideoElement | null>(null);

  // Videos default to MP4, which keeps the sound.
  function pick(file: File) {
    setPicked(null);
    if (!initialFormat) setFormat(isVideoFile(file) ? "mp4" : "gif");
    choose(file);
  }

  // The preview loops just the selected part.
  useEffect(() => {
    const v = video.current;
    if (!v) return;
    const loop = () => {
      if (v.currentTime * 1000 >= range[1] || v.currentTime * 1000 < range[0] - 50) v.currentTime = range[0] / 1000;
    };
    v.addEventListener("timeupdate", loop);
    return () => v.removeEventListener("timeupdate", loop);
  }, [range[0], range[1], clip]); // eslint-disable-line react-hooks/exhaustive-deps -- range is rebuilt each render

  function set(which: "start" | "end", ms: number) {
    if (!info) return;
    clearResult();
    const next = clampRange(which === "start" ? ms : range[0], which === "end" ? ms : range[1], info.durationMs, which);
    setPicked(next);
    if (video.current) video.current.currentTime = (which === "start" ? next[0] : Math.max(next[0], next[1] - 500)) / 1000;
  }

  const fromPlayhead = (which: "start" | "end") => video.current && set(which, Math.round(video.current.currentTime * 1000));
  const length = range[1] - range[0];
  const pct = (ms: number) => (info ? (ms / info.durationMs) * 100 : 0);

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
      <div className="space-y-4">
        <ClipCard clip={clip} info={info} maxUploadMb={maxUploadMb} busy={busy} onChoose={pick} onReset={reset} onVideo={fromVideo} videoRef={video} />
        {clip && info && (
          <Card className="space-y-4 p-4">
            {/* The whole clip, with the kept part highlighted. */}
            <div aria-hidden className="relative h-2 rounded-full bg-panel">
              <div className="absolute inset-y-0 rounded-full bg-accent" style={{ left: `${pct(range[0])}%`, width: `${pct(length)}%` }} />
            </div>
            {(["start", "end"] as const).map((which) => (
              <div key={which} className="space-y-1">
                <div className="flex items-center justify-between gap-2 text-sm">
                  <label htmlFor={`trim-${which}`} className="font-semibold capitalize">{which}</label>
                  <span className="tabular-nums text-muted">{seconds(which === "start" ? range[0] : range[1])}</span>
                </div>
                <input
                  id={`trim-${which}`}
                  type="range"
                  min={0}
                  max={info.durationMs}
                  step={STEP_MS}
                  value={which === "start" ? range[0] : range[1]}
                  disabled={busy}
                  onChange={(e) => set(which, Number(e.target.value))}
                  className="h-11 w-full cursor-pointer accent-[var(--accent)]"
                />
                {clip.video && (
                  <Button size="sm" variant="ghost" disabled={busy} onClick={() => fromPlayhead(which)}>
                    Set {which} to now
                  </Button>
                )}
              </div>
            ))}
          </Card>
        )}
        <ResultCard result={result} />
      </div>

      <Card className="space-y-5 p-5 lg:sticky lg:top-20">
        <div className="space-y-1">
          <SectionLabel>Keeping</SectionLabel>
          <p className="text-2xl font-bold tabular-nums">{info ? seconds(length) : "—"}</p>
          {info && <p className="text-xs text-muted">from {seconds(range[0])} to {seconds(range[1])} of {seconds(info.durationMs)}</p>}
        </div>
        <div className="space-y-2">
          <SectionLabel>Save as</SectionLabel>
          <Segmented label="Format" options={EDIT_FORMATS} value={format} onChange={setFormat} disabled={busy} />
          <p className="text-xs text-muted">MP4 keeps any sound and is much smaller; GIF plays everywhere images do.</p>
        </div>
        <Button variant="primary" size="lg" className="w-full" disabled={!clip || !info || busy} onClick={() => clip && run(clip, { start: range[0], end: range[1], format })}>
          {busy ? "Trimming…" : "Trim & download"}
        </Button>
        {(error || clipError) && <p role="alert" className="text-sm font-medium text-danger">{error ?? clipError}</p>}
      </Card>
    </div>
  );
}
