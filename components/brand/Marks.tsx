import { burstField, burstPath, discField, dotLetter, halftoneDots, loopPaths, spiralPath } from "@/lib/brand.mjs";

type MarkProps = { size?: number; className?: string; title?: string };

/** Shared wrapper: marks draw in `currentColor`; cut-outs use --mark-cut (the colour behind the mark). */
function Svg({ size = 32, className, title, children }: MarkProps & { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      className={className}
      fill="currentColor"
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      {children}
    </svg>
  );
}
const CUT = "var(--mark-cut, #111110)";

/** 1. A soft eight-lobed sunburst with a spiral at its heart: the sun, and the loop a GIF plays in. */
export function BurstLoop(p: MarkProps) {
  return (
    <Svg {...p}>
      <path d={burstPath(50, 50, 49)} />
      <path d={spiralPath(50, 50, 3, 22, 1.7)} fill="none" stroke={CUT} strokeWidth="7.5" strokeLinecap="round" />
    </Svg>
  );
}

/** 2. The burst with a play triangle cut out. The clearest at very small sizes. */
export function BurstPlay(p: MarkProps) {
  return (
    <Svg {...p}>
      <path d={burstPath(50, 50, 49)} />
      <path d="M41 31.5 69 50 41 68.5Z" fill={CUT} stroke={CUT} strokeWidth="5" strokeLinejoin="round" />
    </Svg>
  );
}

/** 3. The burst rendered as halftone dots. For large sizes only; dots blur together when small. */
export function HalftoneBurst(p: MarkProps) {
  const dots = halftoneDots({ size: 100, pitch: 7.2, field: burstField(100, { scale: 0.47 }), soft: 0.3, maxRatio: 0.66, min: 0.5 });
  return (
    <Svg {...p}>
      {dots.map((d, i) => <circle key={i} cx={d.x} cy={d.y} r={d.r} />)}
    </Svg>
  );
}

/** 4. A sun whose rays are a loading spinner, around a loop arrow. */
export function SpinnerSun(p: MarkProps) {
  const { ring, head } = loopPaths(50, 50, 17, 6.5);
  return (
    <Svg {...p}>
      {Array.from({ length: 12 }, (_, i) => {
        const width = 7.5 - i * 0.42; // rays thin out clockwise, like a spinner's tail
        return (
          <rect key={i} x={50 - width / 2} y={3} width={width} height={15} rx={width / 2} transform={`rotate(${i * 30} 50 50)`} />
        );
      })}
      <path d={ring} fill="none" stroke="currentColor" strokeWidth="6.5" strokeLinecap="round" />
      <path d={head} />
    </Svg>
  );
}

/** 5. A dot-matrix G that fades like a halftone. */
export function DotG(p: MarkProps) {
  return (
    <Svg {...p}>
      {dotLetter(100).map((d, i) => <circle key={i} cx={d.x} cy={d.y} r={d.r} />)}
    </Svg>
  );
}

/** 6. Three frames of an animation, the front one holding a small sun. */
export function Frames(p: MarkProps) {
  return (
    <Svg {...p}>
      <rect x="8" y="8" width="56" height="56" rx="12" opacity="0.3" />
      <rect x="22" y="22" width="56" height="56" rx="12" opacity="0.6" />
      <rect x="36" y="36" width="56" height="56" rx="12" />
      <path d={burstPath(64, 64, 17)} fill={CUT} />
    </Svg>
  );
}

/** A large halftone disc, for artwork rather than as a logo. */
export function HalftoneDisc(p: MarkProps) {
  const dots = halftoneDots({ size: 100, pitch: 6, field: discField(100, 0.42), soft: 0.5, maxRatio: 0.62, min: 0.4 });
  return (
    <Svg {...p}>
      {dots.map((d, i) => <circle key={i} cx={d.x} cy={d.y} r={d.r} />)}
    </Svg>
  );
}

export const MARKS = [
  { id: "burst-loop", name: "Burst loop", note: "Sunburst with a spiral: the sun, and the loop a GIF plays in.", Mark: BurstLoop },
  { id: "burst-play", name: "Burst play", note: "Sunburst with a play symbol. The clearest at tiny sizes.", Mark: BurstPlay },
  { id: "halftone-burst", name: "Halftone burst", note: "The burst in halftone dots. Striking when large, soft when small.", Mark: HalftoneBurst },
  { id: "spinner-sun", name: "Spinner sun", note: "Rays that read as a loading spinner, around a loop arrow.", Mark: SpinnerSun },
  { id: "dot-g", name: "Dot G", note: "A dot-matrix G with a halftone fade.", Mark: DotG },
  { id: "frames", name: "Frames", note: "Three frames of an animation with a small sun.", Mark: Frames },
] as const;
