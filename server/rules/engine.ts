import type { Financials, FinPoint } from "../sources/edgar";
import { buildFilingUrl } from "../sources/edgar";
import type {
  Fact,
  FilingRef,
  Light,
  MetricCard,
  OverallVerdict,
  Quote,
} from "@shared/types";

export interface EngineInput {
  cik: string;
  financials: Financials;
  quote: Quote | null;
  isFinancial: boolean;
}

// ── formatting ────────────────────────────────────────────────────────────────
function money(v: number): string {
  const sign = v < 0 ? "-" : "";
  const a = Math.abs(v);
  if (a >= 1e12) return `${sign}$${(a / 1e12).toFixed(2)}T`;
  if (a >= 1e9) return `${sign}$${(a / 1e9).toFixed(2)}B`;
  if (a >= 1e6) return `${sign}$${(a / 1e6).toFixed(1)}M`;
  return `${sign}$${a.toFixed(0)}`;
}
const signedPct = (x: number) => `${x >= 0 ? "+" : ""}${(x * 100).toFixed(1)}%`;
const levelPct = (x: number) => `${(x * 100).toFixed(1)}%`;
const ratio = (x: number) => x.toFixed(2);
const eps = (v: number) => `${v < 0 ? "-" : ""}$${Math.abs(v).toFixed(2)}`;
const cap = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s);

// ── helpers ───────────────────────────────────────────────────────────────────
const SEVERITY: Record<Light, number> = { neutral: -1, green: 0, yellow: 1, red: 2 };
function worst(lights: Light[]): Light {
  return lights.reduce((a, b) => (SEVERITY[b] > SEVERITY[a] ? b : a), "green");
}
/** Count positive YoY steps among the latest `maxSteps` (series is newest-first). */
function countUps(series: FinPoint[], maxSteps: number): number {
  let ups = 0;
  for (let i = 0; i < Math.min(maxSteps, series.length - 1); i++) {
    if (series[i].value > series[i + 1].value) ups++;
  }
  return ups;
}
/** Chronological (oldest→newest) raw values for a sparkline; null if too short. */
function trendOf(series: FinPoint[], n = 6): number[] | undefined {
  if (series.length < 2) return undefined;
  return series.slice(0, n).map((p) => p.value).reverse();
}

function filingOf(cik: string, p: FinPoint | undefined): FilingRef | undefined {
  if (!p) return undefined;
  return {
    form: p.form,
    accession: p.accession,
    filedDate: p.filed,
    period: p.end,
    url: buildFilingUrl(cik, p.accession),
  };
}
function seriesFacts(series: FinPoint[], fmt: (v: number) => string, n = 3): Fact[] {
  return series.slice(0, n).map((p) => ({
    label: `FY${p.fy}`,
    value: fmt(p.value),
    period: p.end,
  }));
}
function neutral(
  key: string,
  label: string,
  detail: string,
  facts: Fact[] = [],
): MetricCard {
  return { key, label, light: "neutral", headline: "Limited data", detail, facts };
}

// ── card scorers ────────────────────────────────────────────────────────────────
function scoreRevenue(fin: Financials, cik: string): MetricCard {
  const rev = fin.revenue;
  if (rev.length < 2)
    return neutral("revenue", "Revenue", "Not enough annual revenue history to assess a trend.", seriesFacts(rev, money));
  const g = (rev[0].value - rev[1].value) / Math.abs(rev[1].value);
  const ups = countUps(rev, 3);
  const steps = Math.min(3, rev.length - 1);
  let light: Light;
  if (g > 0.05 && ups >= 2) light = "green";
  else if (g < -0.02) light = "red";
  else light = "yellow";
  const detail =
    light === "green"
      ? `Revenue grew ${signedPct(g)} year-over-year, rising in ${ups} of the last ${steps} years.`
      : light === "red"
        ? `Revenue declined ${signedPct(g)} year-over-year.`
        : `Revenue changed ${signedPct(g)} year-over-year — flat-to-modest or uneven.`;
  return {
    key: "revenue",
    label: "Revenue",
    light,
    headline: `${money(rev[0].value)} · ${signedPct(g)} YoY`,
    detail,
    facts: seriesFacts(rev, money),
    trend: trendOf(rev),
    sourceFiling: filingOf(cik, rev[0]),
  };
}

function scoreProfitability(fin: Financials, cik: string): MetricCard {
  const ni = fin.netIncome;
  const rev = fin.revenue;
  if (!ni.length || !rev.length)
    return neutral("profitability", "Profitability", "Net income or revenue not reported.");
  const margin = ni[0].value / rev[0].value;
  const priorMargin = ni[1] && rev[1] ? ni[1].value / rev[1].value : null;
  let light: Light;
  let detail: string;
  if (ni[0].value < 0) {
    light = "red";
    detail = `Net loss of ${money(ni[0].value)} (net margin ${levelPct(margin)}).`;
  } else if (margin < 0.05) {
    light = "yellow";
    detail = `Profitable, but net margin of ${levelPct(margin)} is below the 5% caution line.`;
  } else if (priorMargin != null && margin < priorMargin - 0.005) {
    light = "yellow";
    detail = `Profitable, but net margin compressed from ${levelPct(priorMargin)} to ${levelPct(margin)}.`;
  } else {
    light = "green";
    detail =
      priorMargin != null
        ? `Net margin ${levelPct(margin)}, ${margin >= priorMargin ? "stable-to-expanding vs" : "vs"} ${levelPct(priorMargin)} a year ago.`
        : `Net margin ${levelPct(margin)}.`;
  }
  return {
    key: "profitability",
    label: "Profitability",
    light,
    headline: `Net margin ${levelPct(margin)}`,
    detail,
    facts: [
      { label: "Net income (latest FY)", value: money(ni[0].value), period: ni[0].end },
      { label: "Net margin", value: levelPct(margin) },
      ...(priorMargin != null ? [{ label: "Prior-year margin", value: levelPct(priorMargin) }] : []),
    ],
    trend: trendOf(ni),
    sourceFiling: filingOf(cik, ni[0]),
  };
}

function scoreEarnings(fin: Financials, cik: string): MetricCard {
  const e = fin.epsDiluted;
  if (!e.length)
    return neutral("earnings", "Earnings (EPS)", "Diluted EPS not reported.");
  const latest = e[0].value;
  const prior = e[1]?.value ?? null;
  let light: Light;
  let detail: string;
  if (latest < 0) {
    light = "red";
    detail = `Diluted EPS is negative at ${eps(latest)}.`;
  } else if (prior != null && latest <= prior) {
    light = "yellow";
    detail = `Diluted EPS positive but flat-to-declining (${eps(prior)} → ${eps(latest)}).`;
  } else {
    light = "green";
    detail =
      prior != null
        ? `Diluted EPS positive at ${eps(latest)}, up from ${eps(prior)} a year ago.`
        : `Diluted EPS positive at ${eps(latest)}.`;
  }
  return {
    key: "earnings",
    label: "Earnings (EPS)",
    light,
    headline: `Diluted EPS ${eps(latest)}`,
    detail,
    facts: seriesFacts(e, eps),
    trend: trendOf(e),
    sourceFiling: filingOf(cik, e[0]),
  };
}

function scoreBalance(fin: Financials, cik: string, isFinancial: boolean): MetricCard {
  if (isFinancial) {
    return neutral(
      "balance",
      "Balance sheet",
      "Current ratio and leverage are not meaningful for financial-sector companies — review the filings directly.",
    );
  }
  const ac = fin.assetsCurrent?.value ?? null;
  const lc = fin.liabilitiesCurrent?.value ?? null;
  const eq = fin.stockholdersEquity?.value ?? null;
  const debt = fin.totalDebt?.value ?? null;
  const parts: string[] = [];
  const scored: Light[] = [];

  // liquidity
  if (ac != null && lc != null && lc > 0) {
    const cr = ac / lc;
    const liq: Light = cr >= 1.5 ? "green" : cr >= 1.0 ? "yellow" : "red";
    scored.push(liq);
    parts.push(
      `current ratio ${ratio(cr)} (${liq === "green" ? "healthy ≥1.5" : liq === "yellow" ? "adequate 1.0–1.5" : "tight <1.0"})`,
    );
  }

  // leverage
  if (eq != null && eq <= 0) {
    scored.push("red");
    parts.push("negative shareholders' equity");
  } else if (debt != null && eq != null && eq > 0) {
    const de = debt / eq;
    const unreliable = de < 0.05 && lc != null && lc > eq;
    if (unreliable) {
      parts.push(
        `debt/equity not scored — the reported debt tag (${money(debt)}) looks incomplete for this capital structure (n/a)`,
      );
    } else {
      const lev: Light = de < 1.0 ? "green" : de <= 2.0 ? "yellow" : "red";
      scored.push(lev);
      parts.push(
        `debt/equity ${ratio(de)} (${lev === "green" ? "<1.0" : lev === "yellow" ? "1.0–2.0" : ">2.0"})`,
      );
    }
  } else {
    parts.push("debt/equity n/a (debt not reliably reported)");
  }

  let light: Light;
  if (eq != null && eq <= 0) light = "red";
  else if (!scored.length) light = "neutral";
  else light = worst(scored);

  return {
    key: "balance",
    label: "Balance sheet",
    light,
    headline:
      light === "neutral"
        ? "Balance sheet — limited data"
        : `Balance sheet ${light === "green" ? "solid" : light === "yellow" ? "adequate" : "strained"}`,
    detail: cap(parts.join("; ")) + ".",
    facts: [
      ...(ac != null && lc != null ? [{ label: "Current assets / liabilities", value: `${money(ac)} / ${money(lc)}` }] : []),
      ...(eq != null ? [{ label: "Shareholders' equity", value: money(eq) }] : []),
      ...(debt != null ? [{ label: "Reported debt", value: money(debt) }] : []),
    ],
    sourceFiling: filingOf(cik, fin.assetsCurrent ?? undefined),
  };
}

function scoreCashFlow(fin: Financials, cik: string): MetricCard {
  const ocfS = fin.operatingCashFlow;
  if (!ocfS.length)
    return neutral("cashflow", "Cash flow", "Operating cash flow not reported.");
  const ocf = ocfS[0].value;
  const prior = ocfS[1]?.value ?? null;
  const capex = fin.capex[0]?.value ?? null;
  const fcf = capex != null ? ocf - capex : null;
  let light: Light;
  let detail: string;
  if (ocf < 0) {
    light = "red";
    detail = `Operating cash flow is negative at ${money(ocf)} — the business is consuming cash.`;
  } else if (fcf != null && fcf < 0) {
    light = "yellow";
    detail = `Operating cash flow positive (${money(ocf)}) but free cash flow negative (${money(fcf)}) after ${money(capex!)} of capex.`;
  } else if (prior != null && ocf < prior * 0.95) {
    light = "yellow";
    detail = `Operating cash flow positive but declined from ${money(prior)} to ${money(ocf)} year-over-year.`;
  } else {
    light = "green";
    detail = `Operating cash flow ${money(ocf)}${fcf != null ? `, free cash flow ${money(fcf)}` : ""}${prior != null && ocf >= prior ? ", growing year-over-year" : ""}.`;
  }
  return {
    key: "cashflow",
    label: "Cash flow",
    light,
    headline: `Operating CF ${money(ocf)}`,
    detail,
    facts: [
      { label: "Operating cash flow", value: money(ocf), period: ocfS[0].end },
      ...(fcf != null ? [{ label: "Free cash flow", value: money(fcf) }] : []),
      ...(capex != null ? [{ label: "Capex", value: money(capex) }] : []),
    ],
    trend: trendOf(ocfS),
    sourceFiling: filingOf(cik, ocfS[0]),
  };
}

function scoreValuation(quote: Quote | null): MetricCard {
  const facts: Fact[] = [];
  if (quote) {
    if (quote.trailingPE != null) facts.push({ label: "Trailing P/E", value: ratio(quote.trailingPE) });
    if (quote.forwardPE != null) facts.push({ label: "Forward P/E", value: ratio(quote.forwardPE) });
    if (quote.priceToSales != null) facts.push({ label: "Price / Sales", value: ratio(quote.priceToSales) });
    if (quote.marketCap != null) facts.push({ label: "Market cap", value: money(quote.marketCap) });
  }
  let rich = "";
  if (quote?.trailingPE != null && quote.trailingPE > 40)
    rich = ` A trailing P/E of ${ratio(quote.trailingPE)} is elevated, implying high growth expectations priced in.`;
  else if (quote?.priceToSales != null && quote.priceToSales > 10)
    rich = ` A price/sales of ${ratio(quote.priceToSales)} is elevated.`;
  const headline =
    quote?.trailingPE != null
      ? `P/E ${ratio(quote.trailingPE)}`
      : quote?.priceToSales != null
        ? `P/S ${ratio(quote.priceToSales)}`
        : "Valuation context";
  return {
    key: "valuation",
    label: "Valuation (context)",
    light: "neutral", // never a health signal
    headline,
    detail:
      "Context only — valuation is not a health signal. A low multiple can reflect distress; a high one, growth expectations." +
      rich,
    facts,
  };
}

// ── roll-up ───────────────────────────────────────────────────────────────────
function rollup(cards: MetricCard[]): OverallVerdict {
  const health = cards.filter((c) => c.key !== "valuation");
  const reds = health.filter((c) => c.light === "red");
  const yellows = health.filter((c) => c.light === "yellow");
  const scored = health.filter((c) => c.light !== "neutral");
  const prof = cards.find((c) => c.key === "profitability");
  const bal = cards.find((c) => c.key === "balance");
  // Critical: a reported net loss, or a broken balance sheet.
  const critical = prof?.light === "red" || bal?.light === "red";

  let light: Light;
  if (!scored.length) light = "neutral";
  else if (critical || reds.length >= 2) light = "red";
  else if (reds.length === 0 && yellows.length <= 1) light = "green";
  else light = "yellow";

  const names = (cs: MetricCard[]) => cs.map((c) => c.label.toLowerCase()).join(", ");
  let rationale: string;
  if (light === "neutral") rationale = "Not enough reported data to form an overall signal.";
  else if (light === "red")
    rationale = critical && prof?.light === "red"
      ? `Critical concern: the company reported a net loss. ${reds.length} of ${health.length} metrics are red (${names(reds)}).`
      : `${reds.length} of ${health.length} metrics are red (${names(reds)}).`;
  else if (light === "green")
    rationale = `Healthy across the board — ${health.filter((c) => c.light === "green").length} green${yellows.length ? `, ${yellows.length} caution (${names(yellows)})` : ""}.`;
  else
    rationale = `No red flags, but ${yellows.length} metric${yellows.length > 1 ? "s" : ""} warrant${yellows.length > 1 ? "" : "s"} caution (${names(yellows)}).`;

  return { light, rationale };
}

// ── entry point ─────────────────────────────────────────────────────────────────
export function score(input: EngineInput): {
  cards: MetricCard[];
  overall: OverallVerdict;
} {
  const { cik, financials, quote, isFinancial } = input;
  const cards: MetricCard[] = [
    scoreRevenue(financials, cik),
    scoreProfitability(financials, cik),
    scoreEarnings(financials, cik),
    scoreBalance(financials, cik, isFinancial),
    scoreCashFlow(financials, cik),
    scoreValuation(quote),
  ];
  return { cards, overall: rollup(cards) };
}
