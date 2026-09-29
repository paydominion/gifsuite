# Deploying GifSuite to Cloudflare

GifSuite runs entirely on Cloudflare:

| Piece | Cloudflare product | Name |
|---|---|---|
| Pages and API | Workers (Next.js via OpenNext) | `gifsuite` / `gifsuite-staging` |
| Database | D1 | `gifsuite` / `gifsuite-staging` |
| GIF and video files | R2 | `gifsuite-media` / `gifsuite-media-staging` |
| ffmpeg, gif2webp, yt-dlp | Containers (`processor/Dockerfile`) | `MediaProcessor` |
| Grab rate limit | Rate Limiting binding | `GRAB_LIMITER` |

Containers need the **Workers Paid** plan ($5/month). D1, R2 and Container time are billed on top by usage.

## One-time setup (you run these)

1. **Your domain on Cloudflare.** Cloudflare dashboard → *Add a domain*, then change the nameservers at your registrar to the two Cloudflare gives you. Skip if it's already there.
2. **Workers Paid plan.** Dashboard → *Workers & Pages* → *Plans*.
3. **Sign in from this Mac:**
   ```
   ! npx wrangler login
   ```
4. **Docker Desktop running**, because deploying builds the processor's container image.

## Create the resources (Claude can run these once you're signed in)

```
npx wrangler d1 create gifsuite-staging
npx wrangler d1 create gifsuite
npx wrangler r2 bucket create gifsuite-media-staging
npx wrangler r2 bucket create gifsuite-media
```

Paste each `database_id` printed by `d1 create` into `wrangler.jsonc` in place of `00000000-…`. These IDs aren't secrets.

## Secrets (never in files)

Generate each value with `openssl rand -hex 32`, then store it at Cloudflare:

```
npx wrangler secret put ADMIN_TOKEN --env staging
npx wrangler secret put VISITOR_SALT --env staging
npx wrangler secret put ADMIN_TOKEN
npx wrangler secret put VISITOR_SALT
```

## Deploy

```
npm run deploy:staging     # build, apply D1 migrations, deploy to staging
npm run deploy:production  # same, for production
```

Then attach the domains: dashboard → *Workers & Pages* → the worker → *Settings* → *Domains & Routes* → *Add custom domain*. Use `staging.yourdomain.com` for staging and `yourdomain.com` for production. Also set `PUBLIC_BASE_URL` for each environment in `wrangler.jsonc` `vars`.

## After each deploy

- Run the human checklist in `TESTING.md` against the live site.
- The first conversion after the processor has been idle may take a few extra seconds while its container starts.
- Staging hits the **real X**. Check a grab works from Cloudflare's network, since X may treat Cloudflare's addresses differently from your Mac's.
