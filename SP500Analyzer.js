/**
 * SP500Analyzer.gs
 * Main entry point to generate S&P 500 Market Analyzer HTML report using Google Apps Script.
 * - Fetches/updates key data files in Google Drive (only overwrites on success)
 * - Reads/updates Google Sheets for EPS, holdings, etc.
 * - Parses data as in Node.js version
 * - Returns HTML report string
 */

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
 * Main entry: Generates full HTML report for S&P 500 Analyzer
 * @return {string} HTML-formatted report
 */
function SP500Analyzer() {
  // 1. Ensure data files (Excel/CSVs) are up-to-date in Drive
  var folder = getOrCreateAnalysisFolder_();

  // 2. S&P Global EPS: try to download, else use last good file
  var epsSheetId = ensureSPGlobalEPSFile_(folder);

  // 3. Read/parse EPS data from Google Sheet
  var forwardEPS = parseForwardEPSFromSheet_(epsSheetId);

  // 4. (Stub) Fetch other data sections as needed (holdings, PE, etc.)
  // ...

  // 5. Compose HTML report
  var html = composeSP500ReportHTML_({
    forwardEPS: forwardEPS,
    // ... add other sections here
  });
  return html;
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
 * Ensures the S&P Global EPS Excel/Sheet is in Drive, returns Sheet ID
 * Only overwrites if download is successful. Converts Excel to Google Sheet.
 * @param {Folder} folder
 * @return {string} Google Sheet ID
 */
function ensureSPGlobalEPSFile_(folder) {
  var url = 'https://www.spglobal.com/spdji/en/documents/additional-material/sp-500-eps-est.xlsx';
  var fileName = 'sp-500-eps-est.xlsx';
  var sheetName = 'sp-500-eps-est';
  var blob;
  try {
    var response = UrlFetchApp.fetch(url, {
      muteHttpExceptions: true,
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'Accept': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,application/json,text/plain,*/*',
        'Referer': 'https://www.spglobal.com/spdji/en/'
      }
    });
    if (response.getResponseCode() === 200) {
      blob = response.getBlob().setName(fileName);
      // Overwrite file in Drive
      var files = folder.getFilesByName(fileName);
      var file = files.hasNext() ? files.next() : folder.createFile(blob);
      if (files.hasNext()) file.setContent(blob.getBytes());
      // Convert to Google Sheet
      var sheetFile = Drive.Files.insert({title: sheetName, mimeType: MimeType.GOOGLE_SHEETS, parents: [{id: folder.getId()}]}, blob);
      return sheetFile.id;
    }
  } catch (e) {
    // Download failed; fall back to previous file
  }
  // Use last good file
  var files = folder.getFilesByName(sheetName);
  if (files.hasNext()) return files.next().getId();
  throw new Error('No S&P Global EPS file available in Drive');
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
