import { useId } from "react";

type BrandVariant = "symbol" | "wordmark" | "lockup";

type BrandTone = "dark" | "light";

const symbolDots = [
  { cx: 14, cy: 10, r: 4.2 },
  { cx: 26, cy: 10, r: 4.2 },
  { cx: 38, cy: 10, r: 4.2 },
  { cx: 50, cy: 10, r: 4.2 },
  { cx: 14, cy: 22, r: 4.2 },
  { cx: 14, cy: 34, r: 4.2 },
  { cx: 24, cy: 34, r: 3.9 },
  { cx: 36, cy: 34, r: 3.9 },
  { cx: 14, cy: 46, r: 4.2 },
  { cx: 14, cy: 58, r: 4.2 }
];

export function FunkMyFansBrand({
  variant = "lockup",
  tone = "dark",
  className = ""
}: {
  variant?: BrandVariant;
  tone?: BrandTone;
  className?: string;
}) {
  if (variant === "symbol") {
    return <FunkMyFansSymbol className={className} tone={tone} />;
  }

  if (variant === "wordmark") {
    return <FunkMyFansWordmark className={className} tone={tone} />;
  }

  return (
    <div className={`inline-flex items-center gap-3 ${className}`} aria-label="FunkMyFans">
      <FunkMyFansSymbol tone={tone} className="shrink-0" />
      <FunkMyFansWordmark tone={tone} />
    </div>
  );
}

export function FunkMyFansSymbol({ className = "", tone = "dark" }: { className?: string; tone?: BrandTone }) {
  const gradientId = useId().replace(/:/g, "");
  const fill = `url(#${gradientId})`;

  return (
    <svg className={className} viewBox="0 0 64 64" role="img" aria-label="FunkMyFans" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id={gradientId} x1="14" y1="8" x2="50" y2="60" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor={tone === "dark" ? "#E66A8D" : "#C21875"} />
          <stop offset="52%" stopColor="#E66A8D" />
          <stop offset="100%" stopColor="#7B3FF2" />
        </linearGradient>
      </defs>
      <title>FunkMyFans</title>
      {symbolDots.map((dot, index) => (
        <circle key={`${dot.cx}-${dot.cy}-${index}`} cx={dot.cx} cy={dot.cy} r={dot.r} fill={fill} />
      ))}
    </svg>
  );
}

export function FunkMyFansWordmark({ className = "", tone = "dark" }: { className?: string; tone?: BrandTone }) {
  const textColor = tone === "dark" ? "text-[#F3EEE8]" : "text-[#141418]";

  return (
    <span className={`inline-flex items-baseline gap-0.5 text-base font-semibold tracking-[-0.03em] ${textColor} ${className}`}>
      <span>Funk</span>
      <span className="text-[#C21875]">My</span>
      <span>Fans</span>
    </span>
  );
}
