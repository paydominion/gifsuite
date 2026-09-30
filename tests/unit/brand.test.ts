import { describe, expect, it } from "vitest";
import { DOT_G, burstField, burstPath, burstRadius, dotLetter, halftoneDots, loopPaths, spiralPath } from "@/lib/brand.mjs";

describe("burst", () => {
  it("has its tips at 1 and its valleys at the valley depth", () => {
    expect(burstRadius(0)).toBeCloseTo(1);
    expect(burstRadius(Math.PI / 8)).toBeCloseTo(0.6);
    expect(burstRadius(Math.PI / 4)).toBeCloseTo(1); // eight lobes
  });

  it("draws one closed path that stays inside its radius", () => {
    const d = burstPath(50, 50, 49);
    expect(d.startsWith("M")).toBe(true);
    expect(d.endsWith("Z")).toBe(true);
    const numbers = d.match(/-?\d+(\.\d+)?/g)!.map(Number);
    expect(Math.min(...numbers)).toBeGreaterThanOrEqual(0.9);
    expect(Math.max(...numbers)).toBeLessThanOrEqual(99.1);
  });
});

describe("halftoneDots", () => {
  const dots = halftoneDots({ size: 200, pitch: 10, field: burstField(200) });

  it("fills the shape with big dots and lets them shrink to nothing at the edge", () => {
    const at = (x: number, y: number) => dots.filter((d) => Math.hypot(d.x - x, d.y - y) < 12).map((d) => d.r);
    expect(Math.max(...at(100, 100))).toBeGreaterThan(6); // centre: near the maximum size
    expect(at(4, 4)).toEqual([]); // far corner: no dots at all
    const sizes = new Set(dots.map((d) => d.r));
    expect(sizes.size).toBeGreaterThan(10); // a real gradient of sizes, not on/off
  });

  it("keeps every dot on the canvas and above the minimum size", () => {
    for (const d of dots) {
      expect(d.x).toBeGreaterThanOrEqual(0);
      expect(d.x).toBeLessThanOrEqual(200);
      expect(d.r).toBeGreaterThanOrEqual(0.7);
    }
  });
});

describe("other marks", () => {
  it("draws the dot-matrix G with one dot per X, fading toward the bottom-right", () => {
    const dots = dotLetter(100);
    expect(dots).toHaveLength(DOT_G.join("").split("X").length - 1);
    expect(dots[0].r).toBeGreaterThan(dots[dots.length - 1].r);
  });

  it("draws a spiral that winds outward and a loop with an arrowhead", () => {
    const points = spiralPath(50, 50, 3, 22, 1.7).slice(1).split("L").map((p) => p.split(" ").map(Number));
    const radius = (p: number[]) => Math.hypot(p[0] - 50, p[1] - 50);
    expect(radius(points[0])).toBeCloseTo(3, 0);
    expect(radius(points[points.length - 1])).toBeCloseTo(22, 0);
    const { ring, head } = loopPaths(50, 50, 17, 6.5);
    expect(ring).toMatch(/^M[\d. ]+A17 17 0 1 1 [\d. ]+$/);
    expect(head.endsWith("Z")).toBe(true);
  });
});
