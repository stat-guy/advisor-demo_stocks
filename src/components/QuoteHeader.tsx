import { cn } from "@/lib/utils";
import { money, pct, price, range, timeOf } from "@/lib/format";
import { RangeStrip } from "./RangeStrip";
import type { Snapshot } from "@shared/types";

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="truncate text-sm font-medium tabular-nums">{value}</div>
    </div>
  );
}

export function QuoteHeader({ snap }: { snap: Snapshot }) {
  const q = snap.quote;
  const up = (q?.changePercent ?? 0) >= 0;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">{snap.companyName}</h1>
            <span className="rounded-md bg-secondary px-2 py-0.5 text-sm font-medium text-secondary-foreground">
              {snap.ticker}
            </span>
          </div>
          <div className="mt-1 text-sm text-muted-foreground">
            {snap.sector ?? "—"}
            {q?.exchange ? ` · ${q.exchange}` : ""}
          </div>
        </div>
        {q && (
          <div className="text-right">
            <div className="text-3xl font-semibold tabular-nums">{price(q.price)}</div>
            <div
              className={cn(
                "text-sm font-medium tabular-nums",
                up ? "text-signal-green" : "text-signal-red",
              )}
            >
              {pct(q.changePercent)}
              {q.change != null ? ` (${up ? "+" : ""}${q.change.toFixed(2)})` : ""}
            </div>
            <div className="mt-0.5 text-xs text-muted-foreground">
              as of {timeOf(q.asOf)}
            </div>
          </div>
        )}
      </div>

      {q && (
        <div className="grid grid-cols-2 gap-3 rounded-xl border bg-card p-4 sm:grid-cols-4">
          <Stat label="Market cap" value={money(q.marketCap)} />
          <Stat label="Day range" value={range(q.dayLow, q.dayHigh)} />
          {q.fiftyTwoWeekLow != null && q.fiftyTwoWeekHigh != null && q.price != null ? (
            <RangeStrip low={q.fiftyTwoWeekLow} high={q.fiftyTwoWeekHigh} value={q.price} />
          ) : (
            <Stat label="52-week range" value={range(q.fiftyTwoWeekLow, q.fiftyTwoWeekHigh)} />
          )}
          <Stat
            label="P/E · P/S"
            value={`${q.trailingPE != null ? q.trailingPE.toFixed(1) : "—"} · ${q.priceToSales != null ? q.priceToSales.toFixed(2) : "—"}`}
          />
        </div>
      )}
    </div>
  );
}
