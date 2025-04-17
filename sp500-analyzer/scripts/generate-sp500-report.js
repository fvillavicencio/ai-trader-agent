// generate-sp500-report.js
// Script to generate and print a simple S&P 500 EPS & P/E report using the unified cascading fallback service

import { getSP500Earnings } from '../services/earnings.js';

(async () => {
  try {
    const result = await getSP500Earnings();
    console.log('=== S&P 500 (SPY) EPS (TTM) & P/E Report ===');
    if (!result || typeof result !== 'object') {
      throw new Error('No data returned from getSP500Earnings');
    }
    const price = result.price ?? result.value ?? null;
    const pe = result.pe ?? null;
    const eps = result.eps ?? result.value ?? null;
    if (price !== null) console.log(`Price: $${price}`);
    if (pe !== null) console.log(`TTM P/E: ${pe}`);
    if (eps !== null) console.log(`TTM EPS: $${eps}`);
    console.log(`Source: ${result.sourceName || result.provider}`);
    console.log(`Last Updated: ${result.lastUpdated}`);
    if (result.sourceUrl) console.log(`Source URL: ${result.sourceUrl}`);
    if (result.provider === 'S&P Global' || result.provider === 'multpl') {
      console.warn('\n[NOTE] Only limited fields are available from fallback web sources.');
    }
  } catch (err) {
    console.error('Failed to generate S&P 500 report:', err && err.message ? err.message : err);
    process.exit(1);
  }
})();
