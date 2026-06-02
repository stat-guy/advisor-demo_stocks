import { cacheGet, cacheSet } from "../db";

// ── Types ───────────────────────────────────────────────────────────────────

/** One reported XBRL datapoint, normalized. */
export interface FinPoint {
  value: number;
  end: string; // period end (ISO)
  start?: string; // period start (ISO) for duration concepts
  fy: number;
  fp: string; // "FY" | "Q1".."Q4"
  form: string; // "10-K" | "10-Q" | ...
  accession: string;
  filed: string; // ISO
}

/** Normalized financials consumed by the rules engine. Flow series are annual,
 *  newest-first; balance items are the single most-recent instant value. */
export interface Financials {
  cik: string | null;
  revenue: FinPoint[];
  netIncome: FinPoint[];
  grossProfit: FinPoint[];
  operatingIncome: FinPoint[];
  epsDiluted: FinPoint[];
  operatingCashFlow: FinPoint[];
  capex: FinPoint[];
  assetsCurrent: FinPoint | null;
  liabilitiesCurrent: FinPoint | null;
  stockholdersEquity: FinPoint | null;
  totalDebt: FinPoint | null;
}

interface RawEntry {
  val: number;
  end: string;
  start?: string;
  fy: number;
  fp: string;
  form: string;
  accn: string;
  filed: string;
  frame?: string;
}

interface CompanyFacts {
  cik?: number | string;
  entityName?: string;
  facts?: { "us-gaap"?: Record<string, { units?: Record<string, RawEntry[]> }> };
}

// ── Pure helpers ──────────────────────────────────────────────────────────────

export function padCik(cik: string | number): string {
  return String(cik).replace(/\D/g, "").padStart(10, "0");
}

export function parseCompanyTickers(
  raw: Record<string, { cik_str: number | string; ticker: string; title: string }>,
): Record<string, { cik: string; name: string }> {
  const map: Record<string, { cik: string; name: string }> = {};
  for (const row of Object.values(raw)) {
    if (!row?.ticker) continue;
    map[row.ticker.toUpperCase()] = { cik: padCik(row.cik_str), name: row.title };
  }
  return map;
}

export function buildFilingUrl(cik: string, accession: string): string {
  const cikInt = String(Number(padCik(cik)));
  const noDashes = accession.replace(/-/g, "");
  return `https://www.sec.gov/Archives/edgar/data/${cikInt}/${noDashes}/${accession}-index.htm`;
}

const CONCEPTS = {
  revenue: [
    "Revenues",
    "RevenueFromContractWithCustomerExcludingAssessedTax",
    "RevenueFromContractWithCustomerIncludingAssessedTax",
    "SalesRevenueNet",
  ],
  netIncome: ["NetIncomeLoss", "ProfitLoss"],
  grossProfit: ["GrossProfit"],
  operatingIncome: ["OperatingIncomeLoss"],
  epsDiluted: ["EarningsPerShareDiluted", "EarningsPerShareBasicAndDiluted"],
  operatingCashFlow: [
    "NetCashProvidedByUsedInOperatingActivities",
    "NetCashProvidedByUsedInOperatingActivitiesContinuingOperations",
  ],
  capex: [
    "PaymentsToAcquirePropertyPlantAndEquipment",
    "PaymentsToAcquireProductiveAssets",
  ],
  assetsCurrent: ["AssetsCurrent"],
  liabilitiesCurrent: ["LiabilitiesCurrent"],
  stockholdersEquity: [
    "StockholdersEquity",
    "StockholdersEquityIncludingPortionAttributableToNoncontrollingInterest",
  ],
  longTermDebt: ["LongTermDebtNoncurrent", "LongTermDebt"],
  totalLiabilities: ["Liabilities"],
} as const;

/** Raw datapoints for a single concept name, preferring the requested unit. */
function entriesOf(
  facts: CompanyFacts,
  name: string,
  unitPref = "USD",
): RawEntry[] {
  const units = facts.facts?.["us-gaap"]?.[name]?.units;
  if (!units) return [];
  return units[unitPref] ?? Object.values(units)[0] ?? [];
}

function toPoint(e: RawEntry): FinPoint {
  return {
    value: e.val,
    end: e.end,
    start: e.start,
    fy: e.fy,
    fp: e.fp,
    form: e.form,
    accession: e.accn,
    filed: e.filed,
  };
}

/** Annual (10-K, FY) points for ONE concept, deduped by fiscal year keeping the
 *  latest-filed value (handles restatements). */
function annualByFy(entries: RawEntry[]): Map<number, FinPoint> {
  const byFy = new Map<number, RawEntry>();
  for (const e of entries) {
    if (!(e.fp === "FY" && typeof e.form === "string" && e.form.startsWith("10-K"))) {
      continue;
    }
    const prev = byFy.get(e.fy);
    if (!prev || e.filed > prev.filed) byFy.set(e.fy, e);
  }
  const out = new Map<number, FinPoint>();
  for (const [fy, e] of byFy) out.set(fy, toPoint(e));
  return out;
}

/** Annual series merged across concept aliases: higher-priority alias wins a
 *  given fiscal year; lower-priority aliases only fill years still missing.
 *  Handles companies that switch XBRL tags across years. Newest period-end first. */
function annualMerged(
  facts: CompanyFacts,
  names: readonly string[],
  unitPref = "USD",
): FinPoint[] {
  const merged = new Map<number, FinPoint>();
  for (const name of names) {
    for (const [fy, p] of annualByFy(entriesOf(facts, name, unitPref))) {
      if (!merged.has(fy)) merged.set(fy, p);
    }
  }
  return [...merged.values()].sort((a, b) =>
    a.end < b.end ? 1 : a.end > b.end ? -1 : 0,
  );
}

/** Most recent instant value across concept aliases (max period end). */
function latestInstantMerged(
  facts: CompanyFacts,
  names: readonly string[],
  unitPref = "USD",
): FinPoint | null {
  let best: FinPoint | null = null;
  for (const name of names) {
    for (const e of entriesOf(facts, name, unitPref)) {
      if (!best || e.end > best.end || (e.end === best.end && e.filed > best.filed)) {
        best = toPoint(e);
      }
    }
  }
  return best;
}

export function extractFinancials(facts: CompanyFacts): Financials {
  const longTermDebt = latestInstantMerged(facts, CONCEPTS.longTermDebt);
  const totalDebt =
    longTermDebt ?? latestInstantMerged(facts, CONCEPTS.totalLiabilities);

  return {
    cik: facts.cik != null ? padCik(facts.cik) : null,
    revenue: annualMerged(facts, CONCEPTS.revenue),
    netIncome: annualMerged(facts, CONCEPTS.netIncome),
    grossProfit: annualMerged(facts, CONCEPTS.grossProfit),
    operatingIncome: annualMerged(facts, CONCEPTS.operatingIncome),
    epsDiluted: annualMerged(facts, CONCEPTS.epsDiluted, "USD/shares"),
    operatingCashFlow: annualMerged(facts, CONCEPTS.operatingCashFlow),
    capex: annualMerged(facts, CONCEPTS.capex),
    assetsCurrent: latestInstantMerged(facts, CONCEPTS.assetsCurrent),
    liabilitiesCurrent: latestInstantMerged(facts, CONCEPTS.liabilitiesCurrent),
    stockholdersEquity: latestInstantMerged(facts, CONCEPTS.stockholdersEquity),
    totalDebt,
  };
}

// ── Network fetchers (impure, cached) ─────────────────────────────────────────

const UA = `${process.env.EDGAR_CONTACT ?? "advisor-demo contact@example.com"} (advisor-stock-snapshot)`;
const DAY = 24 * 60 * 60 * 1000;

async function edgarFetch(url: string, allow404 = false): Promise<any | null> {
  const res = await fetch(url, {
    headers: { "User-Agent": UA, Accept: "application/json" },
  });
  if (allow404 && res.status === 404) return null;
  if (!res.ok) throw new Error(`EDGAR ${res.status} for ${url}`);
  return res.json();
}

/** ticker (any case) -> { cik, name } | null */
export async function lookupCik(
  ticker: string,
): Promise<{ cik: string; name: string } | null> {
  const KEY = "edgar:tickers";
  let map = cacheGet<Record<string, { cik: string; name: string }>>(KEY, DAY);
  if (!map) {
    const raw = await edgarFetch("https://www.sec.gov/files/company_tickers.json");
    map = parseCompanyTickers(raw);
    cacheSet(KEY, map);
  }
  return map[ticker.toUpperCase()] ?? null;
}

/** Returns null when the company has no XBRL facts (e.g. ETFs, many foreign filers). */
export async function fetchCompanyFacts(cik: string): Promise<CompanyFacts | null> {
  const KEY = `edgar:facts:${padCik(cik)}`;
  const cached = cacheGet<CompanyFacts>(KEY, DAY);
  if (cached) return cached;
  const data = await edgarFetch(
    `https://data.sec.gov/api/xbrl/companyfacts/CIK${padCik(cik)}.json`,
    true,
  );
  if (!data) return null;
  cacheSet(KEY, data);
  return data;
}

export interface FilingRef {
  form: string;
  accession: string;
  filedDate: string;
  url: string;
  period?: string;
}

export interface Submissions {
  sic: string | null;
  sicDescription: string | null;
  filings: FilingRef[];
  latest10K: FilingRef | null;
  latest10Q: FilingRef | null;
}

export async function fetchSubmissions(cik: string): Promise<Submissions | null> {
  const KEY = `edgar:subs:${padCik(cik)}`;
  const cached = cacheGet<Submissions>(KEY, DAY);
  if (cached) return cached;
  const data = await edgarFetch(
    `https://data.sec.gov/submissions/CIK${padCik(cik)}.json`,
    true,
  );
  if (!data) return null;
  const parsed = parseSubmissions(data, cik);
  cacheSet(KEY, parsed);
  return parsed;
}

/** Pure: turn raw submissions JSON into typed filing refs. */
export function parseSubmissions(data: any, cik: string): Submissions {
  const r = data?.filings?.recent ?? {};
  const forms: string[] = r.form ?? [];
  const accns: string[] = r.accessionNumber ?? [];
  const dates: string[] = r.filingDate ?? [];
  const reports: string[] = r.reportDate ?? [];
  const filings: FilingRef[] = forms.map((form, i) => ({
    form,
    accession: accns[i],
    filedDate: dates[i],
    period: reports[i] || undefined,
    url: buildFilingUrl(cik, accns[i] ?? ""),
  }));
  const latest = (f: string) => filings.find((x) => x.form === f) ?? null;
  return {
    sic: data?.sic ? String(data.sic) : null,
    sicDescription: data?.sicDescription ?? null,
    filings,
    latest10K: latest("10-K"),
    latest10Q: latest("10-Q"),
  };
}

/** SIC 6000–6799 = finance/insurance/real-estate. */
export function isFinancialSic(sic: string | null): boolean {
  if (!sic) return false;
  const n = Number(sic);
  return n >= 6000 && n <= 6799;
}
