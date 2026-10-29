"use client";

/**
 * An on/off switch with its label; the whole row is the tap target. Use it for settings that take
 * effect straight away. For a choice that only applies when a button is pressed, use Checkbox.
 */
export function Switch({
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
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`group flex min-h-12 items-center gap-3 rounded-xl text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 ${className}`}
    >
      <span
        aria-hidden
        className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border transition-colors ${
          checked ? "border-transparent bg-accent" : "border-line-strong bg-panel group-hover:border-fg"
        }`}
      >
        <span
          className={`absolute top-0.5 size-[18px] rounded-full shadow-card transition-transform ${
            checked ? "translate-x-[22px] bg-accent-ink" : "translate-x-0.5 bg-muted"
          }`}
        />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-semibold">{label}</span>
        {hint && <span className="block text-sm text-muted">{hint}</span>}
      </span>
    </button>
  );
}
