import { describe, expect, it } from "vitest";
import { findSecrets } from "../../scripts/scan-secrets.mjs";

type Finding = { file: string; line: number; rule: string };
const rules = (text: string, file = "src/file.ts") => (findSecrets(text, file) as Finding[]).map((f) => f.rule);

// Built from pieces so this test file itself never contains a real-looking secret.
const fake = {
  aws: "AKIA" + "Q3ZRT5KEY7XYZ4WB",
  github: "ghp_" + "a1B2c3D4e5F6g7H8i9J0k1L2m3N4o5P6q7R8",
  anthropic: "sk-ant-" + "api03-Zx8yWv7uTs6rQp5oNm4lKj3i",
  stripe: "sk_live_" + "51HqLmnOpQrStUvWx",
  random: "f3a9c1" + "7be24d8e90b1c5a6d7",
};

describe("findSecrets", () => {
  it.each([
    ["AWS access key", `const id = "${fake.aws}";`],
    ["GitHub token", `token ${fake.github}`],
    ["Anthropic API key", `ANTHROPIC=${fake.anthropic}`],
    ["Stripe live key", `stripe(${JSON.stringify(fake.stripe)})`],
    ["private key", "-----BEGIN RSA " + "PRIVATE KEY-----"],
    ["secret assignment", `ADMIN_TOKEN=${fake.random}`],
    ["secret assignment", `VISITOR_SALT="${fake.random}"`],
    ["hard-coded secret", `const config = { apiKey: "${fake.random}" };`],
    ["Cloudflare credential", `CLOUDFLARE_API_TOKEN=${fake.random}abcd`],
  ])("catches a %s", (rule, line) => {
    expect(rules(line)).toContain(rule);
  });

  it.each([
    "ADMIN_TOKEN=",
    'ADMIN_TOKEN: "test-admin-token-not-a-real-secret",',
    "ADMIN_TOKEN=your-long-random-token",
    "const token = process.env.ADMIN_TOKEN;",
    "VISITOR_SALT=${VISITOR_SALT}",
    'const password = "<your password here>";',
    `ADMIN_TOKEN=${fake.random} # secret-scan: allow`,
    "export const MAX_TOKEN_LENGTH = 24;",
  ])("ignores %s", (line) => {
    expect(rules(line)).toEqual([]);
  });

  it("refuses environment and key files, but allows the examples", () => {
    expect(rules("", ".env")).toHaveLength(1);
    expect(rules("", ".env.local")).toHaveLength(1);
    expect(rules("", ".dev.vars")).toHaveLength(1);
    expect(rules("", "certs/server.pem")).toHaveLength(1);
    expect(rules("", ".env.example")).toEqual([]);
    expect(rules("", ".dev.vars.example")).toEqual([]);
  });

  it("reports line numbers", () => {
    expect(findSecrets(`ok\nok\nADMIN_TOKEN=${fake.random}`, "a.ts")).toEqual([
      { file: "a.ts", line: 3, rule: "secret assignment" },
    ]);
  });
});
