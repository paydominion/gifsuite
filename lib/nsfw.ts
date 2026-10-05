import type { NsfwVerdict } from "@/db/gifs";

/** Scores from the processor's NSFW model: the highest each class reached on any sampled frame (0–1). */
export type NsfwScores = { porn: number; hentai: number; sexy: number; frames: number };

/**
 * Explicit content scores at or above this are flagged. Tuned to avoid flagging swimwear, which the
 * model calls "sexy" rather than "porn"; override with the NSFW_THRESHOLD setting.
 */
export const DEFAULT_NSFW_THRESHOLD = 0.6;

/**
 * Decides whether a grabbed GIF is sensitive. The source's own label (X's "possibly sensitive" mark,
 * or another site's 18+ rating) is trusted as-is;
 * otherwise the model's explicit score decides. If the scan failed, the verdict is "not checked"
 * (null), which keeps the GIF off the public timeline without blurring it.
 */
export function nsfwVerdict(
  labelled: boolean,
  scores: NsfwScores | null,
  threshold = DEFAULT_NSFW_THRESHOLD,
  labelledBy: "x" | "site" = "x",
): NsfwVerdict {
  const score = scores ? Math.max(scores.porn, scores.hentai) : null;
  if (labelled) return { nsfw: true, score, source: labelledBy };
  if (score === null) return { nsfw: null, score: null, source: null };
  return { nsfw: score >= threshold, score, source: "scan" };
}
