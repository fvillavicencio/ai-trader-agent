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
 * Fetches S&P 500 forward EPS estimates for 2025 and 2026.
 * - Tries to download the latest file from the web (Axios, then Playwright) to /tmp.
 * - If successful, uses it and overwrites /tmp copy.
 * - If all downloads fail, tries to use /tmp copy.
 * - If /tmp copy does not exist, copies bundled asset from deployment (read-only) dir to /tmp and uses it.
 * - If all fail, returns null.
 * Returns an array: [{ source, url, year, eps }], or null if all methods fail.
 */
export async function getForwardEpsEstimates() {
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

  if (!xlsBuffer) {
    console.error('[EPS] All methods to obtain EPS XLSX failed. Returning null.');
    return null;
  }

  // Now parse xlsBuffer with xlsx
  try {
    workbook = XLSX.read(xlsBuffer, { type: 'buffer' });
    // Find the relevant sheet (usually first)
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    // Convert to array of arrays
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    // DEBUG: Print rows 120 to 140 to inspect ESTIMATES section
    console.log('==== XLSX ROWS 120-140 ====');
    for (let i = 120; i < Math.min(rows.length, 140); i++) {
      console.log(`[${i}]`, rows[i]);
    }
    console.log('============================');
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
      console.warn('[EPS] Could not find ESTIMATES section in XLSX. Fallback:', usedFallback);
      return null;
    }
    // Extract forward EPS for 2025 and 2026 (use column 0 = date, column 2 = operating EPS)
    const results = [];
    for (let i = estimatesStart; i < estimatesEnd; i++) {
      const row = rows[i];
      if (!row || typeof row[0] !== 'string' || !row[0].match(/\d{2}\/\d{2}\/\d{4}/)) continue;
      const year = parseInt(row[0].split('/')[2]);
      const quarter = row[0].split('/')[0] + '/' + row[0].split('/')[1];
      const eps = parseFloat(row[2]);
      // Only take the 12/31/20XX rows for 2025 and 2026
      if ((year === 2025 || year === 2026) && row[0].startsWith('12/31') && !isNaN(eps)) {
        results.push({
          source: 'S&P Global',
          url: fetchedRemote ? SPGLOBAL_XLSX_URL : (usedFallback === 'tmp' ? TMP_XLSX_PATH : BUNDLED_XLSX_PATH),
          year,
          eps,
          fallback: usedFallback
        });
      }
    }
    if (results.length === 0) {
      console.warn('[EPS] Could not extract EPS estimates from XLSX. Fallback:', usedFallback);
      return null;
    }
    // Attach scenario labels (Base for now) and estimate date
    results.forEach(r => { r.scenario = 'Base'; r.estimateDate = new Date().toISOString().slice(0,10); });
    return results;
  } catch (err) {
    console.error('[EPS] Failed to parse XLSX:', err && err.message);
    return null;
  }
}
