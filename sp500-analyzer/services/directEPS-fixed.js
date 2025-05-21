import axios from 'axios';

/**
 * Fetches S&P 500 EPS (TTM) directly from authoritative sources
 * Uses multiple sources with fallbacks to ensure accuracy
 */
export async function getDirectSP500EPS() {
  try {
    // Try multiple sources in sequence until we get a valid result
    const sources = [
      fetchEPSFromMultpl,
      fetchEPSFromYCharts,
      fetchEPSFromWSJ
    ];

    for (const source of sources) {
      try {
        const result = await source();
        if (result && result.eps && !isNaN(result.eps)) {
          // Validate the EPS value - S&P 500 TTM EPS should be in the $200-$213 range
          // If it's much lower (around $50-60), it's likely a quarterly figure
          if (result.eps >= 50 && result.eps <= 80) {
            console.log(`[DIAG] Detected quarterly EPS value (${result.eps}), converting to TTM`);
            // Convert quarterly to TTM by multiplying by 4
            // This is an approximation but better than using the quarterly value directly
            result.eps = result.eps * 4;
            result.isAdjusted = true;
            result.adjustmentMethod = 'Quarterly to TTM (×4)';
          }
          
          // Final validation - S&P 500 TTM EPS should be 3-5% of the index value
          // For a 5600 index, EPS should be around $168-$280
          const indexValue = 5600; // Approximate current S&P 500 value
          const epsToIndexRatio = result.eps / indexValue;
          
          if (epsToIndexRatio < 0.03 || epsToIndexRatio > 0.05) {
            console.log(`[DIAG] EPS value (${result.eps}) has unusual ratio to index (${epsToIndexRatio.toFixed(4)}), but using anyway`);
          }
          
          return result;
        }
      } catch (error) {
        console.error(`[ERROR] Failed to fetch EPS from source: ${error.message}`);
        // Continue to next source
      }
    }

    // If all sources fail, return null
    return null;
  } catch (error) {
    console.error('[ERROR] Failed to fetch direct S&P 500 EPS:', error);
    return null;
  }
}

/**
 * Fetches S&P 500 EPS from multpl.com
 * This is one of the most reliable sources for S&P 500 EPS data
 */
async function fetchEPSFromMultpl() {
  try {
    console.log('[DIAG] Fetching S&P 500 EPS from multpl.com');
    
    // Dynamically import cheerio
    const cheerio = await import('cheerio').then(module => module.default || module);
    
    const url = 'https://www.multpl.com/s-p-500-earnings/table/by-month';
    const { data } = await axios.get(url, { 
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; sp500-analyzer/1.0)' },
      timeout: 10000
    });
    
    const $ = cheerio.load(data);
    const rows = $('table#datatable tbody tr');
    
    // Get the most recent entry (first row)
    if (rows.length > 0) {
      const firstRow = $(rows[0]);
      const dateText = $(firstRow.find('td')[0]).text().trim();
      const epsText = $(firstRow.find('td')[1]).text().trim();
      
      // Extract the numeric value from the text (e.g., "$230.42" -> 230.42)
      const eps = parseFloat(epsText.replace(/[^0-9.-]+/g, ''));
      
      if (!isNaN(eps)) {
        return {
          eps,
          sourceName: 'multpl.com',
          sourceUrl: 'https://www.multpl.com/s-p-500-earnings',
          lastUpdated: dateText,
          provider: 'multpl'
        };
      }
    }
    
    throw new Error('Failed to extract EPS value from multpl.com');
  } catch (error) {
    console.error('[ERROR] Failed to fetch EPS from multpl.com:', error.message);
    throw error;
  }
}

/**
 * Fetches S&P 500 EPS from YCharts
 * YCharts provides reliable financial data including S&P 500 EPS
 */
async function fetchEPSFromYCharts() {
  try {
    console.log('[DIAG] Fetching S&P 500 EPS from YCharts');
    
    // Dynamically import cheerio
    const cheerio = await import('cheerio').then(module => module.default || module);
    
    const url = 'https://ycharts.com/indicators/sp_500_eps';
    const { data } = await axios.get(url, { 
      headers: { 
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Referer': 'https://www.google.com/'
      },
      timeout: 15000
    });
    
    const $ = cheerio.load(data);
    
    // YCharts displays the EPS value in a specific element
    const epsElement = $('.key-stat-title');
    
    if (epsElement.length > 0) {
      const epsText = epsElement.text().trim();
      const eps = parseFloat(epsText.replace(/[^0-9.-]+/g, ''));
      
      if (!isNaN(eps)) {
        return {
          eps,
          sourceName: 'YCharts',
          sourceUrl: 'https://ycharts.com/indicators/sp_500_eps',
          lastUpdated: new Date().toISOString(),
          provider: 'ycharts'
        };
      }
    }
    
    throw new Error('Failed to extract EPS value from YCharts');
  } catch (error) {
    console.error('[ERROR] Failed to fetch EPS from YCharts:', error.message);
    throw error;
  }
}

/**
 * Fetches S&P 500 EPS from Wall Street Journal
 * WSJ provides reliable financial data including S&P 500 EPS
 */
async function fetchEPSFromWSJ() {
  try {
    console.log('[DIAG] Fetching S&P 500 EPS from WSJ');
    
    // Dynamically import cheerio
    const cheerio = await import('cheerio').then(module => module.default || module);
    
    const url = 'https://www.wsj.com/market-data/quotes/index/SPX';
    const { data } = await axios.get(url, { 
      headers: { 
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Referer': 'https://www.google.com/'
      },
      timeout: 15000
    });
    
    const $ = cheerio.load(data);
    
    // WSJ displays the EPS in a specific table
    // This is a simplified approach and may need adjustment based on the actual page structure
    const epsElements = $('td:contains("EPS")').next();
    
    if (epsElements.length > 0) {
      const epsText = epsElements.first().text().trim();
      const eps = parseFloat(epsText.replace(/[^0-9.-]+/g, ''));
      
      if (!isNaN(eps)) {
        return {
          eps,
          sourceName: 'Wall Street Journal',
          sourceUrl: 'https://www.wsj.com/market-data/quotes/index/SPX',
          lastUpdated: new Date().toISOString(),
          provider: 'wsj'
        };
      }
    }
    
    throw new Error('Failed to extract EPS value from WSJ');
  } catch (error) {
    console.error('[ERROR] Failed to fetch EPS from WSJ:', error.message);
    throw error;
  }
}

/**
 * Fallback function that estimates S&P 500 EPS based on current index value and historical P/E
 * This is used only when all direct sources fail
 */
export async function estimateSP500EPS(indexValue, pe) {
  try {
    if (!indexValue || !pe || isNaN(indexValue) || isNaN(pe)) {
      throw new Error('Invalid inputs for EPS estimation');
    }
    
    // Simple calculation: EPS = Price / P/E
    let calculatedEPS = indexValue / pe;
    
    // Validate the calculated EPS
    // For S&P 500, TTM EPS should be roughly 3-5% of the index value
    // For a 5600 index, EPS should be around $168-$280
    const epsToIndexRatio = calculatedEPS / indexValue;
    
    // If the calculated EPS is around $50-$80, it's likely a quarterly figure
    if (calculatedEPS >= 50 && calculatedEPS <= 80) {
      console.log(`[DIAG] Detected likely quarterly EPS value (${calculatedEPS.toFixed(2)}), converting to TTM`);
      // Convert quarterly to TTM by multiplying by 4
      calculatedEPS = calculatedEPS * 4;
      
      return {
        eps: calculatedEPS,
        sourceName: 'Estimated (quarterly adjusted to TTM)',
        sourceUrl: '',
        lastUpdated: new Date().toISOString(),
        provider: 'estimate',
        isEstimate: true,
        adjustmentMethod: 'Quarterly to TTM (×4)'
      };
    }
    
    // If the ratio is outside the expected range (3-5%), adjust it
    if (epsToIndexRatio < 0.03 || epsToIndexRatio > 0.05) {
      console.log(`[DIAG] Calculated EPS (${calculatedEPS.toFixed(2)}) has unusual ratio to index (${epsToIndexRatio.toFixed(4)}), adjusting...`);
      
      // Use a more conservative estimate based on historical averages
      // Target 4% of index value which is in the middle of the expected range
      const adjustedEPS = indexValue * 0.04; // 4% of index value
      
      return {
        eps: adjustedEPS,
        sourceName: 'Estimated (ratio adjusted)',
        sourceUrl: '',
        lastUpdated: new Date().toISOString(),
        provider: 'estimate',
        isEstimate: true,
        adjustmentReason: 'Original calculation outside expected range',
        originalEPS: calculatedEPS,
        targetRatio: '4% of index'
      };
    }
    
    return {
      eps: calculatedEPS,
      sourceName: 'Estimated from P/E ratio',
      sourceUrl: '',
      lastUpdated: new Date().toISOString(),
      provider: 'estimate',
      isEstimate: true
    };
  } catch (error) {
    console.error('[ERROR] Failed to estimate S&P 500 EPS:', error.message);
    
    // Return a very conservative estimate as a last resort
    return {
      eps: 230.00, // Conservative estimate based on recent S&P 500 EPS values
      sourceName: 'Fallback Estimate',
      sourceUrl: '',
      lastUpdated: new Date().toISOString(),
      provider: 'fallback',
      isEstimate: true,
      isFallback: true
    };
  }
}
