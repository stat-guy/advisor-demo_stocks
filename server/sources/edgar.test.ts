import { test, expect, describe } from "bun:test";
import {
  padCik,
  parseCompanyTickers,
  extractFinancials,
  buildFilingUrl,
} from "./edgar";

describe("padCik", () => {
  test("zero-pads numeric and string CIKs to 10 digits", () => {
    expect(padCik(320193)).toBe("0000320193");
    expect(padCik("320193")).toBe("0000320193");
    expect(padCik("0000320193")).toBe("0000320193");
  });
});

describe("parseCompanyTickers", () => {
  test("maps uppercased ticker -> padded cik + title", () => {
    const map = parseCompanyTickers({
      "0": { cik_str: 320193, ticker: "AAPL", title: "Apple Inc." },
      "1": { cik_str: 1318605, ticker: "TSLA", title: "Tesla, Inc." },
    });
    expect(map["AAPL"]).toEqual({ cik: "0000320193", name: "Apple Inc." });
    expect(map["TSLA"]).toEqual({ cik: "0001318605", name: "Tesla, Inc." });
  });
});

describe("buildFilingUrl", () => {
  test("constructs the EDGAR filing index URL", () => {
    expect(buildFilingUrl("0000320193", "0000320193-24-000123")).toBe(
      "https://www.sec.gov/Archives/edgar/data/320193/000032019324000123/0000320193-24-000123-index.htm",
    );
  });
});

const FACTS = {
  cik: 320193,
  entityName: "TEST CO",
  facts: {
    "us-gaap": {
      Revenues: {
        units: {
          USD: [
            { start: "2022-01-01", end: "2022-12-31", val: 1000, accn: "acc-2022", fy: 2022, fp: "FY", form: "10-K", filed: "2023-02-01" },
            { start: "2023-01-01", end: "2023-12-31", val: 1200, accn: "acc-2023", fy: 2023, fp: "FY", form: "10-K", filed: "2024-02-01" },
            // quarterly — must be excluded from the annual series
            { start: "2023-01-01", end: "2023-03-31", val: 300, accn: "acc-2023q1", fy: 2023, fp: "Q1", form: "10-Q", filed: "2023-05-01" },
            // restated FY2023, filed later — dedupe should keep this one
            { start: "2023-01-01", end: "2023-12-31", val: 1210, accn: "acc-2023r", fy: 2023, fp: "FY", form: "10-K", filed: "2025-02-01" },
          ],
        },
      },
      NetIncomeLoss: {
        units: {
          USD: [
            { start: "2022-01-01", end: "2022-12-31", val: 100, accn: "acc-2022", fy: 2022, fp: "FY", form: "10-K", filed: "2023-02-01" },
            { start: "2023-01-01", end: "2023-12-31", val: 150, accn: "acc-2023", fy: 2023, fp: "FY", form: "10-K", filed: "2024-02-01" },
          ],
        },
      },
      AssetsCurrent: {
        units: {
          USD: [
            { end: "2022-12-31", val: 500, accn: "acc-2022", fy: 2022, fp: "FY", form: "10-K", filed: "2023-02-01" },
            { end: "2023-12-31", val: 600, accn: "acc-2023", fy: 2023, fp: "FY", form: "10-K", filed: "2024-02-01" },
          ],
        },
      },
    },
  },
};

describe("extractFinancials", () => {
  const fin = extractFinancials(FACTS as any);

  test("annual revenue series is newest-first, deduped by fiscal year (latest filed wins)", () => {
    expect(fin.revenue.map((p) => p.fy)).toEqual([2023, 2022]);
    expect(fin.revenue[0].value).toBe(1210); // restated value, latest filed
    expect(fin.revenue[0].accession).toBe("acc-2023r");
    expect(fin.revenue[1].value).toBe(1000);
  });

  test("excludes quarterly (non-FY) points from the annual series", () => {
    expect(fin.revenue.some((p) => p.fp === "Q1")).toBe(false);
  });

  test("net income annual series extracted newest-first", () => {
    expect(fin.netIncome[0].fy).toBe(2023);
    expect(fin.netIncome[0].value).toBe(150);
  });

  test("balance-sheet instant uses the most recent period end", () => {
    expect(fin.assetsCurrent?.end).toBe("2023-12-31");
    expect(fin.assetsCurrent?.value).toBe(600);
  });

  test("merges concept aliases, gap-filling missing years (priority order wins ties)", () => {
    const facts = {
      cik: 1,
      facts: {
        "us-gaap": {
          Revenues: {
            units: {
              USD: [
                { start: "2022-01-01", end: "2022-12-31", val: 100, accn: "a", fy: 2022, fp: "FY", form: "10-K", filed: "2023-02-01" },
                { start: "2023-01-01", end: "2023-12-31", val: 110, accn: "b", fy: 2023, fp: "FY", form: "10-K", filed: "2024-02-01" },
              ],
            },
          },
          RevenueFromContractWithCustomerExcludingAssessedTax: {
            units: {
              USD: [
                // same year as primary -> primary must win
                { start: "2023-01-01", end: "2023-12-31", val: 999, accn: "c", fy: 2023, fp: "FY", form: "10-K", filed: "2024-02-01" },
                // year only present in fallback -> must be gap-filled in
                { start: "2024-01-01", end: "2024-12-31", val: 130, accn: "d", fy: 2024, fp: "FY", form: "10-K", filed: "2025-02-01" },
              ],
            },
          },
        },
      },
    };
    const fin = extractFinancials(facts as any);
    expect(fin.revenue.map((p) => p.fy)).toEqual([2024, 2023, 2022]);
    expect(fin.revenue.find((p) => p.fy === 2023)!.value).toBe(110); // primary alias wins
    expect(fin.revenue.find((p) => p.fy === 2024)!.value).toBe(130); // filled from fallback
  });

  test("falls back across concept aliases for revenue", () => {
    const altFacts = {
      cik: 1,
      facts: {
        "us-gaap": {
          RevenueFromContractWithCustomerExcludingAssessedTax: {
            units: {
              USD: [
                { start: "2023-01-01", end: "2023-12-31", val: 999, accn: "a", fy: 2023, fp: "FY", form: "10-K", filed: "2024-02-01" },
              ],
            },
          },
        },
      },
    };
    const alt = extractFinancials(altFacts as any);
    expect(alt.revenue[0].value).toBe(999);
  });
});
