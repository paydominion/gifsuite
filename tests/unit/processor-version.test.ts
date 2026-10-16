import { afterEach, describe, expect, it, vi } from "vitest";
import { fromCurrentImage } from "@/lib/media/processor";

afterEach(() => {
  vi.unstubAllEnvs();
});

/** A fake container namespace: each named instance answers with its image version, and 404 if told to. */
function fakeContainers(images: Record<string, { version: string; status?: number }>) {
  const asked: string[] = [];
  const getContainer = ((_ns: unknown, name?: string) => ({
    fetch: async () => {
      asked.push(name!);
      const img = images[name!] ?? { version: "new-sha" };
      return new Response("body", { status: img.status ?? 200, headers: { "x-processor-version": img.version } });
    },
  })) as unknown as Parameters<typeof fromCurrentImage>[1];
  return { asked, getContainer, ns: {} as Parameters<typeof fromCurrentImage>[0] };
}

describe("fromCurrentImage (converter version handshake)", () => {
  it("uses the deploy's instance when it runs the deploy's image", async () => {
    vi.stubEnv("PROCESSOR_VERSION", "new-sha");
    const { asked, getContainer, ns } = fakeContainers({});
    expect((await fromCurrentImage(ns, getContainer, "/health", undefined, 0)).status).toBe(200);
    expect(asked).toEqual(["processor-new-sha"]);
  });

  it("keeps using an older image for jobs it can do (no instance churn during a rollout)", async () => {
    vi.stubEnv("PROCESSOR_VERSION", "new-sha");
    const { asked, getContainer, ns } = fakeContainers({ "processor-new-sha": { version: "old-sha" } });
    const res = await fromCurrentImage(ns, getContainer, "/convert", undefined, 0);
    expect(res.status).toBe(200);
    expect(asked).toEqual(["processor-new-sha"]);
  });

  it("tries one fresh instance when an older image lacks the route, at most once a minute", async () => {
    vi.stubEnv("PROCESSOR_VERSION", "new-sha");
    const { asked, getContainer, ns } = fakeContainers({ "processor-new-sha": { version: "old-sha", status: 404 } });
    const t0 = 1_000_000_000;
    expect((await fromCurrentImage(ns, getContainer, "/edit", undefined, t0)).status).toBe(200);
    expect(asked).toEqual(["processor-new-sha", "processor-new-sha-1"]);
    // The fresh instance is used from now on.
    await fromCurrentImage(ns, getContainer, "/edit", undefined, t0 + 1000);
    expect(asked.at(-1)).toBe("processor-new-sha-1");
  });

  it("doesn't start another fresh instance within a minute if that one is old too", async () => {
    vi.stubEnv("PROCESSOR_VERSION", "newer-sha");
    const { asked, getContainer, ns } = fakeContainers({
      "processor-newer-sha-1": { version: "old-sha", status: 404 },
      "processor-newer-sha-2": { version: "old-sha", status: 404 },
    });
    // (instanceSuffix is shared module state; earlier tests left it at 1)
    const t = 2_000_000_000;
    const first = await fromCurrentImage(ns, getContainer, "/edit", undefined, t);
    const second = await fromCurrentImage(ns, getContainer, "/edit", undefined, t + 5000);
    expect(first.status).toBe(404);
    expect(second.status).toBe(404);
    expect(asked.filter((n) => n.startsWith("processor-newer-sha")).length).toBe(3); // one fresh try, then no more
  });
});
