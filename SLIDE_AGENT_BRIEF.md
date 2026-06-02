# slide_agent_brief

project:
  name: "Advisor Stock Snapshot"
  audience: "Non-technical wealth-management advisor / client stakeholder"
  deliverable: "1 to 3 pitch slides supporting a live prototype demo"
  objective: "Translate what the demo is, why it matters, and how it creates value without over-explaining implementation details."

core_message:
  one_sentence: "Advisor Stock Snapshot turns a ticker into a source-backed, advisor-ready view of a company's financial health."
  client_value: "The advisor spends less time gathering scattered information and more time applying professional judgment in client conversations."
  emotional_target: "The client should feel that the spend is buying clarity, consistency, speed, and risk-aware workflow improvement."

positioning:
  category: "Advisor decision-support workflow"
  not_category:
    - "Stock picker"
    - "Trading bot"
    - "Buy/sell/hold recommendation engine"
    - "Generic AI chatbot"
  key_distinction: "Most of the product is deterministic and source-backed; AI is used only to narrate already-computed signals in plain English."
  maturity_framing: "Today's prototype is intentionally basic: it proves the repeatable ticker-to-snapshot workflow. The future state is an orchestrated advisor intelligence layer with sector-specialized agents for deeper questions."

what:
  plain_language: "A lightweight advisor dashboard that accepts a stock ticker and returns a consistent snapshot of quote data, SEC filing highlights, financial-health signals, valuation context, and a short plain-English summary."
  user_action: "Advisor enters a ticker."
  product_response: "The system returns a consistent, scan-friendly briefing."
  output_characteristics:
    - "Same framework for every stock"
    - "Traffic-light signals for financial health"
    - "Valuation shown as context, not as a recommendation"
    - "Plain-English explanation at the end"
    - "Source-backed figures from public market data and SEC filings"
  today_vs_future:
    today:
      label: "Prototype"
      description: "Ticker in; fixed advisor snapshot out. Demonstrates the core workflow, data grounding, signal framework, and advisor-safe narration."
    future:
      label: "Orchestrated sector intelligence"
      description: "An orchestrator agent routes deeper advisor questions to specialized sector agents that know which metrics, risks, and filings matter for that industry."

why:
  business_problem:
    - "Advisor stock prep is often fragmented across quote pages, filings, notes, and memory."
    - "Manual review creates inconsistent depth from one stock to another."
    - "Client conversations require speed, confidence, and a clear explanation of what changed or matters."
    - "Different sectors require different analytical lenses; a generic stock summary can miss what matters in insurance, autos, pharmaceuticals, semiconductors, and other specialized domains."
  value_add:
    - "Reduces research friction before client conversations"
    - "Creates a repeatable first-pass review framework"
    - "Highlights weak or mixed fundamentals quickly"
    - "Keeps advisor judgment central"
    - "Improves explainability by tying signals to public data"
    - "Creates a foundation for routing nuanced sector-specific questions to the right analytical specialist"
  spend_justification:
    - "The consulting value is not only the UI; it is the translation of an ambiguous advisor workflow into a usable, governed AI-enabled product."
    - "The prototype demonstrates data sourcing, deterministic business rules, safety guardrails, and client-ready communication in one workflow."
    - "The solution is intentionally scoped to be credible under time constraints while leaving a clear path to production hardening."
    - "The future-state architecture compounds the value: the same front door can expand from a basic stock snapshot into a network of domain-aware advisory tools."

how:
  high_level_flow:
    - step: "Input"
      label: "Ticker"
      explanation: "The advisor starts with a company symbol instead of a free-form AI prompt."
    - step: "Gather"
      label: "Market data + SEC filings"
      explanation: "The system pulls current quote context and recent public filing data."
    - step: "Interpret"
      label: "Transparent financial-health rules"
      explanation: "Deterministic rules compute green, yellow, and red signals from the same framework each time."
    - step: "Explain"
      label: "Plain-English summary"
      explanation: "Claude summarizes the computed signals without creating investment advice."
    - step: "Use"
      label: "Advisor-ready snapshot"
      explanation: "The advisor reviews the snapshot and decides what deserves deeper investigation."
  technical_depth: "Use conceptual mechanics only. Avoid code, package names, database schema, deployment details, and model configuration unless asked during Q&A."
  future_state_flow:
    - step: "Advisor question"
      label: "Nuanced sector question"
      explanation: "Example: Is a P&C insurer pricing risk adequately given loss reserves and claims experience?"
    - step: "Orchestrator"
      label: "Routes to the right specialist"
      explanation: "The orchestrator determines whether the question belongs to insurance, autos, EVs, pharmaceuticals, semiconductors, or another domain."
    - step: "Sector sub-agent"
      label: "Applies domain-specific analysis"
      explanation: "The specialist uses sector-relevant metrics, filings, terminology, and risk patterns instead of applying a generic stock screen."
    - step: "Advisor response"
      label: "Grounded answer with caveats"
      explanation: "The advisor receives a plain-English answer that explains the evidence, uncertainty, and follow-up questions."
  future_state_examples:
    - sector: "P&C insurance"
      specialist_analysis: "Analyze loss reserves, reserve development, claims paid, combined ratio, loss ratio, premium adequacy, and capital strength to assess whether pricing and reserves appear aligned with future claims obligations."
    - sector: "Automotive"
      specialist_analysis: "Analyze unit volume, margins, incentives, financing exposure, inventory, supply chain pressure, and model mix."
    - sector: "Electric vehicles"
      specialist_analysis: "Analyze delivery growth, battery cost exposure, charging ecosystem, capex intensity, software revenue, and regulatory credits."
    - sector: "Pharmaceuticals"
      specialist_analysis: "Analyze patent cliffs, pipeline concentration, trial milestones, regulatory events, revenue concentration, and R&D productivity."
    - sector: "Semiconductors"
      specialist_analysis: "Analyze demand cycles, gross margin durability, inventory correction, foundry exposure, capex cycles, customer concentration, and export controls."

guardrails:
  must_communicate:
    - "Informational only"
    - "Not investment advice"
    - "No buy/sell/hold recommendation"
    - "Advisor judgment remains required"
  safety_framing: "The product flags fundamentals and context; it does not replace professional judgment or suitability analysis."

slide_count_guidance:
  recommended: 1
  acceptable_range: "1 to 3"
  if_one_slide:
    purpose: "Give a complete what/why/how story at a glance."
    structure:
      - "Headline: From ticker to advisor-ready stock snapshot"
      - "Left: Before state / fragmented manual prep"
      - "Middle: Product mechanism / source-backed signal engine"
      - "Right: After state / consistent advisor-ready briefing"
      - "Bottom: 3 or 4 value pillars"
  if_three_slides:
    slide_1:
      title: "What it is"
      job: "Show the transformation from ticker to advisor-ready snapshot."
    slide_2:
      title: "Why it matters"
      job: "Show business value: faster prep, consistency, confidence, advisor control."
    slide_3:
      title: "Where it can go"
      job: "Show today's prototype as the foundation for a future orchestrator that routes nuanced questions to sector-specialized agents."

recommended_headlines:
  primary: "From ticker to advisor-ready stock snapshot"
  alternatives:
    - "A faster first read on company fundamentals"
    - "Consistent stock prep, backed by public data"
    - "Financial-health signals advisors can explain"
    - "The first step toward sector-aware advisor intelligence"

recommended_subheads:
  primary: "Source-backed financial health signals for faster, more consistent client prep."
  alternatives:
    - "A repeatable first-pass briefing that helps advisors see what deserves attention."
    - "Live quote context, SEC filing signals, and plain-English narration in one workflow."
    - "Today: a focused snapshot. Next: specialist agents for deeper sector questions."

value_pillars:
  - label: "Faster prep"
    copy: "Move from scattered research to a focused first read."
  - label: "Consistent analysis"
    copy: "Use the same financial-health framework for every ticker."
  - label: "Source-backed confidence"
    copy: "Ground key figures in market data and public filings."
  - label: "Advisor-safe"
    copy: "Informational signals only; no buy, sell, or hold advice."

phrases_to_use:
  - "advisor-ready"
  - "source-backed"
  - "financial-health signals"
  - "consistent first pass"
  - "plain-English summary"
  - "advisor judgment remains central"
  - "not investment advice"
  - "from fragmented prep to focused review"
  - "future-state orchestrator"
  - "sector-specialized agents"
  - "domain-aware analysis"
  - "right expert for the right question"

phrases_to_avoid:
  - "AI decides"
  - "investment recommendation"
  - "automated stock picking"
  - "predicts winners"
  - "guaranteed accuracy"
  - "replaces the advisor"
  - "black box"
  - "fully autonomous research analyst"
  - "production-ready multi-agent platform"

visual_direction:
  intent: "Communicate transformation and value, not implementation detail."
  tone:
    - "Professional"
    - "Calm"
    - "Finance-credible"
    - "Clear within 10 seconds"
  recommended_visual_metaphor:
    - "Before/after workflow"
    - "Ticker-to-snapshot pipeline"
    - "Scattered inputs becoming a clean advisor view"
    - "Today-to-future bridge: current snapshot as the foundation, future orchestrator branching to sector specialists"
  avoid_visuals:
    - "Dense architecture diagrams"
    - "Code screenshots"
    - "Overly literal full-dashboard replicas"
    - "Decorative AI brain imagery"
    - "Generic chatbot bubbles"
    - "Overpromising performance charts"
  color_guidance: "Use restrained neutrals with purposeful muted green/yellow/red accents for signal language."

demo_alignment:
  prototype_status_framing: "Present as a working prototype built to prove the workflow and value proposition, not a production-ready platform."
  demo_story:
    - "Open with the advisor pain: quick stock prep before a client conversation."
    - "Enter a ticker."
    - "Show the product returning a consistent snapshot."
    - "Point out that the colors are transparent signals, not recommendations."
    - "Close by saying the advisor now knows where to focus deeper review."
  future_state_story:
    - "After the demo, explain that the same interface can evolve from a fixed snapshot into an orchestrated advisor assistant."
    - "The orchestrator would route nuanced questions to sector-specific agents instead of forcing every company through a generic framework."
    - "Example: a P&C insurance specialist could examine reserves, claims trends, and pricing adequacy; an EV specialist would examine a different set of drivers."
    - "This positions the prototype as the foundation of a broader advisory intelligence platform."

success_criteria_for_slide_agent:
  - "A non-technical advisor can explain the product after seeing the slide."
  - "The business value is clearer than the technical stack."
  - "The slide does not imply investment advice."
  - "The slide makes the consulting spend feel justified through workflow improvement, governance, and speed."
  - "The visual leaves room for the live demo to show product specifics."
  - "If future state is included, it is clearly labeled as future state and does not imply today's prototype already contains sector-specialized sub-agents."
