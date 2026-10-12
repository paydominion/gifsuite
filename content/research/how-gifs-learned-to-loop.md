# Research: Why do GIFs loop? A browser decided, in 1995

- Slug: how-gifs-learned-to-loop
- Key phrase people search for: why do gifs loop
- One-sentence summary of the true story: The GIF format could hold several frames with timing from 1989, but nothing in it said "play again"; Netscape Navigator 2.0 added a small extension in 1995 that made animations loop, every browser copied it, and it's in practically every animated GIF today.

All sources accessed 2026-10-12.

## Claims

| # | Claim | Source (title + URL) | What the source says (own words) | Confidence | Human ✔ |
|---|---|---|---|---|---|
| 1 | The GIF89a specification lets one file hold several images, with a delay between them measured in hundredths of a second. | GIF89a specification, CompuServe — https://www.w3.org/Graphics/GIF/spec-gif89a.txt | The Graphic Control Extension has a delay time in 1/100 s, a transparency flag and a disposal method. | high (primary) | ☐ |
| 2 | The spec says GIF "is not intended as a platform for animation, even though it can be done in a limited way." | same as #1 | Exact sentence. | high (primary) | ☐ |
| 3 | The spec defines an "Application Extension" for application-specific data, identified by an 8-byte name and 3-byte code. | same as #1 | Describes the Application Extension block. | high (primary) | ☐ |
| 4 | The spec has no loop count; it came from Netscape's looping extension. | Just Solve the File Format Problem (Archive Team), "GIF" — http://fileformats.archiveteam.org/wiki/GIF | Says the only missing element for animation, a loop count, was supplied by Netscape's looping extension. | medium (wiki; consistent with #1 having no loop field) | ☐ |
| 5 | The extension is an Application Extension named "NETSCAPE2.0"; when its first data byte is 1, it holds the number of times to repeat. | Archive Team (#4) | Describes the NETSCAPE2.0 block and the 0x01 sub-block holding the repeat count. | medium | ☐ |
| 6 | A repeat count of 0 means loop forever. | Search-result summaries only so far (not confirmed on an opened page) | — | low (needs a source) | ☐ |
| 7 | Netscape Navigator 2.0 could play the several images in a GIF89a file as an animation, and Netscape added an optional extension so an animation could loop indefinitely. | Tasty Bits from the Technology Front (TBTF), newsletter of 10 Feb 1996 — https://www.tbtf.com/archive/1996-02-10.html | Contemporary report saying exactly this; also that it was easy to freeze a Mac with looping animations. A reader's correction notes animation support predated the final release (beta versions). | high (contemporary) | ☐ |
| 8 | GIF animations began looping when Netscape Navigator took them up, in 1995. | Slate, Aaron Mak, "Why GIFs almost didn't take over the internet", 29 Mar 2022 — https://slate.com/technology/2022/03/the-history-of-gifs.html | Says animations started looping once Netscape Navigator incorporated GIFs in 1995. | medium | ☐ |
| 9 | Netscape Navigator 2.0 was first released on 18 September 1995. | Search-result summaries of Wikipedia and jwz.org (jwz.org post "Netscape Navigator 2.0 was released 30 years ago today", Sept 2025, couldn't be opened) | — | low (needs an opened source) | ☐ |
| 10 | Early animated GIFs were popular as "Under Construction" signs and moving clip art. | Slate (#8) | Says so. (Belongs to the planned under-construction post too.) | low | ☐ |

## Quotes worth using (each under 25 words, exact, with speaker and source)

- "not intended as a platform for animation, even though it can be done in a limited way" — GIF89a specification.
- "Netscape has added an optional extension to the standard to allow an animation to loop indefinitely." — TBTF newsletter, 10 Feb 1996.

## Could not verify (leave these out of the post)

- The exact release date of Navigator 2.0 (#9) and the "0 = forever" rule (#6) until an opened page confirms them (e.g. a Netscape press release on archive.org, or a GIF decoder's documentation).
- Who first made an animated GIF (a 2015 blog post claims to be "the discoverer"; self-published, not a source).

## Open questions for the human

1. OK to spend one more research pass on #6 and #9 (Wayback Machine copies of Netscape's own pages)? They're the core of the story.
2. Include the "it froze my Mac" detail from TBTF? It's true to the source and fun.

## Proposed outline

- Opening: Nothing in the GIF format says "start again". Looping was bolted on by a web browser in 1995. (#4, #7)
- ## What did the original GIF allow?
  - Several frames, delays in 1/100 s, and the spec's own warning about animation. (#1, #2)
- ## Who made GIFs loop?
  - Netscape Navigator 2.0, the TBTF report. (#7, #8, #9)
- ## How does a GIF know how many times to loop?
  - The NETSCAPE2.0 application extension and its count. (#3, #5, #6)
- ## Why does every GIF still loop?
  - Every other browser copied it; it's in almost every animated GIF. (#4)
- Closing: When GifSuite makes a GIF from a video, it loops forever by default; link to Upload & convert and the planned Speed / boomerang tool.

## Fact-check report (filled in at stage 4)
