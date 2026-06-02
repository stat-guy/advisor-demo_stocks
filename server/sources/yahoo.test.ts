import { test, expect, describe } from "bun:test";
import { normalizeQuote } from "./yahoo";

describe("normalizeQuote", () => {
  const raw = {
    symbol: "F",
    longName: "Ford Motor Company",
    regularMarketPrice: 12.34,
    regularMarketChange: -0.12,
    regularMarketChangePercent: -0.96,
    regularMarketDayLow: 12.1,
    regularMarketDayHigh: 12.5,
    fiftyTwoWeekLow: 9.5,
    fiftyTwoWeekHigh: 14.2,
    marketCap: 49_000_000_000,
    trailingPE: 7.1,
    forwardPE: 6.2,
    priceToSalesTrailing12Months: 0.3,
    currency: "USD",
    fullExchangeName: "NYSE",
  };

  test("maps a full quote payload", () => {
    const q = normalizeQuote(raw, "2026-06-02T00:00:00.000Z");
    expect(q.symbol).toBe("F");
    expect(q.name).toBe("Ford Motor Company");
    expect(q.price).toBe(12.34);
    expect(q.change).toBe(-0.12);
    expect(q.changePercent).toBe(-0.96);
    expect(q.marketCap).toBe(49_000_000_000);
    expect(q.trailingPE).toBe(7.1);
    expect(q.priceToSales).toBe(0.3);
    expect(q.exchange).toBe("NYSE");
    expect(q.asOf).toBe("2026-06-02T00:00:00.000Z");
  });

  test("missing numerics become null; name falls back shortName -> symbol", () => {
    const q = normalizeQuote(
      { symbol: "X", shortName: "X Corp", regularMarketPrice: 5 },
      "t",
    );
    expect(q.name).toBe("X Corp");
    expect(q.trailingPE).toBeNull();
    expect(q.marketCap).toBeNull();
    expect(q.changePercent).toBeNull();

    const q2 = normalizeQuote({ symbol: "Y", regularMarketPrice: 1 }, "t");
    expect(q2.name).toBe("Y");
  });
});
