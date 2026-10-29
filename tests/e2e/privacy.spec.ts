import { expect, test } from "@playwright/test";
import { grabId, waitForCheck } from "../helpers";

const cspViolations: string[] = [];

test.beforeEach(async ({ context, page }) => {
  await context.route(/^https:\/\/(x|twitter)\.com\//, (route) => route.fulfill({ body: "fake X page" }));
  cspViolations.length = 0;
  page.on("console", (msg) => {
    if (/Content Security Policy|Refused to (load|execute|apply)/i.test(msg.text())) cspViolations.push(msg.text());
  });
});

test.afterEach(() => {
  expect(cspViolations, "CSP blocked part of the app").toEqual([]);
});

test("grab a GIF as private, then make it public from its page", async ({ page }) => {
  await page.goto("/");
  // A checkbox on the grab form (it applies when you grab), a switch on the GIF's page (it applies at once).
  const toggle = page.getByRole("checkbox", { name: /Show on the public timeline/ });
  await expect(toggle).toBeChecked(); // public by default
  await toggle.click({ force: true });
  await expect(toggle).not.toBeChecked();
  await expect(page.getByText("Private: only people with the link can see it.")).toBeVisible();

  await page.getByLabel("GIF or post link").fill("https://x.com/uiprivate/status/121");
  await page.getByRole("button", { name: "Grab GIF" }).click();
  await expect(page).toHaveURL(/\/g\/[A-Za-z0-9]{10}$/);
  const id = page.url().split("/").pop()!;

  // Not on the timeline yet.
  await page.goto("/");
  await expect(page.locator(`a[href="/g/${id}"]`)).toHaveCount(0);

  // The grabber sees the switch on the GIF's page and turns it on.
  await page.goto(`/g/${id}`);
  const pageToggle = page.getByRole("switch", { name: /Show on the public timeline/ });
  await expect(pageToggle).toHaveAttribute("aria-checked", "false");
  await pageToggle.click();
  await expect(pageToggle).toHaveAttribute("aria-checked", "true");
  await expect(page.getByText("It joins Latest GIFs after a quick safety check.")).toBeVisible();

  await waitForCheck(id); // runs in the background after the switch
  await page.goto("/");
  await expect(page.locator(`a[href="/g/${id}"]`).first()).toBeVisible();
});

test("other visitors don't get the switch", async ({ page, request }) => {
  const id = await grabId(request, "115", "uiuser"); // grabbed by a different "browser"
  await page.goto(`/g/${id}`);
  await expect(page.locator("video")).toBeVisible();
  await expect(page.getByRole("switch")).toHaveCount(0);
});

test("a sensitive GIF is blurred until the visitor chooses to see it", async ({ page, request }) => {
  const id = await grabId(request, "122", "uispicy");
  await page.goto(`/g/${id}`);
  await expect(page.getByText("Sensitive content")).toBeVisible();
  await expect(page.locator("video")).toHaveCount(0); // not even loaded yet

  await page.getByRole("button", { name: "Show the GIF" }).click();
  await expect(page.locator("video")).toBeVisible();
  await expect(page.getByText("Sensitive content")).toHaveCount(0);
});
