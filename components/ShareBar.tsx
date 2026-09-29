"use client";

import { useEffect, useState } from "react";
import { track } from "@/lib/track";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Field";

type Props = { gifId: string; authorHandle: string; pageUrl: string };
type Origin = { status: "checking" } | { status: "available"; mediaUrl: string } | { status: "gone" };

export function ShareBar({ gifId, authorHandle, pageUrl }: Props) {
  const [caption, setCaption] = useState("");
  const [origin, setOrigin] = useState<Origin>({ status: "checking" });
  const [status, setStatus] = useState<string | null>(null);

  // If the original post is still up, X can embed its GIF directly — no upload needed.
  useEffect(() => {
    let cancelled = false;
    fetch(`/api/gif/${gifId}/origin`)
      .then((res) => res.json() as Promise<{ available: boolean | null; mediaUrl: string | null }>)
      .then((data) => {
        if (cancelled) return;
        setOrigin(data.available && data.mediaUrl ? { status: "available", mediaUrl: data.mediaUrl } : { status: "gone" });
      })
      .catch(() => !cancelled && setOrigin({ status: "gone" }));
    return () => {
      cancelled = true;
    };
  }, [gifId]);

  function postOriginalOnX() {
    if (origin.status !== "available") return;
    // X credits the author itself ("From @author"), so only the user's caption goes in.
    const params = new URLSearchParams({ url: origin.mediaUrl });
    if (caption.trim()) params.set("text", caption.trim());
    window.open(`https://x.com/intent/post?${params}`, "_blank", "noopener");
    track(gifId, "share", "x-original");
  }

  async function copyLink() {
    await navigator.clipboard.writeText(pageUrl);
    track(gifId, "share", "copy-link");
    setStatus("Link copied!");
    setTimeout(() => setStatus(null), 2000);
  }

  return (
    <div className="space-y-3">
      {origin.status === "gone" ? (
        <p className="text-sm text-muted">
          The original post is no longer on X. Download the GIF above to share it.
        </p>
      ) : (
        <>
          <Textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            maxLength={260}
            rows={2}
            placeholder="Write your caption…"
          />
          <Button onClick={postOriginalOnX} disabled={origin.status !== "available"} variant="primary" size="lg" className="w-full">
            {origin.status === "available" ? "Post on X" : "Checking the original post…"}
          </Button>
          {origin.status === "available" && (
            <p className="text-xs text-muted">
              Plays the original GIF in your post, credited &ldquo;From @{authorHandle}&rdquo;. Nothing to upload.
            </p>
          )}
        </>
      )}

      <Button onClick={copyLink} variant="ghost" size="sm">
        Copy link to this page
      </Button>
      {status && <p role="status" className="text-sm text-muted">{status}</p>}
    </div>
  );
}
