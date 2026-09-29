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
| 0.1 | **Test system** | M | Unit tests (Vitest) for the logic. API tests that run against a **fake X** and fixture videos, so tests never touch the real X and never flake. Browser tests (Playwright, using your installed Chrome, so there's no big download). One command runs everything. The API and browser tests only check behavior from the outside, so they prove the app still works after the Cloudflare move in 0.3. |
| 0.2 | **Security baseline** | S | Secrets only in `.env.local` / `.dev.vars` (never committed) with example templates. Server-only code can't end up in the browser. A pre-commit hook that **blocks commits containing secrets**. Security headers, including a Content Security Policy (CSP). A test that scans the built site for leaked secrets. **Known issue from 0.1:** rate limits trust the `x-forwarded-for` header, which anyone can fake; use Cloudflare's `cf-connecting-ip` instead. |
| 0.3 | **Move to Cloudflare** | L | Rebuild the plumbing, keeping every feature working (see *Deployment*): Next.js on **Workers** (OpenNext adapter), **D1** in place of the local SQLite file, **R2** in place of the local media folder, and a **Container** running ffmpeg, gif2webp and yt-dlp. Then deploy to a **staging** subdomain, so the real setup is proven long before launch. |
| 0.4 | **UI foundation** | M | **Satoshi** (downloaded from Fontshare, self-hosted). Design tokens for colors, spacing and type sizes. Shared buttons, inputs, cards and toasts. An app shell with a **Tools** menu, so each new tool slots in. |

## Phase 1: Easy tools (reuse the existing ffmpeg converter)

| # | Feature | Size | Notes |
|---|---|---|---|
| 1 | **Upload & convert** | S/M | Upload a GIF, MP4, WebM or WebP and download it in any format and quality. Adds **secure uploads**: file type checked from the file's actual contents, size limits, ffprobe validation, and random file names. Every later tool uses this. |
| 2 | **Compress / resize** | S | Presets such as "Under 15 MB (X)", "Under 8 MB (Discord)" and "Under 1 MB", or a custom width. |
| 3 | **Speed, reverse, boomerang** | S | 0.25×–4× speed, play backwards, or forward-then-back loop. |
| 4 | **Trim** | M | Pick a start and end on a live preview. The backend is easy; the slider UI is the work. |

## Phase 2: GIF maker

| # | Feature | Size | Notes |
|---|---|---|---|
| 5 | **Photo → GIF** | M | One photo with an effect: zoom-in (Ken Burns), pan, pulse or shake. |
| 6 | **Screenshots → GIF** | M | Several images as a slideshow. Drag to reorder, set time per frame, optional crossfade. |
| 7 | **Crop** | M | Aspect presets (1:1, 16:9, 9:16) plus a drag box. |
| 8 | **Text captions** | M/L | Meme-style top/bottom text or free text, with a font, color and outline. |

## Phase 3: Launch prep → deploy v1

| # | Item | Size | Notes |
|---|---|---|---|
| 9 | **Harden the X fetcher** | M | Request queue, retry with increasing waits, automatic pause when X errors, and a health check. |
| 10 | **Bot protection** | S | Cloudflare Turnstile (invisible CAPTCHA) on grab and upload, plus Cloudflare rate limiting. |
| 11 | **Professional UI pass** | M | Landing page that shows off the suite, polished tool pages, mobile, empty and error states, favicon and link-preview image. |
| 12 | **Legal pages** | S | Terms, privacy, and a **takedown/DMCA contact and process**. This is required, because the site publicly hosts other people's GIFs. |
| 13 | **Launch v1** | S | Point the main domain at production, then run the smoke tests against it. |

**Launch on your main domain when Phases 0–3 are done.** That's a real suite: grab + 8 tools + a polished UI + security. Staging has been live on Cloudflare since 0.3, so launch is mostly a DNS switch.

## Phase 4: After launch

| # | Feature | Size |
|---|---|---|
| 14 | **Grab from more sites** through yt-dlp: Reddit, Tumblr, Imgur, Giphy, Tenor, TikTok (Instagram and Facebook are unreliable) | M |
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

## Done
- ✅ X grabber (link → GIF), dedup per post, public timeline
- ✅ Downloads in GIF / MP4 / WebM / WebP at low / medium / high quality
- ✅ Post on X using the original GIF (X embeds it, "From @author")
