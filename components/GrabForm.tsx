"use client";

import { humanFetch } from "@/lib/human";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { ErrorMessage } from "@/components/ui/Alert";
import { Checkbox } from "@/components/ui/Checkbox";
import { Input } from "@/components/ui/Field";

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
      if (!res.ok) throw new Error(data.error ?? "Couldn't grab that link. Check it opens in your browser, then try again.");
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
      <div className="space-y-2 rounded-2xl border border-line bg-surface p-3 text-left shadow-pop">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          {/* Plain text, not type="url": the browser would silently refuse "x.com/…" without https://, or a
              link pasted with words around it, both of which the server handles. A single field like a
              search box, so its placeholder can stand in for a visible label (it meets 4.5:1). */}
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
            className="min-w-0 sm:flex-1"
          />
          {/* Main action first on phones (stacked, full width), and right beside the field on computers. */}
          <div className="flex flex-col gap-2 sm:flex-row-reverse sm:items-center">
            <Button type="submit" disabled={busy} size="lg" variant="primary" className="w-full sm:w-auto">
              {busy ? "Grabbing…" : "Grab GIF"}
            </Button>
            <Button onClick={pasteAndGrab} disabled={busy} size="lg" variant="tertiary" className="self-center">
              Paste link
            </Button>
          </div>
        </div>
        {/* A checkbox, not a switch: it only takes effect when the GIF is grabbed. */}
        <Checkbox
          checked={isPublic}
          onChange={setIsPublic}
          disabled={busy}
          label="Show on the public timeline"
          hint={isPublic ? "It joins Latest GIFs after a quick safety check." : "Private: only people with the link can see it."}
          className="px-1"
        />
        {/* Inside the dark box: on the yellow hero, red text would be unreadable. */}
        {error && <ErrorMessage>{error}</ErrorMessage>}
      </div>
    </form>
  );
}
