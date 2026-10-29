import type { ComponentProps } from "react";

export const cardClass = "rounded-2xl border border-line bg-surface shadow-card";

export function Card({ className = "", ...props }: ComponentProps<"div">) {
  return <div className={`${cardClass} ${className}`} {...props} />;
}

/** A small status label. Neutral grey and pill-shaped, so it never looks like a button. */
export function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex shrink-0 items-center rounded-full border border-line px-2 py-0.5 text-xs font-semibold text-muted">
      {children}
    </span>
  );
}

/** The heading of a group inside a card or panel, e.g. the label above a set of choices. */
export function SectionLabel({ children, id }: { children: React.ReactNode; id?: string }) {
  return <h2 id={id} className="text-base font-bold">{children}</h2>;
}
