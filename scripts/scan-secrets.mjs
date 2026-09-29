#!/usr/bin/env node
// Blocks secrets from entering git.
//   node scripts/scan-secrets.mjs           scan every tracked or new (non-ignored) file
//   node scripts/scan-secrets.mjs --staged  scan only what is about to be committed (pre-commit hook)
// A line containing "secret-scan: allow" is skipped (for documented false positives only).
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const RULES = [
  ["private key", /-----BEGIN (?:RSA |EC |DSA |OPENSSH |PGP |ENCRYPTED )?PRIVATE KEY-----/],
  ["AWS access key", /\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/],
  ["GitHub token", /\b(?:gh[pousr]_[A-Za-z0-9]{36,}|github_pat_[A-Za-z0-9_]{40,})\b/],
  ["Anthropic API key", /\bsk-ant-[A-Za-z0-9_-]{20,}/],
  ["OpenAI API key", /\bsk-(?:proj-|svcacct-)?[A-Za-z0-9_-]{32,}/],
  ["Slack token", /\bxox[abposr]-[A-Za-z0-9-]{10,}/],
  ["Stripe live key", /\b(?:sk|rk)_live_[A-Za-z0-9]{16,}/],
  ["Google API key", /\bAIza[0-9A-Za-z_-]{35}\b/],
  ["Cloudflare credential", /\bCLOUDFLARE_(?:API_TOKEN|API_KEY|ACCOUNT_API_TOKEN)\s*[=:]\s*["']?[A-Za-z0-9_-]{20,}/],
  // NAME=value lines like the ones in .env files, for any secret-looking name.
  ["secret assignment", /\b[A-Z0-9_]*(?:SECRET|TOKEN|PASSWORD|PASSWD|API_KEY|PRIVATE_KEY|SALT)[A-Z0-9_]*\s*=\s*["']?([^\s"'#]{12,})/],
  // apiKey: "…", password = '…', "token": "…" in code or JSON.
  ["hard-coded secret", /\b(?:api[_-]?key|secret|token|password|passwd|auth[_-]?token|client[_-]?secret)["']?\s*[:=]\s*["']([^"'\s]{16,})["']/i],
];

// Values that look like secrets but clearly aren't.
const PLACEHOLDER = /test|example|not-a-real|dummy|placeholder|changeme|your[-_]|xxxx|<[^>]*>|\$\{|process\.env|\*\*\*/i;

const FORBIDDEN_FILES = [
  [/(^|\/)\.env(\..+)?$/, (f) => !/\.example$/.test(f), "environment file"],
  [/(^|\/)\.dev\.vars(\..+)?$/, (f) => !/\.example$/.test(f), "Wrangler secrets file"],
  [/\.(pem|key|p12|pfx)$/, () => true, "key file"],
  [/(^|\/)id_(rsa|ed25519|ecdsa)$/, () => true, "SSH key"],
];

const SKIP = /(^|\/)(node_modules|\.next[^/]*|\.test-data|test-results|playwright-report)\/|package-lock\.json$|\.(png|jpe?g|gif|webp|mp4|webm|ico|woff2?|ttf|otf|zip)$/;

/** Returns every finding in `text`, which came from `file`. */
export function findSecrets(text, file = "") {
  const findings = [];
  for (const [pattern, applies, what] of FORBIDDEN_FILES) {
    if (pattern.test(file) && applies(file)) findings.push({ file, line: 0, rule: `${what} must never be committed` });
  }
  text.split("\n").forEach((line, i) => {
    if (line.includes("secret-scan: allow")) return;
    for (const [rule, pattern] of RULES) {
      const m = line.match(pattern);
      if (!m) continue;
      const value = m[1] ?? m[0];
      if (PLACEHOLDER.test(value)) continue;
      findings.push({ file, line: i + 1, rule });
      break;
    }
  });
  return findings;
}

function git(...args) {
  return execFileSync("git", args, { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
}

function main() {
  const staged = process.argv.includes("--staged");
  const files = (staged
    ? git("diff", "--cached", "--name-only", "--diff-filter=ACMR")
    : git("ls-files", "--cached", "--others", "--exclude-standard")
  ).split("\n").filter(Boolean);

  const findings = [];
  for (const file of files) {
    if (SKIP.test(file)) continue;
    // In --staged mode, scan the staged version of the file, not the working copy.
    let text;
    try {
      text = staged ? git("show", `:${file}`) : fs.readFileSync(file, "utf8");
    } catch {
      continue;
    }
    if (text.includes("\u0000")) continue; // binary
    findings.push(...findSecrets(text, file));
  }

  if (findings.length) {
    console.error(`\n✋ Possible secrets found${staged ? " — nothing was committed" : ""}:\n`);
    for (const f of findings) console.error(`  ${f.file}${f.line ? `:${f.line}` : ""}  ${f.rule}`);
    console.error("\nMove secrets to .env.local / .dev.vars (git-ignored) or `wrangler secret put`.");
    console.error('If a line is a false positive, add the comment "secret-scan: allow" to it.\n');
    process.exit(1);
  }
  console.log(`secret scan: ${files.length} files clean`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
