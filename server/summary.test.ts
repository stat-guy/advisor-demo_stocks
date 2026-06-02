import { test, expect, describe } from "bun:test";
import { buildSummaryPrompt } from "./summary";
import type { MetricCard } from "@shared/types";

const cards: MetricCard[] = [
  { key: "revenue", label: "Revenue", light: "green", headline: "+167% YoY", detail: "grew fast", facts: [] },
  { key: "profitability", label: "Profitability", light: "red", headline: "margin -122%", detail: "net loss", facts: [] },
];

describe("buildSummaryPrompt", () => {
  const { system, user } = buildSummaryPrompt({
    ticker: "RIVN",
    companyName: "Rivian Automotive",
    sector: "Motor Vehicles",
    overall: { light: "red", rationale: "Critical: net loss." },
    cards,
    dataVersion: "acc-1",
  });

  test("system prompt fences against investment advice", () => {
    const s = system.toLowerCase();
    expect(s).toMatch(/buy|sell|hold/);
    expect(s).toContain("never");
    expect(s).toMatch(/informational|advice/);
  });

  test("user prompt carries the company and every signal", () => {
    expect(user).toContain("Rivian Automotive");
    expect(user).toContain("RIVN");
    expect(user).toContain("Revenue");
    expect(user).toContain("Profitability");
    expect(user.toUpperCase()).toContain("RED");
    expect(user.toUpperCase()).toContain("GREEN");
  });

  test("does not fabricate — only provided signals appear", () => {
    expect(user).not.toContain("Earnings"); // not in the input cards
  });
});
