"use client";

import Link from "next/link";
import { useEffect, useId, useState } from "react";
import { trackUi } from "@/lib/track";
import { ErrorMessage } from "./Alert";
import { buttonClass } from "./Button";

/** True if the file matches an `accept` list of MIME types ("video/mp4", "image/*") and extensions (".gif"). */
export function accepts(accept: string, file: File): boolean {
  const ext = file.name.match(/\.[a-z0-9]+$/i)?.[0].toLowerCase();
  return accept.split(",").some((rule) => {
    const r = rule.trim().toLowerCase();
    if (r.startsWith(".")) return r === ext;
    if (r.endsWith("/*")) return file.type.startsWith(r.slice(0, -1));
    return r === file.type;
  });
}

/**
 * Pick a file by clicking, dragging it in, or pasting it (⌘V). Shared by every upload tool.
 * `accept` filters the file picker; the server still checks the real type.
 */
export function Dropzone({
  accept,
  hint,
  onFile,
  onFiles,
  title = "Drag a file here",
  button = "Choose file",
  disabled,
}: {
  accept: string;
  hint: string;
  /** One file (the first, if several are dropped). */
  onFile?: (file: File) => void;
  /** Several files at once; turns on multiple selection. */
  onFiles?: (files: File[]) => void;
  title?: string;
  /** The label on the visible button (the whole box opens the picker too). */
  button?: string;
  disabled?: boolean;
}) {
  const [rejected, setRejected] = useState<"picture" | "other" | null>(null);
  const deliver = (list: FileList | null | undefined) => {
    const files = Array.from(list ?? []);
    if (files.length === 0) return;
    setRejected(null);
    // The file picker filters by type, but drag-and-drop and paste don't. Several files go to the
    // tool as they are (the GIF maker explains what it skipped); a single wrong one stops here.
    if (!onFiles && !accepts(accept, files[0])) {
      setRejected(/^image\/(?!gif)/.test(files[0].type) ? "picture" : "other");
      trackUi("ui", `file_rejected:${files[0].name.match(/\.([a-z0-9]{1,5})$/i)?.[1].toLowerCase() ?? (files[0].type || "unknown")}`);
      return;
    }
    // The kinds of file people bring (by extension, never the name), and how many at once.
    const kinds = [...new Set(files.map((f) => f.name.match(/\.([a-z0-9]{1,5})$/i)?.[1].toLowerCase() ?? (f.type || "unknown")))];
    trackUi("ui", `file:${kinds.join("+").slice(0, 40)}${files.length > 1 ? `:${files.length}` : ""}`);
    if (onFiles) onFiles(files);
    else onFile?.(files[0]);
  };
  const inputId = useId();
  const [dragging, setDragging] = useState(false);

  // Paste a copied file anywhere on the page.
  useEffect(() => {
    if (disabled) return;
    const onPaste = (e: ClipboardEvent) => deliver(e.clipboardData?.files);
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deliver only reads the latest props
  }, [disabled, onFile, onFiles]);

  return (
    <div className="space-y-3">
      <label
        htmlFor={inputId}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          if (!disabled) deliver(e.dataTransfer.files);
        }}
        className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-6 py-12 text-center transition-colors focus-within:ring-2 focus-within:ring-ring ${
          dragging ? "border-accent bg-panel" : "border-line-strong bg-surface hover:border-accent hover:bg-panel"
        } ${disabled ? "pointer-events-none opacity-60" : ""}`}
      >
        <svg aria-hidden width="28" height="28" viewBox="0 0 24 24" className="text-muted">
          <path d="M12 16V4m0 0-4.5 4.5M12 4l4.5 4.5M4 16v2.5A1.5 1.5 0 0 0 5.5 20h13a1.5 1.5 0 0 0 1.5-1.5V16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        {/* Phones can't drag files, so the button is the main way in; "drag" is a bonus for computers. */}
        <span className="font-semibold max-sm:hidden">{title}</span>
        <span className="text-sm text-muted max-sm:hidden">or</span>
        {/* Looks like a button; the label around it is what opens the picker. */}
        <span aria-hidden className={buttonClass({ variant: "secondary" })}>{button}</span>
        <span className="mt-1 max-w-sm text-sm text-muted">{hint}</span>
        <input
          id={inputId}
          type="file"
          accept={accept}
          multiple={!!onFiles}
          disabled={disabled}
          aria-label={button}
          className="sr-only"
          onChange={(e) => {
            deliver(e.target.files);
            e.target.value = ""; // allow choosing the same file again
          }}
        />
      </label>
      {rejected && (
        <ErrorMessage>
          {rejected === "picture" ? (
            <>
              Pictures (PNG, JPEG, WebP) don&apos;t work here. To turn pictures into a GIF, use the{" "}
              <Link href="/tools/maker" className="font-semibold underline underline-offset-2">
                GIF maker
              </Link>
              .
            </>
          ) : (
            "That kind of file doesn't work here. Choose one of the types listed above."
          )}
        </ErrorMessage>
      )}
    </div>
  );
}
