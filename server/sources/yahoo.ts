import YahooFinance from "yahoo-finance2";
import type { Quote } from "@shared/types";
import { cacheGet, cacheSet } from "../db";

const yf = new YahooFinance({ suppressNotices: ["yahooSurvey"] });

function num(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

function str(v: unknown): string | null {
  return typeof v === "string" && v.length > 0 ? v : null;
}

/** Pure: map a yahoo-finance2 quote payload to our Quote shape. */
export function normalizeQuote(raw: any, asOf: string): Quote {
  return {
    symbol: String(raw.symbol ?? ""),
    name: str(raw.longName) ?? str(raw.shortName) ?? String(raw.symbol ?? ""),
    price: num(raw.regularMarketPrice),
    change: num(raw.regularMarketChange),
    changePercent: num(raw.regularMarketChangePercent),
    currency: str(raw.currency),
    marketCap: num(raw.marketCap),
    trailingPE: num(raw.trailingPE),
    forwardPE: num(raw.forwardPE),
    priceToSales: num(raw.priceToSalesTrailing12Months),
    dayLow: num(raw.regularMarketDayLow),
    dayHigh: num(raw.regularMarketDayHigh),
    fiftyTwoWeekLow: num(raw.fiftyTwoWeekLow),
    fiftyTwoWeekHigh: num(raw.fiftyTwoWeekHigh),
    exchange: str(raw.fullExchangeName) ?? str(raw.exchange),
    asOf,
  };
}

const QUOTE_TTL = 15_000; // 15s — keep the price fresh, dedupe bursts only

/** Impure: fetch a live quote (short-TTL cached). Returns null if unavailable. */
export async function getQuote(symbol: string): Promise<Quote | null> {
  const KEY = `yahoo:quote:${symbol.toUpperCase()}`;
  const cached = cacheGet<Quote>(KEY, QUOTE_TTL);
  if (cached) return cached;
  try {
    // quote() gives price/change/mktcap/ranges; summaryDetail adds PE / P-S.
    const [q, sd] = await Promise.all([
      yf.quote(symbol),
      yf
        .quoteSummary(symbol, { modules: ["summaryDetail"] })
        .then((r: any) => r?.summaryDetail ?? null)
        .catch(() => null),
    ]);
    if (!q || num((q as any).regularMarketPrice) === null) return null;
    const merged = { ...(sd ?? {}), ...(q as any) };
    const quote = normalizeQuote(merged, new Date().toISOString());
    cacheSet(KEY, quote);
    return quote;
  } catch {
    return null;
  }
}
