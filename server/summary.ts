import Anthropic from "@anthropic-ai/sdk";
import type { MetricCard, OverallVerdict } from "@shared/types";
import { cacheGet, cacheSet } from "./db";

const MODEL = process.env.ANTHROPIC_MODEL ?? "claude-opus-4-8";
const EFFORT = (process.env.ANTHROPIC_EFFORT ?? "low") as
  | "low"
  | "medium"
  | "high"
  | "max";

// Lazy so importing this module (e.g. in tests) never constructs the client.
let _client: Anthropic | null | undefined;
function getClient(): Anthropic | null {
  if (_client === undefined) {
    _client = process.env.ANTHROPIC_API_KEY ? new Anthropic() : null;
  }
  return _client;
}

export function summaryEnabled(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

export interface SummaryInput {
  ticker: string;
  companyName: string;
  sector: string | null;
  overall: OverallVerdict;
  cards: MetricCard[];
  dataVersion: string; // filing accession — summary only changes when filings change
}

const SYSTEM = [
  "You are a financial-data narrator inside a wealth-management tool.",
  "You receive PRE-COMPUTED, deterministic health signals about one stock and write a SHORT plain-English summary (2-3 sentences) for a financial advisor to read at a glance.",
  "",
  "HARD RULES:",
  "- Describe ONLY the signals provided. Never invent numbers, metrics, or facts that are not in the input.",
  "- This is informational only. NEVER give investment advice: no buy / sell / hold, no recommendations, no price targets, no predictions, no 'should'.",
  "- Frame colors as financial-health signals, not ratings. Red = weak/deteriorating fundamentals, not 'do not invest'.",
  "- If the signals conflict, say so plainly: 'mixed signals — advisor judgment required'.",
  "- Neutral, factual, concise. No preamble ('Here is...', 'Based on...'). Output only the summary text.",
].join("\n");

/** Pure: build the (system, user) prompt from the computed signals. */
export function buildSummaryPrompt(input: SummaryInput): {
  system: string;
  user: string;
} {
  const lines = input.cards.map(
    (c) => `- ${c.label} [${c.light.toUpperCase()}]: ${c.headline} — ${c.detail}`,
  );
  const user = [
    `Company: ${input.companyName} (${input.ticker})`,
    input.sector ? `Sector: ${input.sector}` : null,
    `Overall signal: ${input.overall.light.toUpperCase()} — ${input.overall.rationale}`,
    "",
    "Per-metric signals:",
    ...lines,
    "",
    "Write the 2-3 sentence advisor summary now.",
  ]
    .filter((l) => l !== null)
    .join("\n");
  return { system: SYSTEM, user };
}

/** Impure: generate (and cache) the narration. Returns null if disabled or on error. */
export async function generateSummary(input: SummaryInput): Promise<string | null> {
  const client = getClient();
  if (!client) return null;

  const key = `summary:${input.ticker}:${input.dataVersion}:${input.overall.light}`;
  const cached = cacheGet<string>(key, 7 * 24 * 60 * 60 * 1000); // 7 days
  if (cached) return cached;

  const { system, user } = buildSummaryPrompt(input);
  try {
    const msg = await client.messages.create({
      model: MODEL,
      max_tokens: 400,
      thinking: { type: "adaptive" },
      output_config: { effort: EFFORT },
      system,
      messages: [{ role: "user", content: user }],
    });
    const text = msg.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("")
      .trim();
    if (text) cacheSet(key, text);
    return text || null;
  } catch (err) {
    console.error("[summary] generation failed:", err);
    return null; // graceful — dashboard still works without it
  }
}
