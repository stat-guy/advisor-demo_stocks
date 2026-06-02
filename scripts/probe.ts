// One-off probe: validate live EDGAR + Yahoo fetch and dump real figures for calibration.
// Usage: bun scripts/probe.ts F TSLA RIVN
import {
  lookupCik,
  fetchCompanyFacts,
  fetchSubmissions,
  extractFinancials,
  isFinancialSic,
} from "../server/sources/edgar";
import { getQuote } from "../server/sources/yahoo";

const tickers = process.argv.slice(2);
const m = (n: number | undefined | null) =>
  n == null ? "—" : (n / 1e9).toFixed(2) + "B";

for (const t of tickers) {
  console.log(`\n=========== ${t} ===========`);
  const cikInfo = await lookupCik(t);
  if (!cikInfo) {
    console.log("  no CIK");
    continue;
  }
  console.log(`  ${cikInfo.name}  CIK=${cikInfo.cik}`);
  const [facts, subs, quote] = await Promise.all([
    fetchCompanyFacts(cikInfo.cik),
    fetchSubmissions(cikInfo.cik),
    getQuote(t),
  ]);
  const fin = extractFinancials(facts);
  console.log(
    `  sector: ${subs.sicDescription} (${subs.sic}) financial=${isFinancialSic(subs.sic)}`,
  );
  console.log(
    `  latest 10-K: ${subs.latest10K?.filedDate}  10-Q: ${subs.latest10Q?.filedDate}`,
  );
  console.log(`  price: ${quote?.price} ${quote?.currency}  PE=${quote?.trailingPE} P/S=${quote?.priceToSales} mktcap=${m(quote?.marketCap)}`);
  const yrs = (s: typeof fin.revenue) =>
    s.slice(0, 3).map((p) => `${p.fy}:${m(p.value)}`).join("  ");
  console.log(`  revenue:   ${yrs(fin.revenue)}`);
  console.log(`  netIncome: ${yrs(fin.netIncome)}`);
  console.log(`  opIncome:  ${yrs(fin.operatingIncome)}`);
  console.log(`  EPS dil:   ${fin.epsDiluted.slice(0, 3).map((p) => `${p.fy}:${p.value}`).join("  ")}`);
  console.log(`  OCF:       ${yrs(fin.operatingCashFlow)}`);
  console.log(`  capex:     ${yrs(fin.capex)}`);
  console.log(`  assetsCur=${m(fin.assetsCurrent?.value)} liabCur=${m(fin.liabilitiesCurrent?.value)} equity=${m(fin.stockholdersEquity?.value)} debt=${m(fin.totalDebt?.value)} (@${fin.assetsCurrent?.end})`);
}
