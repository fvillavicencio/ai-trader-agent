import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();
import { getSP500EpsAndPeFromYahoo15 } from './yahoo15.js';
import { getHistoricalPERatios } from './historicalPE.js';
import { getDirectSP500EPS, estimateSP500EPS } from './directEPS.js';

/**
 * Attempts to fetch the latest S&P 500 EPS (TTM) and P/E with cascading fallbacks
 * Returns: { eps, pe, price, sourceName, sourceUrl, lastUpdated, provider, history }
 */
export async function getSP500Earnings() {
  try {
    // Get historical P/E data first (we'll need this regardless of which API succeeds)
    const historicalPE = await getHistoricalPERatios();
    
    // First, try to get the EPS directly from authoritative sources
    const directEPS = await getDirectSP500EPS();
    if (directEPS && directEPS.eps) {
      console.log(`[DIAG] Using direct EPS value: ${directEPS.eps} from ${directEPS.sourceName}`);
      
      // Now get the price and P/E from Yahoo Finance
      try {
        const yahoo15 = await getSP500EpsAndPeFromYahoo15();
        if (yahoo15 && yahoo15.pe && yahoo15.price) {
          // We have direct EPS and Yahoo Finance price and P/E
          // This is the most accurate combination
          return {
            eps: Number(directEPS.eps.toFixed(2)),
            pe: yahoo15.pe,
            price: yahoo15.price,
            sourceName: directEPS.sourceName,
            sourceUrl: directEPS.sourceUrl,
            lastUpdated: directEPS.lastUpdated,
            provider: directEPS.provider,
            history: historicalPE,
          };
        }
      } catch (e) {
        console.error('[getSP500Earnings] Yahoo15 error:', e.message);
      }
      
      // If we have direct EPS but couldn't get Yahoo price/PE, try to get price directly
      try {
        const response = await axios.get('https://query1.finance.yahoo.com/v8/finance/chart/%5EGSPC', {
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; sp500-analyzer/1.0)'
          },
          timeout: 10000
        });
        
        if (response.data && response.data.chart && response.data.chart.result) {
          const price = response.data.chart.result[0].meta.regularMarketPrice;
          
          // Calculate P/E from price and direct EPS
          const pe = price / directEPS.eps;
          
          return {
            eps: Number(directEPS.eps.toFixed(2)),
            pe: Number(pe.toFixed(2)),
            price,
            sourceName: directEPS.sourceName,
            sourceUrl: directEPS.sourceUrl,
            lastUpdated: directEPS.lastUpdated,
            provider: directEPS.provider,
            history: historicalPE,
          };
        }
      } catch (e) {
        console.error('[getSP500Earnings] Yahoo direct error:', e.message);
      }
    }
    
    // If we couldn't get direct EPS, fall back to Yahoo15
    try {
      const yahoo15 = await getSP500EpsAndPeFromYahoo15();
      if (yahoo15 && yahoo15.eps && yahoo15.pe && yahoo15.price) {
        // Validate EPS - if it seems out of range, recalculate it
        const calculatedEps = yahoo15.price / yahoo15.pe;
        const epsToIndexRatio = yahoo15.eps / yahoo15.price;
        const minRatio = 0.01; // EPS should be at least 1% of index for S&P 500
        const maxRatio = 0.1;  // EPS should be at most 10% of index for S&P 500
        
        let eps = yahoo15.eps;
        if (epsToIndexRatio < minRatio || epsToIndexRatio > maxRatio || isNaN(eps)) {
          console.log(`[DIAG] EPS validation: Original EPS (${eps}) seems out of range. Recalculating.`);
          eps = calculatedEps;
        }
        
        return {
          eps: Number(eps.toFixed(2)),
          pe: yahoo15.pe,
          price: yahoo15.price,
          sourceName: yahoo15.sourceName,
          sourceUrl: yahoo15.sourceUrl,
          lastUpdated: yahoo15.lastUpdated,
          provider: yahoo15.provider,
          history: historicalPE,
        };
      }
    } catch (e) {
      console.error('[getSP500Earnings] Yahoo15 error:', e.message);
    }
    
    // If all else fails, use historical P/E and direct price
    try {
      const response = await axios.get('https://query1.finance.yahoo.com/v8/finance/chart/%5EGSPC', {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; sp500-analyzer/1.0)'
        },
        timeout: 10000
      });
      
      if (response.data && response.data.chart && response.data.chart.result) {
        const price = response.data.chart.result[0].meta.regularMarketPrice;
        const pe = historicalPE?.current || 20; // Use current P/E from historical data or fallback to 20
        const eps = price / pe;
        
        return {
          eps: Number(eps.toFixed(2)),
          pe: Number(pe.toFixed(2)),
          price,
          sourceName: 'Yahoo Finance (direct) + Historical P/E',
          sourceUrl: 'https://finance.yahoo.com/quote/%5EGSPC',
          lastUpdated: new Date().toISOString(),
          provider: 'yahoo-direct-fallback',
          history: historicalPE,
        };
      }
    } catch (e) {
      console.error('[getSP500Earnings] Yahoo direct error:', e.message);
    }
    
    // If absolutely everything fails, return null
    return null;
  } catch (err) {
    console.error('[getSP500Earnings] Error:', err);
    return { 
      eps: null, 
      pe: null, 
      price: null, 
      sourceName: 'N/A', 
      sourceUrl: '', 
      lastUpdated: new Date().toISOString(),
      provider: 'none',
      error: err.message 
    };
  }
}
