"use client";

import { useState } from "react";
import { ErrorMessage } from "@/components/ui/Alert";
import { buttonClass } from "@/components/ui/Button";
import { Switch } from "@/components/ui/Switch";

/**
 * Covers a sensitive GIF with a blurred poster until the visitor chooses to see it.
 * The video isn't loaded at all until then.
 */
export function SensitiveGate({ sensitive, poster, children }: { sensitive: boolean; poster: string; children: React.ReactNode }) {
  const [revealed, setRevealed] = useState(!sensitive);
  if (revealed) return <>{children}</>;
  return (
    <div className="relative grid min-h-64 place-items-center overflow-hidden">
      {/* eslint-disable-next-line @next/next/no-img-element -- a blurred backdrop, not content */}
      <img src={poster} alt="" aria-hidden className="absolute inset-0 size-full scale-110 object-cover blur-2xl brightness-50" />
      <div className="relative max-w-xs space-y-3 p-6 text-center">
        <p className="text-lg font-bold">Sensitive content</p>
        <p className="text-sm text-muted">This GIF may contain nudity or other adult content. Only continue if you are 18 or older.</p>
        <button type="button" onClick={() => setRevealed(true)} className={buttonClass({ variant: "secondary", className: "bg-bg/80" })}>
          Show the GIF
        </button>
      </div>
    </div>
  );
}

/** The grabber's switch for showing their GIF on the public timeline. */
export function VisibilityToggle({ gifId, initialPublic, nsfw }: { gifId: string; initialPublic: boolean; nsfw: boolean | null }) {
  const [isPublic, setIsPublic] = useState(initialPublic);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function change(next: boolean) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/gif/${gifId}/visibility`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ public: next }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Couldn't change that. Try again.");
      setIsPublic(next);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const hint = !isPublic
    ? "Private: only people with the link can see it."
    : nsfw === true
      ? "Marked sensitive, so it stays off the timeline anyway."
      : nsfw === null
        ? "It joins Latest GIFs after a quick safety check."
        : "Anyone can find it under Latest GIFs.";
  return (
    <div className="space-y-1">
      <Switch checked={isPublic} onChange={change} disabled={busy} label="Show on the public timeline" hint={hint} className="w-full" />
      {error && <ErrorMessage>{error}</ErrorMessage>}
    </div>
  );
}
