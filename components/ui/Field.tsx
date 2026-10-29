import type { InputHTMLAttributes, TextareaHTMLAttributes } from "react";

// The border is the strong stroke (≥ 3:1), so the box is visible before anyone touches it.
const FIELD =
  "w-full rounded-xl border border-line-strong bg-bg px-4 text-base text-fg outline-none transition-colors " +
  "placeholder:text-muted hover:border-fg focus:border-ring focus:ring-2 focus:ring-ring/25 disabled:opacity-50";

export function Input({ className = "", ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`${FIELD} h-12 ${className}`} {...props} />;
}

export function Textarea({ className = "", ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={`${FIELD} resize-none py-3 ${className}`} {...props} />;
}

/**
 * A visible label above a field, with an optional hint between them (hints go before the input, not
 * after). Give the field aria-describedby={`${htmlFor}-hint`} when there's a hint.
 */
export function FieldLabel({ htmlFor, children, optional, hint }: { htmlFor: string; children: React.ReactNode; optional?: boolean; hint?: string }) {
  return (
    <div className="space-y-1">
      <label htmlFor={htmlFor} className="block text-sm font-bold">
        {children}
        {optional && <span className="font-normal text-muted"> (optional)</span>}
      </label>
      {hint && <p id={`${htmlFor}-hint`} className="text-sm text-muted">{hint}</p>}
    </div>
  );
}
