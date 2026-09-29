# Testing GifSuite

## Commands

| Command | What it runs | Time |
|---|---|---|
| `npm test` | Unit tests only (Vitest): URL parsing, conversion settings, ranges, rate limits | ~1s |
| `npm run check` | Typecheck + lint + unit tests + API tests. **Run before every commit.** | ~30s |
| `npm run test:e2e` | Browser tests: clicks through the real site in Chrome (headless) | ~30s |
| `npm run check:all` | Everything above | ~1 min |

`npx playwright test --project=e2e --headed` shows the browser while the tests run.

## How it works

- **Unit tests** (`tests/unit`) check small pieces of logic with no server.
- **API tests** (`tests/api`) and **browser tests** (`tests/e2e`) start their own copy of the app on port **3299**. It uses its own data folder (`.test-data`, wiped on every run) and its own build folder (`.next-test`), so it never touches your real data or your `npm run dev` server.
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

- The only test-specific switches are environment variables set in `playwright.config.ts`: `X_SYNDICATION_URL`, `X_MEDIA_HOSTS`, `DATA_DIR`, `NEXT_DIST_DIR`. Production never sets them.

## Rules for new features

1. Every feature ships with tests. Pure logic gets unit tests, endpoints get API tests, and anything a user clicks gets a browser test.
2. A test must own its data: grab a fake post only it uses, or don't depend on "created: true".
3. `npm run check:all` must be fully green before the human test.

---

## Human test checklists

### 0.1 Test system
- [ ] Run `npm run check:all` in `~/gifsuite`. It should end with `42 passed`, then `49 passed`, and no failures.
- [ ] Run `npx playwright test --project=e2e --headed` and watch Chrome grab a GIF, download it, and open the X post box.
- [ ] Optional: in `lib/media/convert.ts`, change `maxWidth: 320` to `300` and run `npm run check`. It should **fail**. Then change it back.
- [ ] `npm run dev` on port 3217 still works normally while tests run.

### Current app (regression, check before each launch)
- [ ] Paste an X GIF link → the GIF page opens, the video plays, and the author is shown.
- [ ] Downloads: Low, Medium and High each give GIF, MP4, WebM and WebP files that open.
- [ ] Post on X opens X with the original GIF in the preview ("From @author").
- [ ] Timeline on the home page shows the new GIF; clicking it opens its page.
