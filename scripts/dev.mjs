#!/usr/bin/env node
// `npm run dev`: applies database migrations to the local D1, builds the blog posts (and rebuilds
// them when they change), then runs the media processor and the Next.js dev server together.
// Ctrl+C stops everything.
import { spawn, execFileSync } from "node:child_process";
import fs from "node:fs";

const PORT = process.env.PORT ?? "3217";

execFileSync("npx", ["wrangler", "d1", "migrations", "apply", "DB", "--local", "--env", "dev"], { stdio: "inherit" });

// Blog posts: build them now (drafts included, so you can preview), and again whenever one changes.
const buildContent = () => {
  try {
    execFileSync("node", ["scripts/build-content.mjs", "--drafts"], { stdio: "inherit" });
  } catch {
    // The builder already printed what to fix; keep the server running.
  }
};
buildContent();
let pending;
fs.watch("content/blog", () => {
  clearTimeout(pending);
  pending = setTimeout(buildContent, 200);
});

const children = [
  spawn("node", ["processor/server.mjs"], {
    stdio: "inherit",
    env: { ...process.env, PORT: "3297", HOST: "127.0.0.1" },
  }),
  spawn("npx", ["next", "dev", "-p", PORT], { stdio: "inherit" }),
];

const stop = () => children.forEach((c) => c.kill("SIGTERM"));
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
for (const child of children) child.on("exit", (code) => {
  stop();
  process.exitCode = code ?? 0;
});
