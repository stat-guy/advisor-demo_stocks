import { useEffect, useState } from "react";
import { fetchSnapshot, isError, type SnapshotResult } from "@/lib/api";
import type { Snapshot } from "@shared/types";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { MetricCardView } from "@/components/MetricCard";
import { OverallBanner } from "@/components/OverallBanner";
import { QuoteHeader } from "@/components/QuoteHeader";
import { SummaryPanel } from "@/components/SummaryPanel";
import { ThemeToggle } from "@/components/ThemeToggle";

const DEMO = ["F", "TSLA", "RIVN"];

export default function App() {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SnapshotResult | null>(null);

  async function run(t: string) {
    const tick = t.trim().toUpperCase();
    if (!tick) return;
    setInput(tick);
    setLoading(true);
    window.history.replaceState(null, "", `?ticker=${encodeURIComponent(tick)}`);
    try {
      setResult(await fetchSnapshot(tick));
    } catch {
      setResult({ error: "Network error — please try again.", ticker: tick, kind: "internal" });
    } finally {
      setLoading(false);
    }
  }

  // Deep link: ?ticker=TSLA auto-loads (shareable demo links over the Funnel URL).
  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get("ticker");
    if (t) void run(t);
  }, []);

  const snap = result && !isError(result) ? result : null;
  const err = result && isError(result) ? result : null;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <div className="flex items-baseline gap-2">
            <span className="font-semibold">Advisor Stock Snapshot</span>
            <span className="hidden text-xs text-muted-foreground sm:inline">
              deterministic signals · grounded in SEC filings
            </span>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-6 px-4 py-6">
        <form onSubmit={(e) => { e.preventDefault(); run(input); }} className="flex flex-wrap items-center gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value.toUpperCase())}
            placeholder="Enter a ticker — e.g. TSLA"
            className="max-w-xs uppercase"
            autoFocus
            aria-label="Ticker symbol"
          />
          <Button type="submit" disabled={loading}>
            {loading ? "Analyzing…" : "Analyze"}
          </Button>
          <div className="ml-auto flex items-center gap-1">
            <span className="text-xs text-muted-foreground">Try:</span>
            {DEMO.map((d) => (
              <Button key={d} type="button" variant="ghost" size="sm" onClick={() => run(d)}>
                {d}
              </Button>
            ))}
          </div>
        </form>

        {loading && <LoadingState />}
        {!loading && err && <ErrorState message={err.error} />}
        {!loading && snap && <SnapshotView snap={snap} />}
        {!loading && !result && <EmptyState onPick={run} />}
      </main>
    </div>
  );
}

function SnapshotView({ snap }: { snap: Snapshot }) {
  return (
    <div className="space-y-5">
      <QuoteHeader snap={snap} />
      <OverallBanner overall={snap.overall} />
      {snap.cards.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {snap.cards.map((c) => (
            <MetricCardView key={c.key} card={c} />
          ))}
        </div>
      )}
      <SummaryPanel snap={snap} />
      {snap.dataNotes.length > 0 && (
        <ul className="space-y-1 text-xs text-muted-foreground">
          {snap.dataNotes.map((n, i) => (
            <li key={i}>• {n}</li>
          ))}
        </ul>
      )}
      {snap.filings.length > 0 && (
        <div className="text-xs text-muted-foreground">
          Source filings:{" "}
          {snap.filings.map((f, i) => (
            <a key={i} href={f.url} target="_blank" rel="noreferrer" className="mr-3 underline">
              {f.form} ({f.filedDate})
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

function LoadingState() {
  return (
    <div className="space-y-5">
      <Skeleton className="h-16 w-full" />
      <Skeleton className="h-20 w-full" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-40 w-full" />
        ))}
      </div>
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-signal-red/30 bg-signal-red-bg p-6 text-center">
      <div className="text-sm font-medium text-signal-red">{message}</div>
      <p className="mt-1 text-xs text-muted-foreground">
        Check the symbol and try again — e.g. AAPL, MSFT, F.
      </p>
    </div>
  );
}

function EmptyState({ onPick }: { onPick: (t: string) => void }) {
  return (
    <div className="rounded-xl border border-dashed p-10 text-center">
      <h2 className="text-lg font-medium">Get up to speed on a stock in seconds</h2>
      <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
        Enter a ticker for a fixed, deterministic read on financial health — revenue,
        profitability, earnings, balance sheet, and cash flow — each scored 🟢/🟡/🔴 and
        traced to the underlying SEC filing.
      </p>
      <div className="mt-4 flex items-center justify-center gap-2">
        {DEMO.map((d) => (
          <Button key={d} variant="outline" size="sm" onClick={() => onPick(d)}>
            {d}
          </Button>
        ))}
      </div>
    </div>
  );
}
