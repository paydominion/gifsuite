/**
 * Landing pages: one page per thing people search for, each with the working tool on it.
 * They all render through components/marketing/LandingPage.tsx, so they share one design.
 * Search volumes behind each page are in content/KEYWORDS.md.
 */
export type LandingTool =
  | { kind: "grab" }
  | { kind: "convert"; initialFormat: "gif" | "mp4" | "webm" | "webp" }
  | { kind: "compress"; initialWidth: "0" | "640" | "480" | "320" }
  | { kind: "maker" }
  | { kind: "crop"; initialFormat: "gif" | "mp4" }
  | { kind: "trim"; initialFormat: "gif" | "mp4" }
  | { kind: "speed"; initialFormat: "gif" | "mp4"; initialDirection: "forward" | "reverse" | "boomerang" }
  | { kind: "captions"; initialFormat: "gif" | "mp4" };

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

const CROP_STEPS: [string, string][] = [
  ["Upload your file", `Drop it in above. GIF, MP4, MOV or WebM. ${LIMITS_UPLOAD}`],
  ["Draw the crop", "Drag the box and its corners, or pick a shape: 1:1, 16:9, 9:16 or 4:5."],
  ["Crop & download", "Choose GIF or MP4 and tap Crop & download."],
];

const LIMITS_MAKER = "Up to 30 pictures, 10 MB each. JPEG, PNG, WebP or GIF.";

const EDIT_LIMITS = "GIF, MP4, MOV or WebM, up to 25 MB and 60 seconds.";
const NOT_KEPT: [string, string] = ["Your file isn't kept", "Uploads are edited and sent straight back. Nothing is stored."];

export const LANDINGS: Landing[] = [
  {
    slug: "trim-video",
    title: "Video Trimmer: trim a video online, free",
    description: "Trim a short video online: pick the start and end on a live preview and download it as MP4 or GIF. Free, no sign-up, for clips up to 60 seconds.",
    eyebrow: "Video trimmer",
    h1: "Trim a video.",
    subtitle: "Pick where it starts and ends, watch the preview loop just that part, and download it.",
    tool: { kind: "trim", initialFormat: "mp4" },
    steps: [
      ["Upload your video", `Drop it in above. ${EDIT_LIMITS}`],
      ["Set the start and end", "Drag the sliders, or play to the moment and tap Set start to now and Set end to now."],
      ["Trim & download", "Keep MP4 for sound, or choose GIF, then tap Trim & download."],
    ],
    why: [
      ["See exactly what you keep", "The preview loops only the part you've chosen, to a tenth of a second."],
      ["Sound kept", "MP4s keep the original sound for the part you keep."],
      NOT_KEPT,
    ],
    faq: [
      ["How do I trim a video?", "Upload it above, set the start and end, and tap Trim & download."],
      ["How long can the video be?", "Up to 60 seconds and 25 MB. GifSuite is made for short clips."],
      ["Can I turn the trimmed part into a GIF?", "Yes. Choose GIF before you download."],
      ["Does it work on iPhone videos?", "Yes. MOV files from iPhones work, as do MP4 and WebM."],
      ["Is it free?", "Yes, with no sign-up and no watermark."],
    ],
    related: ["gif-cutter", "video-to-gif", "video-cropper"],
  },
  {
    slug: "gif-cutter",
    title: "GIF Cutter: trim a GIF to the best moment",
    description: "Cut a GIF down to the part you want: pick the start and end, preview it, and download. Free online GIF trimmer, no sign-up, nothing stored.",
    eyebrow: "GIF cutter",
    h1: "Cut a GIF down to size.",
    subtitle: "Keep just the best moment. Pick where it starts and ends, and download the shorter GIF.",
    tool: { kind: "trim", initialFormat: "gif" },
    steps: [
      ["Upload your GIF", `Drop it in above. ${EDIT_LIMITS}`],
      ["Set the start and end", "Drag the Start and End sliders to the moment you want."],
      ["Trim & download", "Tap Trim & download to get the shorter GIF."],
    ],
    why: [
      ["Smaller files", "A shorter GIF is a smaller file, often small enough to send without compressing."],
      ["Stays sharp", "The kept frames get their own color palette, so colors stay accurate."],
      NOT_KEPT,
    ],
    faq: [
      ["How do I cut a GIF?", "Upload it above, set the start and end, and tap Trim & download."],
      ["Can I make it smaller too?", "Yes. Run the result through the GIF compressor."],
      ["Can I cut a video into a GIF?", "Yes. Upload the video and choose GIF before downloading."],
      ["Is it free?", "Yes, with no sign-up and no watermark."],
    ],
    related: ["trim-video", "gif-compressor", "gif-speed-changer"],
  },
  {
    slug: "reverse-video",
    title: "Reverse Video: play a video backwards online",
    description: "Reverse a short video online so it plays backwards, or make a boomerang that plays forward and back. Download as MP4 or GIF. Free, nothing stored.",
    eyebrow: "Reverse video",
    h1: "Play a video backwards.",
    subtitle: "Reverse a short clip, or make a boomerang that plays forwards and then backwards, on a loop.",
    tool: { kind: "speed", initialFormat: "mp4", initialDirection: "reverse" },
    steps: [
      ["Upload your video", "Drop it in above. MP4, MOV or WebM, up to 20 seconds for reversing."],
      ["Choose Reverse or Boomerang", "And a speed, from 0.25× to 4×, if you like."],
      ["Apply & download", "Tap Apply & download to get your reversed video."],
    ],
    why: [
      ["Reverse or boomerang", "Play it backwards, or forward then back like an Instagram Boomerang."],
      ["Change the speed too", "Slow motion or fast forward, in the same step."],
      NOT_KEPT,
    ],
    faq: [
      ["How do I reverse a video?", "Upload it above, choose Reverse, and tap Apply & download."],
      ["How long can the video be?", "Up to 20 seconds for reverse and boomerang. Trim longer videos first."],
      ["Is the sound reversed too?", "No. Reversed and boomerang clips are silent; forward playback keeps the sound."],
      ["Can I make a boomerang?", "Yes. Choose Boomerang: it plays forward, then backward, on a loop."],
    ],
    related: ["reverse-gif", "gif-speed-changer", "trim-video"],
  },
  {
    slug: "reverse-gif",
    title: "Reverse GIF: play a GIF backwards online",
    description: "Reverse a GIF so it plays backwards, or make a boomerang GIF. Change its speed in the same step. Free online GIF reverser, no sign-up, nothing stored.",
    eyebrow: "GIF reverser",
    h1: "Reverse a GIF.",
    subtitle: "Make it play backwards, or turn it into a boomerang that loops forward and back.",
    tool: { kind: "speed", initialFormat: "gif", initialDirection: "reverse" },
    steps: [
      ["Upload your GIF", "Drop it in above. Up to 20 seconds for reversing."],
      ["Choose Reverse or Boomerang", "Optionally change the speed too."],
      ["Apply & download", "Tap Apply & download to get the reversed GIF."],
    ],
    why: [
      ["Reverse or boomerang", "Backwards, or forward-then-back on a loop."],
      ["Any speed", "From quarter speed to four times faster, in the same step."],
      FREE,
    ],
    faq: [
      ["How do I reverse a GIF?", "Upload it above, choose Reverse, and tap Apply & download."],
      ["What's a boomerang GIF?", "One that plays forward and then backward, so it loops smoothly."],
      ["Can I reverse a video into a GIF?", "Yes. Upload the video and choose GIF."],
      ["Is it free?", "Yes, with no sign-up and no watermark."],
    ],
    related: ["gif-speed-changer", "reverse-video", "gif-cutter"],
  },
  {
    slug: "gif-speed-changer",
    title: "GIF Speed Changer: speed up or slow down a GIF",
    description: "Speed up or slow down a GIF from 0.25× to 4×, or reverse it. Preview and download as GIF or MP4. Free online GIF speed changer, nothing stored.",
    eyebrow: "GIF speed changer",
    h1: "Speed up or slow down a GIF.",
    subtitle: "From quarter speed to four times faster. Reverse it or make a boomerang in the same step.",
    tool: { kind: "speed", initialFormat: "gif", initialDirection: "forward" },
    steps: [
      ["Upload your GIF", `Drop it in above. ${EDIT_LIMITS}`],
      ["Pick a speed", "0.25×, 0.5× and 0.75× slow it down; 1.5×, 2×, 3× and 4× speed it up."],
      ["Apply & download", "Tap Apply & download to save it."],
    ],
    why: [
      ["Smooth at any speed", "Frame rates are capped sensibly, so fast GIFs stay small and slow ones stay smooth."],
      ["Videos too", "Speed up a video and keep its sound, matched to the new speed."],
      NOT_KEPT,
    ],
    faq: [
      ["How do I speed up a GIF?", "Upload it above, pick 1.5× to 4×, and tap Apply & download."],
      ["How do I slow down a GIF?", "Pick 0.25×, 0.5× or 0.75×. The result can be up to 60 seconds long."],
      ["Is a video's sound kept?", "Yes, for MP4s playing forward, sped up or slowed down to match."],
      ["Is it free?", "Yes, with no sign-up and no watermark."],
    ],
    related: ["reverse-gif", "gif-cutter", "gif-compressor"],
  },
  {
    slug: "add-text-to-gif",
    title: "Add Text to GIF: captions with live preview, free",
    description: "Add text to a GIF online: top and bottom captions in meme style, with outline, colors and a live preview. Download as GIF or MP4. Free, nothing stored.",
    eyebrow: "Add text to GIF",
    h1: "Add text to a GIF.",
    subtitle: "Type your top and bottom text, see it on the GIF as you go, and download.",
    tool: { kind: "captions", initialFormat: "gif" },
    steps: [
      ["Upload your GIF", `Drop it in above. ${EDIT_LIMITS}`],
      ["Type your text", "Top text, bottom text, or both. Pick a font, size and color."],
      ["Add text & download", "What you see in the preview is exactly what you get."],
    ],
    why: [
      ["Live preview", "The text is drawn on your GIF as you type, so there are no surprises."],
      ["Readable anywhere", "A thick outline keeps captions clear on light and dark backgrounds."],
      NOT_KEPT,
    ],
    faq: [
      ["How do I add text to a GIF?", "Upload it above, type your top and bottom text, and tap Add text & download."],
      ["Can I change the font and color?", "Yes: Meme, Fun or Clean fonts; white, yellow or black; small, medium or large."],
      ["Does long text fit?", "Yes. Lines wrap automatically and shrink if needed, up to 120 characters each."],
      ["Can I add text to a video?", "Yes. Upload the video and choose GIF or MP4."],
      ["Is it free?", "Yes, with no sign-up and no watermark."],
    ],
    related: ["gif-meme-maker", "gif-maker", "gif-cutter"],
  },
  {
    slug: "gif-meme-maker",
    title: "GIF Meme Maker: make a meme GIF in seconds",
    description: "Make a meme GIF: add classic top and bottom meme text to any GIF or short video, with a live preview. Free online GIF meme generator, no sign-up.",
    eyebrow: "GIF meme maker",
    h1: "Make a meme GIF.",
    subtitle: "Classic white text with a black outline, top and bottom, on any GIF or short video.",
    tool: { kind: "captions", initialFormat: "gif" },
    steps: [
      ["Upload a GIF or video", `Drop it in above, or grab one from a link first. ${EDIT_LIMITS}`],
      ["Write the meme", "Top text sets it up, bottom text lands the joke."],
      ["Download and post", "Tap Add text & download, then share it anywhere."],
    ],
    why: [
      ["The classic meme look", "Bold condensed capitals with a black outline, in an openly licensed font."],
      ["Live preview", "See the meme on the GIF as you type."],
      FREE,
    ],
    faq: [
      ["How do I make a meme GIF?", "Upload a GIF, type the top and bottom text, and tap Add text & download."],
      ["Where can I find a GIF to use?", "Paste a link from X, Giphy, Tenor or Reddit on the home page to grab one first."],
      ["Can I post it on X or WhatsApp?", "Yes. Download it as GIF, or as MP4 for a smaller file."],
      ["Is it free?", "Yes, with no sign-up and no watermark."],
    ],
    related: ["add-text-to-gif", "gif-maker", "twitter-gif-downloader"],
  },
  {
    slug: "gif-cropper",
    title: "GIF Cropper: crop a GIF online, keep it animated",
    description: "Crop a GIF online by dragging a box, or to square, 16:9, 9:16 or 4:5. Every frame is cropped, so it stays animated. Free, nothing stored.",
    eyebrow: "GIF cropper",
    h1: "Crop a GIF.",
    subtitle: "Drag a box over your GIF, or pick a shape. Every frame is cropped, so it keeps moving.",
    tool: { kind: "crop", initialFormat: "gif" },
    steps: CROP_STEPS,
    why: [
      ["Stays animated", "The whole animation is cropped, frame by frame, with colors kept accurate."],
      ["Shapes for every app", "Square for profiles and posts, 9:16 for stories, 16:9 for widescreen, 4:5 for feeds."],
      ["Your file isn't kept", "Uploads are cropped and sent straight back. Nothing is stored."],
    ],
    faq: [
      ["How do I crop a GIF?", "Upload it above, drag the box (or its corners) over the part you want, and tap Crop & download."],
      ["Will my GIF still move after cropping?", "Yes. Every frame is cropped the same way."],
      ["Can I crop a GIF to a square?", "Yes. Pick 1:1 and drag the square to the part you want."],
      ["Can I make the cropped GIF smaller too?", "Yes: run it through the GIF compressor or resizer afterwards."],
      ["Is it free?", "Yes, with no sign-up and no watermark."],
    ],
    related: ["gif-resizer", "gif-compressor", "video-cropper"],
  },
  {
    slug: "video-cropper",
    title: "Video Cropper: crop a video online, free",
    description: "Crop a short video online: drag a box or pick square, 9:16 or 16:9, and download it as MP4 or GIF. Free for clips up to 60 seconds, nothing stored.",
    eyebrow: "Video cropper",
    h1: "Crop a video.",
    subtitle: "Cut a short video down to the part you want, or to square, 9:16 or 16:9. Download it as MP4 or GIF.",
    tool: { kind: "crop", initialFormat: "mp4" },
    steps: CROP_STEPS,
    why: [
      ["Sound kept", "MP4s keep the original sound."],
      ["Ready for stories and posts", "One tap for 9:16 stories and reels, 1:1 posts or 16:9 widescreen."],
      ["Your file isn't kept", "Uploads are cropped and sent straight back. Nothing is stored."],
    ],
    faq: [
      ["How do I crop a video?", "Upload it above, drag the box over the part you want, keep MP4 selected, and tap Crop & download."],
      ["How long can the video be?", "Up to 60 seconds and 25 MB. GifSuite is made for short clips."],
      ["Which formats can I crop?", "MP4, MOV (from iPhones), WebM and GIF."],
      ["Can I crop a video for Instagram or TikTok?", "Yes. Pick 9:16 for stories, reels and TikTok, or 1:1 or 4:5 for feed posts."],
      ["Is it free?", "Yes, with no sign-up and no watermark."],
    ],
    related: ["gif-cropper", "video-to-gif", "gif-compressor"],
  },
  {
    slug: "gif-maker",
    title: "GIF Maker: make a GIF from pictures, free online",
    description: "Make a GIF from your pictures in seconds: a slideshow from several, or zoom, pan and shake effects from one. Free, no sign-up, no watermark.",
    eyebrow: "GIF maker",
    h1: "Make a GIF from your pictures.",
    subtitle: "Several pictures make a slideshow. One picture comes to life with zoom, pan, pulse or shake.",
    tool: { kind: "maker" },
    steps: [
      ["Add your pictures", `Drop them in above, or tap to choose. ${LIMITS_MAKER}`],
      ["Arrange and style", "Drag to reorder, pick the time per picture and a crossfade, or an effect for a single picture."],
      ["Make your GIF", "Tap Make GIF and it downloads. Choose MP4 instead for a smaller file."],
    ],
    why: [
      ["Slideshows and effects", "Turn a set of photos or screenshots into a looping slideshow, or give one picture a Ken Burns zoom."],
      ["Looks right everywhere", "Pictures of different shapes are fitted neatly into one frame, or cropped to fill it."],
      FREE,
    ],
    faq: [
      ["How do I make a GIF from pictures?", "Add your pictures above, arrange them, choose how long each one shows, and tap Make GIF."],
      ["How many pictures can I use?", "Up to 30, each up to 10 MB."],
      ["Can I make a GIF from one photo?", "Yes. One picture gets an effect instead: zoom, pan, pulse or shake."],
      ["Can I make a GIF from a video instead?", "Yes, with the video to GIF converter."],
      ["Are my pictures kept?", "No. They're used to make your GIF and not stored."],
      ["Is there a watermark?", "No."],
    ],
    related: ["image-to-gif", "video-to-gif", "gif-compressor"],
  },
  {
    slug: "image-to-gif",
    title: "Image to GIF: turn images into an animated GIF",
    description: "Turn images into an animated GIF online: combine JPEG, PNG or WebP images into a slideshow, with crossfades. Free, no sign-up, nothing stored.",
    eyebrow: "Images to GIF",
    h1: "Turn images into a GIF.",
    subtitle: "Combine JPEG, PNG or WebP images, or screenshots, into one looping animated GIF.",
    tool: { kind: "maker" },
    steps: [
      ["Add your images", `Drop them in above. ${LIMITS_MAKER}`],
      ["Set the order and timing", "Drag to reorder and choose how long each image shows, from 0.2 to 2 seconds."],
      ["Make the GIF", "Tap Make GIF and it downloads."],
    ],
    why: [
      ["Great for screenshots", "Step-by-step screenshots make a clear, looping how-to GIF."],
      ["Smooth crossfades", "Turn on Crossfade to blend gently from one image to the next."],
      FREE,
    ],
    faq: [
      ["Which image formats work?", "JPEG, PNG, WebP and GIF (a GIF adds its first frame)."],
      ["Do the images need to be the same size?", "No. The GIF takes the shape of the first image; the others are fitted into it, or cropped to fill it if you choose Fill."],
      ["How do I change how fast it plays?", "Choose the time per image: 0.2, 0.5, 1 or 2 seconds."],
      ["Is it free?", "Yes, with no sign-up and no watermark."],
    ],
    related: ["gif-maker", "photo-to-gif", "gif-compressor"],
  },
  {
    slug: "photo-to-gif",
    title: "Photo to GIF: bring a photo to life with motion",
    description: "Turn a photo into a moving GIF with a slow zoom, pan, pulse or shake, or combine several photos into a slideshow. Free online, nothing stored.",
    eyebrow: "Photo to GIF",
    h1: "Bring a photo to life.",
    subtitle: "Give one photo a slow zoom, pan, pulse or shake, or add more for a slideshow.",
    tool: { kind: "maker" },
    steps: [
      ["Add a photo", `Drop it in above. ${LIMITS_MAKER}`],
      ["Pick an effect", "Zoom, Pan, Pulse or Shake, and a length of 2, 3 or 5 seconds."],
      ["Make the GIF", "Tap Make GIF and it downloads."],
    ],
    why: [
      ["Motion from a still", "A slow zoom (the Ken Burns effect) makes a still photo feel alive."],
      ["Sharp results", "Effects are worked out at twice the size, so zooming in stays crisp."],
      FREE,
    ],
    faq: [
      ["How do I turn a photo into a GIF?", "Add the photo above, pick an effect and a length, and tap Make GIF."],
      ["What effects are there?", "Zoom (a slow push in), Pan (slides across), Pulse (a gentle beat) and Shake (a quick wobble)."],
      ["Can I use several photos?", "Yes. Add more and it becomes a slideshow, with optional crossfades."],
      ["Do iPhone photos work?", "JPEG, PNG and WebP work. iPhones usually share photos as JPEG; if one is HEIC, save it as JPEG first."],
    ],
    related: ["gif-maker", "image-to-gif", "video-to-gif"],
  },
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
