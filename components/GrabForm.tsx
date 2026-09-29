"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";

export function GrabForm() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function grab(link: string) {
    if (busy) return;
    if (!link.trim()) {
      setError("Paste an X post link first.");
      return;
    }
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
      <div className="flex flex-col gap-2 rounded-2xl border border-line bg-surface p-2 shadow-card sm:flex-row">
        <Input
          type="url"
          inputMode="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://x.com/someone/status/…"
          aria-label="X post link"
          className="min-w-0 flex-1 border-transparent hover:border-transparent"
        />
        <div className="flex gap-2">
          <Button onClick={pasteAndGrab} disabled={busy} size="lg" variant="ghost">
            Paste
          </Button>
          <Button type="submit" disabled={busy} size="lg" variant="primary" className="flex-1 sm:flex-none">
            {busy ? "Grabbing…" : "Grab GIF"}
          </Button>
        </div>
      </div>
      {error && <p role="alert" className="mt-3 text-sm font-medium text-danger">{error}</p>}
    </form>
  );
}
