# GifSuite

Paste an X (Twitter) post link, get the GIF, download it as GIF / MP4 / WebM / WebP in low, medium or high quality, and post it back to X as the original GIF.
Every grabbed GIF lands on a public timeline.

Runs entirely on Cloudflare: Next.js on Workers (OpenNext), D1 for the database, R2 for files, and a Container for ffmpeg. See `DEPLOY.md`.

## Run it on your Mac

```bash
brew install ffmpeg webp yt-dlp   # used by the media processor
npm install
npm run dev                       # http://localhost:3217
```

`npm run dev` applies database migrations to a **local** D1, then starts the media processor (`processor/server.mjs`, port 3297) and the Next.js dev server together. Local D1 and R2 data live in `.wrangler/` (git-ignored). Nothing touches your Cloudflare account.

The old `./data` folder from the pre-Cloudflare version is no longer used and can be deleted.

## Settings

Plain settings live in `wrangler.jsonc` under `vars`, per environment (`dev`, `test`, `staging`, production). Secrets are never in files; they're set with `wrangler secret put NAME`.

| Setting | Kind | Purpose |
| --- | --- | --- |
| `PUBLIC_BASE_URL` | var | Absolute site URL for link previews |
| `ADMIN_TOKEN` | **secret** (24+ chars) | Enables `POST /api/admin/hide` (header `x-admin-token`) |
| `VISITOR_SALT` | **secret** | Used to count unique visitors without storing IPs |
| `AUTO_HIDE_REPORTS` | var | Distinct reporters before a GIF is hidden (default 5) |
| `MAX_SOURCE_MB` / `MAX_DURATION_S` | var | Limits on grabbed videos (default 50 / 60); the duration limit also applies to uploads |
| `MAX_UPLOAD_MB` | var | Largest file the upload tools accept (default 25) |
| `PROCESSOR_URL` | var, dev/test only | Where the local media processor listens. In production the Container is used instead. |

## How it works

| Part | File | What it does |
|---|---|---|
| X fetcher | `lib/x/fetchTweetMedia.ts` | Resolves a post link to its MP4 through X's public embed endpoint, falling back to yt-dlp in the processor |
| Grab pipeline | `lib/ingest.ts` | Downloads the MP4, has the processor probe it and make the poster and timeline preview, stores everything in R2, and saves the D1 row. Deduplicated per post and media slot. |
| Converter | `lib/media/convert.ts` | Makes each format and quality on first request and keeps it in R2 |
| Upload & convert | `app/api/convert/route.ts` | Converts an uploaded file and returns it. Checks the type from the file's bytes (`lib/media/sniff.ts`); nothing is stored. |
| Media processor | `processor/` | The only place ffmpeg, gif2webp and yt-dlp run. A Cloudflare Container in production, a plain Node process locally. Presets are in `processor/presets.mjs`. |
| Events | `events` table | Records grabs, views, downloads, shares and reports, which will feed the Trending page |

## Tests

See `TESTING.md`. In short, run `npm run check` before every commit and `npm run check:all` for everything.
