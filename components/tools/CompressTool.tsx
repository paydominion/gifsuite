"use client";

import { humanFetch } from "@/lib/human";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { ErrorMessage } from "@/components/ui/Alert";
import { Card, SectionLabel } from "@/components/ui/Card";
import { Dropzone } from "@/components/ui/Dropzone";
import { FieldLabel, Input } from "@/components/ui/Field";
import { Segmented } from "@/components/ui/Segmented";
import { FileHeader, Preview, ResultPanel, UPLOAD_ACCEPT, baseName, formatBytes, isVideoFile, saveAs } from "./shared";

const MB = 1024 * 1024;

// Size limits are each platform's published upload limits at the time of writing.
const TARGETS = [
  { id: "x", label: "X", hint: "Under 15 MB, X's limit for GIFs on the web", bytes: 15 * MB },
  { id: "discord", label: "Discord", hint: "Under 10 MB, Discord's free upload limit", bytes: 10 * MB },
  { id: "5mb", label: "5 MB", hint: "Under 5 MB, X's limit for GIFs in its mobile apps", bytes: 5 * MB },
  { id: "1mb", label: "1 MB", hint: "Under 1 MB, for email and slow connections", bytes: 1 * MB },
  { id: "custom", label: "Custom", hint: "Choose your own limit", bytes: 0 },
] as const;
type TargetId = (typeof TARGETS)[number]["id"];

const WIDTHS = [
  { value: "0", label: "Original" },
  { value: "640", label: "640px" },
  { value: "480", label: "480px" },
  { value: "320", label: "320px" },
];

type Result = {
  url: string;
  name: string;
  size: number;
  width: number;
  fps: number;
  colors: number;
  targetMet: boolean;
  unchanged: boolean;
  target: number;
};

export function CompressTool({ maxUploadMb, initialWidth = "0" }: { maxUploadMb: number; initialWidth?: "0" | "640" | "480" | "320" }) {
  const [file, setFile] = useState<{ file: File; url: string } | null>(null);
  const [targetId, setTargetId] = useState<TargetId>("x");
  const [customMb, setCustomMb] = useState("2");
  const [width, setWidth] = useState<string>(initialWidth);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);

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
      if (picked.size > maxUploadMb * MB) {
        setError(`That file is over ${maxUploadMb} MB. Try a smaller one.`);
        return;
      }
      setFile({ file: picked, url: URL.createObjectURL(picked) });
    },
    [maxUploadMb],
  );

  const target = TARGETS.find((t) => t.id === targetId)!;
  const targetBytes = targetId === "custom" ? Math.round(Number(customMb) * MB) : target.bytes;
  const targetValid = Number.isFinite(targetBytes) && targetBytes >= 20 * 1024 && targetBytes <= 100 * MB;

  async function run() {
    // The button stays enabled and explains what's missing, rather than greying out with no reason.
    if (!file) return setError("Choose a file to compress first.");
    if (!targetValid) return;
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const res = await humanFetch(`/api/compress?target=${targetBytes}&width=${width}`, {
        method: "POST",
        body: file.file,
        headers: { "content-type": "application/octet-stream" },
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? "Couldn't compress that file. Try again, or try a different file.");
      }
      const blob = await res.blob();
      const h = (name: string) => res.headers.get(`x-gifsuite-${name}`);
      const next: Result = {
        url: URL.createObjectURL(blob),
        name: `${baseName(file.file)}-compressed.gif`,
        size: blob.size,
        width: Number(h("width")),
        fps: Number(h("fps")),
        colors: Number(h("colors")),
        targetMet: h("target-met") === "true",
        unchanged: h("unchanged") === "true",
        target: targetBytes,
      };
      setResult(next);
      saveAs(next.url, next.name);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const saved = file && result ? Math.round((1 - result.size / file.file.size) * 100) : 0;

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
          <Card className="space-y-4 p-6">
            <FileHeader
              name={file.file.name}
              details={formatBytes(file.file.size)}
              busy={busy}
              onReset={() => {
                setFile(null);
                setResult(null);
                setError(null);
              }}
            />
            <Preview url={file.url} isVideo={isVideoFile(file.file)} label="Your file" />
          </Card>
        )}

        {result && (
          <ResultPanel name={result.name} bytes={result.size} url={result.url} isVideo={false} label="Compressed GIF">
            <p className="text-sm text-muted">
              {result.unchanged
                ? `Already under ${formatBytes(result.target)}, so it's unchanged.`
                : `${saved > 0 ? `${saved}% smaller · ` : ""}${result.width}px wide · ${result.fps} frames a second · ${result.colors} colors`}
            </p>
            {!result.targetMet && (
              <ErrorMessage>
                Couldn&apos;t get under {formatBytes(result.target)}. This is the smallest it can go; trim the clip to make it smaller.
              </ErrorMessage>
            )}
          </ResultPanel>
        )}
      </div>

      <Card className="space-y-6 p-6 lg:sticky lg:top-20">
        <div className="space-y-2">
          <SectionLabel>Size limit</SectionLabel>
          <Segmented label="Target size" options={TARGETS.map((t) => ({ value: t.id, label: t.label }))} value={targetId} onChange={setTargetId} disabled={busy} columns={3} />
          <p className="text-sm text-muted">{target.hint}</p>
          {targetId === "custom" && (
            <div className="space-y-2 pt-2">
              <FieldLabel htmlFor="compress-custom" hint="Between 0.02 and 100 MB">Size limit in MB</FieldLabel>
              {/* Sized for a few digits, the length of what goes in it. */}
              <Input
                id="compress-custom"
                aria-describedby="compress-custom-hint"
                type="number"
                inputMode="decimal"
                min={0.02}
                max={100}
                step={0.1}
                value={customMb}
                onChange={(e) => setCustomMb(e.target.value)}
                className="w-32"
              />
            </div>
          )}
        </div>
        <div className="space-y-2">
          <SectionLabel>Max width</SectionLabel>
          <Segmented label="Max width" options={WIDTHS} value={width} onChange={setWidth} disabled={busy} />
          <p className="text-sm text-muted">Smaller widths keep more colors and smoother motion at the same file size.</p>
        </div>
        <Button variant="primary" size="lg" className="w-full" disabled={busy} onClick={run}>
          {busy ? "Compressing…" : "Compress & download"}
        </Button>
        {!targetValid && <ErrorMessage>Enter a size between 0.02 and 100 MB.</ErrorMessage>}
        {error && <ErrorMessage>{error}</ErrorMessage>}
      </Card>
    </div>
  );
}
