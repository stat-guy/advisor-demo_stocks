// Shared types between the Bun server (data + rules) and the React frontend.

export type Light = "green" | "yellow" | "red" | "neutral";

/** A single labeled figure shown on a metric card, traceable to its filing. */
export interface Fact {
  label: string;
  value: string;
  period?: string;
}

/** Reference to the SEC filing a figure came from. */
export interface FilingRef {
  form: string; // "10-K" | "10-Q" | ...
  accession: string; // e.g. "0000320193-24-000123"
  filedDate: string; // ISO date
  url: string; // EDGAR document URL
  period?: string; // fiscal period end, ISO date
}

/** One traffic-light metric card. */
export interface MetricCard {
  key: string; // "revenue" | "profitability" | "earnings" | "balance" | "cashflow" | "valuation"
  label: string; // human label
  light: Light;
  headline: string; // short result, e.g. "Revenue +12% YoY"
  detail: string; // WHY this light (threshold reasoning)
  facts: Fact[];
  trend?: number[]; // chronological (oldest→newest) raw values for a sparkline
  sourceFiling?: FilingRef;
}

/** Live market quote. */
export interface Quote {
  symbol: string;
  name: string;
  price: number | null;
  change: number | null;
  changePercent: number | null;
  currency: string | null;
  marketCap: number | null;
  trailingPE: number | null;
  forwardPE: number | null;
  priceToSales: number | null;
  dayLow: number | null;
  dayHigh: number | null;
  fiftyTwoWeekLow: number | null;
  fiftyTwoWeekHigh: number | null;
  exchange: string | null;
  asOf: string; // ISO timestamp the quote was fetched
}

/** Overall roll-up verdict. */
export interface OverallVerdict {
  light: Light;
  rationale: string;
}

/** The full payload the dashboard renders for one ticker. */
export interface Snapshot {
  ticker: string;
  companyName: string;
  cik: string | null;
  sector: string | null;
  isFinancialSector: boolean;
  quote: Quote | null;
  overall: OverallVerdict;
  cards: MetricCard[];
  summary: string | null; // Claude narration; null when disabled / no key
  summaryDisclaimer: string;
  filings: FilingRef[];
  dataNotes: string[]; // e.g. "No SEC XBRL financials available for this ticker"
  generatedAt: string; // ISO timestamp
}

/** Error envelope returned by the API for unknown / unsupported tickers. */
export interface SnapshotError {
  error: string;
  ticker: string;
  kind: "invalid_ticker" | "no_filings" | "no_quote" | "internal";
}
