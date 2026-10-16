import { expect, test } from "@playwright/test";
import { grab } from "../helpers";

test.describe("resilience and health", () => {
  test("a grab survives X failing twice: the fetcher retries", async ({ request }) => {
    const { status, body } = await grab(request, "https://x.com/flaky/status/126");
    expect(status).toBe(200);
    expect(body.id).toMatch(/^[A-Za-z0-9]{10}$/);
  });

  test("GET /api/health reports every part, with no internals", async ({ request }) => {
    const res = await request.get("/api/health");
    expect(res.status()).toBe(200);
    expect(res.headers()["cache-control"]).toBe("no-store");
    const body = await res.json();
    expect(body).toMatchObject({
      ok: true,
      checks: {
        database: { ok: true, ms: expect.any(Number) },
        storage: { ok: true },
        processor: { ok: true },
        x: { ok: true, paused: false, recentFailures: expect.any(Number) },
      },
    });
    expect(JSON.stringify(body)).not.toMatch(/token|secret|127\.0\.0\.1|PROCESSOR_URL|http:\/\//i);
  });
});
