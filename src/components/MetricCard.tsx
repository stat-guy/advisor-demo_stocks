import { Card } from "@/components/ui/card";
import { SignalDot } from "./SignalDot";
import { Sparkline } from "./Sparkline";
import { cn } from "@/lib/utils";
import type { Light, MetricCard } from "@shared/types";

const TINT: Record<Light, string> = {
  green: "bg-signal-green-bg text-signal-green",
  yellow: "bg-signal-yellow-bg text-signal-yellow",
  red: "bg-signal-red-bg text-signal-red",
  neutral: "bg-signal-neutral-bg text-signal-neutral",
};

const BADGE_TEXT: Record<Light, string> = {
  green: "Healthy",
  yellow: "Caution",
  red: "Weak",
  neutral: "Context",
};

export function MetricCardView({ card }: { card: MetricCard }) {
  return (
    <Card className="gap-3 py-4">
      <div className="flex items-start justify-between gap-3 px-4">
        <div className="flex items-center gap-2">
          <SignalDot light={card.light} />
          <span className="text-sm font-medium text-muted-foreground">{card.label}</span>
        </div>
        <span
          className={cn(
            "rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide",
            TINT[card.light],
          )}
        >
          {BADGE_TEXT[card.light]}
        </span>
      </div>

      <div className="px-4">
        <div className="flex items-end justify-between gap-3">
          <div className="text-lg font-semibold tabular-nums">{card.headline}</div>
          {card.trend && card.trend.length >= 2 && (
            <Sparkline values={card.trend} light={card.light} />
          )}
        </div>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{card.detail}</p>
      </div>

      {card.facts.length > 0 && (
        <div className="flex flex-wrap gap-x-4 gap-y-1 px-4 text-xs text-muted-foreground">
          {card.facts.map((f, i) => (
            <span key={i}>
              <span className="text-foreground/70">{f.label}:</span>{" "}
              <span className="tabular-nums">{f.value}</span>
            </span>
          ))}
        </div>
      )}

      {card.sourceFiling && (
        <div className="px-4">
          <a
            href={card.sourceFiling.url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground hover:underline"
          >
            <span aria-hidden>↗</span> Source: {card.sourceFiling.form} · filed{" "}
            {card.sourceFiling.filedDate}
          </a>
        </div>
      )}
    </Card>
  );
}
