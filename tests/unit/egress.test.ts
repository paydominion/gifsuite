import http from "node:http";
import net from "node:net";
import { describe, expect, it } from "vitest";
import { egressProxy } from "../../processor/fetch.mjs";

// yt-dlp goes out only through this proxy, so whatever a page or redirect points it at, it can't
// reach private addresses or non-web ports. (No public site is contacted in these tests.)
async function tunnel(target: string): Promise<string> {
  const { port } = new URL(await egressProxy());
  return new Promise((resolve, reject) => {
    const socket = net.connect(Number(port), "127.0.0.1", () => socket.write(`CONNECT ${target} HTTP/1.1\r\nHost: ${target}\r\n\r\n`));
    socket.once("data", (d) => {
      resolve(d.toString().split("\r\n")[0]);
      socket.destroy();
    });
    socket.on("error", reject);
  });
}

async function viaProxy(target: string): Promise<number> {
  const { port } = new URL(await egressProxy());
  return new Promise((resolve, reject) => {
    http.get({ host: "127.0.0.1", port: Number(port), path: target, headers: { host: new URL(target).host } }, (res) => {
      res.resume();
      resolve(res.statusCode ?? 0);
    }).on("error", reject);
  });
}

describe("yt-dlp's egress proxy", () => {
  it.each(["127.0.0.1:443", "10.0.0.1:443", "169.254.169.254:443", "[::1]:443", "localhost:443", "192.168.1.1:443"])(
    "refuses to tunnel to the private address %s",
    async (target) => expect(await tunnel(target)).toMatch(/403/),
  );

  it("refuses ports other than 80 and 443", async () => {
    expect(await tunnel("1.1.1.1:22")).toMatch(/403/);
  });

  it.each(["http://127.0.0.1:8080/fetch?url=x", "http://169.254.169.254/latest/meta-data/", "http://[::1]/"])(
    "refuses plain requests to %s",
    async (target) => expect(await viaProxy(target)).toBe(403),
  );
});
