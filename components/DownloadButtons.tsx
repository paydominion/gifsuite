"use client";

import { useState } from "react";

const QUALITIES = [
  { id: "low", label: "Low", hint: "320px · 10fps — smallest, for quick sends" },
  { id: "medium", label: "Medium", hint: "480px · 15fps — balanced size and quality" },
  { id: "high", label: "High", hint: "Original size & frame rate — best quality, biggest file" },
] as const;

const FORMATS = [
  { id: "gif", label: "GIF", hint: "Works everywhere" },
  { id: "mp4", label: "MP4", hint: "Best for X, WhatsApp, IG" },
  { id: "webm", label: "WebM", hint: "Small, for the web" },
  { id: "webp", label: "WebP", hint: "Animated sticker" },
] as const;

type Quality = (typeof QUALITIES)[number]["id"];

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
    <div className="space-y-2">
      <div role="radiogroup" aria-label="Quality" className="flex rounded-xl border border-line p-1 text-sm">
        {QUALITIES.map((q) => (
          <button
            key={q.id}
            role="radio"
            aria-checked={quality === q.id}
            onClick={() => setQuality(q.id)}
            disabled={busy !== null}
            className={`flex-1 rounded-lg px-3 py-1.5 font-medium ${quality === q.id ? "bg-fg text-bg" : "text-muted hover:text-fg"}`}
          >
            {q.label}
          </button>
        ))}
      </div>
      <p className="text-xs text-muted">{QUALITIES.find((q) => q.id === quality)!.hint}</p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {FORMATS.map((f) => (
          <button
            key={f.id}
            onClick={() => download(f.id)}
            disabled={busy !== null}
            className="rounded-xl border border-line bg-panel px-3 py-3 text-left hover:border-accent disabled:opacity-60"
          >
            <span className="block font-semibold">{busy === f.id ? "Converting…" : `↓ ${f.label}`}</span>
            <span className="block text-xs text-muted">{f.hint}</span>
          </button>
        ))}
      </div>
      {message && (
        <p role={message.error ? "alert" : "status"} className={`text-sm ${message.error ? "text-danger" : "text-muted"}`}>
          {message.text}
        </p>
      )}
    </div>
  );
}
