"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card, SectionLabel } from "@/components/ui/Card";
import { Dropzone } from "@/components/ui/Dropzone";
import { Segmented } from "@/components/ui/Segmented";
import { Preview, UPLOAD_ACCEPT, baseName, formatBytes, isVideoFile, saveAs } from "./shared";

type Format = "gif" | "mp4" | "webm" | "webp";
type Quality = "low" | "medium" | "high";

const FORMATS: { value: Format; label: string }[] = [
  { value: "gif", label: "GIF" },
  { value: "mp4", label: "MP4" },
  { value: "webm", label: "WebM" },
  { value: "webp", label: "WebP" },
];
const QUALITIES: { value: Quality; label: string }[] = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
];
const QUALITY_HINT: Record<Quality, string> = {
  low: "320px · 10fps. Smallest, for quick sends.",
  medium: "480px · 15fps. Balanced size and quality.",
  high: "Original size and frame rate. Best quality, biggest file.",
};

type Result = { url: string; name: string; size: number; format: Format };

export function ConvertTool({ maxUploadMb, initialFormat = "mp4" }: { maxUploadMb: number; initialFormat?: Format }) {
  const [file, setFile] = useState<{ file: File; url: string } | null>(null);
  const [format, setFormat] = useState<Format>(initialFormat);
  const [quality, setQuality] = useState<Quality>("medium");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);

  // Free preview memory when files change or the page closes.
  useEffect(() => () => {
    if (file) URL.revokeObjectURL(file.url);
  }, [file]);
  useEffect(() => () => {
    if (result) URL.revokeObjectURL(result.url);
  }, [result]);

  const choose = useCallback(
    (picked: File) => {
      setError(null);
      setResult(null);
      if (picked.size > maxUploadMb * 1024 * 1024) {
        setError(`That file is over ${maxUploadMb} MB. Try a smaller one.`);
        return;
      }
      setFile({ file: picked, url: URL.createObjectURL(picked) });
      // Converting a GIF to GIF is rarely what people want; suggest MP4 instead.
      setFormat((f) => (picked.type === "image/gif" && f === "gif" ? "mp4" : f));
    },
    [maxUploadMb],
  );

  async function run() {
    if (!file) return;
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch(`/api/convert?format=${format}&quality=${quality}`, {
        method: "POST",
        body: file.file,
        headers: { "content-type": "application/octet-stream" },
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? "Something went wrong converting that file.");
      }
      const blob = await res.blob();
      const next = { url: URL.createObjectURL(blob), name: `${baseName(file.file)}-${quality}.${format}`, size: blob.size, format };
      setResult(next);
      saveAs(next.url, next.name);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
      <div className="space-y-4">
        {!file ? (
          <Dropzone
            accept={UPLOAD_ACCEPT}
            hint={`GIF, MP4, MOV or WebM, up to ${maxUploadMb} MB. Your file isn't stored.`}
            onFile={choose}
            disabled={busy}
          />
        ) : (
          <Card className="space-y-3 p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-semibold">{file.file.name}</p>
                <p className="text-xs text-muted">{formatBytes(file.file.size)}</p>
              </div>
              <Button
                size="sm"
                variant="ghost"
                disabled={busy}
                onClick={() => {
                  setFile(null);
                  setResult(null);
                  setError(null);
                }}
              >
                Choose another
              </Button>
            </div>
            <Preview url={file.url} isVideo={isVideoFile(file.file)} label="Your file" />
          </Card>
        )}

        {result && (
          <Card className="space-y-3 p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <SectionLabel>Result</SectionLabel>
                <p role="status" className="mt-1 truncate text-sm">
                  Saved {result.name} ({formatBytes(result.size)})
                </p>
              </div>
              <Button size="sm" variant="secondary" onClick={() => saveAs(result.url, result.name)}>
                Download again
              </Button>
            </div>
            <Preview url={result.url} isVideo={result.format === "mp4" || result.format === "webm"} label="Converted file" />
          </Card>
        )}
      </div>

      <Card className="space-y-5 p-5 lg:sticky lg:top-20">
        <div className="space-y-2">
          <SectionLabel>Convert to</SectionLabel>
          <Segmented label="Format" options={FORMATS} value={format} onChange={setFormat} disabled={busy} />
        </div>
        <div className="space-y-2">
          <SectionLabel>Quality</SectionLabel>
          <Segmented label="Quality" options={QUALITIES} value={quality} onChange={setQuality} disabled={busy} />
          <p className="text-xs text-muted">{QUALITY_HINT[quality]}</p>
        </div>
        <Button variant="primary" size="lg" className="w-full" disabled={!file || busy} onClick={run}>
          {busy ? "Converting…" : "Convert & download"}
        </Button>
        {error && <p role="alert" className="text-sm font-medium text-danger">{error}</p>}
      </Card>
    </div>
  );
}
