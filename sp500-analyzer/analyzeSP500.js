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

  freshnessSections.push({ label: 'S&P 500 Index', lastUpdated: spxObj.lastUpdated, sourceName: spxObj.sourceName });

  let trailingPE = null;
  if (earningsObj && earningsObj.pe && earningsObj.sourceName && earningsObj.sourceUrl) {
    trailingPE = {
      pe: earningsObj.pe,
      sourceName: earningsObj.sourceName,
      sourceUrl: earningsObj.sourceUrl,
      lastUpdated: earningsObj.lastUpdated,
      provider: earningsObj.provider,
      history: earningsObj.history
    };
  }

  const forwardDate = forwardEstimates[0]?.estimateDate || spxObj.lastUpdated;
  freshnessSections.push({ label: 'Trailing P/E', lastUpdated: earningsObj.lastUpdated, sourceName: earningsObj.sourceName });
  freshnessSections.push({ label: 'Forward EPS', lastUpdated: forwardDate, sourceName: forwardEstimates[0]?.source });
  freshnessSections.push({ label: 'Market Path (RSI)', lastUpdated: pathObj.lastUpdated, sourceName: pathObj.sourceName });

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
      freshnessSections.push({ label: `${idx.symbol} Holdings`, lastUpdated: etf.lastUpdated, sourceName: etf.sourceName });
      console.log(`[DIAG] analyzeSP500: holdings for ${idx.symbol} fetched`, etf);
      return {
        indexName: idx.name,
        symbol: idx.symbol,
        holdings: etf.holdings,
        sourceName: etf.sourceName,
        sourceUrl: etf.sourceUrl,
        lastUpdated: etf.lastUpdated
      };
    } catch (err) {
      console.error(`[DIAG] analyzeSP500: error fetching holdings for ${idx.symbol}:`, err);
      return { symbol: idx.symbol, error: err.message };
    }
  }));

  freshnessSections.push({ label: 'Trailing EPS', lastUpdated: earningsObj.lastUpdated, sourceName: earningsObj.sourceName });

  console.log("[DIAG] analyzeSP500: finished, returning result");
  return {
    sp500Index: spxObj,
    trailingPE,
    forwardEstimates,
    marketPath: pathObj,
    movingAverages: maObj,
    etfHoldings,
    earnings: earningsObj,
    dataFreshness: freshnessSections
  };
}
