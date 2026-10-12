---
title: GIF size limits on X, Discord, Slack, WhatsApp and email
description: Every app caps how big a GIF can be, and the limits are all different. Here are the current GIF and file size limits, and how to make yours fit.
date: 2026-10-12
type: tip
tags: [upload limits, file size, discord, x]
tool: compress
status: draft
---

A GIF that sends fine in Slack can bounce in Discord and fail on X. Each app sets its own GIF size limit, and some count GIFs differently from other files.

## The limits at a glance

At the time of writing, these are the limits each company's help pages give:

| Where | Limit |
|---|---|
| X, posting from the website | 15 MB for animated GIFs |
| X, posting from the mobile apps | 5 MB for animated GIFs |
| Discord, without Nitro | 10 MB per file |
| WhatsApp, photos and videos | 16 MB |
| Slack | 1 GB per file |
| Gmail, personal accounts | 25 MB of attachments per email |

Limits change, so if a number here stops working, the app's own help page has the current one.

## Why GIFs hit these limits so fast

A GIF stores every frame as a separate picture with up to 256 colors. A few seconds of video at full width easily passes 15 MB, while the same clip as an MP4 might be a tenth of the size. Read [GIF vs MP4 vs WebM vs WebP](/blog/gif-vs-mp4-vs-webm-vs-webp) for why.

## How to make a GIF fit

Open [Compress & resize](/tools/compress), drop in your GIF or video, and pick where it's going: X, Discord, 5 MB or 1 MB, or type your own limit. It tries smaller sizes, fewer frames and fewer colors until the file fits, keeping as much quality as the limit allows. Picking a smaller width first, such as 480px, often keeps the motion smoother at the same file size.

## Is MP4 a better choice?

For WhatsApp and X, often yes. Both play short MP4 clips like GIFs, and an MP4 is far smaller than the same GIF. [Upload & convert](/tools/convert) turns a GIF into an MP4 in one step.
