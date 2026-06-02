import { test, expect, describe, afterEach } from "bun:test";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import App from "./App";
import type { Snapshot } from "@shared/types";

const SNAP: Snapshot = {
  ticker: "F",
  companyName: "FORD MOTOR CO",
  cik: "0000037996",
  sector: "Motor Vehicles & Passenger Car Bodies",
  isFinancialSector: false,
  quote: {
    symbol: "F", name: "Ford Motor Company", price: 16.27, change: -0.1, changePercent: -0.61,
    currency: "USD", marketCap: 64.8e9, trailingPE: null, forwardPE: null, priceToSales: 0.34,
    dayLow: 16, dayHigh: 16.5, fiftyTwoWeekLow: 9, fiftyTwoWeekHigh: 18, exchange: "NYSE",
    asOf: "2026-06-02T14:00:00.000Z",
  },
  overall: { light: "green", rationale: "Healthy across the board — 4 green, 1 caution." },
  cards: [
    {
      key: "revenue", label: "Revenue", light: "green", headline: "$176.19B · +11.5% YoY",
      detail: "Revenue grew +11.5% year-over-year.",
      facts: [{ label: "FY2025", value: "$176.19B" }],
      sourceFiling: { form: "10-K", accession: "x", filedDate: "2026-02-11", url: "https://sec.gov/x" },
    },
  ],
  summary: null,
  summaryDisclaimer: "Informational signals from public filings and market data. Not investment advice.",
  filings: [{ form: "10-K", accession: "x", filedDate: "2026-02-11", url: "https://sec.gov/x" }],
  dataNotes: [],
  generatedAt: "2026-06-02T14:00:00.000Z",
};

afterEach(() => cleanup());

function mockFetch(payload: unknown) {
  globalThis.fetch = (async () =>
    new Response(JSON.stringify(payload), {
      headers: { "content-type": "application/json" },
    })) as typeof fetch;
}

describe("App", () => {
  test("renders the full snapshot after a search", async () => {
    mockFetch(SNAP);
    render(<App />);
    fireEvent.click(screen.getAllByRole("button", { name: "F" })[0]);
    await waitFor(() => expect(screen.getByText("FORD MOTOR CO")).toBeInTheDocument());
    expect(screen.getByText(/Healthy across the board/)).toBeInTheDocument(); // overall rationale
    expect(screen.getByText("Revenue")).toBeInTheDocument(); // a metric card
    expect(screen.getByText(/Not investment advice/)).toBeInTheDocument(); // disclaimer
  });

  test("shows a friendly error state for an unknown ticker", async () => {
    mockFetch({ error: 'No data found for "ZZZZ".', ticker: "ZZZZ", kind: "invalid_ticker" });
    render(<App />);
    fireEvent.click(screen.getAllByRole("button", { name: "F" })[0]);
    await waitFor(() => expect(screen.getByText(/No data found/)).toBeInTheDocument());
  });
});
