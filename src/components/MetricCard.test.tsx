import { test, expect, describe } from "bun:test";
import { render } from "@testing-library/react";
import { MetricCardView } from "./MetricCard";
import type { MetricCard } from "@shared/types";

const CARD: MetricCard = {
  key: "revenue",
  label: "Revenue",
  light: "green",
  headline: "$176.19B · +11.5% YoY",
  detail: "Revenue grew +11.5% year-over-year, rising in 2 of the last 3 years.",
  facts: [
    { label: "FY2025", value: "$176.19B", period: "2025-12-31" },
    { label: "FY2024", value: "$158.06B" },
  ],
  sourceFiling: {
    form: "10-K",
    accession: "0000037996-26-000012",
    filedDate: "2026-02-11",
    url: "https://www.sec.gov/x",
  },
};

const setup = (card = CARD) => render(<MetricCardView card={card} />);

describe("MetricCardView", () => {
  test("shows label, headline, and inline detail", () => {
    const { getByText } = setup();
    expect(getByText("Revenue")).toBeInTheDocument();
    expect(getByText(/\+11\.5% YoY/)).toBeInTheDocument(); // unique to the headline
    expect(getByText(/rising in 2 of the last 3 years/)).toBeInTheDocument();
  });

  test("renders a signal dot with the card's light", () => {
    const { getByRole } = setup();
    expect(getByRole("img")).toHaveAttribute("data-light", "green");
  });

  test("links to the source filing", () => {
    const { getByRole } = setup();
    const link = getByRole("link");
    expect(link).toHaveAttribute("href", "https://www.sec.gov/x");
    expect(link.textContent).toContain("10-K");
  });

  test("renders a sparkline when a trend series is present", () => {
    const { getByTestId } = setup({ ...CARD, trend: [136.34, 158.06, 176.19] });
    expect(getByTestId("sparkline")).toBeInTheDocument();
  });
});
