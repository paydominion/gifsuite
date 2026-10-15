import path from "node:path";
import { expect, test } from "@playwright/test";
import { LANDINGS } from "../../lib/landing";

const fixture = (name: string) => path.join(process.cwd(), "tests", ".fixtures", name);
const cspViolations: string[] = [];

test.beforeEach(async ({ context, page }) => {
  await context.route(/^https:\/\/(x|twitter)\.com\//, (route) => route.fulfill({ body: "fake X page" }));
  cspViolations.length = 0;
  page.on("console", (msg) => {
    if (/Content Security Policy|Refused to (load|execute|apply)/i.test(msg.text())) cspViolations.push(msg.text());
  });
});
test.afterEach(() => expect(cspViolations, "CSP blocked part of the app").toEqual([]));

test("every landing page has its tool, one heading, an FAQ and structured data", async ({ page }) => {
  for (const l of LANDINGS) {
    await page.goto(`/${l.slug}`);
    await expect(page.getByRole("heading", { level: 1 }), l.slug).toHaveText(l.h1);
    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
    await expect(page).toHaveTitle(`${l.title} · GifSuite`);
    // The working tool is on the page.
    const tool = l.tool.kind === "grab" ? page.getByLabel("GIF or post link") : page.locator('input[type="file"]');
    await expect(tool, l.slug).toHaveCount(1);
    // Every question is there, and opens.
    await expect(page.locator("details")).toHaveCount(l.faq.length);
    await page.getByText(l.faq[0][0]).click();
    await expect(page.getByText(l.faq[0][1])).toBeVisible();
    // Structured data for search engines.
    const jsonLd = JSON.parse((await page.locator('script[type="application/ld+json"]').textContent())!);
    expect(jsonLd.map((d: { "@type": string }) => d["@type"])).toEqual(["WebApplication", "FAQPage"]);
    expect(jsonLd[1].mainEntity).toHaveLength(l.faq.length);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", new RegExp(`/${l.slug}$`));
  }
});

test("MP4 to GIF opens with GIF chosen and converts an MP4", async ({ page }) => {
  await page.goto("/mp4-to-gif");
  await expect(page.getByRole("radiogroup", { name: "Format" }).getByRole("radio", { name: "GIF" })).toHaveAttribute("aria-checked", "true");
  await page.locator('input[type="file"]').setInputFiles(fixture("dog.mp4"));
  await page.getByRole("radiogroup", { name: "Quality" }).getByRole("radio", { name: "Low" }).click();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Convert & download" }).click();
  expect((await download).suggestedFilename()).toBe("dog-low.gif");
});

test("GIF to MP4 opens with MP4 chosen; the resizer opens at 480px", async ({ page }) => {
  await page.goto("/gif-to-mp4");
  await expect(page.getByRole("radiogroup", { name: "Format" }).getByRole("radio", { name: "MP4" })).toHaveAttribute("aria-checked", "true");
  await page.goto("/gif-resizer");
  await expect(page.getByRole("radiogroup", { name: "Max width" }).getByRole("radio", { name: "480px" })).toHaveAttribute("aria-checked", "true");
});

test("the Twitter GIF downloader grabs a post", async ({ page }) => {
  await page.goto("/twitter-gif-downloader");
  await page.getByLabel("GIF or post link").fill("https://x.com/uiuser/status/115");
  await page.getByRole("button", { name: "Grab GIF" }).click();
  await expect(page).toHaveURL(/\/g\/[A-Za-z0-9]{10}$/);
});

test("every page links to every landing page from the footer, and related tools link onward", async ({ page }) => {
  await page.goto("/blog");
  const popular = page.getByRole("navigation", { name: "Popular tools" });
  await expect(popular.getByRole("link")).toHaveCount(LANDINGS.length);
  await popular.getByRole("link", { name: "GIF compressor" }).click();
  await expect(page).toHaveURL("/gif-compressor");
  await page.getByRole("main").getByRole("link", { name: /GIF resizer/ }).click();
  await expect(page).toHaveURL("/gif-resizer");
});
