import { Button } from "@/components/ui/Button";
import { Card, SectionLabel } from "@/components/ui/Card";

/** Pieces shared by the upload tools (convert, compress, and the ones to come). */

export const UPLOAD_ACCEPT = "image/gif,video/mp4,video/quicktime,video/webm,.gif,.mp4,.mov,.m4v,.webm";

export function formatBytes(n: number): string {
  return n < 1024 * 1024 ? `${Math.max(1, Math.round(n / 1024))} KB` : `${(n / 1024 / 1024).toFixed(1)} MB`;
}

export const isVideoFile = (f: File) => /^video\//.test(f.type) || /\.(mp4|mov|m4v|webm)$/i.test(f.name);

/** A safe base name for the downloaded file, taken from the uploaded one. */
export const baseName = (f: File) =>
  f.name.replace(/\.[^.]+$/, "").replace(/[^\w.-]+/g, "_").slice(0, 60) || "gifsuite";

export function saveAs(url: string, name: string) {
  Object.assign(document.createElement("a"), { href: url, download: name }).click();
}

/**
 * Ref for a tool's result card: when the result appears off-screen (on phones the settings sit below
 * the file, so it lands above the button just tapped), scroll it into view.
 */
export function revealResult(el: HTMLElement | null) {
  if (!el) return;
  requestAnimationFrame(() => {
    const { top, bottom } = el.getBoundingClientRect();
    if (top >= 64 && bottom <= window.innerHeight) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
  });
}

/** Shows a GIF/WebP as an image and MP4/WebM as a looping video. */
export function Preview({ url, isVideo, label }: { url: string; isVideo: boolean; label: string }) {
  return (
    <div className="overflow-hidden rounded-xl border border-line bg-panel">
      {isVideo ? (
        <video src={url} autoPlay muted loop playsInline aria-label={label} className="mx-auto block max-h-80 w-auto" />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element -- a local blob preview, not a page image
        <img src={url} alt={label} className="mx-auto block max-h-80 w-auto" />
      )}
    </div>
  );
}

/** The chosen file's name and details, with the way to swap it underneath (left-aligned, where people look). */
export function FileHeader({ name, details, busy, onReset }: { name: string; details: string; busy: boolean; onReset: () => void }) {
  return (
    <div className="min-w-0">
      <p className="truncate font-semibold">{name}</p>
      <p className="text-sm text-muted">{details}</p>
      <Button size="sm" variant="tertiary" disabled={busy} onClick={onReset} className="mt-1">
        Choose another file
      </Button>
    </div>
  );
}

/** The finished file: what was saved, a way to save it again, a preview, and any notes. */
export function ResultPanel({
  name,
  bytes,
  url,
  isVideo,
  label,
  children,
}: {
  name: string;
  bytes: number;
  url: string;
  isVideo: boolean;
  label: string;
  children?: React.ReactNode;
}) {
  return (
    <Card ref={revealResult} className="scroll-mt-20 space-y-4 p-6">
      <div className="min-w-0 space-y-2">
        <SectionLabel>Your file is ready</SectionLabel>
        <p role="status" className="break-words text-sm">
          Saved {name} ({formatBytes(bytes)})
        </p>
        {children}
        <Button size="sm" variant="secondary" onClick={() => saveAs(url, name)} className="mt-1">
          Download again
        </Button>
      </div>
      <Preview url={url} isVideo={isVideo} label={label} />
    </Card>
  );
}
