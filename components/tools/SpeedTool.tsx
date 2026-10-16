"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card, SectionLabel } from "@/components/ui/Card";
import { Segmented } from "@/components/ui/Segmented";
import { isVideoFile } from "./shared";
import { ClipCard, EDIT_FORMATS, ResultCard, seconds, useClip, useEditRun, type EditFormat } from "./edit";

type Direction = "forward" | "reverse" | "boomerang";

const SPEEDS = ["0.25", "0.5", "0.75", "1", "1.5", "2", "3", "4"].map((v) => ({ value: v, label: `${v}×` }));
const DIRECTIONS: { value: Direction; label: string }[] = [
  { value: "forward", label: "Forward" },
  { value: "reverse", label: "Reverse" },
  { value: "boomerang", label: "Boomerang" },
];
const HINT: Record<Direction, string> = {
  forward: "Plays as normal.",
  reverse: "Plays backwards.",
  boomerang: "Plays forwards, then backwards, on a loop.",
};
const MAX_REVERSE_MS = 20_000;

/** Speed up, slow down, reverse or boomerang a GIF or video. */
export function SpeedTool({ maxUploadMb, initialDirection, initialFormat }: { maxUploadMb: number; initialDirection?: Direction; initialFormat?: EditFormat }) {
  const { clip, info, error: clipError, choose, fromVideo, reset } = useClip(maxUploadMb);
  const { busy, error, result, run, clearResult } = useEditRun("speed");
  const [speed, setSpeed] = useState("1");
  const [direction, setDirection] = useState<Direction>(initialDirection ?? "forward");
  const [format, setFormat] = useState<EditFormat>(initialFormat ?? "gif");
  const video = useRef<HTMLVideoElement | null>(null);

  // Videos default to MP4, which keeps the sound.
  function pick(file: File) {
    if (!initialFormat) setFormat(isVideoFile(file) ? "mp4" : "gif");
    choose(file);
  }

  // Videos preview the new speed straight away.
  useEffect(() => {
    if (video.current) video.current.playbackRate = Number(speed);
  }, [speed, clip, info]);

  const outMs = info ? (info.durationMs / Number(speed)) * (direction === "boomerang" ? 2 : 1) : 0;
  const tooLongToReverse = !!info && direction !== "forward" && info.durationMs > MAX_REVERSE_MS;
  const tooLong = outMs > 60_000;

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
      <div className="space-y-4">
        <ClipCard clip={clip} info={info} maxUploadMb={maxUploadMb} busy={busy} onChoose={pick} onReset={reset} onVideo={fromVideo} videoRef={video} />
        <ResultCard result={result} />
      </div>

      <Card className="space-y-5 p-5 lg:sticky lg:top-20">
        <div className="space-y-2">
          <SectionLabel>Speed</SectionLabel>
          <Segmented label="Speed" options={SPEEDS} value={speed} onChange={(v) => { setSpeed(v); clearResult(); }} disabled={busy} columns={4} />
        </div>
        <div className="space-y-2">
          <SectionLabel>Direction</SectionLabel>
          <Segmented label="Direction" options={DIRECTIONS} value={direction} onChange={(v) => { setDirection(v); clearResult(); }} disabled={busy} />
          <p className="text-xs text-muted">{HINT[direction]}{clip?.video && direction === "forward" ? " The preview plays at the new speed." : ""}</p>
        </div>
        <div className="space-y-2">
          <SectionLabel>Save as</SectionLabel>
          <Segmented label="Format" options={EDIT_FORMATS} value={format} onChange={setFormat} disabled={busy} />
          <p className="text-xs text-muted">{format === "mp4" ? "MP4 keeps any sound when playing forwards, at the new speed." : "GIF plays everywhere images do."}</p>
        </div>
        {info && <p className="text-sm">New length: <span className="font-semibold tabular-nums">{seconds(outMs)}</span></p>}
        {tooLongToReverse && <p className="text-sm text-danger">Reverse and boomerang work on clips up to 20 seconds. Use Trim first.</p>}
        {!tooLongToReverse && tooLong && <p className="text-sm text-danger">That would be longer than 60 seconds. Pick a faster speed or trim it first.</p>}
        <Button
          variant="primary"
          size="lg"
          className="w-full"
          disabled={!clip || !info || busy || tooLongToReverse || tooLong}
          onClick={() => clip && run(clip, { speed: Number(speed), direction, format })}
        >
          {busy ? "Working…" : "Apply & download"}
        </Button>
        {(error || clipError) && <p role="alert" className="text-sm font-medium text-danger">{error ?? clipError}</p>}
      </Card>
    </div>
  );
}
