# Deploying GifSuite

GifSuite runs entirely on Cloudflare and deploys from **GitHub Actions**, not from your Mac. Your Mac never needs Docker.

| Piece | Cloudflare product | Staging | Production |
|---|---|---|---|
| Pages and API | Workers (Next.js via OpenNext) | `gifsuite-staging` | `gifsuite` |
| Database | D1 | `gifsuite-staging` | `gifsuite` (not created yet) |
| GIF and video files | R2 | `gifsuite-media-staging` | `gifsuite-media` (not created yet) |
| ffmpeg, gif2webp, yt-dlp | Containers (`processor/Dockerfile`) | `MediaProcessor` | `MediaProcessor` |
| Address | Custom domain | https://staging.gifsuite.com | https://gifsuite.com |

Containers need the **Workers Paid** plan ($5/month), which is active. D1, R2 and Container time are billed on top by usage.

## How a deploy happens

1. Push to `main` on GitHub (`git push`).
2. GitHub runs the full test suite (`npm run check:all`).
3. If everything passes, GitHub builds the site, applies database migrations, builds the processor container and deploys to **staging**.

Watch it live at https://github.com/dominusmaster/gifsuite/actions, or run `gh run watch` in the terminal.

**Production** is manual: Actions → *Test and deploy* → *Run workflow* → choose `production`.

## What's already set up

- GitHub repo `dominusmaster/gifsuite` (**private**; it must stay private because of the Satoshi font license).
- GitHub secret `CLOUDFLARE_API_TOKEN`: a Cloudflare API token with Workers, D1, Containers and DNS edit rights. If it leaks, roll it at https://dash.cloudflare.com/profile/api-tokens and update the secret.
- Staging D1 database, R2 bucket and custom domain.
- Staging secrets `ADMIN_TOKEN` and `VISITOR_SALT`. They're random values stored only at Cloudflare.

## Before the first production deploy

Run these once from this Mac (`npx wrangler login` is already done):

```
npx wrangler d1 create gifsuite            # put the printed database_id in wrangler.jsonc (top level)
npx wrangler r2 bucket create gifsuite-media
```

Add to the top level of `wrangler.jsonc`:

```jsonc
"routes": [{ "pattern": "gifsuite.com", "custom_domain": true }],
// and in "vars":
"PUBLIC_BASE_URL": "https://gifsuite.com",
```

Deploy production once from GitHub, then set its secrets (each value is generated and sent straight to Cloudflare, never shown):

```
openssl rand -hex 32 | npx wrangler secret put ADMIN_TOKEN
openssl rand -hex 32 | npx wrangler secret put VISITOR_SALT
```

## Notes

- `npm` is pinned (`packageManager` in `package.json`), and the workflow installs that exact version. Different npm versions disagree about the lock file.
- The first request after the processor has been idle takes a few extra seconds while its container starts.
- To deploy from this Mac in an emergency: start Docker Desktop, then run `npm run deploy:staging`. It's slow on a slow connection; `npm run deploy:status` shows progress.
