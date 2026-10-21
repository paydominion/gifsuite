# GifSuite

Paste an X (Twitter) post link, get the GIF, download it as GIF / MP4 / WebM / WebP in low, medium or high quality, and post it back to X as the original GIF.
Every grabbed GIF lands on a public timeline.

Runs entirely on Cloudflare: Next.js on Workers (OpenNext), D1 for the database, R2 for files, and a Container for ffmpeg. See `DEPLOY.md`.

## Run it on your Mac

```bash
brew install ffmpeg webp yt-dlp   # used by the media processor
npm install
npm install --prefix processor     # the processor's NSFW model (nsfwjs + TensorFlow.js)
npm run dev                       # http://localhost:3217
```

`npm run dev` applies database migrations to a **local** D1, then starts the media processor (`processor/server.mjs`, port 3297) and the Next.js dev server together. Local D1 and R2 data live in `.wrangler/` (git-ignored). Nothing touches your Cloudflare account.

The old `./data` folder from the pre-Cloudflare version is no longer used and can be deleted.

## Settings

Plain settings live in `wrangler.jsonc` under `vars`, per environment (`dev`, `test`, `staging`, production). Secrets are never in files; they're set with `wrangler secret put NAME`.

| Setting | Kind | Purpose |
| --- | --- | --- |
| `PUBLIC_BASE_URL` | var | Absolute site URL for link previews |
| `ADMIN_TOKEN` | **secret** (24+ chars) | Enables `POST /api/admin/hide`, `/api/admin/nsfw` and `/api/admin/scan-pending` (header `x-admin-token`). The NSFW retry sweep uses it, so set it in every deployed environment. |
| `CF_WEB_ANALYTICS_TOKEN` | var (public, not secret) | Cloudflare Web Analytics site token for page views; the beacon is left out when unset. See DEPLOY.md. |
| `TURNSTILE_SITE_KEY` | var (public) | Cloudflare Turnstile site key; turns on the invisible human check in the browser. See DEPLOY.md. |
| `TURNSTILE_SECRET` | **secret** | Turnstile secret; when set, grab, upload and edit requests must carry a valid token. Off when unset. |
| `X_BREAKER_FAILURES` | var | X failures within 2 minutes that pause X for a minute (default 5; tests use 1000). |
| `NSFW_THRESHOLD` | var | Explicit-content score (0–1) at which a scanned GIF is flagged sensitive (default 0.6) |
| `VISITOR_SALT` | **secret** | Used to count unique visitors without storing IPs |
| `AUTO_HIDE_REPORTS` | var | Distinct reporters before a GIF is hidden (default 5) |
| `MAX_SOURCE_MB` / `MAX_DURATION_S` | var | Limits on grabbed videos (default 50 / 60); the duration limit also applies to uploads |
| `MAX_UPLOAD_MB` | var | Largest file the upload tools accept (default 25) |
| `ALLOW_INDEXING` | var, production only | `1` lets search engines index the site. Anything else sends `noindex` and a disallow-all robots.txt. |
| `PROCESSOR_URL` | var, dev/test only | Where the local media processor listens. In production the Container is used instead. |

## How it works

| Part | File | What it does |
|---|---|---|
| X fetcher | `lib/x/fetchTweetMedia.ts` | Resolves a post link to its MP4 through X's public embed endpoint, falling back to yt-dlp in the processor |
| Any-link fetcher | `lib/links.ts`, `processor/fetch.mjs` | Every non-X link. The processor downloads a direct GIF/MP4/WebM file, or the media a page advertises in its link-preview tags (Giphy, Tenor, Imgur…), or falls back to yt-dlp for everything else; then normalises it to H.264 MP4. Refuses private and internal addresses (every hostname and redirect is checked). De-duplicated by a hash of the normalised link (tracking parameters removed). A site's 18+ label flags the GIF at once. |
| Grab pipeline | `lib/ingest.ts` | Downloads the MP4, has the processor probe it and make the poster and timeline preview, stores everything in R2, and saves the D1 row. Deduplicated per post and media slot. The NSFW check runs afterwards (see below), so grabbing never waits for it. |
| Analytics | `lib/analytics.ts`, `lib/analytics-core.ts`, `worker.ts`, `components/shell/ClientEvents.tsx` | Every server event (grab with the pasted link's site, view, share, report, download, convert, compress, visibility, NSFW check, admin actions, errors), every page view (with where the visit came from and which crawler), and browser-only events (file kinds picked, files turned away, error messages shown, JavaScript crashes) go to Workers Analytics Engine with status, timing, sizes, country and device; no IPs, links or file names. `npm run analytics` summarises it. |
| Visibility | `lib/owner.ts`, `app/api/gif/[id]/visibility/route.ts` | GIFs are public by default. The browser that grabbed a GIF gets an owner key (HttpOnly `gs_owner` cookie; only its SHA-256 is stored) and can take the GIF off the timeline or put it back. Private GIFs keep working by link but are `noindex`. |
| NSFW filter | `lib/moderation.ts`, `lib/nsfw.ts`, `processor/nsfw.mjs` | Gates the public timeline only; grabbing, downloading and sharing never wait for it. X's "possibly sensitive" mark is applied at grab time. Otherwise a public GIF starts unchecked (off the timeline) and is scanned after the response by the open-source nsfwjs model, 6 frames in the processor (about 0.4s; nothing leaves our system). A private GIF is scanned when it's made public. A cron trigger (every 5 minutes, `worker.ts` → `POST /api/admin/scan-pending`) retries unfinished checks. Sensitive GIFs never appear on the timeline, have no link preview, and are blurred behind "Show anyway". |
| Converter | `lib/media/convert.ts` | Makes each format and quality on first request and keeps it in R2 |
| Upload & convert | `app/api/convert/route.ts` | Converts an uploaded file and returns it. Checks the type from the file's bytes (`lib/media/sniff.ts`); nothing is stored. |
| Compress & resize | `app/api/compress/route.ts` | Shrinks an upload into a GIF under a target size. The processor tries smaller settings until it fits (`nextAttempt` / `growAttempt` in `processor/presets.mjs`). |
| Blog | `content/blog/*.md` → `scripts/build-content.mjs` | Markdown posts are validated and compiled at build time into `lib/blog/posts.generated.json`. How posts get written: `content/BLOG_PLAYBOOK.md`. |
| Media processor | `processor/` | The only place ffmpeg, gif2webp and yt-dlp run. A Cloudflare Container in production, a plain Node process locally. Presets are in `processor/presets.mjs`. |
| Events | `events` table | Records grabs, views, downloads, shares and reports, which will feed the Trending page |

## Tests

See `TESTING.md`. In short, run `npm run check` before every commit and `npm run check:all` for everything.
