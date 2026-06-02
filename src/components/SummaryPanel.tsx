import type { Snapshot } from "@shared/types";

export function SummaryPanel({ snap }: { snap: Snapshot }) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="mb-2 flex items-center gap-2">
        <span className="text-sm font-medium">Plain-English summary</span>
        <span className="rounded bg-secondary px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
          Opus 4.8 · narration only
        </span>
      </div>
      {snap.summary ? (
        <p className="text-sm leading-relaxed text-foreground/90">{snap.summary}</p>
      ) : (
        <p className="text-sm italic leading-relaxed text-muted-foreground">
          Summary unavailable. The signals above are computed deterministically from SEC
          filings and market data — they do not depend on the AI.
        </p>
      )}
      <p className="mt-3 border-t pt-2 text-xs text-muted-foreground">
        {snap.summaryDisclaimer}
      </p>
    </div>
  );
}
