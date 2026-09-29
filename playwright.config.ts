import { defineConfig } from "@playwright/test";

// The test app gets its own port, build folder and data folder, and talks to a
// local fake X, so it never touches the real X or the data from `npm run dev`.
const APP_PORT = 3299;
const FAKE_X_PORT = 3298;

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
      command: `rm -rf .test-data && npx next dev -p ${APP_PORT}`,
      url: `http://localhost:${APP_PORT}/api/gifs`,
      timeout: 180_000,
      env: {
        DATA_DIR: ".test-data",
        NEXT_DIST_DIR: ".next-test",
        X_SYNDICATION_URL: `http://127.0.0.1:${FAKE_X_PORT}/tweet-result`,
        X_MEDIA_HOSTS: `127.0.0.1:${FAKE_X_PORT}`,
        YTDLP_PATH: "false", // the fallback always fails in tests, so "X is down" is predictable
        ADMIN_TOKEN: "test-admin-token", // test-only value, not a secret
        AUTO_HIDE_REPORTS: "3",
      },
    },
  ],
});
