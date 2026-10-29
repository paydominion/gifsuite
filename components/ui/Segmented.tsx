type Option<T extends string> = { value: T; label: string };

/**
 * A row of mutually exclusive choices (radio group), e.g. Low / Medium / High. The chosen one is
 * outlined in yellow, so it stands out without looking like the screen's main (filled) button.
 */
export function Segmented<T extends string>({
  label,
  options,
  value,
  onChange,
  disabled,
  columns,
}: {
  label: string;
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
  disabled?: boolean;
  /** Wrap into a grid of this many columns (for long lists, e.g. 8 speeds on a phone). */
  columns?: 2 | 3 | 4;
}) {
  const layout = columns ? `grid ${{ 2: "grid-cols-2", 3: "grid-cols-3", 4: "grid-cols-4" }[columns]}` : "flex";
  return (
    <div role="radiogroup" aria-label={label} className={`${layout} gap-1 rounded-xl border border-line-strong bg-bg p-1 text-sm`}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          disabled={disabled}
          onClick={() => onChange(o.value)}
          className={`min-h-10 min-w-0 flex-1 rounded-lg px-1.5 font-semibold whitespace-nowrap transition-colors min-[400px]:px-3 pointer-coarse:min-h-12 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 ${
            value === o.value ? "bg-panel text-accent ring-2 ring-inset ring-accent" : "text-muted hover:bg-panel hover:text-fg"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
