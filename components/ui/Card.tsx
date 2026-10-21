import type { ComponentProps } from "react";

export const cardClass = "rounded-2xl border border-line bg-surface shadow-card";

export function Card({ className = "", ...props }: ComponentProps<"div">) {
  return <div className={`${cardClass} ${className}`} {...props} />;
}

export function Badge({ tone = "neutral", children }: { tone?: "neutral" | "accent"; children: React.ReactNode }) {
  const tones = {
    neutral: "border-line bg-panel text-muted",
    accent: "border-transparent bg-accent text-accent-ink",
  };
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${tones[tone]}`}>
      {children}
    </span>
  );
}

/** Small uppercase label above a section of a page or panel. */
export function SectionLabel({ children }: { children: React.ReactNode }) {
  return <h2 className="text-xs font-semibold uppercase tracking-wider text-subtle">{children}</h2>;
}
