import path from "node:path";
import { describe, expect, it } from "vitest";
import { buildAll, buildPost, parseFrontmatter, renderMarkdown } from "../../scripts/build-content.mjs";

const words = (n: number) => Array.from({ length: n }, (_, i) => `word${i}`).join(" ");
const tip = (extra = "", body = words(130)) => `---
title: A perfectly reasonable title for a tip
description: ${"A description that is long enough to satisfy the rule about length, which asks for at least one hundred and ten characters."}
date: 2026-09-30
type: tip
tags: [one, two]
${extra}---

${body}
`;

describe("parseFrontmatter", () => {
  it("reads values, inline lists and block lists", () => {
    const { data, body } = parseFrontmatter(`---
title: "Quoted: with a colon"
tags: [a, b c, "d"]
sources:
  - First | https://example.com/1
  - Second | https://example.com/2
# a comment
---

Body here.`);
    expect(data).toEqual({
      title: "Quoted: with a colon",
      tags: ["a", "b c", "d"],
      sources: ["First | https://example.com/1", "Second | https://example.com/2"],
    });
    expect(body.trim()).toBe("Body here.");
  });

  it("rejects a file with no frontmatter", () => {
    expect(() => parseFrontmatter("just text")).toThrow(/frontmatter/);
  });
});

describe("renderMarkdown", () => {
  it("shows raw HTML as text, so a post can never inject a script", () => {
    const { html } = renderMarkdown('Hello <script>alert(1)</script> <img src=x onerror="alert(2)">');
    expect(html).not.toContain("<script");
    expect(html).not.toContain("<img");
    expect(html).toContain("&lt;script&gt;");
  });

  it("refuses javascript: links and marks external links", () => {
    const bad = renderMarkdown("[click](javascript:alert(1))");
    expect(bad.html).not.toContain("javascript:");
    expect(bad.problems.join()).toMatch(/must start with/);

    const { html } = renderMarkdown("[X](https://x.com/a) and [tool](/tools/compress)");
    expect(html).toContain('<a href="https://x.com/a" target="_blank" rel="noopener noreferrer">X</a>');
    expect(html).toContain('<a href="/tools/compress">tool</a>');
  });

  it("gives headings anchors and flags H1s and images", () => {
    const { html, problems } = renderMarkdown("# Big\n\n## Why GIFs loop\n\n![pic](a.png)");
    expect(html).toContain('<h2 id="why-gifs-loop">');
    expect(problems.join()).toMatch(/H1/);
    expect(problems.join()).toMatch(/image/);
  });
});

describe("buildPost", () => {
  it("builds a valid tip", () => {
    const { post, problems } = buildPost("a-good-slug", tip("tool: compress\n"));
    expect(problems).toBeUndefined();
    expect(post).toMatchObject({ slug: "a-good-slug", type: "tip", tool: "compress", draft: false, tags: ["one", "two"] });
    expect(post!.readingMinutes).toBeGreaterThanOrEqual(1);
  });

  it.each([
    ["Bad_Slug", tip(), /file name/],
    ["ok", tip().replace(/title: .*/, `title: ${"x".repeat(70)}`), /title is 70 characters/],
    ["ok", tip().replace(/description: .*/, "description: too short"), /description is 9 characters/],
    ["ok", tip().replace("2026-09-30", "30/09/2026"), /date must look like/],
    ["ok", tip().replace("type: tip", "type: rant"), /type must be one of/],
    ["ok", tip("tool: teleport\n"), /isn't a GifSuite tool/],
    ["ok", tip().replace("tags: [one, two]", "tags: []"), /at least one tag/],
    ["ok", tip("", "too short"), /body is 2 words/],
  ])("explains what's wrong with %s", (slug, source, message) => {
    expect(buildPost(slug, source).problems!.join("\n")).toMatch(message);
  });

  const history = (extra: string) =>
    tip(extra, words(520)).replace("type: tip", "type: history");
  const threeSources = "sources:\n  - One | https://example.com/1\n  - Two | https://example.com/2\n  - Three | https://example.com/3\n";

  it("won't publish a history post without sources and a human fact-checker", () => {
    expect(buildPost("h", history("")).problems!.join("\n")).toMatch(/at least 3 sources/);
    expect(buildPost("h", history(threeSources)).problems!.join("\n")).toMatch(/reviewedBy/);
    expect(buildPost("h", history(threeSources + "reviewedBy: Ada\n")).post).toMatchObject({ reviewedBy: "Ada", sources: [{ title: "One", url: "https://example.com/1" }, {}, {}] });
  });

  it("lets a history draft exist before it has been reviewed", () => {
    expect(buildPost("h", history(threeSources + "status: draft\n")).post).toMatchObject({ draft: true });
  });

  it("rejects malformed sources", () => {
    const bad = "sources:\n  - No link here\n  - Two | https://example.com/2\n  - Three | ftp://example.com/3\n";
    expect(buildPost("h", history(bad)).problems!.join("\n")).toMatch(/must look like: Title of the page \| https/);
  });
});

describe("the real content folder", () => {
  const dir = path.join(process.cwd(), "content", "blog");

  it("has no broken posts", () => {
    expect(buildAll(dir, { drafts: true }).errors).toEqual([]);
  });

  it("publishes posts newest first, skips templates, and hides drafts unless asked", () => {
    const published = buildAll(dir).posts;
    expect(published.length).toBeGreaterThanOrEqual(4);
    expect(published.every((p) => !p.draft && !p.slug.startsWith("_"))).toBe(true);
    const dates = published.map((p) => p.date);
    expect(dates).toEqual([...dates].sort().reverse());
  });
});
