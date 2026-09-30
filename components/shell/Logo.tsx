import Link from "next/link";
import { BurstLoop } from "@/components/brand/Marks";

export function Logo() {
  return (
    <Link href="/" className="flex h-11 items-center gap-2 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
      <BurstLoop size={30} className="text-accent" />
      <span className="text-[17px] font-bold tracking-tight">GifSuite</span>
    </Link>
  );
}
