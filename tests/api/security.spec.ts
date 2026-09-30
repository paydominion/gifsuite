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
