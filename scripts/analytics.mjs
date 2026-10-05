// Summarises GifSuite's server events from Cloudflare Workers Analytics Engine.
//
//   npm run analytics                      staging, last 7 days
//   npm run analytics -- production 30     production, last 30 days
//
// Needs a Cloudflare API token with "Account Analytics: Read" in CF_ANALYTICS_TOKEN (keep it in
// .env.local or your shell, never in git). Column names follow the layout in lib/analytics.ts.
import fs from "node:fs";

const ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID ?? "20b8ba24d09e2641751595eb779909f1";
const [envName = "staging", daysArg = "7"] = process.argv.slice(2);
const DATASETS = { production: "gifsuite_events", staging: "gifsuite_events_staging" };
const dataset = DATASETS[envName];
const days = Number(daysArg);
if (!dataset || !Number.isInteger(days) || days < 1 || days > 90) {
  console.error("Usage: npm run analytics -- [staging|production] [days 1–90]");
  process.exit(1);
}

// Read the token from .env.local if it isn't already in the environment.
let token = process.env.CF_ANALYTICS_TOKEN;
if (!token && fs.existsSync(".env.local")) {
  token = fs.readFileSync(".env.local", "utf8").match(/^CF_ANALYTICS_TOKEN=(.+)$/m)?.[1]?.trim(); // secret-scan: allow (reads the token from .env.local; no value here)
}
if (!token) {
  console.error("Set CF_ANALYTICS_TOKEN (a Cloudflare API token with Account Analytics: Read), e.g. in .env.local.");
  process.exit(1);
}

async function sql(query) {
  const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/analytics_engine/sql`, {
    method: "POST",
    headers: { authorization: `Bearer ${token}` },
    body: query,
  });
  if (!res.ok) throw new Error(`Analytics Engine HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`);
  return (await res.json()).data;
}

// Analytics Engine samples at high volume; _sample_interval weights each row back up.
const since = `timestamp > NOW() - INTERVAL '${days}' DAY`;
const sections = [
  ["Events", `SELECT blob1 AS event, blob4 AS outcome, SUM(_sample_interval) AS count, ROUND(AVG(double2)) AS avg_ms
    FROM ${dataset} WHERE ${since} GROUP BY event, outcome ORDER BY count DESC`],
  ["Grab attempts by site (where pasted links come from)", `SELECT blob5 AS site, blob4 AS outcome, SUM(_sample_interval) AS count
    FROM ${dataset} WHERE ${since} AND blob1 = 'grab' GROUP BY site, outcome ORDER BY count DESC LIMIT 25`],
  ["Why grabs failed", `SELECT blob3 AS reason, SUM(_sample_interval) AS count
    FROM ${dataset} WHERE ${since} AND blob1 = 'grab' AND blob4 = 'error' GROUP BY reason ORDER BY count DESC LIMIT 15`],
  ["Downloads and tool use by setting", `SELECT blob1 AS event, blob3 AS setting, SUM(_sample_interval) AS count
    FROM ${dataset} WHERE ${since} AND blob1 IN ('download', 'convert', 'compress') GROUP BY event, setting ORDER BY count DESC LIMIT 20`],
  ["NSFW checks", `SELECT blob5 AS source, blob4 AS outcome, SUM(_sample_interval) AS count, ROUND(AVG(double5), 3) AS avg_score
    FROM ${dataset} WHERE ${since} AND blob1 = 'nsfw_check' GROUP BY source, outcome ORDER BY count DESC`],
  ["Countries", `SELECT blob6 AS country, SUM(_sample_interval) AS events, COUNT(DISTINCT blob7) AS visitor_days
    FROM ${dataset} WHERE ${since} AND blob6 != '' GROUP BY country ORDER BY events DESC LIMIT 15`],
  ["Devices", `SELECT blob8 AS device, SUM(_sample_interval) AS events
    FROM ${dataset} WHERE ${since} GROUP BY device ORDER BY events DESC`],
];

console.log(`GifSuite analytics: ${envName}, last ${days} day(s). Page views are in the Cloudflare dashboard → Web Analytics.\n`);
for (const [title, query] of sections) {
  console.log(`── ${title}`);
  const rows = await sql(`${query} FORMAT JSON`);
  if (rows.length === 0) console.log("  (nothing yet)");
  else console.table(rows);
}
