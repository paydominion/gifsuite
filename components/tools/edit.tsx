"use client";

import { humanFetch } from "@/lib/human";
import { useCallback, useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Dropzone } from "@/components/ui/Dropzone";
import { FileHeader, ResultPanel, UPLOAD_ACCEPT, baseName, formatBytes, isVideoFile, saveAs } from "./shared";

/** Pieces shared by the Trim, Speed & reverse and Captions tools, which all call POST /api/edit. */

export type EditFormat = "gif" | "mp4";
export type ClipInfo = { durationMs: number; width: number; height: number; hasAudio?: boolean };
export type Clip = { file: File; url: string; video: boolean };

export const EDIT_FORMATS: { value: EditFormat; label: string }[] = [
  { value: "gif", label: "GIF" },
  { value: "mp4", label: "MP4" },
];

/** The chosen file, and its length and size once known (from the video itself, or the server for GIFs). */
export function useClip(maxUploadMb: number) {
  const [clip, setClip] = useState<Clip | null>(null);
  const [info, setInfo] = useState<ClipInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => () => {
    if (clip) URL.revokeObjectURL(clip.url);
  }, [clip]);

  const choose = useCallback(
    async (picked: File) => {
      setError(null);
      setInfo(null);
      if (picked.size > maxUploadMb * 1024 * 1024) {
        setError(`That file is over ${maxUploadMb} MB. Try a smaller one.`);
        return;
      }
      const video = isVideoFile(picked);
      setClip({ file: picked, url: URL.createObjectURL(picked), video });
      if (!video) {
        // Browsers can't tell how long a GIF is, so the server reads it.
        const res = await humanFetch("/api/probe", { method: "POST", body: picked, headers: { "content-type": "application/octet-stream" } });
        const data = (await res.json().catch(() => ({}))) as Partial<ClipInfo> & { error?: string };
        if (!res.ok || !data.durationMs) setError(data.error ?? "Couldn't read that file. Try another one.");
        else setInfo({ durationMs: data.durationMs, width: data.width ?? 0, height: data.height ?? 0 });
      }
    },
    [maxUploadMb],
  );

  /** For videos: call from onLoadedMetadata. */
  const fromVideo = useCallback((v: HTMLVideoElement) => {
    if (!Number.isFinite(v.duration) || !v.videoWidth) return setError("Couldn't read that video. Try another one.");
    setInfo({ durationMs: Math.round(v.duration * 1000), width: v.videoWidth, height: v.videoHeight });
  }, []);

  const reset = () => {
    setClip(null);
    setInfo(null);
    setError(null);
  };
  return { clip, info, error, setError, choose, fromVideo, reset };
}

type Result = { url: string; name: string; bytes: number; format: EditFormat };

/** Sends an edit and downloads the result. */
export function useEditRun(tool: "trim" | "speed" | "captions") {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  useEffect(() => () => {
    if (result) URL.revokeObjectURL(result.url);
  }, [result]);

  async function run(clip: Clip, settings: Record<string, unknown> & { format: EditFormat }, overlay?: Blob | null) {
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const form = new FormData();
      form.append("file", clip.file);
      if (overlay) form.append("overlay", overlay, "overlay.png");
      form.append("settings", JSON.stringify(settings));
      const res = await humanFetch(`/api/edit?tool=${tool}`, { method: "POST", body: form });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? "Couldn't edit that file. Try again, or try a different file.");
      }
      const blob = await res.blob();
      const suffix = { trim: "trimmed", speed: "speed", captions: "captioned" }[tool];
      const next = { url: URL.createObjectURL(blob), name: `${baseName(clip.file)}-${suffix}.${settings.format}`, bytes: blob.size, format: settings.format };
      setResult(next);
      saveAs(next.url, next.name);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return { busy, error, result, run, clearResult: () => setResult(null) };
}

export const seconds = (ms: number) => `${(ms / 1000).toFixed(1)}s`;

/** The upload box, or the chosen clip with its preview (and anything drawn over it). */
export function ClipCard({
  clip,
  info,
  maxUploadMb,
  busy,
  onChoose,
  onReset,
  onVideo,
  videoRef,
  overlay,
}: {
  clip: Clip | null;
  info: ClipInfo | null;
  maxUploadMb: number;
  busy: boolean;
  onChoose: (f: File) => void;
  onReset: () => void;
  onVideo: (v: HTMLVideoElement) => void;
  videoRef?: React.RefObject<HTMLVideoElement | null>;
  overlay?: React.ReactNode;
}) {
  if (!clip) {
    return <Dropzone accept={UPLOAD_ACCEPT} hint={`GIF, MP4, MOV or WebM, up to ${maxUploadMb} MB. Your file isn't stored.`} onFile={onChoose} disabled={busy} />;
  }
  return (
    <Card className="space-y-4 p-6">
      <FileHeader
        name={clip.file.name}
        details={`${formatBytes(clip.file.size)}${info ? ` · ${info.width}×${info.height} · ${seconds(info.durationMs)}` : ""}`}
        busy={busy}
        onReset={onReset}
      />
      <div className="relative overflow-hidden rounded-xl bg-panel">
        {clip.video ? (
          <video
            ref={videoRef}
            src={clip.url}
            autoPlay
            muted
            loop
            playsInline
            className="block h-auto w-full"
            onLoadedMetadata={(e) => onVideo(e.currentTarget)}
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element -- a local blob preview
          <img src={clip.url} alt="Your file" className="block h-auto w-full" />
        )}
        {overlay}
      </div>
    </Card>
  );
}

export function ResultCard({ result }: { result: Result | null }) {
  if (!result) return null;
  return <ResultPanel name={result.name} bytes={result.bytes} url={result.url} isVideo={result.format === "mp4"} label="Edited file" />;
}
