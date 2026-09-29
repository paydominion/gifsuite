import type { InputHTMLAttributes, TextareaHTMLAttributes } from "react";

const FIELD =
  "w-full rounded-xl border border-line bg-surface px-4 text-base text-fg outline-none transition-colors " +
  "placeholder:text-subtle hover:border-line-strong focus:border-ring focus:ring-2 focus:ring-ring/25";

export function Input({ className = "", ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`${FIELD} h-12 ${className}`} {...props} />;
}

export function Textarea({ className = "", ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={`${FIELD} resize-none py-3 ${className}`} {...props} />;
}
