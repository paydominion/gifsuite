/**
 * An error message: icon, border, tinted background and text, so it never relies on colour alone.
 * role="alert" also reports it to analytics (see ClientEvents).
 */
export function ErrorMessage({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <p role="alert" className={`flex items-start gap-2 rounded-xl border border-danger/60 bg-danger/10 px-3 py-2 text-left text-sm text-danger ${className}`}>
      <svg aria-hidden width="18" height="18" viewBox="0 0 18 18" className="mt-px shrink-0">
        <circle cx="9" cy="9" r="7.25" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <path d="M9 5v4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <circle cx="9" cy="12.5" r="1.05" fill="currentColor" />
      </svg>
      <span className="min-w-0">{children}</span>
    </p>
  );
}
