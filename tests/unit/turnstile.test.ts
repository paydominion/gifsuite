import { afterEach, describe, expect, it, vi } from "vitest";
import { humanCheckEnabled, isHuman } from "@/lib/turnstile";

const req = (token?: string) => new Request("https://gifsuite.com/api/grab", { method: "POST", headers: token ? { "x-turnstile-token": token } : {} });

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("isHuman (Cloudflare Turnstile)", () => {
  it("lets everything through while no secret is set (dev and tests)", async () => {
    expect(humanCheckEnabled()).toBe(false);
    expect(await isHuman(req())).toBe(true);
  });

  it("asks Cloudflare, and trusts its answer", async () => {
    vi.stubEnv("TURNSTILE_SECRET", "test-secret");
    const fetchMock = vi.fn(async (_url: string, init: RequestInit) => {
      const body = new URLSearchParams(init.body as string);
      return Response.json({ success: body.get("response") === "good-token" && body.get("secret") === "test-secret" });
    });
    vi.stubGlobal("fetch", fetchMock);
    expect(await isHuman(req("good-token"))).toBe(true);
    expect(await isHuman(req("forged-token"))).toBe(false);
    expect(fetchMock.mock.calls[0][0]).toBe("https://challenges.cloudflare.com/turnstile/v0/siteverify");
  });

  it("refuses requests with no token, without asking Cloudflare", async () => {
    vi.stubEnv("TURNSTILE_SECRET", "test-secret");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    expect(await isHuman(req())).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("lets people through if Cloudflare's check itself is unreachable", async () => {
    vi.stubEnv("TURNSTILE_SECRET", "test-secret");
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("network down"); }));
    expect(await isHuman(req("any-token"))).toBe(true);
  });
});
