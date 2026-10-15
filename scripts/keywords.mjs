// Keyword research with the Keywords Everywhere API: monthly searches, cost per click and
// competition for keywords, so blog topics are picked by real demand.
//
//   npm run keywords -- "gif to mp4" "mp4 to gif"   check these keywords
//   npm run keywords -- --topics                     check every key phrase in content/TOPICS.md
//   npm run keywords -- --ideas "gif"                related searches, with their volumes
//   npm run keywords -- --credits                    credits left
//   Add --country gb (default us; "" = global).
//
// Needs KEYWORDS_EVERYWHERE_API_KEY in .env.local (git-ignored). One credit = one keyword's data.
import fs from "node:fs";

const API = "https://api.keywordseverywhere.com/v1";
const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const option = (name, fallback) => (args.includes(name) ? args[args.indexOf(name) + 1] ?? fallback : fallback);
const country = option("--country", "us");
const words = args.filter((a, i) => !a.startsWith("--") && !["--country", "--ideas"].includes(args[i - 1]));

let key = process.env.KEYWORDS_EVERYWHERE_API_KEY;
if (!key && fs.existsSync(".env.local")) {
  key = fs.readFileSync(".env.local", "utf8").match(/^KEYWORDS_EVERYWHERE_API_KEY=(.+)$/m)?.[1]?.trim(); // secret-scan: allow (reads the key from .env.local; no value here)
}
if (!key) {
  console.error("Set KEYWORDS_EVERYWHERE_API_KEY in .env.local.");
  process.exit(1);
}

async function call(path, form) {
  const res = await fetch(`${API}${path}`, {
    method: form ? "POST" : "GET",
    headers: { authorization: `Bearer ${key}`, accept: "application/json" },
    body: form,
  });
  if (!res.ok) throw new Error(`Keywords Everywhere HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return res.json();
}

/** Volume, CPC, competition and 12-month trend for up to 100 keywords per request. */
async function keywordData(list) {
  const rows = [];
  for (let i = 0; i < list.length; i += 100) {
    const form = new URLSearchParams({ dataSource: "gkp", country, currency: "USD" });
    for (const kw of list.slice(i, i + 100)) form.append("kw[]", kw);
    rows.push(...(await call("/get_keyword_data", form)).data);
  }
  return rows;
}

function trend(points = []) {
  if (points.length < 6) return "";
  const avg = (xs) => xs.reduce((a, p) => a + p.value, 0) / xs.length || 0;
  const recent = avg(points.slice(-3));
  const earlier = avg(points.slice(0, 3));
  if (!earlier) return "";
  const change = Math.round(((recent - earlier) / earlier) * 100);
  return change > 15 ? `↑ ${change}%` : change < -15 ? `↓ ${Math.abs(change)}%` : "steady";
}

function print(rows, extra = {}) {
  rows.sort((a, b) => b.vol - a.vol);
  console.table(
    rows.map((r) => ({
      keyword: r.keyword,
      "searches/mo": r.vol,
      cpc: `$${r.cpc?.value ?? "0"}`,
      competition: Number(r.competition ?? 0).toFixed(2),
      "trend (12 mo)": trend(r.trend),
      ...(extra[r.keyword] ? { topic: extra[r.keyword] } : {}),
    })),
  );
}

if (flag("--credits")) {
  console.log(`credits left: ${(await call("/account/credits"))[0]}`);
} else if (flag("--topics")) {
  // Every "key phrase:" in the topic queue, with its topic slug.
  const text = fs.readFileSync("content/TOPICS.md", "utf8");
  const topics = {};
  for (const block of text.split(/^### /m).slice(1)) {
    const slug = block.split("\n")[0].trim();
    const phrase = block.match(/^- key phrase: (.+)$/m)?.[1]?.trim();
    const status = block.match(/^- status: (.+)$/m)?.[1]?.trim();
    if (phrase) topics[phrase] = `${slug} (${status})`;
  }
  print(await keywordData(Object.keys(topics)), topics);
} else if (flag("--ideas")) {
  const seed = option("--ideas", "");
  if (!seed) throw new Error('Give a seed: --ideas "gif"');
  const form = new URLSearchParams({ keyword: seed, num: "50" });
  const [related, pasf] = await Promise.all([call("/get_related_keywords", form), call("/get_pasf_keywords", form)]);
  const ideas = [...new Set([...(related.data ?? []), ...(pasf.data ?? [])])];
  if (ideas.length === 0) console.log("no ideas returned");
  else print(await keywordData(ideas));
} else if (words.length) {
  print(await keywordData(words));
} else {
  console.log('Usage: npm run keywords -- "keyword" … | --topics | --ideas "seed" | --credits  [--country us]');
}
