"use client";

import { useEffect, useState } from "react";
import { track } from "@/lib/track";

type Props = { gifId: string; authorHandle: string; pageUrl: string };

const enc = encodeURIComponent;

export function ShareBar({ gifId, authorHandle, pageUrl }: Props) {
  const [caption, setCaption] = useState("");
  const [canShareFiles, setCanShareFiles] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    const probe = new File([new Blob()], "x.mp4", { type: "video/mp4" });
    setCanShareFiles(!!navigator.canShare?.({ files: [probe] }));
  }, []);

  const text = caption.trim() || `via @${authorHandle}`;

  const links = [
    { id: "x", label: "X", href: `https://x.com/intent/post?text=${enc(text)}&url=${enc(pageUrl)}` },
    { id: "whatsapp", label: "WhatsApp", href: `https://wa.me/?text=${enc(`${text} ${pageUrl}`)}` },
    { id: "telegram", label: "Telegram", href: `https://t.me/share/url?url=${enc(pageUrl)}&text=${enc(text)}` },
    { id: "facebook", label: "Facebook", href: `https://www.facebook.com/sharer/sharer.php?u=${enc(pageUrl)}` },
    { id: "reddit", label: "Reddit", href: `https://www.reddit.com/submit?url=${enc(pageUrl)}&title=${enc(text)}` },
  ];

  async function fetchFile(): Promise<File> {
    const res = await fetch(`/api/gif/${gifId}/download?format=mp4`);
    if (!res.ok) throw new Error();
    return new File([await res.blob()], `${authorHandle}-${gifId}.mp4`, { type: "video/mp4" });
  }

  // Phones: hand the actual video to the share sheet (X, WhatsApp, Instagram, TikTok…).
  async function shareFile() {
    setStatus("Preparing…");
    try {
      const file = await fetchFile();
      await navigator.share({ files: [file], text });
      track(gifId, "share", "native");
      setStatus(null);
    } catch (err) {
      setStatus((err as Error).name === "AbortError" ? null : "Sharing didn't work. Try Download instead.");
    }
  }

  // Desktop: X can't receive a file from a link, so download it and open the composer to attach it.
  async function postToX() {
    setStatus("Downloading the MP4 — attach it in the X composer.");
    try {
      const file = await fetchFile();
      const url = URL.createObjectURL(file);
      Object.assign(document.createElement("a"), { href: url, download: file.name }).click();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
      window.open(`https://x.com/intent/post?text=${enc(text)}`, "_blank", "noopener");
      track(gifId, "share", "x-upload");
    } catch {
      setStatus("Couldn't download the file. Try again.");
    }
  }

  async function copyLink() {
    await navigator.clipboard.writeText(pageUrl);
    track(gifId, "share", "copy");
    setStatus("Link copied!");
    setTimeout(() => setStatus(null), 2000);
  }

  return (
    <div className="space-y-3">
      <textarea
        value={caption}
        onChange={(e) => setCaption(e.target.value)}
        maxLength={280}
        rows={2}
        placeholder={`Write your caption… (default: via @${authorHandle})`}
        className="w-full resize-none rounded-xl border border-line bg-panel px-4 py-3 outline-none placeholder:text-muted focus:border-accent"
      />
      <div className="flex flex-wrap gap-2">
        {canShareFiles ? (
          <button onClick={shareFile} className="rounded-xl bg-accent px-4 py-2.5 font-semibold text-accent-ink hover:brightness-110">
            Share GIF to an app…
          </button>
        ) : (
          <button onClick={postToX} className="rounded-xl bg-accent px-4 py-2.5 font-semibold text-accent-ink hover:brightness-110">
            Post it on X
          </button>
        )}
        {links.map((l) => (
          <a
            key={l.id}
            href={l.href}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => track(gifId, "share", l.id)}
            className="rounded-xl border border-line px-4 py-2.5 font-medium hover:bg-panel"
          >
            {l.label}
          </a>
        ))}
        <button onClick={copyLink} className="rounded-xl border border-line px-4 py-2.5 font-medium hover:bg-panel">
          Copy link
        </button>
      </div>
      {status && <p className="text-sm text-muted">{status}</p>}
    </div>
  );
}
