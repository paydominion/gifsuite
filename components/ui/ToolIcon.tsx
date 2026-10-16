/** Simple line icons, one per tool, drawn on a 24px grid in the current text colour. */
const PATHS: Record<string, string> = {
  // A link with a download arrow.
  grab: "M10 14a4 4 0 0 0 5.66 0l3-3a4 4 0 0 0-5.66-5.66l-1 1M14 10a4 4 0 0 0-5.66 0l-3 3a4 4 0 0 0 5.66 5.66l1-1",
  // Two arrows swapping.
  convert: "M7 7h11l-3-3M17 17H6l3 3",
  // Arrows pressing inwards.
  compress: "M4 9h5V4M20 9h-5V4M4 15h5v5M20 15h-5v5",
  // Fast-forward.
  speed: "M4 6l7 6-7 6V6zM13 6l7 6-7 6V6z",
  // Scissors.
  trim: "M8.5 8.5 20 20M8.5 15.5 20 4M6 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM6 21a3 3 0 1 0 0-6 3 3 0 0 0 0 6z",
  // Stacked pictures with a spark.
  maker: "M4 8h11v11H4zM8 5h11v11M17 2v2M20 3l-1.5 1.5",
  // Crop corners.
  crop: "M6 2v16h16M2 6h16v16",
  // A capital T.
  captions: "M5 6V4h14v2M12 4v16M9 20h6",
};

export function ToolIcon({ tool, className = "size-5" }: { tool: string; className?: string }) {
  const d = PATHS[tool];
  if (!d) return null;
  return (
    <svg aria-hidden viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d={d} />
    </svg>
  );
}
