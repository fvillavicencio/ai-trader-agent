/**
 * SP500Analyzer.gs
 *
 * This version fetches S&P 500 analysis from the Lambda web service defined in Script Properties.
 * It ignores all local calculations and simply returns the Lambda's JSON response.
 */

/**
 * Fetches S&P 500 analysis from the Lambda service.
 * @return {Object} JSON response from Lambda
 */
function fetchSP500AnalysisFromLambda_() {
  var props = PropertiesService.getScriptProperties();
  var url = props.getProperty('LAMBDA_SERVICE_URL');
  var apiKey = props.getProperty('LAMBDA_API_KEY');
  if (!url || !apiKey) throw new Error('Missing LAMBDA_SERVICE_URL or LAMBDA_API_KEY in Script Properties');

  var options = {
    method: 'post',
    headers: {
      'x-api-key': apiKey
    },
    muteHttpExceptions: true,
    // Increase timeout to 60 seconds (default is 30s)
    timeout: 60 * 1000
  };

  var lastError = null;
  for (var attempt = 0; attempt < 2; attempt++) {
    try {
      var response = UrlFetchApp.fetch(url, options);
      var code = response.getResponseCode();
      if (code !== 200) {
        throw new Error('Lambda service error: ' + code + ' - ' + response.getContentText());
      }
      var json = response.getContentText();
      try {
        return JSON.parse(json);
      } catch (e) {
        throw new Error('Failed to parse Lambda JSON: ' + e + '\n' + json);
      }
    } catch (err) {
      lastError = err;
      // Only retry on timeout or 504
      if (attempt === 0 && (String(err).indexOf('504') !== -1 || String(err).toLowerCase().indexOf('timeout') !== -1)) {
        Utilities.sleep(2500); // brief pause before retry
        continue;
      } else {
        throw err;
      }
    }
  }
  throw lastError || new Error('Unknown error fetching Lambda service');
}

/**
 * Fetches S&P 500 analysis from Lambda, with 1-hour caching using CacheService.
 * @return {Object} JSON response from Lambda
 */
function SP500Analyzer() {
  var cache = CacheService.getScriptCache();
  var cached = cache.get('SP500_ANALYSIS');
  if (cached) {
    try {
      return JSON.parse(cached);
    } catch (e) {
      // Fallback to fetch if parsing fails
    }
  }
  var result = fetchSP500AnalysisFromLambda_();
  cache.put('SP500_ANALYSIS', JSON.stringify(result), 3600); // 1 hour
  return result;
}

/**
 * Clears the S&P 500 analysis cache.
 */
function clearSP500AnalyzerCache() {
  CacheService.getScriptCache().remove('SP500_ANALYSIS');
}

/**
 * Tester/debug function: logs Lambda JSON output, text output, and HTML output
 */
function testSP500Analyzer() {
  var result = SP500Analyzer();
  Logger.log('=== Raw JSON ===');
  Logger.log(JSON.stringify(result, null, 2));

  Logger.log('=== Text Format ===');
  var text = formatSP500AnalysisText(result);
  Logger.log(text);

  Logger.log('=== HTML Format ===');
  var html = formatSP500AnalysisHtml(result);
  Logger.log(html);

  return {
    json: result,
    text: text,
    html: html
  };
}

/**
 * Formats the S&P 500 Lambda JSON into a plain text summary for OpenAI prompt.
 * @param {Object} lambdaJson - The parsed Lambda JSON (with .body property if raw)
 * @return {String} Text summary for OpenAI prompt
 */
function formatSP500AnalysisText(lambdaJson) {
  // Accept either raw or wrapped (with .body as string)
  var data = lambdaJson && lambdaJson.body ? JSON.parse(lambdaJson.body) : lambdaJson;
  // Patch: Map .value to .eps for forwardEstimates if needed
  if (data.forwardEstimates && Array.isArray(data.forwardEstimates)) {
    data.forwardEstimates.forEach(function(est) {
      if (est.value !== undefined && est.eps === undefined) {
        est.eps = est.value;
      }
    });
  }
  addImpliedIndexValuesToEstimates(data);
  addImpliedIndexValuesToEarningsTTM(data);
  var lines = [];
  lines.push('S&P 500 Market Analyzer Report');
  lines.push('');

  // Index Level
  if (data.sp500Index) {
    lines.push('Current S&P 500 Index Level:');
    lines.push(`  Index Price: ${data.sp500Index.price}`);
    lines.push(`  Source: ${data.sp500Index.sourceName}`);
    if (data.sp500Index.sourceUrl) lines.push(`  URL: ${data.sp500Index.sourceUrl}`);
    if (data.sp500Index.lastUpdated) lines.push(`  Last Update: ${formatDate(data.sp500Index.lastUpdated)}`);
    lines.push('');
  }

  // Trailing P/E
  if (data.trailingPE) {
    lines.push('S&P 500 Trailing P/E Ratio:');
    lines.push(`  P/E: ${data.trailingPE.pe}`);
    lines.push(`  Source: ${data.trailingPE.sourceName}`);
    if (data.trailingPE.sourceUrl) lines.push(`  URL: ${data.trailingPE.sourceUrl}`);
    if (data.trailingPE.lastUpdated) lines.push(`  Last Update: ${formatDate(data.trailingPE.lastUpdated)}`);
    lines.push('');
    // Render Historical P/E Context immediately after
    if (data.trailingPE.history) {
      lines.push('  Historical P/E Context:');
      lines.push('  Current | 5-Year Avg | 10-Year Avg');
      lines.push(`  ${Number(data.trailingPE.pe).toFixed(2)} | ${Number(data.trailingPE.history.avg5).toFixed(2)} | ${Number(data.trailingPE.history.avg10).toFixed(2)}`);
      lines.push('');
    }
  }

  // Forward EPS Table
  if (data.forwardEstimates && data.forwardEstimates.length > 0) {
    lines.push('S&P 500 Forward EPS & Implied Index Values (2025 & 2026):');
    lines.push('  Annual Estimate | Forward EPS | 15x | % vs Index | 17x | % vs Index | 20x | % vs Index');
    data.forwardEstimates.forEach(function(est) {
      lines.push(`  ${est.estimateDate || ''} | $${est.eps || ''} | $${est.pe15 || ''} | ${est.pe15Pct || ''} | $${est.pe17 || ''} | ${est.pe17Pct || ''} | $${est.pe20 || ''} | ${est.pe20Pct || ''}`);
    });
    lines.push('');
  }

  // Market Path
  if (data.marketPath) {
    let rsiValue = typeof data.marketPath.rsi === 'number' ? data.marketPath.rsi.toFixed(1) : (data.marketPath.rsi || 'N/A');
    if (rsiValue === null || rsiValue === 'N/A') {
      // Do not render this section if RSI is missing or N/A
    } else {
      lines.push('Market "Path of Least Resistance":');
      lines.push(`  Value: ${data.marketPath.value}`);
      lines.push(`  RSI: ${rsiValue} (14-day)`);
      lines.push(`  [Info] ${getRSIExplanation()}`);
      lines.push(`  Source: ${data.marketPath.sourceName}`);
      if (data.marketPath.sourceUrl) lines.push(`  URL: ${data.marketPath.sourceUrl}`);
      if (data.marketPath.lastUpdated) lines.push(`  Last Update: ${formatDate(data.marketPath.lastUpdated)}`);
      if (data.marketPath.explanation) lines.push(`  Explanation: ${data.marketPath.explanation}`);
      lines.push('');
    }
  }

  // ETF Holdings (SPY, QQQ, DIA)
  if (data.etfHoldings && data.etfHoldings.length > 0) {
    data.etfHoldings.forEach(function(etf) {
      lines.push(`Top 5 Weighted Stocks in ${etf.indexName} (${etf.symbol}):`);
      lines.push('  # | Ticker | Company | Weight');
      etf.holdings.slice(0, 5).forEach(function(h, i) {
        lines.push(`  ${i + 1} | ${h.symbol} | ${h.name} | ${h.weight}`);
      });
      lines.push(`  Source: ${etf.sourceName}`);
      if (etf.sourceUrl) lines.push(`  URL: ${etf.sourceUrl}`);
      if (etf.lastUpdated) lines.push(`  Last Update: ${formatDate(etf.lastUpdated)}`);
      lines.push('');
    });
  }

  // Trailing EPS Table
  if (data.earnings) {
    lines.push('S&P 500 Earnings Per Share (Trailing 12M):');
    lines.push('  Metric | Value');
    lines.push(`  EPS (TTM) | ${data.earnings.eps}`);
    lines.push(`  S&P 500 Target at 15x | ${data.earnings.pe15}`);
    lines.push(`  S&P 500 Target at 17x | ${data.earnings.pe17}`);
    lines.push(`  S&P 500 Target at 20x | ${data.earnings.pe20}`);
    lines.push(`  Source: ${data.earnings.sourceName}`);
    if (data.earnings.sourceUrl) lines.push(`  URL: ${data.earnings.sourceUrl}`);
    if (data.earnings.lastUpdated) lines.push(`  Last Update: ${formatDate(data.earnings.lastUpdated)}`);
    lines.push('');
  }

  // Data Freshness Table
  if (data.freshness && Array.isArray(data.freshness)) {
    lines.push('Data Freshness Summary:');
    lines.push('  Section | Last Updated | Source');
    data.freshness.forEach(function(row) {
      lines.push(`  ${row.section} | ${row.lastUpdated} | ${row.source}`);
    });
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Formats the S&P 500 Lambda JSON into an HTML section harmonized with Utils.gs style.
 * @param {Object} lambdaJson - The parsed Lambda JSON (with .body property if raw)
 * @return {String} HTML section for email/report
 */
function formatSP500AnalysisHtml(lambdaJson) {
  // Accept either raw or wrapped (with .body as string)
  var data = lambdaJson && lambdaJson.body ? JSON.parse(lambdaJson.body) : lambdaJson;
  // Patch: Map .value to .eps for forwardEstimates if needed
  if (data.forwardEstimates && Array.isArray(data.forwardEstimates)) {
    data.forwardEstimates.forEach(function(est) {
      if (est.value !== undefined && est.eps === undefined) {
        est.eps = est.value;
      }
    });
  }
  addImpliedIndexValuesToEstimates(data);
  addImpliedIndexValuesToEarningsTTM(data);
  var html = [];

// --- Market "Path of Least Resistance" styled like Volatility Indices ---
  if (data.marketPath) {
    let rsiValue = typeof data.marketPath.rsi === 'number' ? data.marketPath.rsi.toFixed(1) : (data.marketPath.rsi || 'N/A');
    let rsiLabel = data.marketPath.value || 'N/A';
    let rsiTrend = rsiLabel; // Assuming value is something like "Neutral", "Bullish", "Bearish"
    let rsiColor = rsiTrend.toLowerCase().includes('bull') ? '#4caf50' :
                   rsiTrend.toLowerCase().includes('bear') ? '#f44336' :
                   '#2563eb'; // blue for neutral/default

    let trendIcon = rsiTrend.toLowerCase().includes('bull') ? '&#8593;' :
                    rsiTrend.toLowerCase().includes('bear') ? '&#8595;' :
                    '&#8594;';

    if (rsiValue !== null && rsiValue !== 'N/A') {
      const rsiPercent = Math.max(0, Math.min(100, Number(rsiValue))); // Clamp to 0-100
      const rsiColor = rsiPercent > 70 ? '#43a047' : rsiPercent < 30 ? '#e53935' : '#2563eb';

      html.push('<div class="rsi-container" style="margin-bottom: 15px; padding: 12px; background-color: #f9f9f9; border-radius: 6px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); width: 100%;">');
      html.push('<div class="rsi-header" style="font-weight: bold; clamp(1.1rem, 3vw, 1.35rem); margin-bottom: 10px;">Path of Least Resistance</div>');
      html.push('<div class="rsi-content" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; flex-wrap: wrap;">');
      html.push('<div class="rsi-label" style="font-weight: bold; font-size: clamp(1rem, 2.5vw, 1.1rem)">Relative Strength Index (14-day)</div>');
      html.push('<div class="rsi-value" style="font-weight: bold; font-size: clamp(1rem, 2.5vw, 1.1rem); color: ' + rsiColor + ';">' + rsiLabel + '</div>');
      html.push('</div>');
      html.push('<div class="rsi-gauge" style="position: relative; height: 12px; background: linear-gradient(to right, #e53935 0%, #ffeb3b 30%, #ffeb3b 70%, #43a047 100%); border-radius: 5px; margin: 10px 0;">');
      html.push('<div class="rsi-gauge-pointer" style="position: absolute; top: 50%; left: ' + rsiPercent + '%; transform: translate(-50%, -50%); width: 18px; height: 18px; background-color: #333; border-radius: 50%; z-index: 1;"></div>');
      html.push('<div class="rsi-gauge-pointer-inner" style="position: absolute; top: 50%; left: ' + rsiPercent + '%; transform: translate(-50%, -50%); width: 12px; height: 12px; background-color: #fff; border: 2px solid #333; border-radius: 50%; z-index: 2;"></div>');
      html.push('</div>');
      html.push('<div class="rsi-explanation" style="display: flex; justify-content: space-between; font-size: 12px; color: #757575; margin-top: 5px; flex-wrap: wrap;">');
      html.push('<div>Oversold</div><div>Neutral</div><div>Overbought</div>');
      html.push('</div>');
      let explanation = data.marketPath.explanation || getRSIExplanation();
      html.push('<div class="rsi-explanation-text" style="font-size: 13px; color: #555; line-height: 1.4; margin-top: 8px;">' + explanation + '</div>');
      let url = data.marketPath.sourceUrl || 'https://finance.yahoo.com/quote/%5EGSPC';
      let sourceLabel = (url.includes('yahoo')) ? 'Yahoo Finance' : (data.marketPath.sourceName || 'Tradier (RSI)');
      html.push('<div class="rsi-source" style="font-size: 10px; color: #888; margin-top: 10px; text-align: right;">Source: <a href="' + url + '" style="color:#2563eb; text-decoration:underline;">' + sourceLabel + '</a>' + (data.marketPath.lastUpdated ? ', as of ' + formatDate(data.marketPath.lastUpdated) : '') + '</div>');
      html.push('</div>');
    }
  }


  html.push('<div class="section" style="background-color: white; border-radius: 8px; padding: 15px; margin-bottom: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); width: 100%; margin-left: auto; margin-right: auto; box-sizing: border-box;">  ');
  html.push('<h2 style="color: #333; border-bottom: 1px solid #eee; padding-bottom: 10px; margin-top: 0; text-align: center; font-size: clamp(1.1rem, 2.5vw, 1.25rem);">S&amp;P 500 Analysis</h2>');


  // --- Current S&P 500 Index Level & Trailing P/E Ratio: Responsive, solid color, max width ---
  if (data.sp500Index && data.trailingPE) {
    const indexSourceUrl = data.sp500Index.sourceUrl || 'https://finance.yahoo.com/quote/%5EGSPC';
    const indexSourceLabel = (indexSourceUrl.includes('yahoo')) ? 'Yahoo Finance' : (data.sp500Index.sourceName || '');
    const indexAsOf = data.sp500Index.lastUpdated ? ', as of ' + formatDate(data.sp500Index.lastUpdated) : '';
    const peSourceUrl = data.trailingPE.sourceUrl || 'https://finance.yahoo.com/quote/%5EGSPC';
    const peSourceLabel = (peSourceUrl.includes('yahoo')) ? 'Yahoo Finance' : (data.trailingPE.sourceName || '');
    const peAsOf = data.trailingPE.lastUpdated ? ', as of ' + formatDate(data.trailingPE.lastUpdated) : '';
    const indexValue = Number(data.sp500Index.price).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2});
    const peCurrent = Number(data.trailingPE.pe).toFixed(2);
    const pe5 = Number(data.trailingPE.history.avg5).toFixed(2);
    const pe10 = Number(data.trailingPE.history.avg10).toFixed(2);
    html.push('<div class="row" style="display: flex; flex-direction: row; gap: 12px; justify-content: flex-start; align-items: stretch; margin-bottom: 24px; flex-wrap: wrap;">');
    // Index Card
    html.push(`
      <div class="index-card" style="flex:1.15; min-width:220px; max-width:100%; display:flex; flex-direction:column; align-items:center; justify-content:center; background-color: #f9f9f9; border-radius: 6px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); margin-right:8px; gap:0; width:100%;">
        <div class="index-card-header" style="font-weight: 700; font-size: clamp(1rem,2vw,1.1rem); color: #1e293b; margin-bottom: 14px; text-align:center; letter-spacing:0.01em;">Current S&amp;P 500 Index Level</div>
        <div class="index-card-value" style="font-size: clamp(2rem, 5vw, 2.4em); font-weight: bold; color: #2563eb; letter-spacing:0.01em; line-height:1; margin-bottom: 7px;">${indexValue}</div>
        <div class="index-card-source" style="font-size: 10px; color: #888; text-align: center; margin-top: 6px; line-height:1.35;">
          Source: <a href="${indexSourceUrl}" target="_blank" style="color:#2563eb; text-decoration:underline;">${indexSourceLabel}</a>${indexAsOf}
        </div>
      </div>
    `);
    // Trailing P/E Card - solid dark purple header
    html.push(`
      <div class="pe-card" style="flex:1; min-width:220px; background-color: #f9f9f9; border-radius: 6px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); padding: 20px 24px 18px 24px; display: flex; flex-direction: column; justify-content: center; border: 1px solid #d0f7e2; max-width:100%; width:100%;">
        <div class="pe-card-header" style="font-weight: bold; font-size: clamp(1rem,2vw,1.1rem); margin-bottom: 8px;">S&amp;P 500 Trailing P/E Ratio</div>
        <div class="pe-card-table" style="overflow-x:auto;">
          <table style="width:100%; border-collapse:separate; border-spacing:0 14px; background: #fff; margin-bottom: 10px; border-radius:10px; overflow:hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.04); font-size: clamp(0.95rem, 2vw, 1.05rem);">
            <thead><tr style="background:#4B2991; text-align:center; font-weight:600; color:#fff; font-size:1.07em;">
              <th style="padding:16px 0 12px 0;">Current</th><th>5-Year Avg</th><th>10-Year Avg</th>
            </tr></thead>
            <tbody>
              <tr style="text-align:center; background:#fff; border-bottom:1px solid #e5e7eb; color:#111;">
                <td style="font-weight:bold; color:#111;">${peCurrent}</td><td style="color:#111;">${pe5}</td><td style="color:#111;">${pe10}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="pe-card-source" style="font-size: 10px; color: #888; margin-top: 2px; text-align: right;">Source: <a href="${peSourceUrl}" target="_blank" style="color:#2563eb; text-decoration:underline;">${peSourceLabel}</a>${peAsOf}</div>
      </div>
    `);
    html.push('</div>');
  }

  // --- S&P 500 Earnings Per Share (Trailing 12M) Table: solid burgundy header ---
  if (data.earnings) {
    const ttmSourceUrl = data.earnings.sourceUrl || 'https://finance.yahoo.com/quote/%5EGSPC/financials';
    const ttmSourceLabel = (ttmSourceUrl.includes('yahoo')) ? 'Yahoo Finance' : (data.earnings.sourceName || '');
    const ttmAsOf = data.earnings.lastUpdated ? ', as of ' + formatDate(data.earnings.lastUpdated) : '';
    const epsTTM = Number(data.earnings.eps).toFixed(2);
    const pe15 = Number(data.earnings.pe15).toFixed(2);
    const pe17 = Number(data.earnings.pe17).toFixed(2);
    const pe20 = Number(data.earnings.pe20).toFixed(2);
    html.push('<div class="earnings-container" style="margin-bottom: 15px; padding: 12px; background-color: #f9f9f9; border-radius: 6px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); width: 100%; min-width:220px;">');
    html.push('<div class="earnings-header label-col" style="font-weight: bold; font-size: clamp(1rem,2vw,1.1rem); margin-bottom: 14px; color: #1a3c6e; letter-spacing:0.01em;">S&amp;P 500 Earnings Per Share (Trailing 12M)</div>');
    html.push('<div class="earnings-table" style="overflow-x:auto;">');
    html.push('<table style="width:100%; border-collapse:separate; border-spacing:0 14px; background: #fff; margin-bottom: 10px; border-radius:10px; overflow:hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.04); font-size: clamp(0.95rem, 2vw, 1.05rem);">');
    html.push('<thead><tr style="background:#B91C1C; text-align:center; font-weight:600; color:#fff; font-size:1.07em;">');
    html.push('<th style="padding:16px 0 12px 0;">S&amp;P 500 EPS (TTM)</th><th>Target at 15x</th><th>Target at 17x</th><th>Target at 20x</th>');
    html.push('</tr></thead>');
    html.push('<tbody>');
    html.push(`<tr style="text-align:center; background:#fff; border-bottom:1px solid #e5e7eb; color:#111;">`);
    html.push(`<td style="font-weight:bold; color:#111;">${epsTTM}</td><td style="color:#111;">$${pe15}</td><td style="color:#111;">$${pe17}</td><td style="color:#111;">$${pe20}</td>`);
    html.push('</tr>');
    html.push('</tbody></table>');
    html.push('</div>');
    html.push(`<div class="earnings-source" style="font-size: 10px; color: #888; margin-top: 8px; text-align: right;">Source: <a href="${ttmSourceUrl}" target="_blank" style="color:#2563eb; text-decoration:underline;">${ttmSourceLabel}</a>${ttmAsOf}</div>`);
    html.push('</div>');
  }

  // --- S&P 500 Forward EPS & Implied Index Values Table (Dark Green Header, White Rows, % Fix) ---
  if (data.forwardEstimates && data.forwardEstimates.length > 0) {
    const spGlobalUrl = 'https://www.spglobal.com/spdji/en/documents/additional-material/sp-500-eps-est.xlsx';
    const asOfDate = data.forwardEstimates[0]?.lastUpdated ? formatDate(data.forwardEstimates[0].lastUpdated) : '';
    html.push('<div class="forward-eps-container" style="margin-bottom: 15px; padding: 12px; background-color: #f9f9f9; border-radius: 6px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); width: 100%; min-width:220px;">');
    html.push('<div class="forward-eps-header label-col" style="font-weight: bold; font-size: clamp(1rem,2vw,1.1rem); margin-bottom: 14px; color: #1a3c6e; letter-spacing:0.01em;">S&amp;P 500 Forward EPS & Implied Index Values (2025 & 2026)</div>');
    html.push('<div class="forward-eps-table" style="overflow-x:auto;">');
    html.push('<table style="width:100%; border-collapse:separate; border-spacing:0 14px; background: #fff; margin-bottom: 10px; border-radius:10px; overflow:hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.04); font-size: clamp(0.95rem, 2vw, 1.05rem);">');
    html.push('<thead><tr style="background:#166534; text-align:center; font-weight:600; color:#fff; font-size:1.07em;">');
    html.push('<th style="padding:16px 0 12px 0;">Annual Estimate</th><th>Forward EPS</th><th>15x</th><th>% vs Index</th><th>17x</th><th>% vs Index</th><th>20x</th><th>% vs Index</th>');
    html.push('</tr></thead>');
    html.push('<tbody>');
    // --- Use the same % calculation logic as formatSP500AnalysisText ---
    let indexValue = data.sp500Index && data.sp500Index.price ? Number(data.sp500Index.price) : null;
    data.forwardEstimates.forEach(function(est, idx) {
      let estimateYear = (est.estimateDate && est.estimateDate.length >= 4) ? est.estimateDate.slice(-4) : '';
      let eps = est.eps !== undefined ? `$${Number(est.eps).toFixed(2)}` : '';
      let pe15 = est.eps !== undefined ? `$${(Number(est.eps) * 15).toFixed(2)}` : '';
      let pe17 = est.eps !== undefined ? `$${(Number(est.eps) * 17).toFixed(2)}` : '';
      let pe20 = est.eps !== undefined ? `$${(Number(est.eps) * 20).toFixed(2)}` : '';
      // Calculate % vs Index using the same logic as formatSP500AnalysisText
      let pe15Pct = '', pe17Pct = '', pe20Pct = '';
      if (indexValue && !isNaN(Number(est.eps))) {
        pe15Pct = `${((Number(est.eps) * 15 / indexValue - 1) * 100).toFixed(1)}%`;
        pe17Pct = `${((Number(est.eps) * 17 / indexValue - 1) * 100).toFixed(1)}%`;
        pe20Pct = `${((Number(est.eps) * 20 / indexValue - 1) * 100).toFixed(1)}%`;
      }
      html.push(`<tr style="text-align:center; background:#fff; border-bottom:1px solid #e5e7eb; color:#111;">`);
      html.push(`<td style="font-weight:bold; color:#111;">${estimateYear}</td><td style="font-weight:bold; color:#111;">${eps}</td><td style='color:#111;'>${pe15}</td><td style='color:#111;'>${pe15Pct}</td><td style='color:#111;'>${pe17}</td><td style='color:#111;'>${pe17Pct}</td><td style='color:#111;'>${pe20}</td><td style='color:#111;'>${pe20Pct}</td>`);
      html.push('</tr>');
    });
    html.push('</tbody></table>');
    html.push('</div>');
    html.push(`<div class="forward-eps-source" style="font-size: 10px; color: #888; margin-top: 8px; text-align: right;">Source: <a href="${spGlobalUrl}" target="_blank" style="color:#2563eb; text-decoration:underline;">S&amp;P Global</a>${asOfDate ? ', as of ' + asOfDate : ''}</div>`);
    html.push('</div>');
  }

  // ETF Holdings (SPY, QQQ, DIA)
  if (data.etfHoldings && data.etfHoldings.length > 0) {
    html.push('<div class="etf-holdings-container" style="margin-bottom: 15px; padding: 12px; background-color: #f9f9f9; border-radius: 6px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); width: 100%; min-width:220px;">');
    html.push('<div class="etf-holdings-header label-col" style="font-weight: bold; font-size: clamp(1rem,2vw,1.1rem); margin-bottom: 10px;">Top 5 Weighted Stocks in Major Indices</div>');
    html.push('<div class="etf-holdings-cards row" style="display: flex; flex-direction: row; gap: 20px; justify-content: space-between; margin-bottom: 24px; flex-wrap: wrap;">');
    data.etfHoldings.forEach(function(etf) {
      html.push(`
        <div class="etf-holding-card" style="flex: 1; min-width:220px; max-width:100%; background: #fff; border-radius: 10px; box-shadow: 0 1px 4px rgba(0,0,0,0.07); padding: 18px 16px 14px 16px; border-left: 5px solid #2563eb; display: flex; flex-direction: column; align-items: flex-start; width: 100%;">
        <div class="etf-holding-header" style="font-weight: bold; font-size: clamp(1rem,2vw,1.1rem); margin-bottom: 4px; font-family: Segoe UI, Arial, sans-serif; color: #222;">${etf.indexName} <span style='color:#888; font-size:0.92em;'>(${etf.symbol})</span></div>
        <div class="etf-holding-table" style="margin-bottom: 10px; font-size: clamp(0.95rem, 2vw, 1.05rem); color: #444;">Top 5 Holdings:</div>
        <div class="etf-holding-rows" style="display: flex; flex-direction: column; gap: 6px; width: 100%; margin-bottom: 10px;">
          ${etf.holdings.slice(0, 5).map(h => `
            <div class="etf-holding-row" style="display: flex; justify-content: space-between; align-items: center; background: #f8f9fa; border-radius: 4px; padding: 6px 8px;">
              <span class="etf-holding-symbol" style="font-weight: bold; color: #2563eb;">${h.symbol}</span>
              <span class="etf-holding-name" style="flex: 1; margin-left: 10px; color: #222; font-size: 0.8em;">${h.name}</span>
              <span class="etf-holding-weight" style="font-size: 0.8em; color: #555; font-family: monospace; margin-left: 10px;">${h.weight}</span>
           </div>
          `).join('')}
        </div>
        <div class="etf-holding-source" style="font-size: 10px; color: #888; margin-top: auto;">
          Source: <a href="${etf.sourceUrl || '#'}" style="color:#2563eb; text-decoration:underline;" target="_blank">${etf.sourceName}</a>${etf.lastUpdated ? ', as of ' + formatDate(etf.lastUpdated)   : ''}
        </div>
      </div>
      `);
    });
  html.push('</div>'); // container
  }
  return html.join('');
} 

/**
 * Helper: Adds implied index values (15x, 17x, 20x EPS) and their % vs Index to forwardEstimates array.
 * @param {Object} data - The parsed Lambda JSON
 */
function addImpliedIndexValuesToEstimates(data) {
  if (!data || !data.forwardEstimates || !data.sp500Index || !data.sp500Index.price) return;
  var currentIndex = Number(data.sp500Index.price);
  data.forwardEstimates.forEach(function(est) {
    var eps = Number(est.eps);
    if (!isNaN(eps) && !isNaN(currentIndex) && currentIndex > 0) {
      est.pe15 = (eps * 15).toFixed(2);
      est.pe17 = (eps * 17).toFixed(2);
      est.pe20 = (eps * 20).toFixed(2);
      est.pe15Pct = ((eps * 15 / currentIndex - 1) * 100).toFixed(1) + '%';
      est.pe17Pct = ((eps * 17 / currentIndex - 1) * 100).toFixed(1) + '%';
      est.pe20Pct = ((eps * 20 / currentIndex - 1) * 100).toFixed(1) + '%';
    } else {
      est.pe15 = est.pe17 = est.pe20 = 'N/A';
      est.pe15Pct = est.pe17Pct = est.pe20Pct = 'N/A';
    }
  });
}

/**
 * Helper: Adds implied index values (15x, 17x, 20x) for TTM EPS.
 * @param {Object} data - The parsed Lambda JSON
 */
function addImpliedIndexValuesToEarningsTTM(data) {
  if (data.earnings && typeof data.earnings.eps === 'number') {
    data.earnings.pe15 = (data.earnings.eps * 15).toFixed(2);
    data.earnings.pe17 = (data.earnings.eps * 17).toFixed(2);
    data.earnings.pe20 = (data.earnings.eps * 20).toFixed(2);
  } else {
    data.earnings.pe15 = data.earnings.pe17 = data.earnings.pe20 = 'N/A';
  }
}

/**
 * Helper: Returns a human-readable explanation of RSI and 'path of least resistance'.
 */
function getRSIExplanation() {
  return 'Developed by J.\u00a0Welles\u00a0Wilder\u00a0Jr. in 1978, the <a href="https://www.investopedia.com/terms/r/rsi.asp" target="_blank">Relative Strength Index (RSI)</a> is a 0–100 momentum oscillator: readings >\u00a070 signal overbought, <\u00a030 oversold, and 30–70 neutral (with 50 marking “no trend”). Values above 50 imply bullish momentum; below 50, bearish momentum.';
}