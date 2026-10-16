import { afterEach, describe, expect, it, vi } from "vitest";
import { fromCurrentImage } from "@/lib/media/processor";

afterEach(() => {
  vi.unstubAllEnvs();
});

/** A fake container namespace: each named instance answers with the image version it started on. */
function fakeContainers(images: Record<string, string>) {
  const asked: string[] = [];
  const getContainer = ((_ns: unknown, name?: string) => ({
    fetch: async () => {
      asked.push(name!);
      return new Response("ok", { headers: { "x-processor-version": images[name!] ?? "new-sha" } });
    },
  })) as unknown as Parameters<typeof fromCurrentImage>[1];
  return { asked, getContainer, ns: {} as Parameters<typeof fromCurrentImage>[0] };
}

describe("fromCurrentImage (converter version handshake)", () => {
  it("uses the deploy's instance when it runs the deploy's image", async () => {
    vi.stubEnv("PROCESSOR_VERSION", "new-sha");
    const { asked, getContainer, ns } = fakeContainers({});
    const res = await fromCurrentImage(ns, getContainer, "/health");
    expect(await res.text()).toBe("ok");
    expect(asked).toEqual(["processor-new-sha"]);
  });

  it("moves to a fresh instance when one answers from an older image, and stays there", async () => {
    vi.stubEnv("PROCESSOR_VERSION", "new-sha");
    const { asked, getContainer, ns } = fakeContainers({ "processor-new-sha": "old-sha" });
    const res = await fromCurrentImage(ns, getContainer, "/edit");
    expect(res.headers.get("x-processor-version")).toBe("new-sha");
    expect(asked).toEqual(["processor-new-sha", "processor-new-sha-1"]);
    await fromCurrentImage(ns, getContainer, "/edit");
    expect(asked.at(-1)).toBe("processor-new-sha-1");
  });
});
