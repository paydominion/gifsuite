"use client";

import { humanFetch } from "@/lib/human";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";
import { Switch } from "@/components/ui/Switch";

export function GrabForm() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPublic, setIsPublic] = useState(true);

  async function grab(link: string) {
    if (busy) return;
    if (!link.trim()) {
      setError("Paste a link first.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await humanFetch("/api/grab", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url: link, public: isPublic }),
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
      <div className="rounded-2xl border border-line bg-surface p-2 text-left shadow-pop">
        <div className="flex flex-col gap-2 sm:flex-row">
          {/* Plain text, not type="url": the browser would silently refuse "x.com/…" without https://, or a
              link pasted with words around it, both of which the server handles. */}
          <Input
            type="text"
            inputMode="url"
            autoComplete="off"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint="go"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Paste a link from X, Giphy, Reddit… or any GIF"
            aria-label="GIF or post link"
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
        <Switch
          checked={isPublic}
          onChange={setIsPublic}
          disabled={busy}
          label="Show on the public timeline"
          hint={isPublic ? "It joins Latest GIFs after a quick safety check." : "Private: only people with the link can see it."}
          className="mt-1 w-full px-2"
        />
      </div>
      {error && (
        <p role="alert" className="mx-auto mt-3 w-fit rounded-lg bg-bg px-3 py-1.5 text-sm font-semibold text-danger">
          {error}
        </p>
      )}
    </form>
  );
}
