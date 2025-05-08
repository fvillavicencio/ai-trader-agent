import axios from 'axios';
import XLSX from 'xlsx';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import playwright from "playwright-core";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isLambda = !!process.env.LAMBDA_TASK_ROOT;
const SPGLOBAL_XLSX_URL = 'https://www.spglobal.com/spdji/en/documents/additional-material/sp-500-eps-est.xlsx';

/**
 * Attempts to download the XLSX file using Playwright (headless browser).
 * Returns true if successful, false otherwise.
 */
async function downloadXlsxWithPlaywright(downloadPath) {
  const browser = await playwright.chromium.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-gpu',
      '--single-process',
      '--no-zygote',
      '--disable-dev-shm-usage'
    ]
  });
  const context = await browser.newContext({ acceptDownloads: true });
  const page = await context.newPage();
  try {
    await page.goto('https://www.spglobal.com/spdji/en/indices/equity/sp-500/#data');
    // Wait for the download link to be present
    await page.waitForSelector('a[href*="sp-500-eps-est.xlsx"]', { timeout: 10000 });
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.click('a[href*="sp-500-eps-est.xlsx"]')
    ]);
    await download.saveAs(downloadPath);
    await browser.close();
    return true;
  } catch (err) {
    await browser.close();
    return false;
  }
}

/**
<<<<<<< HEAD
 * Fetches forward EPS estimates from Alpha Vantage API for SPY (S&P 500 ETF)
 * Uses the OVERVIEW endpoint to get EPS and ForwardPE, then calculates forward EPS
 * Falls back to other methods if API fails or rate limit is reached
 */
async function getForwardEpsFromAlphaVantage() {
  const apiKey = process.env.ALPHA_VANTAGE_API_KEY;
  if (!apiKey) {
    console.warn('[EPS] Alpha Vantage API key not found in environment variables');
    return null;
  }

  try {
    console.log('[EPS] Fetching S&P 500 data from Alpha Vantage');
    
    // First, get the current price of SPY
    const priceResponse = await axios.get(`https://www.alphavantage.co/query`, {
      params: {
        function: 'GLOBAL_QUOTE',
        symbol: 'SPY',
        apikey: apiKey
      },
      timeout: 10000
    });
    
    if (priceResponse.data['Error Message'] || priceResponse.data.Note) {
      console.warn('[EPS] Alpha Vantage API error or rate limit:', 
        priceResponse.data['Error Message'] || priceResponse.data.Note);
      return null;
    }
    
    const currentPrice = parseFloat(priceResponse.data['Global Quote']['05. price']);
    if (!currentPrice || isNaN(currentPrice)) {
      console.warn('[EPS] Failed to get SPY price from Alpha Vantage');
      return null;
    }
    
    // Now get the fundamental data including ForwardPE
    const overviewResponse = await axios.get(`https://www.alphavantage.co/query`, {
      params: {
        function: 'OVERVIEW',
        symbol: 'SPY',
        apikey: apiKey
      },
      timeout: 10000
    });
    
    if (overviewResponse.data['Error Message'] || overviewResponse.data.Note) {
      console.warn('[EPS] Alpha Vantage API error or rate limit:', 
        overviewResponse.data['Error Message'] || overviewResponse.data.Note);
      return null;
    }
    
    const forwardPE = parseFloat(overviewResponse.data.ForwardPE);
    if (!forwardPE || isNaN(forwardPE)) {
      console.warn('[EPS] Failed to get ForwardPE from Alpha Vantage');
      return null;
    }
    
    // Calculate forward EPS (Price ÷ Forward P/E)
    const forwardEPS = currentPrice / forwardPE;
    
    // Calculate next year's EPS with estimated growth (typically 5-10%)
    // Using 7% as a conservative estimate for S&P 500 earnings growth
    const nextYearEPS = forwardEPS * 1.07;
    
    const currentYear = new Date().getFullYear();
    const nextYear = currentYear + 1;
    
    return [
      {
        estimateDate: `12/31/${currentYear}`,
        value: forwardEPS,
        source: 'Alpha Vantage',
        sourceUrl: 'https://www.alphavantage.co/',
        lastUpdated: new Date().toISOString().slice(0,10),
        year: currentYear
      },
      {
        estimateDate: `12/31/${nextYear}`,
        value: nextYearEPS,
        source: 'Alpha Vantage (estimated)',
        sourceUrl: 'https://www.alphavantage.co/',
        lastUpdated: new Date().toISOString().slice(0,10),
        year: nextYear
      }
    ];
  } catch (err) {
    console.error('[EPS] Alpha Vantage API error:', err.message);
    return null;
  }
}

/**
 * Fetches S&P 500 forward EPS estimates for current and next year.
 * - First tries Alpha Vantage API
 * - Then tries to download the latest file from S&P Global
 * - If all API calls fail, falls back to local JSON file
 * Returns an array of objects with estimateDate, value, source, and lastUpdated.
 */
export async function getForwardEpsEstimates() {
  // Try Alpha Vantage first
  const alphaVantageData = await getForwardEpsFromAlphaVantage();
  if (alphaVantageData && alphaVantageData.length > 0) {
    console.log('[EPS] Successfully retrieved data from Alpha Vantage');
    return alphaVantageData;
  }
  
  console.log('[EPS] Alpha Vantage failed or rate limited, trying S&P Global XLSX...');
  
  // If Alpha Vantage fails, try the S&P Global XLSX approach
=======
 * Fetches S&P 500 forward EPS estimates for 2025 and 2026.
 * - Tries to download the latest file from the web (Axios, then Playwright) to /tmp.
 * - If successful, uses it and overwrites /tmp copy.
 * - If all downloads fail, tries to use /tmp copy.
 * - If /tmp copy does not exist, copies bundled asset from deployment (read-only) dir to /tmp and uses it.
 * - If all fail, returns an array with a single object containing error information.
 * Returns an array of objects with lastUpdated (string).
 */
export async function getForwardEpsEstimates() {
>>>>>>> e80430d35c78aec5ecc761bbc6b43d16d32918fa
  // Paths
  const TMP_XLSX_PATH = '/tmp/sp-500-eps-est.xlsx';
  const BUNDLED_XLSX_PATH = path.resolve(__dirname, 'sp-500-eps-est.xlsx');

  let workbook;
  let xlsBuffer;
  let usedFallback = null;
  let fetchedRemote = false;

  // 1. Try direct Axios download to /tmp
  try {
    const response = await axios.get(SPGLOBAL_XLSX_URL, {
      responseType: 'arraybuffer',
      headers: {
        'Accept': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,application/json,text/plain,*/*',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Referer': 'https://www.spglobal.com/spdji/en/',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'DNT': '1',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'same-origin',
        'Sec-Fetch-User': '?1',
        'Upgrade-Insecure-Requests': '1',
        'Connection': 'keep-alive',
        'Host': 'www.spglobal.com',
        'Origin': 'https://www.spglobal.com',
        'Cookie': '' // Add cookies here if needed
      },
      timeout: 15000
    });
    xlsBuffer = response.data;
    fs.writeFileSync(TMP_XLSX_PATH, xlsBuffer);
    usedFallback = 'axios';
    fetchedRemote = true;
    console.log('[EPS] Downloaded XLSX via Axios:', SPGLOBAL_XLSX_URL);
  } catch (err) {
    console.warn('[EPS] Axios download failed:', err && err.message);
    // 2. If Axios fails, try Playwright to /tmp
    try {
      const playwrightSuccess = await downloadXlsxWithPlaywright(TMP_XLSX_PATH);
      if (playwrightSuccess) {
        xlsBuffer = fs.readFileSync(TMP_XLSX_PATH);
        usedFallback = 'playwright';
        fetchedRemote = true;
        console.log('[EPS] Downloaded XLSX via Playwright:', SPGLOBAL_XLSX_URL);
      } else {
        usedFallback = null;
        console.error('[EPS] Playwright download failed.');
      }
    } catch (err2) {
      usedFallback = null;
      console.error('[EPS] Playwright download threw error:', err2 && err2.message);
    }
  }

  // 3. If all downloads failed, try /tmp copy
  if (!xlsBuffer && fs.existsSync(TMP_XLSX_PATH)) {
    try {
      xlsBuffer = fs.readFileSync(TMP_XLSX_PATH);
      usedFallback = 'tmp';
      console.log('[EPS] Using /tmp XLSX file:', TMP_XLSX_PATH);
    } catch (err) {
      console.error('[EPS] Failed to read /tmp XLSX:', err);
    }
  }

  // 4. If /tmp copy does not exist, copy bundled asset and use it
  if (!xlsBuffer && fs.existsSync(BUNDLED_XLSX_PATH)) {
    try {
      fs.copyFileSync(BUNDLED_XLSX_PATH, TMP_XLSX_PATH);
      xlsBuffer = fs.readFileSync(TMP_XLSX_PATH);
      usedFallback = 'bundled';
      console.log('[EPS] Copied bundled XLSX to /tmp and using it:', BUNDLED_XLSX_PATH);
    } catch (err) {
      console.error('[EPS] Failed to copy bundled XLSX to /tmp:', err);
    }
  }

  try {
    // Now parse xlsBuffer with xlsx
    if (!xlsBuffer) {
<<<<<<< HEAD
      console.error('[EPS] All methods to obtain EPS XLSX failed. Falling back to JSON file.');
      return getForwardEpsFromJsonFile();
=======
      console.error('[EPS] All methods to obtain EPS XLSX failed. Returning error.');
      return [{ estimateDate: '', value: null, source: 'N/A', lastUpdated: '' }];
>>>>>>> e80430d35c78aec5ecc761bbc6b43d16d32918fa
    }

    workbook = XLSX.read(xlsBuffer, { type: 'buffer' });
    // Find the relevant sheet (usually first)
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
<<<<<<< HEAD
    
    // Convert to array of arrays for easier scanning
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    
    // Extract the last updated date from cell A2 (row index 1, column index 0)
    let spGlobalLastUpdated = null;
    
    // Check if row 1 (index 1) exists and has at least 1 column
    if (rows.length > 1 && rows[1] && rows[1].length > 0) {
      const cellA2 = rows[1][0]; // Row 2, Column A (0-indexed)
      console.log('[EPS] Cell A2 value:', cellA2);
      
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
            console.log('[EPS] Failed to convert Excel date serial number:', e);
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
      console.log('[EPS] Could not extract date from cell A2, using current date');
      const now = new Date();
      spGlobalLastUpdated = `${now.getMonth() + 1}/${now.getDate()}/${now.getFullYear()}`;
    }
    
    console.log(`[EPS] S&P Global data last updated: ${spGlobalLastUpdated}`);
    
=======
    // Convert to array of arrays
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    // DEBUG: Print rows 120 to 140 to inspect ESTIMATES section
    console.log('==== XLSX ROWS 120-140 ====');
    for (let i = 120; i < Math.min(rows.length, 140); i++) {
      console.log(`[${i}]`, rows[i]);
    }
    console.log('============================');
>>>>>>> e80430d35c78aec5ecc761bbc6b43d16d32918fa
    // Find the 'ESTIMATES' row and extract data rows after it, until 'ACTUALS'
    let estimatesStart = -1;
    let estimatesEnd = rows.length;
    for (let i = 0; i < rows.length; i++) {
      if (Array.isArray(rows[i]) && rows[i][0] && String(rows[i][0]).toUpperCase().includes('ESTIMATES')) {
        estimatesStart = i + 1;
      }
      if (Array.isArray(rows[i]) && rows[i][0] && String(rows[i][0]).toUpperCase().includes('ACTUALS') && estimatesStart !== -1) {
        estimatesEnd = i;
        break;
      }
    }
    if (estimatesStart === -1) {
<<<<<<< HEAD
      console.warn('[EPS] Could not find ESTIMATES section in XLSX. Falling back to JSON file.');
      return getForwardEpsFromJsonFile();
    }
    
    // Extract forward EPS for current and next year (use column 0 = date, column 8 = OPERATING EARNINGS)
    const results = [];
    const currentYear = new Date().getFullYear();
    const nextYear = currentYear + 1;
    
    // Find the price column (usually column 1)
    let priceColumnIndex = 1;
    let operatingEarningsColumnIndex = 8; // Default to column 8 for OPERATING EARNINGS
    
    // Try to find the OPERATING EARNINGS column by header
    for (let i = estimatesStart - 10; i < estimatesStart; i++) {
      if (Array.isArray(rows[i])) {
        // Look for "OPERATING EARNINGS" header
        const opIndex = rows[i].findIndex(cell => 
          cell && String(cell).toUpperCase().includes('OPERATING') && 
          String(cell).toUpperCase().includes('EARNINGS'));
        
        if (opIndex !== -1) {
          operatingEarningsColumnIndex = opIndex;
          console.log(`[EPS] Found OPERATING EARNINGS column at index ${operatingEarningsColumnIndex}`);
          break;
        }
      }
    }
    
=======
      console.warn('[EPS] Could not find ESTIMATES section in XLSX. Fallback:', usedFallback);
      return [{ estimateDate: '', value: null, source: 'N/A', lastUpdated: '' }];
    }
    // Extract forward EPS for 2025 and 2026 (use column 0 = date, column 2 = operating EPS)
    const results = [];
>>>>>>> e80430d35c78aec5ecc761bbc6b43d16d32918fa
    for (let i = estimatesStart; i < estimatesEnd; i++) {
      const row = rows[i];
      if (!row || typeof row[0] !== 'string' || !row[0].match(/\d{2}\/\d{2}\/\d{4}/)) continue;
      const year = parseInt(row[0].split('/')[2]);
<<<<<<< HEAD
      
      // Use the OPERATING EARNINGS column (annualized values) instead of column 2 (quarterly values)
      const eps = parseFloat(row[operatingEarningsColumnIndex]);
      
      // Only take the 12/31/20XX rows for current and next year
      if ((year === currentYear || year === nextYear) && row[0].startsWith('12/31') && !isNaN(eps)) {
        // Get the price from the same row if available
        const price = row[priceColumnIndex] ? parseFloat(row[priceColumnIndex]) : null;
        
        // No need for adjustment since we're now using the annualized values directly
=======
      const quarter = row[0].split('/')[0] + '/' + row[0].split('/')[1];
      const eps = parseFloat(row[2]);
      // Only take the 12/31/20XX rows for 2025 and 2026
      if ((year === 2025 || year === 2026) && row[0].startsWith('12/31') && !isNaN(eps)) {
>>>>>>> e80430d35c78aec5ecc761bbc6b43d16d32918fa
        results.push({
          estimateDate: row[0],
          value: eps,
          source: 'S&P Global',
<<<<<<< HEAD
          sourceUrl: 'https://www.spglobal.com/spdji/en/',
          lastUpdated: spGlobalLastUpdated, // Use the S&P Global last updated date instead of current date
          year: year,
          price: price // Include the price if available
        });
      }
    }
    
    if (results.length === 0) {
      console.warn('[EPS] Could not extract EPS estimates from XLSX. Falling back to JSON file.');
      return getForwardEpsFromJsonFile();
    }
    
    return results;
  } catch (err) {
    console.error('[EPS] Failed to parse XLSX:', err && err.message);
    return getForwardEpsFromJsonFile();
  }
}

/**
 * Reads forward EPS estimates from the JSON file.
 * This is used as a last resort fallback when all API calls fail.
 */
async function getForwardEpsFromJsonFile() {
  try {
    const currentYear = new Date().getFullYear();
    const nextYear = currentYear + 1;
    
    // Path to the JSON file (relative to this file)
    const jsonFilePath = path.resolve(__dirname, '../forward_eps_estimates.json');
    
    if (!fs.existsSync(jsonFilePath)) {
      console.error('[EPS] JSON file not found:', jsonFilePath);
      return [{ estimateDate: '', value: null, source: 'N/A', lastUpdated: '' }];
    }
    
    const jsonData = JSON.parse(fs.readFileSync(jsonFilePath, 'utf8'));
    
    // Filter to get only FactSet estimates for current and next year
    const filteredData = jsonData.filter(item => 
      (item.source === 'FactSet' && (item.year === currentYear || item.year === nextYear))
    );
    
    if (filteredData.length === 0) {
      console.warn('[EPS] No relevant data found in JSON file');
      return [{ estimateDate: '', value: null, source: 'N/A', lastUpdated: '' }];
    }
    
    // Format the data to match our expected output
    return filteredData.map(item => ({
      estimateDate: `12/31/${item.year}`,
      value: item.eps,
      source: item.source,
      sourceUrl: item.url,
      lastUpdated: fs.statSync(jsonFilePath).mtime.toISOString().slice(0,10),
      year: item.year
    }));
  } catch (err) {
    console.error('[EPS] Failed to read JSON file:', err && err.message);
=======
          lastUpdated: fetchedRemote ? new Date().toISOString().slice(0,10) : (usedFallback === 'tmp' ? fs.statSync(TMP_XLSX_PATH).mtime.toISOString().slice(0,10) : fs.statSync(BUNDLED_XLSX_PATH).mtime.toISOString().slice(0,10))
        });
      }
    }
    if (results.length === 0) {
      console.warn('[EPS] Could not extract EPS estimates from XLSX. Fallback:', usedFallback);
      return [{ estimateDate: '', value: null, source: 'N/A', lastUpdated: '' }];
    }
    return results;
  } catch (err) {
    console.error('[EPS] Failed to parse XLSX:', err && err.message);
>>>>>>> e80430d35c78aec5ecc761bbc6b43d16d32918fa
    return [{ estimateDate: '', value: null, source: 'N/A', lastUpdated: '' }];
  }
}
