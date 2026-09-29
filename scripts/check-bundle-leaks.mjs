#!/usr/bin/env node
// Builds the app with a unique marker in every secret, then scans everything a
// browser can download (the client bundle) for those markers and for server-only code.
import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const DIST = ".next-leakcheck";
const SECRETS = ["ADMIN_TOKEN", "VISITOR_SALT"];
const markers = Object.fromEntries(SECRETS.map((name) => [name, `LEAKCHECK_${name}_${crypto.randomBytes(8).toString("hex")}`]));

// Code that only belongs on the server. Seeing it in the browser bundle means a server module leaked.
const SERVER_ONLY = ["node:sqlite", "child_process", "timingSafeEqual", "cdn.syndication.twimg.com", "gif2webp"];

console.log("Building with marker secrets…");
fs.rmSync(DIST, { recursive: true, force: true });
execFileSync("npx", ["next", "build"], {
  stdio: ["ignore", "ignore", "inherit"],
  env: { ...process.env, ...markers, NEXT_DIST_DIR: DIST, DATA_DIR: fs.mkdtempSync(path.join(os.tmpdir(), "leakcheck-")) },
});

const clientDir = path.join(DIST, "static");
const problems = [];
let scanned = 0;
for (const file of fs.readdirSync(clientDir, { recursive: true })) {
  const full = path.join(clientDir, file);
  if (!fs.statSync(full).isFile()) continue;
  const text = fs.readFileSync(full, "utf8");
  scanned++;
  for (const [name, marker] of Object.entries(markers)) {
    if (text.includes(marker)) problems.push(`${file}: contains the value of ${name}`);
    if (text.includes(name)) problems.push(`${file}: mentions ${name}`);
  }
  for (const needle of SERVER_ONLY) if (text.includes(needle)) problems.push(`${file}: contains server-only code (${needle})`);
}
fs.rmSync(DIST, { recursive: true, force: true });

if (problems.length) {
  console.error(`\n✋ The browser bundle leaks server data:\n${problems.map((p) => `  ${p}`).join("\n")}\n`);
  process.exit(1);
}
console.log(`bundle leak check: ${scanned} client files clean`);
