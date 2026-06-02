# Advisor Stock Snapshot — Working Plan

> **How to use this doc:** This is the living source of truth for the build. Edit anything
> directly — change thresholds, reorder cards, flip decisions, add notes in **`> EDIT:`**
> callouts. I re-read this file before each work session and pick up your changes. Nothing
> here is final until we start building the corresponding piece.

---

## 1. Product summary

A wealth-management advisor types a **ticker** and instantly gets a **fixed, deterministic
dashboard**: live quote + financial-health **traffic lights** (🟢/🟡/🔴) + a short
plain-English **summary written by Claude at the very end**. Same layout for every ticker,
so the advisor learns it once and reacts on sight. **No chat** — the advisor reacts to
information, never converses with it.

**Context:** AI Prototype Challenge, Finance track. Deliverables = working prototype
(~120 min spirit) + one slide + 20-min live defense to a panel playing client stakeholders.

---

## 2. Locked design decisions

- **No LLM in the data path.** ~98% of the screen is deterministic. Claude only narrates.
- **Ticker in → fixed dashboard out.** No free-text questions.
- **Content focus:** financial highlights from recent SEC filings + live quote.
- **Data:** Yahoo (no keys) for quote; SEC EDGAR for filings.
- **Grounding:** every figure traces to its source filing; "not reported" instead of guessing.
- **Signals:** per-metric traffic lights + one overall light, both from a transparent rules engine.

---

## 3. Guardrail — NOT financial advice (hard requirement)

The tool surfaces **directional signals on financial health**. It never implies a
recommendation to buy, sell, or hold.

- Lights are **"fundamental health signals,"** not ratings. 🔴 = "weak/deteriorating
  fundamentals; warrants scrutiny" — **not** "don't invest."
- Claude's summary is **fenced**: no buy/sell/hold, no price targets, no predictions. It only
  describes the computed signals and flags **"mixed signals — advisor judgment required"**
  when lights conflict.
- **Always-visible disclaimer:** "Informational signals from public filings and market data.
  Not investment advice."

---

## 4. Architecture & stack

```
[ React + shadcn UI ]  ──fetch──>  [ Bun.serve() API ]
   (Vite, local)                      │
                                      ├─ yahoo-finance2  → live quote
                                      ├─ SEC EDGAR fetch → XBRL companyfacts + submissions
                                      ├─ rules engine    → deterministic 🟢/🟡/🔴 (pure, tested)
                                      ├─ bun:sqlite      → cache layer
                                      └─ Anthropic SDK   → 2-3 sentence fenced summary
```

- **Single Bun process.** `bun run dev` starts it. Bun serves the built React app + the API.
  Dev mode: Vite dev server proxies `/api/*` to Bun.
- **Frontend is local-only** (not deployed).
- EDGAR requires a `User-Agent` header with contact info — will set
  `User-Agent: advisor-demo (<contact>)`.
- **LLM model:** `claude-opus-4-8` with **adaptive thinking** (`thinking: {type:"adaptive"}`)
  and **effort `low`** — the summary is a simple narration task, so low effort keeps it fast
  and cheap. No `temperature`/`top_p`/`top_k` (Opus 4.8 rejects them). Degrades gracefully —
  dashboard works fully without an API key, just no closing summary.

> EDIT: override here if you'd rather force Next.js-under-Bun instead of Vite + Bun.serve.

### Visual design (Cursor-inspired)

Aesthetic modeled on cursor.com — minimalist, **warm-neutral** base, generous whitespace,
`rounded-lg` cards with thin subtle borders, near-black high-contrast text, refined
low-saturation palette. Default **light** theme (advisors work in daylight) with a **dark**
toggle mirroring Cursor's dark hero. Traffic lights use **muted tints** (soft emerald / amber /
rose, not garish) so color reads instantly without eye strain. Implemented as shadcn theme
tokens (Tailwind v4 / oklch), radius ~10px.

**Data viz (Tufte principles):** axis-free **sparklines** in each flow-metric card (line recedes
in neutral, latest point carries the signal color; explicit **zero baseline** when a series goes
negative, so profit→loss is honest) + a **52-week range strip** (range-frame, lie factor 1.0) on
the quote. No gridlines, no chartjunk; shape (micro) sits beside the exact figure and under the
overall verdict (macro).

### Serving & public access (Tailscale Funnel)

The app runs locally on the Tailscale node but is exposed publicly via **Tailscale Funnel**
so external testers can interact and give feedback at a `https://<machine>.<tailnet>.ts.net`
URL.

- Bun binds a local port (e.g. `3000`); `tailscale funnel 3000` proxies public HTTPS → local.
  (Funnel serves on 443/8443/10000 publicly, mapped to the local port.)
- **Same-origin** (Bun serves UI + API together) → no CORS. Frontend uses **relative `/api`
  paths**, never hardcoded `localhost`, so it works behind the funnel domain.
- **Public-access hardening** (it's on the open internet):
  - `ANTHROPIC_API_KEY` stays **server-side only** — never shipped to the client.
  - **Summary cached in the snapshot** → repeat views don't re-call Claude (caps LLM spend).
  - Simple **per-IP rate limit** + strict **ticker input validation** to bound abuse/cost.
  - App is effectively **read-only** to clients (ticker lookups only; no client-driven writes).

---

## 5. Data sources & freshness

| Data | Source | Cache policy |
|---|---|---|
| Live quote (price, %chg, mkt cap, P/E, range) | `yahoo-finance2` | **fresh each load**, ~15s TTL, stamped "as of HH:MM:SS" |
| ticker → CIK map | EDGAR `company_tickers.json` | daily |
| Financial facts (XBRL) | EDGAR `companyfacts` | refresh on new filing, else 24h TTL |
| Computed snapshot | (derived) | keyed by filing accession + quote timestamp |

Filings used: latest **10-K** (annual) + recent **10-Q** (quarterly). Trends computed over
the last ~4–8 quarters (YoY comparisons to handle seasonality).

---

## 6. Metric cards + DRAFT threshold table  ⬅️ RED-LINE THIS

Six cards. Scoring basis = **company's own multi-period trend + basic absolute health checks**
(sector-neutral, ticker-agnostic). Every light is explainable on hover (shows the why +
threshold + source filing). **These cutoffs are a first pass — edit freely.**

Trend uses **annual (FY / 10-K) figures** from EDGAR XBRL, merged across concept aliases so a
company switching XBRL tags between years doesn't create gaps. Balance-sheet items use the
latest reported instant (often the most recent 10-Q).

### Card 1 — Revenue
| Light | Rule |
|---|---|
| 🟢 | YoY growth > +5% **and** growing in ≥3 of last 4 quarters |
| 🟡 | YoY between −2% and +5%, or choppy/mixed |
| 🔴 | YoY < −2% (declining) |

### Card 2 — Profitability / Margins
| Light | Rule |
|---|---|
| 🟢 | Net income positive **and** net margin stable-or-expanding vs year ago |
| 🟡 | Positive but margin compressing, or thin (<5%) |
| 🔴 | Negative net income (unprofitable) |

### Card 3 — Earnings (Diluted EPS, TTM)
| Light | Rule |
|---|---|
| 🟢 | Positive and growing YoY |
| 🟡 | Positive but flat/declining |
| 🔴 | Negative |

### Card 4 — Balance Sheet (light = worse of the two sub-checks)
| Sub-check | 🟢 | 🟡 | 🔴 |
|---|---|---|---|
| Liquidity (current ratio) | ≥ 1.5 | 1.0 – 1.5 | < 1.0 |
| Leverage (total debt / equity) | < 1.0 | 1.0 – 2.0 | > 2.0 or negative equity |

> Note: suppressed/flagged for the **financial sector** (banks' ratios mean something different).
> Leverage is scored only when debt is reliably tagged; for captive-finance / complex balance
> sheets where the XBRL debt tag is implausibly small (e.g. Ford, where it reads ~$0.3B), leverage
> is marked **n/a** and the card leans on liquidity (current ratio) rather than show a misleading 🟢.

### Card 5 — Cash Flow (TTM)
| Light | Rule |
|---|---|
| 🟢 | Operating CF positive & growing **and** free cash flow (OCF − CapEx) positive |
| 🟡 | OCF positive but FCF negative (heavy capex) or OCF declining |
| 🔴 | Operating CF negative (burning cash) |

### Card 6 — Valuation  (NEUTRAL CONTEXT — not a health light)
Shows trailing P/E, forward P/E, P/S, market cap, and P/E vs the company's **own 3–5yr range**.
Displayed in neutral/grey with a note: *"Context only — cheap ≠ good. Not a health signal."*

---

## 7. Overall light roll-up (transparent)

Computed from the **5 health cards** (valuation excluded):

- 🔴 **overall** if any *critical* red (negative net income **or** current ratio < 1.0 with
  leverage > 2.0) **or** ≥ 2 red cards.
- 🟢 **overall** if 0 reds and ≤ 1 yellow.
- 🟡 otherwise.

> EDIT: adjust the roll-up logic / weights here.

---

## 8. Claude summary spec

- Input: **only** the already-computed signals + numbers (no raw filings, no web).
- Output: 2–3 sentences, neutral, plain English, explains the *why* behind the colors.
- Fenced: no buy/sell/hold, no targets, no predictions; flags conflicting lights as
  "mixed signals — advisor judgment required."
- Cached: system/instruction prompt cached; per-ticker payload is the variable part.

---

## 9. SQLite schema (bun:sqlite)

```sql
tickers      (ticker TEXT PK, cik TEXT, name TEXT, updated_at INT)
company_facts(cik TEXT PK, facts_json TEXT, latest_accession TEXT, fetched_at INT)
snapshots    (ticker TEXT PK, snapshot_json TEXT, quote_ts INT, accession TEXT, created_at INT)
```

---

## 10. Project structure

```
advisor-demo_stocks/
├─ PLAN.md
├─ package.json            ← bun scripts (dev / build / start / test)
├─ vite.config.ts          ← Vite + Tailwind v4, /api proxy, @ alias
├─ components.json         ← shadcn config
├─ bunfig.toml             ← bun test preload (happy-dom)
├─ index.html
├─ .env / .env.example     ← secrets (gitignored)
├─ shared/
│  └─ types.ts             ← Snapshot / Quote / MetricCard types (server + web)
├─ server/                 ← Bun runtime
│  ├─ index.ts             ← Bun.serve(): /api routes + static dist
│  ├─ db.ts                ← bun:sqlite + TTL cache helpers
│  ├─ sources/
│  │  ├─ yahoo.ts          ← quote fetch (yahoo-finance2)
│  │  └─ edgar.ts          ← cik map, companyfacts, submissions
│  ├─ rules/
│  │  ├─ engine.ts         ← PURE deterministic scoring
│  │  └─ engine.test.ts    ← golden-fixture tests (TDD)
│  └─ summary.ts           ← Anthropic SDK (Opus 4.8, graceful no-key)
├─ src/                    ← Vite + React + shadcn frontend
│  ├─ main.tsx / App.tsx / index.css
│  ├─ lib/utils.ts
│  └─ components/          ← ui/*, TickerSearch, OverallLight, MetricCard, Summary, Disclaimer
├─ test/                   ← setup.ts + cross-cutting tests
└─ fixtures/               ← cached companyfacts JSON for demo tickers
```

---

## 11. Build phases — LIVE PROGRESS

> Updated as I work. `[ ]` = todo, `[~]` = in progress, `[x]` = done.

- [x] **1. Scaffold** — Bun + Vite + React + shadcn + Tailwind v4, `bun run dev`, bun:sqlite init ✅
  - [x] package.json + Bun scripts (dev / build / start / test)
  - [x] Vite + TS config, `/api` proxy, path alias `@/*`
  - [x] Tailwind v4 + Cursor-inspired theme tokens + shadcn config
  - [x] Bun.serve server skeleton (serve dist + `/api/health`) — verified
  - [x] SQLite schema + TTL cache helpers
  - [x] TDD harness (bun test + happy-dom + jest-dom) — verified green
- [x] **2. Data layer** — EDGAR (cik map, companyfacts, submissions) + Yahoo quote, with caching ✅
  - [x] EDGAR cik lookup, companyfacts, submissions (+ SIC sector) — live-verified F/TSLA/RIVN
  - [x] XBRL extraction merged across concept aliases (tag-switch gaps fixed) — 11 tests green
  - [x] Yahoo quote via yahoo-finance2 v3 (+ summaryDetail for PE/P-S) — live-verified
  - [x] SQLite TTL caching (filings 24h, quote 15s)
- [x] **3. Rules engine** — pure module + unit tests against fixtures (the heart) ✅
  - [x] 6 card scorers + overall roll-up (deterministic) — 23 golden tests green (F/TSLA/RIVN + edges)
  - [x] Snapshot assembler + `/api/snapshot` endpoint — live-verified (Ford🟡 Tesla🟢 Rivian🔴)
  - [x] Graceful states: invalid ticker, ETF/no-XBRL (SPY → quote-only), financial sector
- [x] **4. Dashboard UI** — fixed layout, traffic-light cards, source links, disclaimer ✅
  - [x] shadcn primitives (parallel agent) + SignalDot + MetricCard — component tests green
  - [x] Quote header + stat strip, overall banner, summary panel, theme toggle, states
  - [x] Deep-link (`?ticker=`) for shareable demo links; full-render integration test green
  - [x] Cursor-inspired light theme — visually verified via headless screenshot (TSLA)
- [x] **5. Claude summary** — fenced Opus 4.8 prompt, graceful no-key fallback ✅
  - [x] Opus 4.8 + adaptive thinking + effort=low (correct SDK params via claude-api skill)
  - [x] Advice-fenced system prompt (no buy/sell/hold), narrates only computed signals
  - [x] Summary cached in SQLite per filing version (caps LLM spend under public load)
  - [x] Live-verified on F/TSLA/RIVN — grounded, fenced, "mixed signals" on conflicts
- [x] **6. Robustness** — invalid ticker / no-XBRL / financial-sector states; rate limit; demo pre-cache (F/TSLA/RIVN) ✅
  - [x] Graceful states verified (covered in phase 3) + financial-sector de-emphasis
  - [x] Per-IP fixed-window rate limiter (30/min) — 3 tests green, 429 verified live
  - [x] Startup cache-warming for F/TSLA/RIVN — instant first load over Funnel
- [x] **7. Polish + slide** — one slide for the pitch ✅
  - [x] One-slide pitch in [SLIDE.md](./SLIDE.md) (problem → solution → differentiator → live proof + speaker notes)
  - [x] [README.md](./README.md) with run / build / test instructions
- [x] **8. Serving** — single Bun process for Tailscale Funnel; document funnel command ✅
  - [x] `bun run start` serves dist/ + /api one process; relative `/api` paths (Funnel-ready) — verified
  - [x] Funnel command + public-hardening documented in README

---

## 12. Testing strategy

**Methodology: red/green TDD.** Write the failing test first, confirm it's red, then implement
to green. No build phase is marked done with failing or partial tests.

- **Rules engine:** golden-fixture unit tests per ticker (healthy / struggling / unprofitable-growth)
  asserting exact light outputs. This is where correctness lives.
- **Data adapters:** parse-from-fixture tests (no live network in tests).
- **UI components:** @testing-library/react + happy-dom (e.g. a light renders the right color/aria).
- **Manual demo run** through the pre-cached tickers before the interview.

---

## 13. Demo plan

**Must-work set (same industry — autos — for a clean apples-to-apples comparison):**
- **F** (Ford) — profitable legacy automaker → mostly 🟢/🟡
- **TSLA** (Tesla) — profitable high-growth → mixed 🟢/🟡
- **RIVN** (Rivian) — high-growth, unprofitable, cash-burning → 🔴s (great summary story)

This trio is the minimum bar if we hit time constraints, and it naturally showcases all three
colors within one peer group. Pre-cached so external testers get instant results.

---

## 14. Known limitations (be upfront in the defense)

- Yahoo is an unofficial source (no SLA).
- Balance-sheet ratios are misleading for banks/financials → flagged.
- Foreign filers (20-F) / ETFs / indices have no clean US-GAAP XBRL → explicit "unavailable" state.
- Thresholds are heuristic, not calibrated against a labeled dataset.

---

## 15. Open questions for you

1. ~~Anthropic API key~~ — user will drop credentials into `.env` (gitignored). ✅
2. ~~Demo tickers~~ — **F, TSLA, RIVN** (autos). ✅
3. **Contact string** for EDGAR `User-Agent` — defaulted to the account email in `.env`
   (`EDGAR_CONTACT`); override there if you prefer a different address.
4. Anything in the threshold table you'd move before we start (§6)?
