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
  let spxObj, earningsObj, forwardEstimates, pathObj, maObj;
  
  try {
    [spxObj, earningsObj, forwardEstimates, pathObj, maObj] = await Promise.all([
      getSP500IndexPrice(),
      getSP500Earnings(),
      getForwardEpsEstimates(),
      getMarketPath(),
      getSPYMovingAverages()
    ]);
    console.log("[DIAG] analyzeSP500: all core data fetched");
  } catch (error) {
    console.error("[DIAG] analyzeSP500: error fetching data:", error);
    // Check if the error is related to HTML content
    if (error.message && (error.message.includes('<!DOCTYPE') || error.message.includes('<html'))) {
      throw new Error("Received HTML content in API response. The data source may be returning an error page.");
    }
    // Re-throw the error to be caught by the lambda handler
    throw error;
  }

  // Defensive: Ensure all service results are never null
  const safeSpxObj = spxObj || { price: null, lastUpdated: '', sourceName: 'N/A', sourceUrl: '' };
  const safeEarningsObj = earningsObj || { eps: null, pe: null, price: null, value: null, sourceName: 'N/A', sourceUrl: '', lastUpdated: '', provider: 'N/A' };
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
      history: safeEarningsObj.history,
      fiveYearAvg: safeEarningsObj.history?.fiveYearAvg || null,
      tenYearAvg: safeEarningsObj.history?.tenYearAvg || null
    };
  }

  // Process forward EPS estimates
  let formattedEstimates = [];
  let forwardPE = null;
  try {
    console.log('[DIAG] analyzeSP500: fetching forward EPS estimates');
    const forwardEpsEstimates = await getForwardEpsEstimates();
    
    // Format for Lambda response - ensure compatibility with SP500Analyzer.gs
    // SP500Analyzer.gs expects 'eps' property, so map 'value' to 'eps'
    formattedEstimates = forwardEpsEstimates.map(est => ({
      year: est.year,
      estimateDate: est.estimateDate,
      eps: est.value, // Map value to eps for compatibility
      value: est.value, // Keep value for newer code
      source: est.source,
      sourceUrl: est.sourceUrl,
      lastUpdated: formatDate(new Date())
    }));
    
    // Calculate forward P/E ratio if we have the necessary data
    if (formattedEstimates.length > 0 && safeSpxObj.price) {
      const currentForwardEps = formattedEstimates[0];
      let epsValue = currentForwardEps.value || currentForwardEps.eps;
      
      // Extract numeric value from EPS string if needed
      if (typeof epsValue === 'string' && epsValue.startsWith('$')) {
        epsValue = epsValue.substring(1);
      }
      epsValue = parseFloat(epsValue);
      
      if (!isNaN(epsValue) && epsValue > 0) {
        // Calculate forward P/E ratio
        const forwardPERatio = safeSpxObj.price / epsValue;
        
        // Create the forward P/E object
        forwardPE = {
          current: parseFloat(forwardPERatio.toFixed(2)),
          eps: currentForwardEps.eps || currentForwardEps.value,
          year: currentForwardEps.year,
          source: currentForwardEps.source || "S&P Global",
          sourceUrl: currentForwardEps.sourceUrl || "https://www.spglobal.com/spdji/en/",
          lastUpdated: currentForwardEps.lastUpdated || formatDate(new Date())
        };
        
        console.log(`[DIAG] analyzeSP500: calculated forward P/E ratio: ${forwardPERatio.toFixed(2)} based on EPS: ${epsValue} and index level: ${safeSpxObj.price}`);
      } else {
        console.log(`[DIAG] analyzeSP500: could not calculate forward P/E - invalid EPS value: ${epsValue}`);
      }
    } else {
      console.log("[DIAG] analyzeSP500: could not calculate forward P/E - missing required data (price or forwardEps)");
    }
    
    const forwardDate = formattedEstimates[0]?.estimateDate || safeSpxObj.lastUpdated;
    freshnessSections.push({ label: 'Forward EPS', lastUpdated: forwardDate, sourceName: formattedEstimates[0]?.source || 'N/A' });
  } catch (error) {
    console.error('[ERROR] Failed to fetch forward EPS estimates:', error);
    const forwardDate = safeSpxObj.lastUpdated;
    freshnessSections.push({ label: 'Forward EPS', lastUpdated: forwardDate, sourceName: 'N/A' });
  }

  freshnessSections.push({ label: 'Trailing P/E', lastUpdated: safeEarningsObj.lastUpdated, sourceName: safeEarningsObj.sourceName });
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

  // Extract historical P/E data if available
  let historicalPE = null;
  if (safeEarningsObj && safeEarningsObj.history) {
    // The historical P/E data should already be properly formatted from the historicalPE.js service
    // Just pass it through with any necessary additional metadata
    historicalPE = {
      ...safeEarningsObj.history,
      source: safeEarningsObj.history.source || safeEarningsObj.sourceName,
      sourceUrl: safeEarningsObj.history.sourceUrl || safeEarningsObj.sourceUrl,
      lastUpdated: safeEarningsObj.history.lastUpdated || safeEarningsObj.lastUpdated
    };
  }

  console.log("[DIAG] analyzeSP500: finished, returning result");
  return {
    sp500Index: safeSpxObj,
    trailingPE,
    forwardPE, // Add the forward P/E ratio to the returned data
    forwardEstimates: formattedEstimates || [],
    marketPath: safePathObj,
    movingAverages: safeMaObj,
    etfHoldings,
    earnings: safeEarningsObj,
    dataFreshness: freshnessSections,
    // Add historical P/E data as a new property
    historicalPE
  };
}

function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
