import { expect, test } from "@playwright/test";
import { ADMIN_TOKEN, grabId } from "../helpers";

test.describe("security headers", () => {
  test("pages get a nonce CSP that changes on every request", async ({ request }) => {
    const nonceOf = async () => {
      const res = await request.get("/");
      const csp = res.headers()["content-security-policy"];
      expect(csp).toContain("'strict-dynamic'");
      expect(csp).toContain("frame-ancestors 'none'");
      expect(csp).toContain("object-src 'none'");
      expect(csp).not.toContain("'unsafe-inline'"); // production build: styles need the nonce too
      expect(csp).not.toContain("'unsafe-eval'");
      const nonce = csp.match(/'nonce-([^']+)'/)![1];
      // Next.js stamps the same nonce on its own scripts.
      expect(await res.text()).toContain(`nonce="${nonce}"`);
      return nonce;
    };
    expect(await nonceOf()).not.toBe(await nonceOf());
  });

  test("the Cloudflare Web Analytics beacon carries the page's nonce", async ({ request }) => {
    const res = await request.get("/blog");
    const csp = res.headers()["content-security-policy"];
    const nonce = csp.match(/'nonce-([^']+)'/)![1];
    expect(csp).toContain("connect-src 'self' https://cloudflareinsights.com");
    const html = await res.text();
    const tag = html.match(/<script[^>]*beacon\.min\.js[^>]*>/)?.[0] ?? "";
    expect(tag).toContain(`nonce="${nonce}"`);
    expect(tag).toContain("&quot;token&quot;:&quot;0123456789abcdef0123456789abcdef&quot;");
  });

  test("no page is static: each one is rendered with the nonce of its own request", async ({ request }) => {
    // A prerendered or cached page would reuse HTML stamped with an old nonce, and browsers would
    // block every script on it. This bit /tools on the live site.
    for (const path of ["/", "/tools", "/tools/convert", "/tools/compress", "/blog", "/brand", "/this-page-does-not-exist"]) {
      for (let i = 0; i < 3; i++) {
        const res = await request.get(path);
        const headerNonce = res.headers()["content-security-policy"].match(/'nonce-([^']+)'/)![1];
        const html = await res.text();
        const htmlNonces = [...new Set([...html.matchAll(/nonce="([^"]+)"/g)].map((m) => m[1]))];
        expect(htmlNonces, `${path} request ${i + 1}`).toEqual([headerNonce]);
        expect(res.headers()["cache-control"] ?? "", path).not.toContain("s-maxage");
      }
    }
  });

  test("every response gets the basic hardening headers", async ({ request }) => {
    const id = await grabId(request, "111", "gifmaker");
    for (const path of ["/", `/g/${id}`, "/api/gifs", `/media/${id}/poster.jpg`]) {
      const h = (await request.get(path)).headers();
      expect(h["x-content-type-options"], path).toBe("nosniff");
      expect(h["x-frame-options"], path).toBe("DENY");
      expect(h["referrer-policy"], path).toBe("strict-origin-when-cross-origin");
      expect(h["permissions-policy"], path).toContain("camera=()");
      expect(h["x-powered-by"], path).toBeUndefined();
    }
  });

  test("the tab icon and brand artwork are served from our own site", async ({ request }) => {
    for (const path of ["/icon.svg", "/brand/burst.svg", "/brand/band.svg"]) {
      const res = await request.get(path);
      expect(res.status(), path).toBe(200);
      expect(res.headers()["content-type"], path).toContain("image/svg+xml");
    }
    expect(await (await request.get("/")).text()).toContain('rel="icon"');
  });

  test("error responses don't leak internals", async ({ request }) => {
    const res = await request.post("/api/grab", { data: { url: "https://x.com/down/status/500" } });
    const text = await res.text();
    expect(text).not.toMatch(/stack|at \w+ \(|node_modules|syndication|yt-dlp|\/Users\//);
  });

  test("admin rejects tokens that are almost right", async ({ request }) => {
    const res = await request.post("/api/admin/hide", {
      data: { gifId: "whatever", hidden: true },
      headers: { "x-admin-token": ADMIN_TOKEN.slice(0, -1) + "X" },
    });
    expect(res.status()).toBe(401);
  });
});
