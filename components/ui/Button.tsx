import type { ButtonHTMLAttributes } from "react";

/**
 * Three weights, told apart without colour: primary is filled, secondary is outlined, tertiary is
 * underlined text. Use one primary per screen.
 */
type Variant = "primary" | "secondary" | "tertiary";
type Size = "sm" | "md" | "lg";

const BASE =
  "inline-flex items-center justify-center gap-2 rounded-xl font-semibold whitespace-nowrap transition " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 " +
  "focus-visible:ring-offset-bg disabled:pointer-events-none disabled:opacity-50";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-accent text-accent-ink hover:bg-accent/85 active:bg-accent/70",
  secondary: "border border-accent text-accent hover:bg-accent/10 active:bg-accent/20",
  tertiary: "text-accent underline decoration-2 underline-offset-4 hover:decoration-transparent active:opacity-70",
};

// Every size reaches a 48px tap target on touch screens; sm and md stay compact under a mouse.
const SIZES: Record<Size, string> = {
  sm: "h-10 text-sm pointer-coarse:h-12",
  md: "h-11 text-sm pointer-coarse:h-12",
  lg: "h-12 text-base",
};
// Side padding belongs to the box. Tertiary buttons have no box, so their text lines up with the text around them.
const PADDING: Record<Size, string> = { sm: "px-4", md: "px-5", lg: "px-6" };

export type ButtonStyle = { variant?: Variant; size?: Size; className?: string };

/** Button classes, for links and other elements that should look like a button. */
export function buttonClass({ variant = "secondary", size = "md", className = "" }: ButtonStyle = {}) {
  const pad = variant === "tertiary" ? "" : PADDING[size];
  return `${BASE} ${VARIANTS[variant]} ${SIZES[size]} ${pad} ${className}`;
}

export function Button({
  variant,
  size,
  className,
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & ButtonStyle) {
  return <button type={type} className={buttonClass({ variant, size, className })} {...props} />;
}
