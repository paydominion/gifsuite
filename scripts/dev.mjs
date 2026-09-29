#!/usr/bin/env node
// `npm run dev`: applies database migrations to the local D1, then runs the media processor
// and the Next.js dev server together. Ctrl+C stops both.
import { spawn, execFileSync } from "node:child_process";

const PORT = process.env.PORT ?? "3217";

execFileSync("npx", ["wrangler", "d1", "migrations", "apply", "DB", "--local", "--env", "dev"], { stdio: "inherit" });

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
