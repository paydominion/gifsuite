# GifSuite

Paste an X (Twitter) post link, get the GIF, download it as GIF / MP4 / WebM / WebP in low, medium or high quality, and post it back to X as the original GIF.
Every grabbed GIF lands on a public timeline.

## Run it

```bash
brew install ffmpeg webp yt-dlp   # ffmpeg + webp required; yt-dlp is a fallback fetcher
npm install
npm run dev                  # http://localhost:3000
```

Requires Node 22.5+ (uses the built-in `node:sqlite`).
Data lives in `./data` (SQLite database + media files).

## Environment (all optional)

| Variable | Default | Purpose |
| --- | --- | --- |
| `PUBLIC_BASE_URL` | request host | Absolute URL used in share links and link previews |
| `DATA_DIR` | `./data` | Where the database and media are stored |
| `ADMIN_TOKEN` | unset | Enables `POST /api/admin/hide` (header `x-admin-token`) |
| `AUTO_HIDE_REPORTS` | `5` | Distinct reporters before a GIF is hidden automatically |
| `MAX_SOURCE_MB` / `MAX_DURATION_S` | `50` / `60` | Limits on grabbed videos |
| `FFMPEG_PATH`, `FFPROBE_PATH`, `GIF2WEBP_PATH`, `YTDLP_PATH` | on `PATH` | Binary locations |

## How it works

- `lib/x/fetchTweetMedia.ts`: resolves a post link to its MP4 using X's public embed endpoint, falling back to `yt-dlp`.
- `lib/ingest.ts`: downloads the MP4, creates the poster and timeline preview, and saves the row. Posts are deduplicated per post and media slot.
- `lib/media/convert.ts`: converts formats on demand and caches them in `data/media/<id>/out.<fmt>`.
- The `events` table records grabs, views, downloads, shares and reports, which feed the upcoming Trending page.
