import { expect, test } from "@playwright/test";

const BASE = "http://localhost:3299";

test.describe("link previews, icons and the app manifest", () => {
  test("every kind of page shares the 1200×630 preview image as a large card", async ({ request }) => {
    for (const path of ["/", "/tools", "/mp4-to-gif", "/blog/save-a-gif-from-x"]) {
      const html = await (await request.get(path)).text();
      expect(html, path).toContain(`<meta property="og:image" content="${BASE}/brand/og.png"/>`);
      expect(html, path).toContain('<meta property="og:image:width" content="1200"/>');
      expect(html, path).toContain('<meta name="twitter:card" content="summary_large_image"/>');
    }
    const img = await request.get("/brand/og.png");
    expect(img.status()).toBe(200);
    expect(img.headers()["content-type"]).toBe("image/png");
  });

  test("every indexable page names its own address as canonical", async ({ request }) => {
    const paths = ["/", "/tools", "/tools/convert", "/tools/compress", "/tools/trim", "/tools/speed", "/tools/crop", "/tools/captions", "/tools/maker", "/terms", "/privacy", "/copyright", "/blog", "/mp4-to-gif"];
    for (const path of paths) {
      const html = await (await request.get(path)).text();
      const href = path === "/" ? BASE : `${BASE}${path}`;
      expect(html, path).toContain(`<link rel="canonical" href="${href}"/>`);
    }
  });

  test("phones get a home-screen icon and a web app manifest", async ({ request }) => {
    const html = await (await request.get("/")).text();
    expect(html).toContain('<link rel="apple-touch-icon" href="/apple-touch-icon.png"/>');
    expect(html).toMatch(/<link rel="manifest" href="\/manifest\.webmanifest"/);
    expect((await request.get("/apple-touch-icon.png")).headers()["content-type"]).toBe("image/png");
    const manifest = await (await request.get("/manifest.webmanifest")).json();
    expect(manifest).toMatchObject({ name: "GifSuite", display: "standalone", theme_color: "#111110" });
    for (const icon of manifest.icons) expect((await request.get(icon.src)).status(), icon.src).toBe(200);
  });

  test("browsers and crawlers that ask for /favicon.ico get the icon", async ({ request }) => {
    const res = await request.get("/favicon.ico");
    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"]).toContain("image/");
  });
});
