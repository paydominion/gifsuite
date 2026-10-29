"use client";

import { useState } from "react";
import { ErrorMessage } from "@/components/ui/Alert";
import { Segmented } from "@/components/ui/Segmented";

const QUALITIES = [
  { value: "low", label: "Low", hint: "320px wide, 10 frames a second. Smallest, for quick sends." },
  { value: "medium", label: "Medium", hint: "480px wide, 15 frames a second. Balanced size and quality." },
  { value: "high", label: "High", hint: "Original size and frame rate. Best quality, biggest file." },
] as const;

const FORMATS = [
  { id: "gif", label: "GIF", hint: "Works everywhere" },
  { id: "mp4", label: "MP4", hint: "Best for X, WhatsApp, Instagram" },
  { id: "webm", label: "WebM", hint: "Small, for the web" },
  { id: "webp", label: "WebP", hint: "Animated sticker" },
] as const;

type Quality = (typeof QUALITIES)[number]["value"];

function formatBytes(n: number): string {
  return n < 1024 * 1024 ? `${Math.max(1, Math.round(n / 1024))} KB` : `${(n / 1024 / 1024).toFixed(1)} MB`;
}

export function DownloadButtons({ gifId }: { gifId: string }) {
  const [quality, setQuality] = useState<Quality>("medium");
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<{ text: string; error?: boolean } | null>(null);

  // Fetch first so we can show "Converting…" while the server builds the file.
  async function download(format: string) {
    setBusy(format);
    setMessage(null);
    try {
      const res = await fetch(`/api/gif/${gifId}/download?format=${format}&quality=${quality}`);
      if (!res.ok) throw new Error();
      const name = res.headers.get("content-disposition")?.match(/filename="(.+)"/)?.[1] ?? `${gifId}.${format}`;
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      Object.assign(document.createElement("a"), { href: url, download: name }).click();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
      setMessage({ text: `Saved ${name} (${formatBytes(blob.size)})` });
    } catch {
      setMessage({ text: `Couldn't make the ${format.toUpperCase()}. Try again.`, error: true });
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-3">
      <Segmented label="Quality" options={[...QUALITIES]} value={quality} onChange={setQuality} disabled={busy !== null} />
      <p className="text-sm text-muted">{QUALITIES.find((q) => q.value === quality)!.hint}</p>
      {/* Four equally good choices, so all four get the same (secondary) style: none is pushed. */}
      <div className="grid grid-cols-2 gap-2">
        {FORMATS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => download(f.id)}
            disabled={busy !== null}
            className="rounded-xl border border-accent px-4 py-3 text-left transition-colors hover:bg-accent/10 active:bg-accent/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
          >
            <span className="flex items-center gap-1.5 font-semibold text-accent">
              <svg aria-hidden width="14" height="14" viewBox="0 0 14 14">
                <path d="M7 2v7.5M3.5 6 7 9.5 10.5 6M2.5 12h9" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {/* The section is headed "Download", so the button shows just the format; screen readers hear the verb too. */}
              {busy === f.id ? "Converting…" : <><span className="sr-only">Download </span>{f.label}</>}
            </span>
            <span className="block text-sm text-muted">{f.hint}</span>
          </button>
        ))}
      </div>
      {message &&
        (message.error ? <ErrorMessage>{message.text}</ErrorMessage> : <p role="status" className="text-sm text-muted">{message.text}</p>)}
    </div>
  );
}
