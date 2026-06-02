# Advisor Stock Snapshot

Get up to speed on a stock in seconds. Type a ticker → a fixed, deterministic dashboard of
**green / yellow / red** financial-health signals, every figure pulled straight from SEC
filings and live market data, with a short plain-English summary from Claude.

**🔗 Live demo — [macbook-pro.tail7c941e.ts.net](https://macbook-pro.tail7c941e.ts.net)** ·
type any ticker (try **F**, **TSLA**, **RIVN**). *Served from the author's machine over Tailscale
Funnel — may be offline if the host is asleep.*

Built for the AI Prototype Challenge (Finance track). See [PLAN.md](./PLAN.md) for the full design.

## The core idea

**The AI never touches the numbers or the verdict.** ~98% of the screen is deterministic:

| Layer | Source | Hallucination risk |
|---|---|---|
| Quote (price, change, market cap, P/E) | Yahoo (`yahoo-finance2`) | none |
| Financial figures (revenue, margins, EPS, cash, balance sheet) | SEC EDGAR XBRL — exact reported values, cited to the filing | none |
| 🟢/🟡/🔴 signals (6 metrics + overall) | **deterministic rules engine** | none |
| 2-3 sentence summary | Claude Opus 4.8 — narrates only the computed signals, **fenced against investment advice** | bounded |

It surfaces *directional health signals*, never investment advice (no buy/sell/hold).

## Run it

Requires [Bun](https://bun.sh). Copy `.env.example` → `.env` and add your `ANTHROPIC_API_KEY`
(optional — the dashboard works without it; only the AI summary needs it).

```bash
bun install
bun run dev     # Vite (5173) + Bun API (3000) with hot reload
```

Open http://localhost:5173. Try `F`, `TSLA`, `RIVN`, or any ticker. Deep links work: `?ticker=TSLA`.

### Production / single process

```bash
bun run build   # Vite build → dist/
bun run start   # one Bun process serves dist/ + /api on :3000
```

### Public demo over Tailscale Funnel

The app is one same-origin process using relative `/api` paths, so it works behind Funnel as-is:

```bash
bun run build && bun run start      # serve on :3000
tailscale funnel 3000               # public https://<machine>.<tailnet>.ts.net
```

Hardening for public exposure is built in: the API key stays server-side, the AI summary is
cached per filing version (50 viewers of one ticker = 1 LLM call), and requests are rate-limited
per IP (30/min, override with `RATE_LIMIT`).

## Test

Strict red/green TDD throughout. The deterministic rules engine is the heart and is covered by
golden-fixture tests for Ford / Tesla / Rivian plus edge cases.

```bash
bun test
```

## Stack

Bun · Vite · React · shadcn/ui (Tailwind v4) · `bun:sqlite` cache · SEC EDGAR · `yahoo-finance2` ·
Anthropic SDK (Opus 4.8, adaptive thinking, effort=low).
