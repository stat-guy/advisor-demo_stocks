import {
  lookupCik,
  fetchCompanyFacts,
  fetchSubmissions,
  extractFinancials,
  isFinancialSic,
  type FilingRef as EdgarFiling,
} from "./sources/edgar";
import { getQuote } from "./sources/yahoo";
import { score } from "./rules/engine";
import { generateSummary } from "./summary";
import type { FilingRef, Snapshot, SnapshotError } from "@shared/types";

export const DISCLAIMER =
  "Informational signals from public filings and market data. Not investment advice.";

/** Tickers: 1–6 letters, optional dot/dash class suffix (e.g. BRK.B). */
export function isValidTicker(raw: string): boolean {
  return /^[A-Za-z]{1,6}([.-][A-Za-z]{1,3})?$/.test(raw.trim());
}

function toFilings(...refs: (EdgarFiling | null)[]): FilingRef[] {
  return refs.filter((r): r is EdgarFiling => r != null);
}

export async function buildSnapshot(
  rawTicker: string,
): Promise<Snapshot | SnapshotError> {
  const ticker = rawTicker.trim().toUpperCase();
  if (!isValidTicker(ticker))
    return { error: "Please enter a valid ticker symbol.", ticker, kind: "invalid_ticker" };

  const quotePromise = getQuote(ticker);
  const cikInfo = await lookupCik(ticker);

  // No SEC mapping — could still be a tradeable ETF/foreign filer. Show quote only.
  if (!cikInfo) {
    const quote = await quotePromise;
    if (!quote)
      return { error: `No data found for "${ticker}".`, ticker, kind: "invalid_ticker" };
    return {
      ticker,
      companyName: quote.name || ticker,
      cik: null,
      sector: null,
      isFinancialSector: false,
      quote,
      overall: {
        light: "neutral",
        rationale:
          "No SEC filings found for this symbol (e.g. an ETF or foreign filer) — showing the market quote only.",
      },
      cards: [],
      summary: null,
      summaryDisclaimer: DISCLAIMER,
      filings: [],
      dataNotes: ["No SEC XBRL financials available for this symbol."],
      generatedAt: new Date().toISOString(),
    };
  }

  const [facts, subs, quote] = await Promise.all([
    fetchCompanyFacts(cikInfo.cik),
    fetchSubmissions(cikInfo.cik).catch(() => null),
    quotePromise,
  ]);
  const fin = extractFinancials((facts ?? {}) as Parameters<typeof extractFinancials>[0]);
  const isFinancial = isFinancialSic(subs?.sic ?? null);
  const filings = toFilings(subs?.latest10K ?? null, subs?.latest10Q ?? null);
  const hasFinancials = fin.revenue.length > 0 || fin.netIncome.length > 0;

  // ETFs / foreign filers / trusts: a CIK exists but there are no XBRL financials.
  if (!hasFinancials) {
    if (!quote)
      return { error: `No filings or market data found for "${ticker}".`, ticker, kind: "no_filings" };
    return {
      ticker,
      companyName: cikInfo.name || quote.name || ticker,
      cik: cikInfo.cik,
      sector: subs?.sicDescription ?? null,
      isFinancialSector: isFinancial,
      quote,
      overall: {
        light: "neutral",
        rationale:
          "No SEC XBRL financial statements are available for this symbol (common for ETFs and foreign filers) — showing the market quote only.",
      },
      cards: [],
      summary: null,
      summaryDisclaimer: DISCLAIMER,
      filings,
      dataNotes: ["No SEC XBRL financials available for this symbol."],
      generatedAt: new Date().toISOString(),
    };
  }

  const { cards, overall } = score({ cik: cikInfo.cik, financials: fin, quote, isFinancial });

  const dataNotes: string[] = [];
  if (!quote) dataNotes.push("Live quote unavailable right now.");
  if (isFinancial)
    dataNotes.push("Financial-sector company — balance-sheet ratios are de-emphasized.");

  // Claude narration — fed only the computed signals; cached per filing version.
  const dataVersion = cards.find((c) => c.sourceFiling)?.sourceFiling?.accession ?? "na";
  const summary = await generateSummary({
    ticker,
    companyName: cikInfo.name || quote?.name || ticker,
    sector: subs?.sicDescription ?? null,
    overall,
    cards,
    dataVersion,
  });

  return {
    ticker,
    companyName: cikInfo.name || quote?.name || ticker,
    cik: cikInfo.cik,
    sector: subs?.sicDescription ?? null,
    isFinancialSector: isFinancial,
    quote,
    overall,
    cards,
    summary,
    summaryDisclaimer: DISCLAIMER,
    filings,
    dataNotes,
    generatedAt: new Date().toISOString(),
  };
}
