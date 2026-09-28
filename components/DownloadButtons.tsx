"use client";

import { useState } from "react";

const FORMATS = [
  { id: "gif", label: "GIF", hint: "Works everywhere" },
  { id: "mp4", label: "MP4", hint: "Best for X, WhatsApp, IG" },
  { id: "webm", label: "WebM", hint: "Small, for the web" },
  { id: "webp", label: "WebP", hint: "Animated sticker" },
] as const;

export function DownloadButtons({ gifId }: { gifId: string }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Fetch first so we can show "Converting…" while the server builds the file.
  async function download(format: string) {
    setBusy(format);
    setError(null);
    try {
      const res = await fetch(`/api/gif/${gifId}/download?format=${format}`);
      if (!res.ok) throw new Error();
      const name = res.headers.get("content-disposition")?.match(/filename="(.+)"/)?.[1] ?? `${gifId}.${format}`;
      const url = URL.createObjectURL(await res.blob());
      const a = Object.assign(document.createElement("a"), { href: url, download: name });
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
    } catch {
      setError(`Couldn't make the ${format.toUpperCase()}. Try again.`);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div>
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
      {error && <p role="alert" className="mt-2 text-sm text-danger">{error}</p>}
    </div>
  );
}
