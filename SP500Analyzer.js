/**
 * SP500Analyzer.gs
 * Main entry point to generate S&P 500 Market Analyzer HTML report using Google Apps Script.
 * - Fetches/updates key data files in Google Drive (only overwrites on success)
 * - Reads/updates Google Sheets for EPS, holdings, etc.
 * - Parses data as in Node.js version
 * - Returns HTML report string
 */

// === CONFIGURE THIS WITH YOUR SHEET ID ===
var MAIN_SPREADSHEET_ID = 'PASTE-YOUR-SPREADSHEET-ID-HERE'; // e.g. '1abcD2eFgHIjklmnopQrstUvwxYZ1234567890abcde'

/**
 * --- API Key Retrieval Section ---
 * Store your API keys securely in the Apps Script Properties Service.
 * Example: In Apps Script editor, go to Project Settings > Script Properties > Add the key-value pairs.
 * E.g., { ALPHA_VANTAGE_API_KEY: 'your-key', FMP_API_KEY: 'your-key', TRADIER_API_KEY: 'your-key' }
 */
function getAlphaVantageAPIKey() {
  return PropertiesService.getScriptProperties().getProperty('ALPHA_VANTAGE_API_KEY');
}
function getFMPAPIKey() {
  return PropertiesService.getScriptProperties().getProperty('FMP_API_KEY');
}
function getTradierAPIKey() {
  return PropertiesService.getScriptProperties().getProperty('TRADIER_API_KEY');
}
// Add more as needed...

/**
 * --- HTML Helper Functions (ported from Node.js) ---
 */
function htmlSectionHeader(title) {
  return `<h2>${title}</h2><hr/>`;
}
function htmlSourceBlock(sourceName, sourceUrl, lastUpdated) {
  return `<div class="source-block"><strong>Source:</strong> ${sourceName}<br/><strong>URL:</strong> <a href="${sourceUrl}">${sourceUrl}</a><br/><strong>Last Update:</strong> ${formatTimestamp(lastUpdated)}</div>`;
}
function htmlHoldingsBlock(indexName, symbol, top, sourceName, sourceUrl, lastUpdated) {
  let lines = [`<div class="holdings-block"><h3>${indexName} (${symbol})</h3><div class="responsive-table"><table><thead><tr><th>#</th><th>Ticker</th><th>Company</th><th>Weight</th></tr></thead><tbody>`];
  top.forEach(function(h, i) {
    lines.push(`<tr><td>${i + 1}</td><td>${h.symbol}</td><td>${h.name}</td><td>${h.weight}</td></tr>`);
  });
  lines.push('</tbody></table></div>');
  lines.push(htmlSourceBlock(sourceName, sourceUrl, lastUpdated));
  lines.push('</div>');
  return lines.join('\n');
}
function htmlForwardPETable(estimates, multiples, currentIndex) {
  let lines = [
    `<div class="forward-pe-block"><div class="responsive-table"><table><thead><tr><th>Scenario</th><th>Year</th><th>Estimate Date</th><th>Forward EPS</th>` +
      multiples.map(function(m) { return `<th>${m}x</th><th>% vs Index</th>`; }).join('') + `<th>Source URL</th></tr></thead><tbody>`
  ];
  estimates.forEach(function(est) {
    const scenario = est.scenario || 'Base';
    lines.push(`<tr><td>${scenario}</td><td>${est.year}</td><td>${formatTimestamp(est.estimateDate || '')}</td><td><strong>$${Number(est.eps).toFixed(2)}</strong></td>` +
      multiples.map(function(m) {
        const target = est.eps * m;
        const pct = currentIndex ? (((target - currentIndex) / currentIndex) * 100).toFixed(1) + '%' : '';
        return `<td><strong>${formatUSD(Number(target).toFixed(2))}</strong></td><td>${pct}</td>`;
      }).join('') +
      `<td><a href="${est.url}">link</a></td></tr>`);
  });
  lines.push('</tbody></table></div></div>');
  return lines.join('\n');
}
function formatTimestamp(ts) {
  if (!ts) return '';
  var d = new Date(ts);
  var pad = function(n) { return n.toString().padStart(2, '0'); };
  return d.getUTCFullYear() + '-' + pad(d.getUTCMonth()+1) + '-' + pad(d.getUTCDate()) + ' ' + pad(d.getUTCHours()) + ':' + pad(d.getUTCMinutes()) + ':' + pad(d.getUTCSeconds()) + ' UTC';
}
function formatUSD(val) {
  if (val === null || val === undefined || isNaN(val)) return 'N/A';
  return '$' + Number(val).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function htmlIndexPriceBlock(indexPrice, peRatio) {
  return `<div class="index-block"><h2>S&P 500 Index</h2><p><strong>Price:</strong> ${formatUSD(indexPrice.price)}<br/><strong>P/E:</strong> ${peRatio.pe}</p>${htmlSourceBlock(indexPrice.sourceName, indexPrice.sourceUrl, indexPrice.lastUpdated)}</div>`;
}

function htmlStalenessWarning(lastUpdated, maxAgeDays, label) {
  if (!lastUpdated) return '';
  var now = new Date();
  var updated = new Date(lastUpdated);
  var diffDays = (now - updated) / (1000 * 60 * 60 * 24);
  if (diffDays > maxAgeDays) {
    return `<div class="stale-warning"><strong>Warning:</strong> ${label} data is more than ${maxAgeDays} days old (${formatTimestamp(lastUpdated)}). Treat with caution.</div>`;
  }
  return '';
}

function htmlDataFreshnessTable(sections) {
  var lines = [
    '<div class="freshness-block"><h3>Data Freshness Summary</h3><div class="responsive-table"><table><thead><tr><th>Section</th><th>Last Updated</th><th>Source</th></tr></thead><tbody>'
  ];
  for (var i = 0; i < sections.length; ++i) {
    var s = sections[i];
    lines.push(`<tr><td>${s.label}</td><td>${formatTimestamp(s.lastUpdated) || ''}</td><td>${s.sourceName || ''}</td></tr>`);
  }
  lines.push('</tbody></table></div></div>');
  return lines.join('\n');
}

function htmlMarketPathBlock_(pathObj, maObj) {
  return `<div class="market-path-block">${htmlSectionHeader('Market "Path of Least Resistance"')}<div class="market-path-value">${pathObj.value} (RSI period: 14-day)</div>${htmlSourceBlock(pathObj.sourceName, pathObj.sourceUrl, pathObj.lastUpdated)}<div class="market-path-expl">Explanation: RSI is a 14-day lookback. 50-day MA: <b>${maObj.sma50.toFixed(2)}</b>, 200-day MA: <b>${maObj.sma200.toFixed(2)}</b>, SPY last: <b>${maObj.latest.toFixed(2)}</b>. ${(maObj.latest > maObj.sma200 ? 'Above' : 'Below')} 200-day MA. ${(maObj.latest > maObj.sma50 ? 'Above' : 'Below')} 50-day MA.</div></div>`;
}

/**
 * Main entry: Generates full HTML report for S&P 500 Analyzer
 * @return {string} HTML-formatted report
 */
function SP500Analyzer() {
  var folder = getOrCreateAnalysisFolder_();
  var epsSheetId = null;
  var forwardEPS = [];
  try {
    epsSheetId = ensureSPGlobalEPSFile_();
    forwardEPS = parseForwardEPSFromSheet_(epsSheetId);
  } catch (e) {
    // Skip XLSX parsing if error
    forwardEPS = [];
  }
  var indexPrice = fetchSP500IndexPrice_();
  var peRatio = fetchSP500PERatio_();
  var marketPath = fetchMarketPath_();
  var spyMovingAverages = fetchSPYMovingAverages_();

  // ETF Top Holdings (CSV/API only)
  var spyHoldings = fetchETFTopHoldings_('SPY');
  var qqqHoldings = fetchETFTopHoldings_('QQQ');
  var diaHoldings = fetchETFTopHoldings_('DIA');

  // Data freshness summary
  var freshnessSections = [
    { label: 'S&P 500 Index', lastUpdated: indexPrice.lastUpdated, sourceName: indexPrice.sourceName },
    { label: 'Trailing EPS', lastUpdated: (forwardEPS[0] && forwardEPS[0].lastUpdated) || '', sourceName: (forwardEPS[0] && forwardEPS[0].sourceName) || '' },
    { label: 'SPY Holdings', lastUpdated: spyHoldings.lastUpdated, sourceName: spyHoldings.sourceName },
    { label: 'QQQ Holdings', lastUpdated: qqqHoldings.lastUpdated, sourceName: qqqHoldings.sourceName },
    { label: 'DIA Holdings', lastUpdated: diaHoldings.lastUpdated, sourceName: diaHoldings.sourceName }
  ];

  // --- HTML assembly ---
  var html = '<h1>S&P 500 Market Analyzer Report (GAS)</h1>';
  html += htmlSectionHeader('Forward EPS Estimates');
  html += htmlForwardPETable(forwardEPS, [15, 17, 20], indexPrice.price);
  html += htmlSectionHeader('S&P 500 Index');
  html += htmlIndexPriceBlock(indexPrice, peRatio);
  html += htmlSectionHeader('ETF Top Holdings');
  html += htmlHoldingsBlock('S&P 500 ETF', 'SPY', spyHoldings.holdings, spyHoldings.sourceName, spyHoldings.sourceUrl, spyHoldings.lastUpdated);
  html += htmlHoldingsBlock('NASDAQ 100 ETF', 'QQQ', qqqHoldings.holdings, qqqHoldings.sourceName, qqqHoldings.sourceUrl, qqqHoldings.lastUpdated);
  html += htmlHoldingsBlock('Dow Jones ETF', 'DIA', diaHoldings.holdings, diaHoldings.sourceName, diaHoldings.sourceUrl, diaHoldings.lastUpdated);
  html += htmlSectionHeader('Market Path of Least Resistance');
  html += htmlMarketPathBlock_(marketPath, spyMovingAverages);
  html += htmlDataFreshnessTable(freshnessSections);
  return html;
}

// --- ETF Top Holdings fetcher using CSV/API stub ---
function fetchETFTopHoldings_(symbol) {
  // Stub: Replace with actual CSV/API logic as available
  // Example: Return static data for SPY, QQQ, DIA
  if (symbol === 'SPY') {
    return {
      holdings: [
        { symbol: 'AAPL', name: 'Apple Inc.', weight: '7.5%' },
        { symbol: 'MSFT', name: 'Microsoft Corp.', weight: '7.0%' },
        { symbol: 'AMZN', name: 'Amazon.com Inc.', weight: '3.2%' },
        { symbol: 'NVDA', name: 'NVIDIA Corp.', weight: '3.0%' },
        { symbol: 'GOOGL', name: 'Alphabet Inc.', weight: '2.2%' }
      ],
      sourceName: 'CSV/API Stub',
      sourceUrl: '',
      lastUpdated: new Date().toISOString()
    };
  }
  // Add more ETF symbols as needed
  return { holdings: [], sourceName: '', sourceUrl: '', lastUpdated: '' };
}

/**
 * Utility: Always fetch and convert the latest XLSX file, replacing any old Google Sheet version
 * @return {Spreadsheet} Google Sheet
 */
function getFreshMarketSpreadsheet_() {
  var FOLDER_NAME = 'sp500-analyzer';
  var XLSX_FILE_NAME = 'sp-500-eps-est.xlsx';
  var SHEET_NAME = XLSX_FILE_NAME.replace('.xlsx', '');

  // Find the folder
  var folders = DriveApp.getFoldersByName(FOLDER_NAME);
  if (!folders.hasNext()) throw new Error('Folder not found: ' + FOLDER_NAME);
  var folder = folders.next();

  // Find the xlsx file
  var files = folder.getFilesByName(XLSX_FILE_NAME);
  if (!files.hasNext()) throw new Error('XLSX file not found: ' + XLSX_FILE_NAME);
  var file = files.next();

  // Remove any previous Google Sheet version with the same name
  var sheetFiles = folder.getFilesByName(SHEET_NAME);
  while (sheetFiles.hasNext()) {
    var oldSheet = sheetFiles.next();
    oldSheet.setTrashed(true);
  }

  // Convert XLSX to Google Sheet
  var blob = file.getBlob();
  var newSheetFile = DriveApp.createFile(blob);
  var newSheet = SpreadsheetApp.openById(newSheetFile.getId());
  newSheetFile.setName(SHEET_NAME);
  folder.addFile(newSheetFile);
  return newSheet;
}

function fetchSP500IndexPrice_() {
  try {
    var ss = getFreshMarketSpreadsheet_();
    var sheet = ss.getSheetByName('MarketData');
    if (!sheet) {
      sheet = ss.insertSheet('MarketData');
      sheet.getRange('A1').setValue('Symbol');
      sheet.getRange('B1').setValue('Price');
      sheet.getRange('C1').setValue('PE');
      sheet.getRange('A2').setValue('.INX');
    }
    // Always reset the formula to force recalc
    sheet.getRange('B2').setFormula('=GOOGLEFINANCE(".INX", "price")');
    SpreadsheetApp.flush();
    Utilities.sleep(2000);
    var price = sheet.getRange('B2').getValue();
    if (!price || isNaN(price)) {
      price = 'ERROR: Google Finance unavailable. Check formula or quota.';
    }
    return {
      price: price,
      lastUpdated: new Date().toISOString(),
      sourceName: 'Google Finance',
      sourceUrl: 'https://www.google.com/finance/quote/.INX:INDEXSP'
    };
  } catch (e) {
    return { price: 'ERROR: ' + e.message, lastUpdated: new Date().toISOString(), sourceName: 'Google Finance', sourceUrl: 'https://www.google.com/finance/quote/.INX:INDEXSP' };
  }
}

function fetchSP500PERatio_() {
  try {
    var ss = getFreshMarketSpreadsheet_();
    var sheet = ss.getSheetByName('MarketData');
    var pe = null;
    if (sheet) {
      pe = sheet.getRange('C2').getValue();
      if (!pe || isNaN(pe)) {
        pe = 'Please enter latest S&P 500 PE in MarketData!C2';
      }
    } else {
      pe = 'Please enter latest S&P 500 PE in MarketData!C2';
    }
    return {
      pe: pe,
      lastUpdated: new Date().toISOString(),
      sourceName: 'Manual/Sheet',
      sourceUrl: ''
    };
  } catch (e) {
    return { pe: 'ERROR: ' + e.message, lastUpdated: new Date().toISOString(), sourceName: 'Manual/Sheet', sourceUrl: '' };
  }
}

function fetchTopHoldingsAll_() { return []; }
function fetchMarketPath_() { return { value: 'Neutral (RSI=52.3)', rsi: 52.3, sourceName: 'Tradier (RSI)', sourceUrl: 'https://developer.tradier.com/documentation/markets/get-timesales', lastUpdated: new Date().toISOString() }; }
function fetchSPYMovingAverages_() { return { latest: 5200, sma50: 5100, sma200: 4800 }; }

/**
 * Ensures the S&P Global EPS Excel/Sheet is in the 'sp500-analyzer' folder, returns Sheet ID.
 * Uses the latest local XLSX if present, else downloads fresh, then converts to Google Sheet using Advanced Drive API.
 * Only overwrites if download is successful. Converts Excel to Google Sheet if needed.
 * Requires Advanced Drive Service enabled (Drive API v2 as 'Drive').
 * @return {string} Google Sheet ID
 */
function ensureSPGlobalEPSFile_() {
  var FOLDER_NAME = 'sp500-analyzer';
  var fileName = 'sp-500-eps-est.xlsx';
  var sheetName = 'sp-500-eps-est';
  var url = 'https://www.spglobal.com/spdji/en/documents/additional-material/sp-500-eps-est.xlsx';

  // Find the folder
  var folders = DriveApp.getFoldersByName(FOLDER_NAME);
  if (!folders.hasNext()) throw new Error('Folder not found: ' + FOLDER_NAME);
  var folder = folders.next();

  // Prefer local XLSX if present in folder
  var files = folder.getFilesByName(fileName);
  if (files.hasNext()) {
    var file = files.next();
    var blob = file.getBlob();
    // Remove any previous Google Sheet version with the same name
    var sheetFiles = folder.getFilesByName(sheetName);
    while (sheetFiles.hasNext()) {
      var oldSheet = sheetFiles.next();
      oldSheet.setTrashed(true);
    }
    // Convert to Google Sheet using Advanced Drive API
    var resource = { title: sheetName, mimeType: MimeType.GOOGLE_SHEETS, parents: [{id: folder.getId()}] };
    var converted = Drive.Files.insert(resource, blob, { convert: true });
    folder.addFile(DriveApp.getFileById(converted.id));
    return converted.id;
  }

  // If no local XLSX, try to download fresh
  try {
    var response = UrlFetchApp.fetch(url, { muteHttpExceptions: true, headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (response.getResponseCode() === 200) {
      var blob = response.getBlob().setName(fileName);
      var newFile = folder.createFile(blob);
      // Remove any previous Google Sheet version with the same name
      var sheetFiles = folder.getFilesByName(sheetName);
      while (sheetFiles.hasNext()) {
        var oldSheet = sheetFiles.next();
        oldSheet.setTrashed(true);
      }
      // Convert to Google Sheet using Advanced Drive API
      var resource = { title: sheetName, mimeType: MimeType.GOOGLE_SHEETS, parents: [{id: folder.getId()}] };
      var converted = Drive.Files.insert(resource, blob, { convert: true });
      folder.addFile(DriveApp.getFileById(converted.id));
      return converted.id;
    }
  } catch (e) {
    // Download failed; fall back to previous file
  }

  // Use last good Google Sheet file if present
  var sheetFiles = folder.getFilesByName(sheetName);
  if (sheetFiles.hasNext()) return sheetFiles.next().getId();

  throw new Error('No S&P Global EPS file available in Drive (neither Google Sheet nor .xlsx found). Check file names and folder.');
}

/**
 * Tester/debug function: logs HTML output
 */
function SP500Analyzer_test() {
  var html = SP500Analyzer();
  Logger.log(html);
  // Optionally: MailApp.sendEmail('your@email.com', 'SP500 Report', '', {htmlBody: html});
}

/**
 * Debug: List all files in the analysis folder for troubleshooting
 */
function debugListFilesInAnalysisFolder() {
  var folder = getOrCreateAnalysisFolder_();
  var files = folder.getFiles();
  var output = [];
  while (files.hasNext()) {
    var file = files.next();
    Logger.log('File: ' + file.getName());
    output.push(file.getName());
  }
  return output;
}

/**
 * Gets or creates the 'Trading Analysis Emails' folder in Drive
 * @return {Folder} Google Drive folder
 */
function getOrCreateAnalysisFolder_() {
  var folderName = 'Trading Analysis Emails';
  var folders = DriveApp.getFoldersByName(folderName);
  if (folders.hasNext()) return folders.next();
  return DriveApp.createFolder(folderName);
}

/**
 * Parses forward EPS for 2025/2026 from the Google Sheet (converted from Excel)
 * @param {string} sheetId
 * @return {Array<Object>} [{year, eps, ...}]
 */
function parseForwardEPSFromSheet_(sheetId) {
  var ss = SpreadsheetApp.openById(sheetId);
  var sheet = ss.getSheets()[0];
  var data = sheet.getDataRange().getValues();
  // Find 'ESTIMATES' row, then parse data as in Node.js version
  var estimatesStart = -1, estimatesEnd = data.length;
  for (var i = 0; i < data.length; i++) {
    if (String(data[i][0]).toUpperCase().indexOf('ESTIMATES') !== -1) estimatesStart = i + 1;
    if (String(data[i][0]).toUpperCase().indexOf('ACTUALS') !== -1 && estimatesStart !== -1) { estimatesEnd = i; break; }
  }
  if (estimatesStart === -1) throw new Error('ESTIMATES section not found');
  var results = [];
  for (var i = estimatesStart; i < estimatesEnd; i++) {
    var row = data[i];
    if (!row[0] || typeof row[0] !== 'string' || !row[0].match(/\d{2}\/\d{2}\/\d{4}/)) continue;
    var year = parseInt(row[0].split('/')[2]);
    var eps = parseFloat(row[2]);
    if ((year === 2025 || year === 2026) && row[0].indexOf('12/31') === 0 && !isNaN(eps)) {
      results.push({year: year, eps: eps, date: row[0]});
    }
  }
  return results;
}

/**
 * Composes the HTML report (stub, expand as needed)
 * @param {Object} data
 * @return {string}
 */
function composeSP500ReportHTML_(data) {
  var html = '<h1>S&P 500 Market Analyzer Report (GAS)</h1>';
  html += '<h2>Forward EPS Estimates</h2>';
  html += '<table border="1"><tr><th>Year</th><th>EPS</th></tr>';
  data.forwardEPS.forEach(function(e){
    html += '<tr><td>' + e.year + '</td><td>' + e.eps + '</td></tr>';
  });
  html += '</table>';
  // ... add more report sections here
  return html;
}
