# Testing GifSuite

## Commands

| Command | What it runs | Time |
|---|---|---|
| `npm test` | Unit tests only (Vitest): URL parsing, conversion settings, ranges, rate limits, secret scanner | ~1s |
| `npm run scan:secrets` | Scans every file in the repo for keys, tokens and `.env` files | ~1s |
| `npm run check` | Secret scan + typecheck + lint + unit tests + API tests. **Run before every commit.** | ~3 min |
| `npm run test:e2e` | Browser tests: clicks through the real site in Chrome (headless) | ~3 min |
| `npm run check:leaks` | Builds the site with marker secrets and checks the browser bundle for leaks | ~30s |
| `npm run check:all` | Everything above | ~6 min |

`npx playwright test --project=e2e --headed` shows the browser while the tests run.

## How it works

- **Unit tests** (`tests/unit`) check small pieces of logic with no server.
- **API tests** (`tests/api`) and **browser tests** (`tests/e2e`) build the app exactly as it deploys (`opennextjs-cloudflare build`) and run it in **Cloudflare's own Worker runtime** (`wrangler dev --env test`) on port **3299**, with a local D1 database and R2 bucket in `.test-data` (wiped every run). So they check what gets deployed, including the strict Content Security Policy, without touching Cloudflare, your real data or your `npm run dev` server.
- A test copy of the **media processor** runs on port **3296** (`npm run dev` uses 3297).
- **Fake X** (`tests/fake-x/server.mjs`, port **3298**) stands in for X. It serves test posts and small videos made with ffmpeg, so tests never call the real X and give the same result every time. Its test posts:

  | Post | Behaves like |
  |---|---|
  | 111, 112, 115, 117 | a normal GIF post |
  | 113, 116 | a GIF post that tests delete mid-test |
  | 114 | a photo first, then a 640px GIF |
  | 200 | text only, no media |
  | 405 | an unavailable post |
  | 500 | X being down |
  | 600 | a video that's too long |
  | any other ID | a post that doesn't exist |

- The test-only settings live in the `test` environment of `wrangler.jsonc`: `X_SYNDICATION_URL`, `X_MEDIA_HOSTS`, `PROCESSOR_URL`, `TRUST_FORWARDED_FOR` and a test admin token. Production never sets them.

## Rules for new features

1. Every feature ships with tests. Pure logic gets unit tests, endpoints get API tests, and anything a user clicks gets a browser test.
2. A test must own its data: grab a fake post only it uses, or don't depend on "created: true".
3. `npm run check:all` must be fully green before the human test.

---

## Human test checklists

### 0.1 Test system
- [ ] Run `npm run check:all` in `~/gifsuite`. It should end with `58 passed` (unit), `53 passed` (API + browser) and "client files clean", with no failures.
- [ ] Run `npx playwright test --project=e2e --headed` and watch Chrome grab a GIF, download it, and open the X post box.
- [ ] Optional: in `processor/presets.mjs`, change `maxWidth: 320` to `300` and run `npm run check`. It should **fail**. Then change it back.
- [ ] `npm run dev` on port 3217 still works normally while tests run.

### 0.2 Security baseline
- [ ] Try to commit a secret: `echo "ADMIN_TOKEN=f3a9c17be24d8e90b1c5a6d7" > probe.txt && git add probe.txt && git commit -m test`. It should be **blocked**. Then run `git rm --cached probe.txt && rm probe.txt`. <!-- secret-scan: allow -->
- [ ] `cp .env.example .env.local`, fill in values, and check `git status` doesn't list `.env.local`.
- [ ] Open the site and check the browser DevTools console shows no "Content Security Policy" errors while you grab, download and post.
- [ ] `npm run check:leaks` ends with "client files clean".

### 0.3 Move to Cloudflare
- [ ] `npm run dev` starts **both** the processor and the site, and http://localhost:3217 loads.
- [ ] Grab a real X GIF link, then download it as Low GIF and High WebP. Both files open.
- [ ] Stop and restart `npm run dev`: the GIF is still on the timeline (local D1 and R2 keep data in `.wrangler/`).
- [ ] Docker Desktop running: `docker build -t gifsuite-processor processor/` succeeds (this is the image Cloudflare runs).
- [ ] Staging (after your `npx wrangler login` and the steps in `DEPLOY.md`): grab a real X link on `staging.yourdomain.com`.

### Current app (regression, check before each launch)
- [ ] Paste an X GIF link → the GIF page opens, the video plays, and the author is shown.
- [ ] Downloads: Low, Medium and High each give GIF, MP4, WebM and WebP files that open.
- [ ] Post on X opens X with the original GIF in the preview ("From @author").
- [ ] Timeline on the home page shows the new GIF; clicking it opens its page.
