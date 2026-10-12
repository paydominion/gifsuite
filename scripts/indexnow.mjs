// Tells IndexNow search engines (Bing, Yandex, Seznam, Naver…) about every page in the sitemap, so
// new and updated pages are crawled within minutes. Runs after each production deploy.
//   node scripts/indexnow.mjs https://gifsuite.com
// The key is public by design: IndexNow checks that https://<site>/<key>.txt contains it.
const KEY = "e3f003a37ca246f01c7984810dec5b17";
const site = (process.argv[2] ?? "https://gifsuite.com").replace(/\/$/, "");
const host = new URL(site).host;

const xml = await (await fetch(`${site}/sitemap.xml`)).text();
const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]).filter((u) => new URL(u).host === host);
if (urls.length === 0) {
  console.log("indexnow: no URLs in the sitemap; nothing sent");
  process.exit(0);
}
const res = await fetch("https://api.indexnow.org/indexnow", {
  method: "POST",
  headers: { "content-type": "application/json; charset=utf-8" },
  body: JSON.stringify({ host, key: KEY, keyLocation: `${site}/${KEY}.txt`, urlList: urls }),
});
// 200 and 202 both mean accepted. A failure here never fails a deploy.
console.log(`indexnow: sent ${urls.length} URLs, HTTP ${res.status}`);
