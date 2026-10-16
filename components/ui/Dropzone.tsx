"use client";

import { useEffect, useId, useState } from "react";

/**
 * Pick a file by clicking, dragging it in, or pasting it (⌘V). Shared by every upload tool.
 * `accept` filters the file picker; the server still checks the real type.
 */
export function Dropzone({
  accept,
  hint,
  onFile,
  onFiles,
  title = "Drop a file here, or click to choose",
  disabled,
}: {
  accept: string;
  hint: string;
  /** One file (the first, if several are dropped). */
  onFile?: (file: File) => void;
  /** Several files at once; turns on multiple selection. */
  onFiles?: (files: File[]) => void;
  title?: string;
  disabled?: boolean;
}) {
  const deliver = (list: FileList | null | undefined) => {
    const files = Array.from(list ?? []);
    if (files.length === 0) return;
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
      <span className="font-semibold">{title}</span>
      <span className="text-sm text-muted">{hint}</span>
      <input
        id={inputId}
        type="file"
        accept={accept}
        multiple={!!onFiles}
        disabled={disabled}
        className="sr-only"
        onChange={(e) => {
          deliver(e.target.files);
          e.target.value = ""; // allow choosing the same file again
        }}
      />
    </label>
  );
}
