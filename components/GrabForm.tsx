"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function GrabForm() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function grab(link: string) {
    if (!link.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/grab", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url: link }),
      });
      const data = (await res.json().catch(() => ({}))) as { id?: string; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Something went wrong.");
      router.push(`/g/${data.id}`);
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  async function pasteAndGrab() {
    try {
      const text = await navigator.clipboard.readText();
      setUrl(text);
      grab(text);
    } catch {
      setError("Couldn't read your clipboard. Paste the link into the box instead.");
    }
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        grab(url);
      }}
      className="w-full"
    >
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          type="url"
          inputMode="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://x.com/someone/status/…"
          aria-label="X post link"
          className="min-w-0 flex-1 rounded-xl border border-line bg-panel px-4 py-3 text-base outline-none placeholder:text-muted focus:border-accent"
        />
        <div className="flex gap-2">
          <button
            type="button"
            onClick={pasteAndGrab}
            disabled={busy}
            className="rounded-xl border border-line px-4 py-3 font-medium hover:bg-panel disabled:opacity-50"
          >
            Paste
          </button>
          <button
            type="submit"
            disabled={busy || !url.trim()}
            className="flex-1 rounded-xl bg-accent px-6 py-3 font-semibold text-accent-ink hover:brightness-110 disabled:opacity-50 sm:flex-none"
          >
            {busy ? "Grabbing…" : "Grab GIF"}
          </button>
        </div>
      </div>
      {error && <p role="alert" className="mt-2 text-sm text-danger">{error}</p>}
    </form>
  );
}
