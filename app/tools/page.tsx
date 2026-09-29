import type { Metadata } from "next";
import Link from "next/link";
import { TOOLS } from "@/lib/tools";
import { Badge, cardClass } from "@/components/ui/Card";

export const metadata: Metadata = {
  title: "All tools",
  description: "Every GIF tool in GifSuite: grab from X, convert, compress, trim, make GIFs from photos and more.",
};

export default function ToolsPage() {
  return (
    <div className="space-y-8">
      <header className="max-w-2xl space-y-2">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">All tools</h1>
        <p className="text-muted">One place for everything GIF. New tools are added regularly.</p>
      </header>
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {TOOLS.map((tool) => {
          const body = (
            <>
              <div className="flex items-center justify-between gap-3">
                <h2 className="font-semibold">{tool.name}</h2>
                {tool.status === "live" ? <Badge tone="accent">Live</Badge> : <Badge>Coming soon</Badge>}
              </div>
              <p className="mt-1.5 text-sm text-muted">{tool.description}</p>
            </>
          );
          return (
            <li key={tool.slug}>
              {tool.status === "live" ? (
                <Link href={tool.href} className={`${cardClass} block h-full p-5 transition-colors hover:border-line-strong`}>
                  {body}
                </Link>
              ) : (
                <div aria-disabled className={`${cardClass} h-full p-5 opacity-70`}>{body}</div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
