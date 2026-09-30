import { expect, test } from "@playwright/test";

const BASE = "http://localhost:3299";

test.describe("blog", () => {
  test("the index lists the posts", async ({ request }) => {
    const res = await request.get("/blog");
    expect(res.status()).toBe(200);
    const html = await res.text();
    for (const slug of ["how-to-make-a-gif-smaller", "gif-vs-mp4-vs-webm-vs-webp", "post-a-gif-on-x", "save-a-gif-from-x"]) {
      expect(html).toContain(`href="/blog/${slug}"`);
    }
  });

  test("a post has the tags search engines and link previews read", async ({ request }) => {
    const res = await request.get("/blog/how-to-make-a-gif-smaller");
    expect(res.status()).toBe(200);
    const html = await res.text();

    expect(html).toContain("<title>5 ways to make a GIF smaller without wrecking it · GifSuite</title>");
    expect(html).toMatch(/<meta name="description" content="A GIF&#x27;s size comes from its width, length, frame rate and colors\./);
    expect(html).toContain(`<link rel="canonical" href="${BASE}/blog/how-to-make-a-gif-smaller"`);
    expect(html).toContain('property="og:type" content="article"');
    expect(html).toContain('property="article:published_time" content="2026-09-30"');

    // Structured data is valid JSON and describes this article.
    const jsonLd = html.match(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/)![1];
    const data = JSON.parse(jsonLd);
    expect(data).toMatchObject({
      "@type": "Article",
      headline: "5 ways to make a GIF smaller without wrecking it",
      datePublished: "2026-09-30",
      mainEntityOfPage: `${BASE}/blog/how-to-make-a-gif-smaller`,
    });

    // The article body and its link to the tool.
    expect(html).toContain('<h2 id="1-make-it-shorter">');
    expect(html).toContain('<a href="/tools/compress">Compress &amp; resize</a>');
  });

  test("unknown posts and templates are 404s", async ({ request }) => {
    expect((await request.get("/blog/no-such-post")).status()).toBe(404);
    expect((await request.get("/blog/_template-tip")).status()).toBe(404);
  });

  test("the sitemap lists pages, live tools and posts", async ({ request }) => {
    const res = await request.get("/sitemap.xml");
    expect(res.status()).toBe(200);
    const xml = await res.text();
    for (const path of ["/", "/tools", "/blog", "/tools/convert", "/tools/compress", "/blog/save-a-gif-from-x"]) {
      expect(xml).toContain(`<loc>${BASE}${path}</loc>`);
    }
    expect(xml).not.toContain("_template");
  });

  test("anything that isn't production tells search engines to stay out", async ({ request }) => {
    const robots = await (await request.get("/robots.txt")).text();
    expect(robots).toMatch(/User-Agent: \*\s+Disallow: \/\s*$/i);
    expect(robots).not.toContain("Sitemap:");
    for (const path of ["/", "/blog", "/blog/save-a-gif-from-x"]) {
      expect((await request.get(path)).headers()["x-robots-tag"], path).toBe("noindex, nofollow");
    }
  });
});
