"use client";

import { useId } from "react";

/** A single checkbox with its label: for an option that applies when the form's button is pressed. */
export function Checkbox({
  checked,
  onChange,
  label,
  hint,
  disabled,
  className = "",
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  hint?: string;
  disabled?: boolean;
  className?: string;
}) {
  const id = useId();
  return (
    <label htmlFor={id} className={`group flex min-h-12 cursor-pointer items-center gap-3 rounded-xl text-left ${disabled ? "pointer-events-none opacity-50" : ""} ${className}`}>
      <input
        id={id}
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="peer sr-only"
      />
      {/* The square, drawn so its border meets 3:1 and the tick is unmistakable. */}
      <span
        aria-hidden
        className="grid size-6 shrink-0 place-items-center rounded-md border-2 border-line-strong bg-bg text-accent-ink transition-colors group-hover:border-fg peer-checked:border-accent peer-checked:bg-accent peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-bg"
      >
        {checked && (
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 7.5 5.8 10 11 4" />
          </svg>
        )}
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-semibold">{label}</span>
        {hint && <span className="block text-sm text-muted">{hint}</span>}
      </span>
    </label>
  );
}
