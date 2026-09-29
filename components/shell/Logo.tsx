import Link from "next/link";

export function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
      <span aria-hidden className="grid size-7 place-items-center rounded-lg bg-accent text-sm font-black text-accent-ink">
        G
      </span>
      <span className="text-[17px] font-bold tracking-tight">GifSuite</span>
    </Link>
  );
}
