# One-Slide Pitch

> Drop this into Keynote / Google Slides / PowerPoint as a single slide. Content is sized to
> fit one slide; the speaker notes at the bottom are for you, not the slide.

---

## ADVISOR STOCK SNAPSHOT
### Get up to speed on any stock in seconds — before the client call.

**The problem:** Advisors need a fast, trustworthy read on a stock's financial health. Reading
filings is slow. Asking an AI risks a hallucinated number in front of a client — a compliance
liability.

**The solution:** Type a ticker → a fixed dashboard of **🟢 / 🟡 / 🔴** health signals, every
figure pulled straight from SEC filings and live market data, plus a 2-sentence plain-English
summary. Same layout every time — the advisor reacts on sight.

---

**Why it's different — the AI never touches the numbers or the verdict:**

```
  SEC EDGAR XBRL  ─┐
  (exact filings)  ├─►  DETERMINISTIC RULES ENGINE  ─►  🟢/🟡/🔴  ─►  Claude writes
  Yahoo quote     ─┘    (6 metrics + overall, audited)     (cited)      a 2-sentence
                                                                        summary — never
                                                                        gives advice
```

| Fast | Accurate | Compliant | Trustworthy |
|---|---|---|---|
| React on sight, no training | Numbers from filings, not AI | Signals, **not** buy/sell/hold | Auditable rules; cites every filing; says "not reported" instead of guessing |

---

**Live proof — three automakers, instantly comparable:**

- **F** 🟡 — profitable & growing, but thin margins / tight liquidity
- **TSLA** 🟢 — strong fundamentals; flagged as richly valued (context, not a signal)
- **RIVN** 🔴 — +167% revenue but deep losses & cash burn → *"mixed signals, advisor judgment required"*

---

### Speaker notes (not on the slide)
- Lead with the compliance angle — it's what a wealth firm cares about most.
- The one-liner that wins the room: *"The AI doesn't decide anything. A transparent rules
  engine does — green because revenue grew three years and margins held. The AI just turns
  that into a sentence, and it's fenced so it can never say buy or sell."*
- Demo flow: open with TSLA (all green + valuation caveat), then RIVN (red, great story),
  then hover a card / click a filing link to show every number traces to an SEC filing.
- If pushed on accuracy: the financial figures are EDGAR's structured XBRL data — the company's
  own reported numbers — so there's nothing for the model to get wrong.
