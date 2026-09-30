# GifSuite blog playbook

How the blog gets written: an AI does the legwork in a loop, and a human approves twice before anything is published. This file is the AI's instructions and the human's checklist.

**Two kinds of post**

| Kind | `type` | Length | What it is |
|---|---|---|---|
| Tip | `tip` | 150–400 words | One practical GIF problem, solved. Links to the GifSuite tool that does it. |
| History | `history` | 600–1,200 words | One true story from the life of the GIF, fully sourced. |

**Where things live**

| Path | What |
|---|---|
| `content/TOPICS.md` | The queue. Every topic and its status. |
| `content/research/<slug>.md` | Research notes for one topic: claims, sources, outline, fact-check report. |
| `content/blog/<slug>.md` | The post. The file name is the URL: `/blog/<slug>`. |
| `content/blog/_template-tip.md`, `_template-history.md` | Starting points. Files starting with `_` are never published. |

---

## The loop

Paste this to an AI agent that can read and write files in this repo and search the web (for example Claude Code with `/loop`):

```
Read content/BLOG_PLAYBOOK.md and follow it exactly.
Open content/TOPICS.md and find the first topic whose status is one an AI may act on:
idea, outline-approved, or drafted.
Do exactly ONE stage for that ONE topic, update its status in content/TOPICS.md, run
`npm run content` and fix anything it reports, then stop and tell me in three lines:
what you did, what the human needs to do next, and which files to open.
If every topic is waiting on a human, say so and stop. Never do a human stage yourself.
```

One run = one stage for one topic. That keeps each step small enough to check.

### Stages and statuses

| # | Stage | Who | Status before → after | Output |
|---|---|---|---|---|
| 1 | Research | AI | `idea` → `needs-research-review` | `content/research/<slug>.md` |
| 2 | **Research review** | **Human** | `needs-research-review` → `outline-approved` | Ticks and edits in the research file |
| 3 | Draft | AI | `outline-approved` → `drafted` | `content/blog/<slug>.md` with `status: draft` |
| 4 | Fact-check | AI (fresh session) | `drafted` → `needs-final-review` | Report at the bottom of the research file |
| 5 | **Final review** | **Human** | `needs-final-review` → `published` | `reviewedBy` added, `status: published` |
| 6 | Ship | Human or AI | — | `npm run check`, commit, push |

A topic can also be set to `parked` (not now) or `killed` (couldn't be verified; say why in one line).

---

## Stage 1: Research (AI)

Goal: find out what is true and provable, before any writing.

1. Read the topic's entry in `TOPICS.md`. The "leads" there are **unverified hints**, not facts.
2. Search for sources. Prefer, in this order:
   1. **Primary sources:** the original specification, patent, press release, company help page, court or regulator document, the person's own words in an interview or talk.
   2. **Contemporary reporting:** news articles written at the time.
   3. **Reputable later accounts:** books, museum and archive pages, long-form journalism.
   - An encyclopedia article is a map, not a source. Follow its references and cite those.
   - Forums, social posts and AI-written pages are never sources.
3. Write `content/research/<slug>.md` using the template below.
4. Set the topic's status to `needs-research-review`.

**Rules for claims**

- One row per checkable fact: a date, a name, a number, a "first", a cause, a quote.
- Every row has the exact URL and **what that page says, in your own words**.
- Dates, numbers and "firsts" need **two independent sources**. If you only find one, mark confidence `low`.
- If sources disagree, record both and mark the row `disputed`. Disagreement is often the most interesting part of the story.
- If you can't find a source, the claim goes in "Could not verify", not in the table.
- **Never invent** a source, a quote, a date or a URL. An empty table is an acceptable result; a made-up row is not.
- Open each URL and confirm it loads and says what you claim. Note the date you accessed it.

**Research file template**

```markdown
# Research: <working title>

- Slug: <slug>
- Key phrase people search for: <phrase>
- One-sentence summary of the true story: <sentence>

## Claims

| # | Claim | Source (title + URL) | What the source says (own words) | Confidence | Human ✔ |
|---|---|---|---|---|---|
| 1 | | | | high / medium / low / disputed | ☐ |

## Quotes worth using (each under 25 words, exact, with speaker and source)

## Could not verify (leave these out of the post)

## Open questions for the human

## Proposed outline

- Opening: <the most surprising true thing>
- ## <H2, ideally a question people ask>
  - claims used: #1, #4
- ## <H2>
- Closing: <what it means for someone using GIFs today, and the tool or post to link>

## Fact-check report (filled in at stage 4)
```

## Stage 2: Research review (human)

Open the research file and the sources side by side.

- [ ] Open every source link. Tick **Human ✔** only for rows where the page really says it.
- [ ] Delete or fix any row you can't confirm.
- [ ] Answer the open questions, or write "cut it".
- [ ] Edit the outline until it's the post you'd want to read.
- [ ] At least **3 sources** survive, and the story still holds together. If not, set the topic to `killed` or send it back to `idea` with a note.
- [ ] Set the status to `outline-approved`.

## Stage 3: Draft (AI)

1. Copy the right template to `content/blog/<slug>.md`.
2. Write the post from the approved outline, using **only rows ticked by the human**.
3. Fill in the frontmatter. For history posts, list every source actually used under `sources:` as `Title | URL`. Keep `status: draft` and leave `reviewedBy` out.
4. Run `npm run content`. It enforces the limits in the table below; fix what it reports.
5. Set the status to `drafted`.

**Writing rules**

- Plain words, short paragraphs, specific details. Write like a well-informed friend, not a press release.
- Open with the most surprising true thing. Never open with "In this post" or a dictionary definition.
- Give dates and names exactly as the sources do. If the sources disagree, say so in the post.
- Explain any technical term the first time it appears.
- **Your own words only.** Do not copy sentences from sources. Quotes are short (under 25 words), exact, and attributed in the sentence.
- No images yet (the builder rejects them).
- End with what this means for someone using GIFs today, and link to one GifSuite tool or post.
- Facts about other companies' products (limits, features, prices) are phrased "at the time of writing".

**SEO rules**

- One post answers one question. Put the phrase people search for in the title and in the first 100 words, naturally, once each.
- Headings (`##`) are the questions a reader would ask next. Never use `#` inside the post.
- Link to at least one GifSuite tool or other post, using words that describe the destination ("Compress & resize", not "click here").
- No keyword stuffing and no filler to reach a word count.

| Field | Rule (enforced by `npm run content`) |
|---|---|
| File name | lowercase words joined by hyphens |
| `title` | 65 characters or fewer |
| `description` | 110–165 characters |
| `date` | `YYYY-MM-DD` |
| `type` | `tip` or `history` |
| `tags` | at least one |
| `tool` | optional; one of grab, convert, compress, speed, trim, photo, screenshots, crop, captions |
| Body | tips ≥ 120 words, history ≥ 500 words; headings start at `##`; no raw HTML; no images |
| `sources` | history: at least 3, each `Title | https://…` |
| `reviewedBy` | history: required before `status: published` |

## Stage 4: Fact-check (AI, in a fresh session)

Use a new session so the checker hasn't seen the drafting. Its job is to find problems, not to be agreeable.

1. Read the draft and the research file. Do not read anything else first.
2. For **every sentence that states a fact**, find the ticked claim that supports it. Record each one in the research file under "Fact-check report":
   - `OK` — supported by claim #N.
   - `UNSUPPORTED` — no ticked claim says this.
   - `STRONGER THAN SOURCE` — the draft says "first", "always", "caused" and the source doesn't.
   - `QUOTE MISMATCH` — the quote isn't word-for-word, or is over 25 words.
3. Re-open each source URL. Flag any that no longer load.
4. Check for sentences that closely follow a source's wording, and rewrite them.
5. Fix what can be fixed by **cutting or softening**. Never fix a gap by adding a new unsourced fact; if new research is needed, say so in the report.
6. Run `npm run content`, then set the status to `needs-final-review`.

## Stage 5: Final review (human)

Preview it: `npm run dev`, then open `http://localhost:3217/blog`. Drafts show a red DRAFT label.

- [ ] Read it out loud once. Fix anything that sounds like a machine or a brochure.
- [ ] Every line in the fact-check report is `OK`, or the sentence is gone.
- [ ] Spot-check three claims against their sources yourself.
- [ ] Title and description make you want to click, and are honest about what's inside.
- [ ] The link to a GifSuite tool or post is there and makes sense.
- [ ] Add `reviewedBy: <your name>`, change `status:` to `published`, and set `date:` to today.
- [ ] Set the topic's status to `published` in `TOPICS.md`.

## Stage 6: Ship

```
npm run check      # includes the blog build and all tests
git add -A && git commit -m "Blog: <title>"
git push           # GitHub tests it and deploys to staging
```

Read it once on https://staging.gifsuite.com/blog, then run the production deploy from GitHub Actions.

---

## Tips posts: the short path

Tips don't need the full research cycle, but they still need to be true.

1. **AI:** pick a `tip` topic with status `idea`. Test the advice with the actual GifSuite tool where possible, and check any third-party fact (a size limit, a supported format) against that company's own help page. Write the post with `status: draft`, note the links you checked at the bottom of the topic's entry in `TOPICS.md`, and set the status to `needs-final-review`.
2. **Human:** stage 5 checklist (no `reviewedBy` needed), then ship.

## Corrections

If a published post turns out to be wrong: fix it, add `updated: YYYY-MM-DD` to the frontmatter, and if the error was significant, add a last line to the post: "*Correction (date): what changed.*" Don't silently rewrite history posts.
