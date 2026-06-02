import { price } from "@/lib/format";

/** Linear position (0–100%) of value within [low, high]; clamped. Lie factor 1.0. */
export function rangePosition(low: number, high: number, value: number): number {
  if (high <= low) return 0;
  return Math.max(0, Math.min(1, (value - low) / (high - low))) * 100;
}

/**
 * Tufte range-frame: shows where the current price sits within its band, with
 * the endpoints labeled. Answers "compared to what?" honestly — position is the
 * exact linear fraction, no distortion.
 */
export function RangeStrip({
  low,
  high,
  value,
  label = "52-week range",
}: {
  low: number;
  high: number;
  value: number;
  label?: string;
}) {
  const pct = rangePosition(low, high, value);
  return (
    <div className="min-w-0">
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="relative mt-2 h-1 rounded-full bg-border" data-testid="range-track">
        <div
          data-testid="range-marker"
          className="absolute top-1/2 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-foreground ring-2 ring-background"
          style={{ left: `${pct}%` }}
        />
      </div>
      <div className="mt-1 flex justify-between text-[11px] tabular-nums text-muted-foreground">
        <span>{price(low)}</span>
        <span>{price(high)}</span>
      </div>
    </div>
  );
}
