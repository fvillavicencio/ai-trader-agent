import { getTopHoldings } from './services/etf.js';
import { getSP500Earnings } from './services/earnings.js';
import { getMarketPath } from './services/technicals.js';
import { getForwardEpsEstimates } from './services/forwardPE.js';
import { getSP500IndexPrice } from './services/price.js';
import { getSPYMovingAverages } from './services/movingAverages.js';

/**
 * Runs the S&P 500 analysis and returns a structured JSON object.
 */
export async function analyzeSP500() {
  console.log("[DIAG] analyzeSP500: start");
  const freshnessSections = [];

  // Parallelize independent API calls
  console.log("[DIAG] analyzeSP500: starting parallel data fetches");
  const [
    spxObj,
    earningsObj,
    forwardEstimates,
    pathObj,
    maObj
  ] = await Promise.all([
    getSP500IndexPrice(),
    getSP500Earnings(),
    getForwardEpsEstimates(),
    getMarketPath(),
    getSPYMovingAverages()
  ]);
  console.log("[DIAG] analyzeSP500: all core data fetched");

  // Defensive: Ensure all service results are never null
  const safeSpxObj = spxObj || { price: null, lastUpdated: '', sourceName: 'N/A', sourceUrl: '' };
  const safeEarningsObj = earningsObj || { eps: null, pe: null, price: null, value: null, sourceName: 'N/A', sourceUrl: '', lastUpdated: '', provider: 'N/A' };
  const safeForwardEstimates = Array.isArray(forwardEstimates) && forwardEstimates.length > 0 ? forwardEstimates : [{ estimateDate: '', value: null, source: 'N/A', lastUpdated: '' }];
  const safePathObj = pathObj || { value: null, lastUpdated: '', sourceName: 'N/A', sourceUrl: '' };
  const safeMaObj = maObj || { latest: null, sma50: null, sma200: null };

  freshnessSections.push({ label: 'S&P 500 Index', lastUpdated: safeSpxObj.lastUpdated, sourceName: safeSpxObj.sourceName });

  let trailingPE = null;
  if (safeEarningsObj && safeEarningsObj.pe && safeEarningsObj.sourceName && safeEarningsObj.sourceUrl) {
    trailingPE = {
      pe: safeEarningsObj.pe,
      sourceName: safeEarningsObj.sourceName,
      sourceUrl: safeEarningsObj.sourceUrl,
      lastUpdated: safeEarningsObj.lastUpdated,
      provider: safeEarningsObj.provider,
      history: safeEarningsObj.history
    };
  }

  const forwardDate = safeForwardEstimates[0]?.estimateDate || safeSpxObj.lastUpdated;
  freshnessSections.push({ label: 'Trailing P/E', lastUpdated: safeEarningsObj.lastUpdated, sourceName: safeEarningsObj.sourceName });
  freshnessSections.push({ label: 'Forward EPS', lastUpdated: forwardDate, sourceName: safeForwardEstimates[0]?.source || 'N/A' });
  freshnessSections.push({ label: 'Market Path (RSI)', lastUpdated: safePathObj.lastUpdated, sourceName: safePathObj.sourceName });

  // Parallelize ETF holdings fetches
  console.log("[DIAG] analyzeSP500: fetching ETF holdings in parallel");
  const indices = [
    { symbol: 'SPY', name: 'S&P 500' },
    { symbol: 'QQQ', name: 'NASDAQ 100' },
    { symbol: 'DIA', name: 'Dow Jones 30' }
  ];
  const etfHoldings = await Promise.all(indices.map(async (idx) => {
    console.log(`[DIAG] analyzeSP500: fetching holdings for ${idx.symbol}`);
    try {
      const etf = await getTopHoldings(idx.symbol);
      const safeEtf = etf || { holdings: [], sourceName: 'N/A', sourceUrl: '', lastUpdated: '' };
      freshnessSections.push({ label: `${idx.symbol} Holdings`, lastUpdated: safeEtf.lastUpdated, sourceName: safeEtf.sourceName });
      console.log(`[DIAG] analyzeSP500: holdings for ${idx.symbol} fetched`, safeEtf);
      return {
        indexName: idx.name,
        symbol: idx.symbol,
        holdings: safeEtf.holdings,
        sourceName: safeEtf.sourceName,
        sourceUrl: safeEtf.sourceUrl,
        lastUpdated: safeEtf.lastUpdated
      };
    } catch (err) {
      console.error(`[DIAG] analyzeSP500: error fetching holdings for ${idx.symbol}:`, err);
      return { symbol: idx.symbol, error: err.message };
    }
  }));

  freshnessSections.push({ label: 'Trailing EPS', lastUpdated: safeEarningsObj.lastUpdated, sourceName: safeEarningsObj.sourceName });

  console.log("[DIAG] analyzeSP500: finished, returning result");
  return {
    sp500Index: safeSpxObj,
    trailingPE,
    forwardEstimates: safeForwardEstimates,
    marketPath: safePathObj,
    movingAverages: safeMaObj,
    etfHoldings,
    earnings: safeEarningsObj,
    dataFreshness: freshnessSections
  };
}
