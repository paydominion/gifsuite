"use client";

import { Button } from "@/components/ui/Button";

/** Saves the mark drawn inside `#<targetId>` as a standalone SVG file with its colours baked in. */
export function DownloadMark({ targetId, fileName, color, cut }: { targetId: string; fileName: string; color: string; cut: string }) {
  function download() {
    const svg = document.querySelector(`#${targetId} svg`);
    if (!svg) return;
    const copy = svg.cloneNode(true) as SVGElement;
    copy.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    copy.setAttribute("width", "512");
    copy.setAttribute("height", "512");
    copy.removeAttribute("class");
    const source = new XMLSerializer()
      .serializeToString(copy)
      .replaceAll("currentColor", color)
      .replaceAll("var(--mark-cut, #111110)", cut);
    const url = URL.createObjectURL(new Blob([source], { type: "image/svg+xml" }));
    Object.assign(document.createElement("a"), { href: url, download: fileName }).click();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  }
  return (
    <Button size="sm" variant="secondary" onClick={download}>
      Download SVG
    </Button>
  );
}
