# GifSuite roadmap

GifSuite is a **suite of GIF tools**: grab, convert, make and edit GIFs, with X/Twitter as the main market.
Features are ordered from easiest to hardest. Each one reuses what the one before it built.

Size: **S** = small (under a day) · **M** = medium · **L** = large (several sessions).

---

## How every feature ships

1. **Build.** Claude builds the feature and its automated tests.
2. **Automated check.** `npm run check` (typecheck, lint, unit tests, API tests) and `npm run test:e2e` (clicking through the real UI) must all pass for the **whole app**, not just the new feature, so nothing old breaks.
3. **Human test.** Claude gives you a short checklist (also kept in `TESTING.md`). You try the feature yourself.
4. **Commit.** Only after you approve: one commit per feature.
5. **Next.** Tick the feature off here and move on.

A feature is not done until a human has tested it.

---

## Phase 0: Foundation (before new features)

| # | Item | Size | What it gives us |
|---|---|---|---|
| 0.1 | ✅ **Test system** | M | Unit tests (Vitest) for the logic. API tests that run against a **fake X** and fixture videos, so tests never touch the real X and never flake. Browser tests (Playwright, using your installed Chrome, so there's no big download). One command runs everything. The API and browser tests only check behavior from the outside, so they prove the app still works after the Cloudflare move in 0.3. |
| 0.2 | ✅ **Security baseline** | S | Secrets only in `.env.local` / `.dev.vars` (never committed) with example templates. Server-only code can't end up in the browser. A pre-commit hook that **blocks commits containing secrets**. Security headers, including a Content Security Policy (CSP). A test that scans the built site for leaked secrets. Rate limits now use Cloudflare's `cf-connecting-ip`, which visitors can't fake (was `x-forwarded-for`). |
| 0.3 | ✅ **Move to Cloudflare** (staging is live at https://staging.gifsuite.com; deploys run from GitHub Actions, see DEPLOY.md) | L | Rebuild the plumbing, keeping every feature working (see *Deployment*): Next.js on **Workers** (OpenNext adapter), **D1** in place of the local SQLite file, **R2** in place of the local media folder, and a **Container** running ffmpeg, gif2webp and yt-dlp. Then deploy to a **staging** subdomain, so the real setup is proven long before launch. |
| 0.4 | ✅ **UI foundation** | M | **Satoshi** (downloaded from Fontshare, self-hosted). Design tokens for colors, spacing and type sizes. Shared buttons, inputs, cards and toasts. An app shell with a **Tools** menu, so each new tool slots in. |

## SEO landing pages (2026-10-15)

- ✅ Eight keyword landing pages live on gifsuite.com, one shared design (lib/landing.ts → components/marketing/LandingPage.tsx): twitter-gif-downloader, twitter-video-downloader, mp4-to-gif, video-to-gif, gif-to-mp4, gif-compressor, gif-resizer, giphy-downloader. Volumes in content/KEYWORDS.md. Next candidates: gif-maker (368k/mo, needs roadmap #5–8), reddit-video-downloader (after confirming Reddit works), gif-to-png, webp-to-gif (needs a WebP decoder).

## Waiting on you (owner to-do, 2026-10-12)

Things only you can do; Claude has done everything around them.

- [ ] **Google Search Console:** https://search.google.com/search-console → Add property → **Domain** → `gifsuite.com` → it offers Cloudflare automatic verification; accept. Then Sitemaps → submit `https://gifsuite.com/sitemap.xml`.
- [ ] **Bing Webmaster Tools:** https://www.bing.com/webmasters → "Import from Google Search Console" (after the step above). IndexNow already pings Bing on every deploy.
- [ ] **legal@gifsuite.com:** Cloudflare dashboard → gifsuite.com → Email → Email Routing → enable → route `legal@` to your Gmail. The legal pages already show this address.
- [ ] **Read the legal pages** (/terms, /privacy, /copyright). Written from what the site actually does, but not by a lawyer.
- [ ] **DMCA agent (US safe harbor, optional but recommended):** register a designated agent with the US Copyright Office ($6, https://www.copyright.gov/dmca-directory/), using legal@gifsuite.com.
- [ ] **Web Analytics token:** Cloudflare → Analytics & Logs → Web Analytics → Add site `gifsuite.com` (manual JS snippet) → send Claude the token. Same for staging if wanted.
- [ ] **gifsuite.app:** edit the GitHub deploy token to include the gifsuite.app zone (DEPLOY.md → "Adding gifsuite.app"); Claude then adds its redirect routes. It currently shows nothing.
- [ ] **Keyword research (free):** after Search Console, open Bing Webmaster Tools → Keyword Research to check search volumes for blog topics. (OpenSEO was set aside on 2026-10-15: it needs a paid DataForSEO top-up, $50 minimum. It's still downloaded in ~/open-seo if that changes.)
- [ ] **Blog reviews:** research for who-invented-the-gif, the-gif-patent-fight, how-gifs-learned-to-loop (tick claims, answer questions in `content/research/`); final read of three tip drafts (download-gif-from-giphy-and-tenor, gif-size-limits-by-platform — check the Discord and WhatsApp rows, gif-to-mp4). See `content/TOPICS.md`.
- [ ] **Staging checklists** in TESTING.md (any-link grab, public/private/NSFW, analytics), logo choice on /brand, and whether to commit `ios_app/` + the AGENTS.md change.

## Phase 1: Easy tools (reuse the existing ffmpeg converter)

| # | Feature | Size | Notes |
|---|---|---|---|
| 1 | ✅ **Upload & convert** | S/M | Upload a GIF, MP4, WebM or WebP and download it in any format and quality. Adds **secure uploads**: file type checked from the file's actual contents, size limits, ffprobe validation, and random file names. Every later tool uses this. |
| 2 | ✅ **Compress / resize** | S | Presets such as "Under 15 MB (X)", "Under 8 MB (Discord)" and "Under 1 MB", or a custom width. |
| 3 | ⏳ **Speed, reverse, boomerang** (built 2026-10-16: /tools/speed, /reverse-video, /reverse-gif, /gif-speed-changer; awaiting human test) | S | 0.25×–4× speed, play backwards, or forward-then-back loop. |
| 4 | ⏳ **Trim** (built 2026-10-16: /tools/trim, /trim-video, /gif-cutter; awaiting human test) | M | Pick a start and end on a live preview. The backend is easy; the slider UI is the work. |

## Phase 2: GIF maker

| # | Feature | Size | Notes |
|---|---|---|---|
| 5 | ⏳ **Photo → GIF** (built 2026-10-15 as part of the GIF maker, /tools/maker; awaiting human test) | M | One photo with an effect: zoom-in (Ken Burns), pan, pulse or shake. |
| 6 | ⏳ **Screenshots → GIF** (built 2026-10-15 as part of the GIF maker; awaiting human test) | M | Several images as a slideshow. Drag to reorder, set time per frame, optional crossfade. |
| 7 | ⏳ **Crop** (built 2026-10-16: /tools/crop, /gif-cropper, /video-cropper; awaiting human test) | M | Aspect presets (1:1, 16:9, 9:16) plus a drag box. |
| 8 | ⏳ **Text captions** (built 2026-10-16: /tools/captions, /add-text-to-gif, /gif-meme-maker; Anton and Comic Neue, both SIL OFL, in public/fonts/captions; awaiting human test) | M/L | Meme-style top/bottom text or free text, with a font, color and outline. **Caption fonts must be openly licensed (e.g. SIL OFL): the Satoshi license forbids offering it to users for their own content** (see `app/fonts/LICENSE.md`). |

## Phase 3: Launch prep → deploy v1

| # | Item | Size | Notes |
|---|---|---|---|
| 9 | ⏳ **Harden the X fetcher** (built 2026-10-16: retries with backoff, a D1-backed circuit breaker that falls back to yt-dlp, de-duplicated and capped requests, `/api/health`; awaiting review) | M | Request queue, retry with increasing waits, automatic pause when X errors, and a health check. |
| 10 | ⏳ **Bot protection** (built 2026-10-16: Turnstile on grab, uploads and edits, off until keys are set; needs the widget from the Cloudflare dashboard, see DEPLOY.md) | S | Cloudflare Turnstile (invisible CAPTCHA) on grab and upload, plus Cloudflare rate limiting. |
| 11 | ⏳ **Professional UI pass** (built 2026-10-16: home page with every tool and icons, trust strip, 1200×630 link-preview image on every page, Apple and app icons, web app manifest, branded error page; images via `npm run images`; awaiting review) | M | Landing page that shows off the suite, polished tool pages, mobile, empty and error states, favicon and link-preview image. |
| 12 | ✅ **Legal pages** (2026-10-12: /terms, /privacy, /copyright; contact legal@gifsuite.com) | S | Terms, privacy, and a **takedown/DMCA contact and process**. This is required, because the site publicly hosts other people's GIFs. |
| 13 | ✅ **Launch v1** (2026-10-12: gifsuite.com live and indexable, own database and bucket, www redirects, IndexNow on every deploy) | S | Point the main domain at production, then run the smoke tests against it. |

**Launch on your main domain when Phases 0–3 are done.** That's a real suite: grab + 8 tools + a polished UI + security. Staging has been live on Cloudflare since 0.3, so launch is mostly a DNS switch.

## Phase 4: After launch

| # | Feature | Size |
|---|---|---|
| 14 | ⏳ **Grab from any link** (built 2026-10-03, awaiting human test): direct GIF/MP4/WebM links on any site, pages that publish their GIF in link-preview tags (Giphy, Tenor, Imgur, Tumblr…), and everything else yt-dlp knows (Reddit, TikTok…). Adult sites are allowed by choice; the NSFW filter keeps them blurred and off the timeline. Animated WebP links aren't supported yet (ffmpeg can't read them). | M |
| 15 | **Video → GIF** from a long uploaded video, with a segment picker | M |
| 16 | **Screen recording → GIF** in the browser | M/L |
| 17 | **Search & tags** | M |
| 18 | **Trending page** from the `events` data | M |
| 19 | **Duplicate detection across reposts** (same video address → same file fingerprint → frames that look alike) | M/L |
| 20 | **Accounts, favorites, collections** (sign in with X) | L |
| 21 | **AI:** auto-tagging, smart search, caption generator for viral posts | L |
| 22 | **Official X API fallback**, once revenue justifies the cost | M |

---

## Deployment (all-in on Cloudflare)

```
visitor ──► Cloudflare edge (your domain, HTTPS, CDN, Turnstile, rate limits)
                │
                ▼
        Worker: Next.js app (OpenNext) ─┬─► D1 (database: gifs, events)
                                        ├─► R2 (media: source, previews, converted files)
                                        └─► Container: ffmpeg + gif2webp + yt-dlp
                                             (started on demand, reads/writes R2)
```

- **Worker** runs the pages and the API. It can't run ffmpeg itself, so heavy media work goes to the Container.
- **Container** is a small media service in a Docker image. It is only reachable from our Worker, never from the internet, and it sleeps when idle.
- **D1** is Cloudflare's SQLite, so the existing SQL mostly carries over. **R2** stores files, and Cloudflare serves them with free egress.
- **Cost:** Workers Paid plan ($5/month) is required for Containers. D1, R2 and Container usage are billed on top by usage, and are small at launch.
- **Local development:** `wrangler dev` simulates D1 and R2 on your Mac. The Container runs in Docker Desktop.

Setup, done in 0.3:
1. The domain's DNS must be on Cloudflare (skip if it's already there).
2. `npx wrangler login` (you run this; it opens a browser to sign in).
3. Claude creates the D1 database, the R2 bucket and the container config in `wrangler.jsonc`.
4. Secrets are set with `wrangler secret put NAME`. They're stored encrypted at Cloudflare, never in git, never in the image.
5. Deploy staging (e.g. `staging.yourdomain.com`), then production at launch.
6. Nightly D1 export as a backup. R2 is already durable.

**Known risks, checked in 0.3:**
- Requests to X come from Cloudflare's addresses, which X may treat differently. The fake-X tests don't cover that, so staging tests it against the real X.
- Container cold starts may add a few seconds to the *first* conversion after the service has been idle.

## Security rules (always on)

- Secrets live only in `.env.local` / `.dev.vars` locally and in `wrangler secret` in production. Both files are git-ignored; example files list the names with no values.
- Only `NEXT_PUBLIC_*` variables may ever reach the browser, and none of them are secret.
- Code that uses secrets starts with `import "server-only"`, so the build fails if the browser ever imports it.
- The pre-commit hook scans for keys and tokens and refuses the commit.
- Uploads are validated by their actual contents, stored under random names, and size- and time-limited. ffmpeg only ever reads our own files.
- Security headers: CSP, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`.
- Admin endpoints need a long random token. Rate limits apply everywhere, backed by Cloudflare's.
- Run `npm audit` before every deploy.

## Design (redesigned 2026-09-30)

- ✅ "Ink and sun": one dark theme, a single yellow, halftone dots as decoration, and a sunburst mark. The reference is the `/brand` page; artwork is generated by `npm run brand` from `lib/brand.mjs`.
- ✅ Phone layout: a menu replaces the header links below 640px, touch targets are at least 44px, and every page is tested at 320, 360 and 390px.
- ⏳ **Logo:** six options are on `/brand`. "Burst loop" is in use until you choose; swapping is one line in `components/shell/Logo.tsx` (and `npm run brand` for the tab icon).

## Blog (added 2026-09-30)

- ✅ `/blog` with SEO tags, structured data, sitemap and robots rules. Staging is hidden from search engines; only production (`ALLOW_INDEXING=1`) is indexed.
- ✅ Four tips posts published.
- The **history of the GIF** series is written through `content/BLOG_PLAYBOOK.md`: an AI loop does research, drafting and fact-checking, and a human approves twice. The queue is `content/TOPICS.md`.

## Safety and visibility (added 2026-10-02)

- ⏳ **Public/private toggle:** GIFs are public by default. A switch on the grab form, and for the grabber on the GIF page, takes a GIF off the timeline (the link keeps working, search engines skip it). Without accounts, "the grabber" is the browser that grabbed it, via an owner cookie. Built and auto-tested; awaiting your human test.
- ⏳ **NSFW filter:** gates the public timeline only, so grabbing, downloading and sharing never wait for it. X's "possibly sensitive" mark is applied straight away; otherwise an open-source model (nsfwjs) scans frames in our converter container after the grab, and the GIF joins the timeline once it passes (usually within a second; a sweep every 5 minutes retries anything unfinished). Sensitive GIFs are kept off the timeline, blurred until "Show anyway", and get no link preview. Admins can overrule with `POST /api/admin/nsfw`. Built and auto-tested; awaiting your human test.
- ⏳ **Cloudflare analytics:** every server event goes to Workers Analytics Engine (grab attempts record which site the link came from, to decide which sites to add next); page views through Cloudflare Web Analytics. `npm run analytics` prints a summary. Built and auto-tested; awaiting your human test and the Web Analytics site token (DEPLOY.md).
- Later: once accounts exist (#20), "private" can become truly private (only you), and the visibility switch moves to your account.

## Done
- ✅ X grabber (link → GIF), dedup per post, public timeline
- ✅ Downloads in GIF / MP4 / WebM / WebP at low / medium / high quality
- ✅ Post on X using the original GIF (X embeds it, "From @author")
