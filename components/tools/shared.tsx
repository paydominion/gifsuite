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
