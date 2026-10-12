# Blog topic queue

The loop in `BLOG_PLAYBOOK.md` works through this file top to bottom.

**Statuses:** `idea` → `needs-research-review` → `outline-approved` → `drafted` → `needs-final-review` → `published`. Also `parked` and `killed`.
An AI may act on `idea`, `outline-approved` and `drafted`. Everything else waits for a human.

**Leads are unverified.** They're starting points for research, written from memory. Nothing under "leads to verify" may appear in a post until a source confirms it.

---

## History of the GIF

### who-invented-the-gif
- status: needs-research-review
- research: content/research/who-invented-the-gif.md (2026-10-12)
- type: history
- key phrase: who invented the gif
- angle: The GIF wasn't made for memes. It was an engineering fix for sending color pictures over slow phone-line connections.
- leads to verify: created at CompuServe in 1987; the team was led by Steve Wilhite; it was meant to work across different makes of computer; why existing formats weren't good enough.

### gif87a-vs-gif89a
- status: idea
- type: history
- key phrase: gif89a
- angle: The 1989 update quietly added the features that made the GIF we know: timing between frames and transparency.
- leads to verify: what the 87a and 89a versions each contain, read from the specification itself; which features arrived in 89a; whether animation was an intended use.

### how-gifs-learned-to-loop
- status: needs-research-review
- research: content/research/how-gifs-learned-to-loop.md (2026-10-12)
- type: history
- key phrase: why do gifs loop
- angle: Endless looping wasn't in the original format. A browser added it, and everyone else copied it.
- leads to verify: a Netscape Navigator extension introduced looping in the mid-1990s; which version and year; how the loop count is stored in the file.

### the-gif-patent-fight
- status: needs-research-review
- research: content/research/the-gif-patent-fight.md (2026-10-12)
- type: history
- key phrase: gif patent unisys
- angle: For a decade, the compression inside every GIF was patented, and the fight over it gave us PNG.
- leads to verify: the LZW compression method was patented and the patent was held by Unisys; the licensing announcement in the mid-1990s and the reaction; PNG was created in response; a "Burn All GIFs" protest day; when the patents expired.

### under-construction
- status: idea
- type: history
- key phrase: 90s web gifs
- angle: Spinning logos, flames and "under construction" signs: what animated GIFs meant on the early web.
- leads to verify: the role of personal home page services such as GeoCities; the "Dancing Baby" animation and the year it spread; archives that preserve these GIFs today.

### gif-or-jif
- status: idea
- type: history
- key phrase: how to pronounce gif
- angle: The format's creator had a firm answer. Most people ignored it.
- leads to verify: what Steve Wilhite said about pronunciation and where he said it; an award acceptance in 2013 that made the question news; how dictionaries list the pronunciation.
- note: This is a disputed topic. Present both sides with sources; don't pick a winner without one.

### how-the-gif-came-back
- status: idea
- type: history
- key phrase: reaction gif history
- angle: By the 2000s the GIF looked finished. Social media turned it into a language.
- leads to verify: the role of Tumblr and forums in reaction GIFs; "GIF" being named a word of the year by a dictionary publisher in 2012; early GIF search engines.

### when-twitter-added-gifs
- status: idea
- type: history
- key phrase: twitter gif support
- angle: Twitter held out against GIFs for years, then added them by turning them into video.
- leads to verify: the year Twitter added GIF support; the official announcement; that uploads are converted to MP4 and why; when the built-in GIF search arrived and who supplied it.

### giphy-and-tenor
- status: idea
- type: history
- key phrase: giphy history
- angle: How searching for a GIF became a business that the biggest tech companies fought over.
- leads to verify: when Giphy and Tenor were founded; Google's purchase of Tenor; Meta's purchase of Giphy, the UK competition regulator's ruling, and the later sale; the prices reported for each.

### why-gifs-only-have-256-colors
- status: idea
- type: history
- key phrase: why do gifs have 256 colors
- angle: The limit made sense for 1987 hardware. Here's what it costs today and how encoders hide it.
- leads to verify: the 8-bit color table in the specification; typical display hardware of the late 1980s; how per-frame color tables and dithering work around the limit.

### what-could-replace-the-gif
- status: idea
- type: history
- key phrase: gif alternatives
- angle: Better formats have existed for years. The GIF keeps winning anyway.
- leads to verify: what animated PNG, WebP and AVIF each offer and when major browsers began supporting them; why platforms serve video in place of GIF files.

### remembering-steve-wilhite
- status: idea
- type: history
- key phrase: steve wilhite
- angle: A short, respectful profile of the engineer behind the format.
- leads to verify: his career at CompuServe; the lifetime achievement award; the date and circumstances of his death as reported in obituaries.
- note: Living-memory biography. Use obituaries from established news outlets and his own statements only.

---

## Tips

### how-to-make-a-gif-smaller
- status: published
- type: tip

### gif-vs-mp4-vs-webm-vs-webp
- status: published
- type: tip

### post-a-gif-on-x
- status: published
- type: tip
- checked: X Help Center page on media upload limits (5 MB mobile, 15 MB web for animated GIFs). Re-check twice a year.

### save-a-gif-from-x
- status: published
- type: tip

### gif-size-limits-by-platform
- status: needs-final-review
- type: tip
- key phrase: gif size limit
- angle: One table of current GIF and file upload limits for X, Discord, Slack, WhatsApp and email, each checked against that company's help page.
- tool: compress
- checked (2026-10-12): Gmail 25 MB for personal accounts — https://support.google.com/mail/answer/6584 ; Slack 1 GB — https://slack.com/help/articles/201330736-Add-files-to-Slack ; X 15 MB web / 5 MB mobile — already checked for post-a-gif-on-x.
- HUMAN MUST CHECK before publishing (their help pages wouldn't load for the AI): Discord free limit 10 MB — https://support.discord.com/hc/en-us/articles/25444343291031-File-Attachments-FAQ (news reports since Sept 2024 say 10 MB); WhatsApp 16 MB for photos and videos — https://faq.whatsapp.com/164676891531296 . Fix or remove those two table rows if the pages say otherwise.

### how-to-make-a-gif-from-a-video
- status: idea
- type: tip
- key phrase: video to gif
- angle: Pick the right 3 seconds, the right width and the right frame rate.
- tool: convert

### why-is-my-gif-so-big
- status: idea
- type: tip
- key phrase: why is my gif file so large
- angle: The three things that make GIFs huge, shown with real before-and-after numbers from the compress tool.
- tool: compress

### download-gif-from-giphy-and-tenor
- status: needs-final-review
- type: tip
- key phrase: download gif from giphy
- tool: grab
- checked: grabbing a Giphy page link, a Giphy direct .gif link and a Tenor page link with GifSuite on staging (2026-10-05/12). No third-party limits or features are stated beyond "sites often serve video or WebP", which is general.

### download-reddit-gif
- status: idea
- type: tip
- key phrase: download gif from reddit
- angle: Reddit "GIFs" are usually videos; how to get one as a GIF. Test on staging first: Reddit sometimes blocks servers.
- tool: grab

### gif-to-mp4
- status: needs-final-review
- type: tip
- key phrase: convert gif to mp4
- angle: Why MP4 is often 5–10× smaller than the same GIF, with real numbers from Upload & convert.
- tool: convert
- checked (2026-10-12): converted https://media1.tenor.com/m/aGj-frNYMFEAAAAC/cat-cat-dance.gif (2,174,247 bytes, 498×476, 1.6 s, 10 fps) with GifSuite's converter: MP4 high 140,319 B, medium 50,337 B, low 14,495 B. Quality settings from processor/presets.mjs. The "X and WhatsApp play short clips like GIFs" line is general; no third-party limits stated.

### mp4-to-gif
- status: idea
- type: tip
- key phrase: mp4 to gif
- angle: Turn a short clip into a GIF that plays everywhere; the right width and frame rate.
- tool: convert

### how-to-send-a-gif-on-whatsapp
- status: idea
- type: tip
- key phrase: send gif on whatsapp
- angle: Why MP4 is the file to send, and how WhatsApp treats short videos as GIFs. Check against WhatsApp's help pages.
- tool: convert
