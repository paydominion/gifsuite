/**
 * Landing pages: one page per thing people search for, each with the working tool on it.
 * They all render through components/marketing/LandingPage.tsx, so they share one design.
 * Search volumes behind each page are in content/KEYWORDS.md.
 */
export type LandingTool =
  | { kind: "grab" }
  | { kind: "convert"; initialFormat: "gif" | "mp4" | "webm" | "webp" }
  | { kind: "compress"; initialWidth: "0" | "640" | "480" | "320" };

export type Landing = {
  slug: string;
  /** <title>, 60 characters or fewer, with the keyword first. */
  title: string;
  /** Meta description, 110–160 characters. */
  description: string;
  eyebrow: string;
  h1: string;
  subtitle: string;
  tool: LandingTool;
  steps: [string, string][];
  why: [string, string][];
  faq: [string, string][];
  related: string[];
};

const FREE = ["Free, no sign-up", "No account, no watermark, no app to install. It works in any browser, on phone or computer."] as [string, string];
const PRIVATE_UPLOADS = ["Your file isn't kept", "Uploads are converted and sent straight back. Nothing you upload is stored on our servers."] as [string, string];
const LIMITS_UPLOAD = "Files up to 25 MB and clips up to 60 seconds.";

export const LANDINGS: Landing[] = [
  {
    slug: "twitter-gif-downloader",
    title: "Twitter GIF Downloader: save X GIFs as GIF or MP4",
    description: "Download any GIF from X (Twitter) as a real GIF, MP4, WebM or WebP. Paste the post link, pick a quality, done. Free, no sign-up.",
    eyebrow: "Twitter / X GIF downloader",
    h1: "Download GIFs from X (Twitter).",
    subtitle: "Paste a post link and get its GIF as a real .gif file, or as MP4, WebM or WebP.",
    tool: { kind: "grab" },
    steps: [
      ["Copy the post's link", "On X, tap Share on the post with the GIF, then Copy link."],
      ["Paste it here", "Paste the link into the box above and tap Grab GIF."],
      ["Download", "Pick GIF, MP4, WebM or WebP and a quality, and save it."],
    ],
    why: [
      ["A real GIF, not a video", "X stores GIFs as small videos, so there's no Save button. GifSuite turns it back into a .gif that works everywhere."],
      ["Post it back the right way", "Share it on X as the original GIF, credited to its author, without re-uploading."],
      FREE,
    ],
    faq: [
      ["Why can't I save a GIF from X directly?", "X converts every GIF to a short MP4 video when it's posted, so your browser treats it as a video, not an image. GifSuite downloads that video and converts it back into a GIF."],
      ["Does it work with x.com and twitter.com links?", "Yes. Links from x.com, twitter.com and mobile.twitter.com all work, including links that point at a specific GIF in a post with several."],
      ["What quality can I download?", "Low, Medium or High. High keeps the original size and frame rate; Low makes the smallest file for quick sends."],
      ["Can I download GIFs from private or age-restricted posts?", "No. GifSuite can only grab what X shows to everyone without signing in."],
      ["Is it free?", "Yes, with no sign-up and no watermark."],
    ],
    related: ["twitter-video-downloader", "gif-to-mp4", "gif-compressor"],
  },
  {
    slug: "twitter-video-downloader",
    title: "Twitter Video Downloader: save X videos as MP4 or GIF",
    description: "Download short videos from X (Twitter) as MP4, or turn them into a GIF. Paste the post link and save it. Free, for clips up to 60 seconds.",
    eyebrow: "Twitter / X video downloader",
    h1: "Download short videos from X.",
    subtitle: "Paste a post link to save its video as MP4, or turn it into a GIF. Works with clips up to 60 seconds.",
    tool: { kind: "grab" },
    steps: [
      ["Copy the post's link", "On X, tap Share on the post with the video, then Copy link."],
      ["Paste it here", "Paste the link into the box above and tap Grab GIF."],
      ["Download", "Choose MP4 to keep it as a video, or GIF to loop it anywhere."],
    ],
    why: [
      ["MP4 or GIF", "Keep the video as a small, sharp MP4, or make it a GIF for chats, documents and forums."],
      ["Made for short clips", "GifSuite is built for the short clips people share as GIFs and memes, up to 60 seconds."],
      FREE,
    ],
    faq: [
      ["How long can the video be?", "Up to 60 seconds. Longer videos are refused; GifSuite is made for short clips."],
      ["Is the sound kept?", "When you download MP4 at High quality, the original video, sound included, is kept. GIFs never have sound."],
      ["Does it work on iPhone and Android?", "Yes. It runs in your phone's browser; there's nothing to install."],
      ["Can I download videos from private posts?", "No. Only posts X shows to everyone without signing in."],
    ],
    related: ["twitter-gif-downloader", "video-to-gif", "gif-compressor"],
  },
  {
    slug: "mp4-to-gif",
    title: "MP4 to GIF Converter: free, fast, high quality",
    description: "Convert MP4 to GIF online in seconds. Choose the size and quality, and download a GIF that plays everywhere. Free, no sign-up, nothing stored.",
    eyebrow: "MP4 to GIF converter",
    h1: "Convert MP4 to GIF.",
    subtitle: "Drop in a short MP4 and get a GIF that loops everywhere: chats, email, documents and forums.",
    tool: { kind: "convert", initialFormat: "gif" },
    steps: [
      ["Upload your MP4", `Drop it into the box above, or tap to choose it. ${LIMITS_UPLOAD}`],
      ["Pick a quality", "High keeps the full size and frame rate. Medium and Low make smaller GIFs."],
      ["Download your GIF", "Tap Convert & download, and the GIF saves."],
    ],
    why: [
      ["GIFs that look good", "Each GIF gets its own color palette built from your clip, so colors stay accurate even at a small size."],
      PRIVATE_UPLOADS,
      FREE,
    ],
    faq: [
      ["How do I convert MP4 to GIF?", "Upload the MP4 above, keep GIF selected, pick a quality and tap Convert & download."],
      ["What's the maximum file size?", "Up to 25 MB and 60 seconds per file. Trim longer videos to the moment you want first."],
      ["Why is my GIF bigger than the MP4?", "GIF is a much older format that stores every frame as a full picture. If it's too big, choose Medium or Low, or use the GIF compressor."],
      ["Can I also convert MOV or WebM?", "Yes. MOV (from iPhones) and WebM work the same way."],
      ["Is my video kept?", "No. It's converted and sent straight back; nothing is stored."],
    ],
    related: ["video-to-gif", "gif-compressor", "gif-to-mp4"],
  },
  {
    slug: "video-to-gif",
    title: "Video to GIF Converter: turn any clip into a GIF",
    description: "Turn a video into a GIF online: MP4, MOV from iPhone, or WebM. Pick the quality and download a looping GIF. Free, no sign-up, nothing stored.",
    eyebrow: "Video to GIF converter",
    h1: "Turn a video into a GIF.",
    subtitle: "MP4, iPhone MOV or WebM in, a looping GIF out. Pick the size and quality that suits where it's going.",
    tool: { kind: "convert", initialFormat: "gif" },
    steps: [
      ["Upload the video", `Drop it in above or tap to choose it. ${LIMITS_UPLOAD}`],
      ["Choose GIF and a quality", "High keeps everything; Medium (480px) is the sweet spot for chats; Low is smallest."],
      ["Convert and save", "Tap Convert & download to get your GIF."],
    ],
    why: [
      ["Works with phone videos", "MOV files straight from an iPhone and MP4s from Android both work."],
      PRIVATE_UPLOADS,
      FREE,
    ],
    faq: [
      ["Which video formats can I turn into a GIF?", "MP4, MOV and WebM, up to 25 MB and 60 seconds."],
      ["How long should a GIF be?", "Two to six seconds is typical. Short GIFs load faster and stay small enough to send."],
      ["Does the GIF loop?", "Yes, GIFs made here loop forever."],
      ["Is there a watermark?", "No."],
    ],
    related: ["mp4-to-gif", "gif-compressor", "twitter-video-downloader"],
  },
  {
    slug: "gif-to-mp4",
    title: "GIF to MP4 Converter: make GIFs up to 15× smaller",
    description: "Convert a GIF to MP4 online and shrink it by over 90% with no visible loss. Ideal for WhatsApp, Instagram and X. Free, no sign-up.",
    eyebrow: "GIF to MP4 converter",
    h1: "Convert GIF to MP4.",
    subtitle: "Same animation, a fraction of the size. A 2.2 MB GIF became a 140 KB MP4 in our test.",
    tool: { kind: "convert", initialFormat: "mp4" },
    steps: [
      ["Upload your GIF", `Drop it in above or tap to choose it. ${LIMITS_UPLOAD}`],
      ["Keep MP4 selected", "High keeps the full size and frame rate; Medium and Low are smaller still."],
      ["Download the MP4", "Tap Convert & download to save it."],
    ],
    why: [
      ["Much smaller files", "MP4 stores only what changes between frames, so it's often over 90% smaller than the same GIF."],
      ["Plays like a GIF on social apps", "X and WhatsApp play short silent MP4s on a loop, just like GIFs."],
      PRIVATE_UPLOADS,
    ],
    faq: [
      ["Why convert a GIF to MP4?", "To make it much smaller. MP4 is a modern video format; a GIF stores every frame as a full picture with at most 256 colors."],
      ["Will it look worse?", "At High quality, it keeps the original size and frame rate and looks the same."],
      ["Can I post the MP4 as a GIF on X or WhatsApp?", "Yes. Both play short MP4 clips on a loop."],
      ["Is it free?", "Yes, with no sign-up, and your file isn't stored."],
    ],
    related: ["mp4-to-gif", "gif-compressor", "twitter-gif-downloader"],
  },
  {
    slug: "gif-compressor",
    title: "GIF Compressor: shrink a GIF to any size limit",
    description: "Compress a GIF to fit X, Discord, email or any size limit, keeping as much quality as the limit allows. Free online GIF compressor, nothing stored.",
    eyebrow: "GIF compressor",
    h1: "Compress a GIF to fit.",
    subtitle: "Pick where it's going (X, Discord, 5 MB or 1 MB) and get the best-looking GIF under that size.",
    tool: { kind: "compress", initialWidth: "0" },
    steps: [
      ["Upload your GIF", `Drop it in above. Videos work too and come out as a GIF. ${LIMITS_UPLOAD}`],
      ["Pick a target", "X (15 MB), Discord (10 MB), 5 MB, 1 MB, or your own limit."],
      ["Tap Compress & download", "GifSuite tries smaller sizes, fewer frames and fewer colors until it fits."],
    ],
    why: [
      ["Fits the limit, keeps the quality", "It stops at the best-looking version that's under your limit, instead of crushing everything."],
      ["Presets for where you're posting", "One tap for X or Discord's limits, or type any size."],
      PRIVATE_UPLOADS,
    ],
    faq: [
      ["How do I make a GIF smaller?", "Upload it above, choose a target size and tap Compress & download. Choosing a smaller width first, such as 480px, often keeps the motion smoother."],
      ["What's the GIF size limit on Discord and X?", "At the time of writing, Discord allows 10 MB per file without Nitro, and X allows 15 MB for GIFs posted from the web and 5 MB from its apps."],
      ["Why are GIFs so big?", "A GIF stores every frame as a full picture. Long clips, large widths and many colors add up fast."],
      ["Is quality lost?", "Some detail is traded for size, but only as much as needed to fit your limit."],
    ],
    related: ["gif-resizer", "gif-to-mp4", "mp4-to-gif"],
  },
  {
    slug: "gif-resizer",
    title: "GIF Resizer: resize a GIF online for free",
    description: "Resize a GIF to 640, 480 or 320 pixels wide online, keeping it animated. Make it smaller for chats, email and forums. Free, nothing stored.",
    eyebrow: "GIF resizer",
    h1: "Resize a GIF.",
    subtitle: "Make a GIF narrower, and lighter, without losing the animation. 640, 480 or 320 pixels wide.",
    tool: { kind: "compress", initialWidth: "480" },
    steps: [
      ["Upload your GIF", `Drop it in above. ${LIMITS_UPLOAD}`],
      ["Choose a width", "640, 480 or 320 pixels. Height follows automatically, so it never looks stretched."],
      ["Resize and download", "Tap Compress & download to get your resized GIF."],
    ],
    why: [
      ["Keeps the animation", "Every frame is resized, so the GIF still moves exactly as before."],
      ["Smaller and smoother", "A narrower GIF is a smaller file, and keeps more colors and frames at the same size."],
      PRIVATE_UPLOADS,
    ],
    faq: [
      ["How do I resize a GIF?", "Upload it above, choose a width, and download. Height is adjusted to keep the shape."],
      ["Can I make a GIF a specific file size too?", "Yes. Pick a size target as well, such as 5 MB, and it will fit both."],
      ["Does resizing make it blurry?", "Making a GIF smaller keeps it sharp. Making it bigger than the original isn't offered, because it would only blur it."],
      ["Is it free?", "Yes, with no sign-up and no watermark."],
    ],
    related: ["gif-compressor", "gif-to-mp4", "mp4-to-gif"],
  },
  {
    slug: "giphy-downloader",
    title: "Giphy Downloader: save GIFs from Giphy and Tenor",
    description: "Download any GIF from Giphy or Tenor as a real GIF, MP4 or WebM. Paste the link and save it. Free, no sign-up, works on phone and computer.",
    eyebrow: "Giphy & Tenor downloader",
    h1: "Download GIFs from Giphy and Tenor.",
    subtitle: "Paste the GIF's link and save it as a real GIF, or as MP4 or WebM.",
    tool: { kind: "grab" },
    steps: [
      ["Copy the GIF's link", "Open the GIF's page on Giphy or Tenor and copy the link from the address bar."],
      ["Paste it here", "Paste it into the box above and tap Grab GIF."],
      ["Download", "Pick a format and quality, and save it."],
    ],
    why: [
      ["A real file", "GIF sites often serve video or WebP that many apps won't treat as a GIF. You get a proper .gif, or a small MP4."],
      ["Any GIF site", "Giphy, Tenor, Imgur, direct .gif links and many more sites work the same way."],
      FREE,
    ],
    faq: [
      ["How do I download a GIF from Giphy?", "Copy the GIF page's link, paste it above, tap Grab GIF, and download it in the format you want."],
      ["Does it work with Tenor?", "Yes. Tenor GIF links work the same way."],
      ["Can I use GIFs I download?", "Downloading a GIF doesn't make it yours. Use it the way its creator and the site's terms allow."],
      ["Is it free?", "Yes, with no sign-up and no watermark."],
    ],
    related: ["twitter-gif-downloader", "gif-to-mp4", "gif-compressor"],
  },
];

export const getLanding = (slug: string) => LANDINGS.find((l) => l.slug === slug);
