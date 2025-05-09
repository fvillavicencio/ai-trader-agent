import axios from 'axios';
import XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isLambda = !!process.env.LAMBDA_TASK_ROOT;
const SPGLOBAL_XLSX_URL = 'https://www.spglobal.com/spdji/en/documents/additional-material/sp-500-eps-est.xlsx';

/**
 * Fetches S&P 500 EPS (TTM) directly from authoritative sources
 * Uses multiple sources with fallbacks to ensure accuracy
 */
export async function getDirectSP500EPS() {
  try {
    // First try to get the TTM EPS from the S&P Global spreadsheet (most accurate source)
    const spGlobalEPS = await fetchEPSFromSPGlobalSpreadsheet();
    if (spGlobalEPS && spGlobalEPS.eps && !isNaN(spGlobalEPS.eps)) {
      console.log(`[DIAG] Using TTM EPS value from S&P Global spreadsheet: ${spGlobalEPS.eps}`);
      return spGlobalEPS;
    }
    
    // If S&P Global fails, try other sources
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
/**
 * Fetches S&P 500 TTM EPS from the S&P Global spreadsheet
 * This is the most accurate and authoritative source for S&P 500 EPS data
 * Extracts the value from cell I133 which contains the most recent TTM EPS value
 */
async function fetchEPSFromSPGlobalSpreadsheet() {
  try {
    console.log('[DIAG] Fetching S&P 500 TTM EPS from S&P Global spreadsheet');
    
    // Paths for the spreadsheet
    const TMP_XLSX_PATH = '/tmp/sp-500-eps-est.xlsx';
    const BUNDLED_XLSX_PATH = path.resolve(__dirname, 'sp-500-eps-est.xlsx');
    
    let xlsBuffer;
    let fetchedRemote = false;
    
    // 1. Try direct Axios download to memory
    try {
      console.log('[DIAG] Attempting to download XLSX via Axios from:', SPGLOBAL_XLSX_URL);
      const response = await axios.get(SPGLOBAL_XLSX_URL, {
        responseType: 'arraybuffer',
        headers: {
          'Accept': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,application/json,text/plain,*/*',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          'Referer': 'https://www.spglobal.com/spdji/en/',
          'Accept-Language': 'en-US,en;q=0.9'
        },
        timeout: 15000
      });
      
      // Check content type to ensure we're getting an Excel file
      const contentType = response.headers['content-type'];
      console.log('[DIAG] Response content type:', contentType);
      
      if (contentType && (
        contentType.includes('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') ||
        contentType.includes('application/vnd.ms-excel') ||
        contentType.includes('application/octet-stream')
      )) {
        xlsBuffer = response.data;
        try {
          fs.writeFileSync(TMP_XLSX_PATH, xlsBuffer);
          console.log('[DIAG] Saved S&P Global spreadsheet to:', TMP_XLSX_PATH);
        } catch (writeErr) {
          console.warn('[DIAG] Could not write to /tmp, continuing with in-memory buffer');
        }
        fetchedRemote = true;
        console.log('[DIAG] Downloaded S&P Global spreadsheet successfully');
      } else {
        console.warn('[DIAG] Received unexpected content type:', contentType);
        throw new Error(`Unexpected content type: ${contentType}`);
      }
    } catch (err) {
      console.warn('[DIAG] Axios download failed:', err.message);
    }
    
    // 2. If download failed, try /tmp copy
    if (!xlsBuffer && fs.existsSync(TMP_XLSX_PATH)) {
      try {
        xlsBuffer = fs.readFileSync(TMP_XLSX_PATH);
        console.log('[DIAG] Using cached S&P Global spreadsheet from:', TMP_XLSX_PATH);
      } catch (err) {
        console.error('[DIAG] Failed to read /tmp XLSX:', err.message);
      }
    }
    
    // 3. If no buffer yet, try to use bundled asset
    if (!xlsBuffer && fs.existsSync(BUNDLED_XLSX_PATH)) {
      try {
        xlsBuffer = fs.readFileSync(BUNDLED_XLSX_PATH);
        console.log('[DIAG] Using bundled S&P Global spreadsheet from:', BUNDLED_XLSX_PATH);
      } catch (err) {
        console.error('[DIAG] Failed to read bundled XLSX:', err.message);
      }
    }
    
    // If we couldn't get the spreadsheet, return null
    if (!xlsBuffer) {
      console.error('[DIAG] All methods to obtain S&P Global spreadsheet failed');
      return null;
    }
    
    // Parse the spreadsheet
    try {
      const workbook = XLSX.read(xlsBuffer, { type: 'buffer' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      
      // Convert to array of arrays for easier scanning
      const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
      
      // Extract the last updated date from cell A2 (row index 1, column index 0)
      let spGlobalLastUpdated = null;
      if (rows.length > 1 && rows[1] && rows[1].length > 0) {
        const cellA2 = rows[1][0]; // Row 2, Column A (0-indexed)
        console.log('[DIAG] Cell A2 value:', cellA2);
        
        if (cellA2) {
          // If it's a date object, format it
          if (cellA2 instanceof Date) {
            spGlobalLastUpdated = `${cellA2.getMonth() + 1}/${cellA2.getDate()}/${cellA2.getFullYear()}`;
          } 
          // If it's a string that looks like a date, use it directly
          else if (typeof cellA2 === 'string' && cellA2.match(/^\d{1,2}\/\d{1,2}\/\d{4}$/)) {
            spGlobalLastUpdated = cellA2;
          }
          // If it's a number that could be a date serial number, try to convert it
          else if (typeof cellA2 === 'number') {
            try {
              // Excel date serial numbers can be converted to JS dates
              const excelEpoch = new Date(1899, 11, 30);
              const dateObj = new Date(excelEpoch.getTime() + cellA2 * 24 * 60 * 60 * 1000);
              spGlobalLastUpdated = `${dateObj.getMonth() + 1}/${dateObj.getDate()}/${dateObj.getFullYear()}`;
            } catch (e) {
              console.log('[DIAG] Failed to convert Excel date serial number:', e.message);
              spGlobalLastUpdated = String(cellA2);
            }
          }
          // Otherwise just use the string representation
          else {
            spGlobalLastUpdated = String(cellA2);
          }
        }
      }
      
      // If we couldn't extract a date, fall back to current date
      if (!spGlobalLastUpdated) {
        const now = new Date();
        spGlobalLastUpdated = `${now.getMonth() + 1}/${now.getDate()}/${now.getFullYear()}`;
      }
      
      console.log(`[DIAG] S&P Global data last updated: ${spGlobalLastUpdated}`);
      
      // Look for cell I133 which contains the TTM EPS value
      // In a 0-indexed array, this would be rows[132][8]
      let ttmEPS = null;
      
      // Make sure we have enough rows and columns
      if (rows.length >= 133 && rows[132] && rows[132].length >= 9) {
        ttmEPS = rows[132][8]; // Cell I133 (0-indexed)
        console.log('[DIAG] Found TTM EPS value in cell I133:', ttmEPS);
      } else {
        // If we can't find cell I133, look for the ACTUALS section and the most recent TTM EPS value
        console.log('[DIAG] Cell I133 not found, searching for ACTUALS section');
        
        let actualsStart = -1;
        for (let i = 0; i < rows.length; i++) {
          if (Array.isArray(rows[i]) && rows[i][0] && String(rows[i][0]).toUpperCase().includes('ACTUALS')) {
            actualsStart = i + 1;
            break;
          }
        }
        
        if (actualsStart !== -1) {
          // Look for the 12 MONTH EARNINGS PER SHARE column
          let ttmEPSColumnIndex = -1;
          for (let i = actualsStart - 10; i < actualsStart; i++) {
            if (Array.isArray(rows[i])) {
              const index = rows[i].findIndex(cell => 
                cell && String(cell).toUpperCase().includes('12 MONTH') && 
                String(cell).toUpperCase().includes('EARNINGS') &&
                String(cell).toUpperCase().includes('PER SHARE'));
              
              if (index !== -1) {
                ttmEPSColumnIndex = index;
                console.log(`[DIAG] Found TTM EPS column at index ${ttmEPSColumnIndex}`);
                break;
              }
            }
          }
          
          // If we found the TTM EPS column, look for the most recent value
          if (ttmEPSColumnIndex !== -1) {
            for (let i = actualsStart; i < rows.length; i++) {
              const row = rows[i];
              if (!row || !row[0]) continue;
              
              // Check if this is a date row
              const isDateRow = typeof row[0] === 'string' && row[0].match(/\d{1,2}\/\d{1,2}\/\d{4}/);
              if (isDateRow && row[ttmEPSColumnIndex] && !isNaN(parseFloat(row[ttmEPSColumnIndex]))) {
                ttmEPS = parseFloat(row[ttmEPSColumnIndex]);
                console.log(`[DIAG] Found most recent TTM EPS value: ${ttmEPS} from row ${i+1}`);
                break;
              }
            }
          }
        }
      }
      
      // If we found a TTM EPS value, return it
      if (ttmEPS !== null && !isNaN(parseFloat(ttmEPS))) {
        return {
          eps: parseFloat(ttmEPS),
          sourceName: 'S&P Global (TTM EPS)',
          sourceUrl: 'https://www.spglobal.com/spdji/en/',
          lastUpdated: spGlobalLastUpdated,
          provider: 'spglobal',
          isFreshData: fetchedRemote
        };
      }
      
      console.warn('[DIAG] Could not find TTM EPS value in S&P Global spreadsheet');
      return null;
    } catch (err) {
      console.error('[DIAG] Failed to parse S&P Global spreadsheet:', err.message);
      return null;
    }
  } catch (error) {
    console.error('[ERROR] Failed to fetch EPS from S&P Global spreadsheet:', error.message);
    return null;
  }
}

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
