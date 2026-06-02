import type { Light } from "@shared/types";

const SIGNAL_VAR: Record<Light, string> = {
  green: "var(--signal-green)",
  yellow: "var(--signal-yellow)",
  red: "var(--signal-red)",
  neutral: "var(--signal-neutral)",
};

/**
 * Tufte sparkline: word-sized, axis-free, no gridlines. The trend line recedes
 * (neutral), the latest point carries the signal color (primary mark). Series
 * that dip below zero get an explicit zero baseline so the crossing is honest.
 */
export function Sparkline({
  values,
  light,
  width = 116,
  height = 28,
}: {
  values: number[];
  light: Light;
  width?: number;
  height?: number;
}) {
  if (!values || values.length < 2) return null;

  const pad = 3;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const domainMin = min;
  const domainMax = max < 0 ? 0 : max; // all-negative: anchor the top at zero
  const span = domainMax - domainMin || 1;
  const showZero = min < 0;

  const x = (i: number) => pad + (i / (values.length - 1)) * (width - 2 * pad);
  const y = (v: number) => height - pad - ((v - domainMin) / span) * (height - 2 * pad);

  const points = values.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const lastI = values.length - 1;

  return (
    <svg
      role="img"
      aria-label="trend sparkline"
      data-testid="sparkline"
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="overflow-visible text-muted-foreground"
    >
      {showZero && (
        <line
          data-testid="spark-zero"
          x1={pad}
          x2={width - pad}
          y1={y(0)}
          y2={y(0)}
          stroke="currentColor"
          strokeWidth={0.75}
          strokeOpacity={0.35}
          strokeDasharray="2 2"
        />
      )}
      <polyline
        data-testid="spark-line"
        points={points}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeOpacity={0.6}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <circle
        data-testid="spark-last"
        data-light={light}
        cx={x(lastI)}
        cy={y(values[lastI])}
        r={2.4}
        style={{ fill: SIGNAL_VAR[light] }}
      />
    </svg>
  );
}
