import { SignalDot } from "./SignalDot";
import { cn } from "@/lib/utils";
import type { Light, OverallVerdict } from "@shared/types";

const FRAME: Record<Light, string> = {
  green: "border-signal-green/30 bg-signal-green-bg",
  yellow: "border-signal-yellow/30 bg-signal-yellow-bg",
  red: "border-signal-red/30 bg-signal-red-bg",
  neutral: "border-border bg-signal-neutral-bg",
};

const WORD: Record<Light, string> = {
  green: "Healthy",
  yellow: "Caution",
  red: "Weak",
  neutral: "No overall signal",
};

const TEXT: Record<Light, string> = {
  green: "text-signal-green",
  yellow: "text-signal-yellow",
  red: "text-signal-red",
  neutral: "text-muted-foreground",
};

export function OverallBanner({ overall }: { overall: OverallVerdict }) {
  return (
    <div className={cn("flex items-start gap-4 rounded-xl border p-4", FRAME[overall.light])}>
      <SignalDot light={overall.light} size="lg" className="mt-1" />
      <div>
        <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Overall signal
        </div>
        <div className={cn("text-xl font-semibold", TEXT[overall.light])}>
          {WORD[overall.light]}
        </div>
        <p className="mt-1 max-w-2xl text-sm leading-relaxed text-foreground/80">
          {overall.rationale}
        </p>
      </div>
    </div>
  );
}
