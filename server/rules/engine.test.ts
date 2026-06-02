import { test, expect, describe } from "bun:test";
import { score } from "./engine";
import type { Financials, FinPoint } from "../sources/edgar";
import type { Quote } from "@shared/types";

// ── fixture builders ──────────────────────────────────────────────────────────
function pt(value: number, fy: number): FinPoint {
  return {
    value,
    end: `${fy}-12-31`,
    fy,
    fp: "FY",
    form: "10-K",
    accession: `acc-${fy}`,
    filed: `${fy + 1}-02-15`,
  };
}
// newest-first list of [value, fiscalYear]
const s = (rows: [number, number][]): FinPoint[] => rows.map(([v, fy]) => pt(v, fy));
function inst(value: number): FinPoint {
  return { value, end: "2026-03-31", fy: 2026, fp: "Q1", form: "10-Q", accession: "acc-q", filed: "2026-04-30" };
}
const B = 1e9;

function quote(partial: Partial<Quote>): Quote {
  return {
    symbol: "X", name: "X", price: 100, change: 0, changePercent: 0, currency: "USD",
    marketCap: null, trailingPE: null, forwardPE: null, priceToSales: null,
    dayLow: null, dayHigh: null, fiftyTwoWeekLow: null, fiftyTwoWeekHigh: null,
    exchange: "NYSE", asOf: "2026-06-02T00:00:00.000Z", ...partial,
  };
}

const FORD: Financials = {
  cik: "0000037996",
  revenue: s([[176.19 * B, 2025], [158.06 * B, 2024], [136.34 * B, 2023]]),
  netIncome: s([[4.33 * B, 2025], [-1.98 * B, 2024], [17.94 * B, 2023]]),
  grossProfit: [],
  operatingIncome: s([[5.46 * B, 2025], [6.28 * B, 2024], [4.52 * B, 2023]]),
  epsDiluted: s([[1.08, 2025], [-0.49, 2024], [4.45, 2023]]),
  operatingCashFlow: s([[14.92 * B, 2025], [6.85 * B, 2024], [15.79 * B, 2023]]),
  capex: s([[8.24 * B, 2025], [6.87 * B, 2024], [6.23 * B, 2023]]),
  assetsCurrent: inst(116.33 * B),
  liabilitiesCurrent: inst(106.68 * B),
  stockholdersEquity: inst(37.45 * B),
  totalDebt: inst(0.29 * B), // captive-finance tag — implausibly small => leverage n/a
};

const TSLA: Financials = {
  cik: "0001318605",
  revenue: s([[96.77 * B, 2025], [81.46 * B, 2024], [53.82 * B, 2023]]),
  netIncome: s([[15.0 * B, 2025], [12.56 * B, 2024], [5.52 * B, 2023]]),
  grossProfit: [],
  operatingIncome: s([[8.89 * B, 2025], [13.66 * B, 2024], [6.52 * B, 2023]]),
  epsDiluted: s([[4.3, 2025], [3.62, 2024], [1.63, 2023]]),
  operatingCashFlow: s([[13.26 * B, 2025], [14.72 * B, 2024], [11.5 * B, 2023]]),
  capex: s([[8.9 * B, 2025], [7.16 * B, 2024], [6.48 * B, 2023]]),
  assetsCurrent: inst(69.75 * B),
  liabilitiesCurrent: inst(34.14 * B),
  stockholdersEquity: inst(84.12 * B),
  totalDebt: inst(7.64 * B),
};

const RIVN: Financials = {
  cik: "0001874178",
  revenue: s([[4.43 * B, 2025], [1.66 * B, 2024], [0.06 * B, 2023]]),
  netIncome: s([[-5.43 * B, 2025], [-6.75 * B, 2024], [-4.69 * B, 2023]]),
  grossProfit: [],
  operatingIncome: s([[-5.74 * B, 2025], [-6.86 * B, 2024], [-4.22 * B, 2023]]),
  epsDiluted: s([[-5.74, 2025], [-7.4, 2024], [-22.98, 2023]]),
  operatingCashFlow: s([[-4.87 * B, 2025], [-5.05 * B, 2024], [-2.62 * B, 2023]]),
  capex: s([[1.03 * B, 2025], [1.37 * B, 2024], [1.79 * B, 2023]]),
  assetsCurrent: inst(7.04 * B),
  liabilitiesCurrent: inst(3.35 * B),
  stockholdersEquity: inst(4.43 * B),
  totalDebt: inst(4.44 * B),
};

function lights(fin: Financials, q: Quote | null = null, isFinancial = false) {
  const r = score({ cik: fin.cik!, financials: fin, quote: q, isFinancial });
  const byKey = Object.fromEntries(r.cards.map((c) => [c.key, c.light]));
  return { ...byKey, overall: r.overall.light };
}

// ── golden fixtures (derived from real FY data) ────────────────────────────────
describe("golden: Ford — profitable & growing, thin margins, tight liquidity", () => {
  const L = lights(FORD);
  test("revenue green (growing ~+11% YoY)", () => expect(L.revenue).toBe("green"));
  test("profitability yellow (positive but margin <5%)", () => expect(L.profitability).toBe("yellow"));
  test("earnings green (EPS positive, up YoY)", () => expect(L.earnings).toBe("green"));
  test("balance yellow (current ratio ~1.1; leverage n/a)", () => expect(L.balance).toBe("yellow"));
  test("cashflow green (OCF positive & growing, FCF positive)", () => expect(L.cashflow).toBe("green"));
  test("valuation is neutral context", () => expect(L.valuation).toBe("neutral"));
  test("overall yellow (no reds, two yellows)", () => expect(L.overall).toBe("yellow"));
});

describe("golden: Tesla — strong fundamentals, OCF dipped, rich valuation", () => {
  const L = lights(TSLA, quote({ trailingPE: 391, priceToSales: 16.2 }));
  test("revenue green", () => expect(L.revenue).toBe("green"));
  test("profitability green (net margin ~15%, not compressing)", () => expect(L.profitability).toBe("green"));
  test("earnings green", () => expect(L.earnings).toBe("green"));
  test("balance green (current ratio ~2, low leverage)", () => expect(L.balance).toBe("green"));
  test("cashflow yellow (OCF declined YoY)", () => expect(L.cashflow).toBe("yellow"));
  test("overall green (0 reds, <=1 yellow)", () => expect(L.overall).toBe("green"));
});

describe("golden: Rivian — explosive growth but deeply unprofitable, burning cash", () => {
  const L = lights(RIVN);
  test("revenue green (+167% YoY)", () => expect(L.revenue).toBe("green"));
  test("profitability red (net loss)", () => expect(L.profitability).toBe("red"));
  test("earnings red (negative EPS)", () => expect(L.earnings).toBe("red"));
  test("balance yellow (good liquidity, ~1x leverage)", () => expect(L.balance).toBe("yellow"));
  test("cashflow red (negative operating cash flow)", () => expect(L.cashflow).toBe("red"));
  test("overall red (critical: net loss + cash burn)", () => expect(L.overall).toBe("red"));
});

// ── sparkline trend data ─────────────────────────────────────────────────────────
describe("trend series (chronological, for sparklines)", () => {
  function cardOf(fin: Financials, key: string) {
    return score({ cik: fin.cik!, financials: fin, quote: null, isFinancial: false }).cards.find(
      (c) => c.key === key,
    )!;
  }
  test("revenue trend is oldest→newest", () => {
    expect(cardOf(FORD, "revenue").trend).toEqual([136.34 * B, 158.06 * B, 176.19 * B]);
  });
  test("profitability trend tracks net income and includes the negative year", () => {
    expect(cardOf(FORD, "profitability").trend).toEqual([17.94 * B, -1.98 * B, 4.33 * B]);
  });
  test("cash-flow trend tracks operating cash flow", () => {
    expect(cardOf(RIVN, "cashflow").trend).toEqual([-2.62 * B, -5.05 * B, -4.87 * B]);
  });
  test("balance and valuation cards carry no trend", () => {
    expect(cardOf(FORD, "balance").trend).toBeUndefined();
    const val = score({ cik: FORD.cik!, financials: FORD, quote: null, isFinancial: false }).cards.find(
      (c) => c.key === "valuation",
    )!;
    expect(val.trend).toBeUndefined();
  });
});

// ── edge cases ─────────────────────────────────────────────────────────────────
describe("edge cases", () => {
  test("insufficient data -> neutral card, not a false signal", () => {
    const thin: Financials = { ...FORD, revenue: [], netIncome: [] };
    const r = score({ cik: "x", financials: thin, quote: null, isFinancial: false });
    const rev = r.cards.find((c) => c.key === "revenue")!;
    expect(rev.light).toBe("neutral");
  });

  test("negative equity -> balance red", () => {
    const broke: Financials = { ...FORD, stockholdersEquity: inst(-2 * B), totalDebt: inst(10 * B) };
    expect(lights(broke).balance).toBe("red");
  });

  test("financial sector -> balance neutral (ratios not meaningful)", () => {
    expect(lights(FORD, null, true).balance).toBe("neutral");
  });

  test("Ford's implausibly small debt tag => leverage excluded from detail as n/a", () => {
    const r = score({ cik: FORD.cik!, financials: FORD, quote: null, isFinancial: false });
    const bal = r.cards.find((c) => c.key === "balance")!;
    expect(bal.detail.toLowerCase()).toContain("n/a");
  });
});
