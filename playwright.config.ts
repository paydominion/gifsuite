import { defineConfig } from "@playwright/test";

// The test app runs in Cloudflare's own Worker runtime (`wrangler dev --env test`) with local
// D1 and R2 in .test-data, the media processor as a plain process, and a fake X, so tests
// never touch the real X, Cloudflare, or the data from `npm run dev`.
const APP_PORT = 3299;
const FAKE_X_PORT = 3298;
const PROCESSOR_PORT = 3296; // not 3297, which `npm run dev` uses
const STATE = ".test-data/wrangler";

export default defineConfig({
  testDir: "tests",
  // One shared server with real state: run in a fixed order, one at a time.
  fullyParallel: false,
  workers: 1,
  timeout: 90_000,
  expect: { timeout: 15_000 },
  reporter: [["list"]],
  use: { baseURL: `http://localhost:${APP_PORT}` },
  projects: [
    { name: "api", testDir: "tests/api" },
    // Uses the Chrome already installed on this Mac, so Playwright needs no browser download.
    { name: "e2e", testDir: "tests/e2e", use: { channel: "chrome", headless: true } },
  ],
  webServer: [
    {
      command: "node tests/fake-x/server.mjs",
      url: `http://127.0.0.1:${FAKE_X_PORT}/health`,
      env: { FAKE_X_PORT: String(FAKE_X_PORT) },
      timeout: 120_000,
    },
    {
      command: "node processor/server.mjs",
      url: `http://127.0.0.1:${PROCESSOR_PORT}/health`,
      // The yt-dlp fallback always fails in tests, so "X is down" is predictable.
      env: { PORT: String(PROCESSOR_PORT), HOST: "127.0.0.1", YTDLP_PATH: "false" },
    },
    {
      // A production build, so tests check exactly what gets deployed (including the strict CSP).
      command: [
        "rm -rf .test-data",
        "npx opennextjs-cloudflare build",
        `npx wrangler d1 migrations apply DB --local --env test --persist-to ${STATE}`,
        `npx wrangler dev --env test --port ${APP_PORT} --ip 127.0.0.1 --persist-to ${STATE} --log-level warn`,
      ].join(" && "),
      url: `http://localhost:${APP_PORT}/api/gifs`,
      timeout: 600_000,
    },
  ],
});
