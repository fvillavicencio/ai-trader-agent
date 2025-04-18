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
    if (data.sp500Index.lastUpdated) lines.push(`  Last Update: ${formatDate_(data.sp500Index.lastUpdated)}`);
    lines.push('');
  }

  // Trailing P/E
  if (data.trailingPE) {
    lines.push('S&P 500 Trailing P/E Ratio:');
    lines.push(`  P/E: ${data.trailingPE.pe}`);
    lines.push(`  Source: ${data.trailingPE.sourceName}`);
    if (data.trailingPE.sourceUrl) lines.push(`  URL: ${data.trailingPE.sourceUrl}`);
    if (data.trailingPE.lastUpdated) lines.push(`  Last Update: ${formatDate_(data.trailingPE.lastUpdated)}`);
    lines.push('');
  }

  // Historical P/E Context (standalone section)
  if (data.trailingPE && data.trailingPE.history) {
    lines.push('Historical P/E Context:');
    lines.push('  Current | 5-Year Avg | 10-Year Avg');
    lines.push(`  ${Number(data.trailingPE.pe).toFixed(2)} | ${Number(data.trailingPE.history.avg5).toFixed(2)} | ${Number(data.trailingPE.history.avg10).toFixed(2)}`);
    lines.push('');
  }

  // Forward EPS Table
  if (data.forwardEstimates && data.forwardEstimates.length > 0) {
    lines.push('S&P 500 Forward EPS & Implied Index Values (2025 & 2026):');
    lines.push('  Scenario | Year | Estimate Date | EPS | 15x | % vs Index | 17x | % vs Index | 20x | % vs Index | Source');
    data.forwardEstimates.forEach(function(est) {
      lines.push(`  ${est.scenario || ''} | ${est.year || ''} | ${est.estimateDate || ''} | $${est.eps || ''} | ${est.pe15 || ''} | ${est.pe15Pct || ''} | ${est.pe17 || ''} | ${est.pe17Pct || ''} | ${est.pe20 || ''} | ${est.pe20Pct || ''} | ${est.source || ''}`);
    });
    lines.push('');
  }

  // Market Path
  if (data.marketPath) {
    lines.push('Market "Path of Least Resistance":');
    lines.push(`  Value: ${data.marketPath.value}`);
    var rsiValue = typeof data.marketPath.rsi === 'number' ? data.marketPath.rsi.toFixed(1) : 'N/A';
    lines.push(`  RSI: ${rsiValue} (14-day)`);
    lines.push(`  [Info] ${getRSIExplanation()}`);
    lines.push(`  Source: ${data.marketPath.sourceName}`);
    if (data.marketPath.sourceUrl) lines.push(`  URL: ${data.marketPath.sourceUrl}`);
    if (data.marketPath.lastUpdated) lines.push(`  Last Update: ${formatDate_(data.marketPath.lastUpdated)}`);
    if (data.marketPath.explanation) lines.push(`  Explanation: ${data.marketPath.explanation}`);
    lines.push('');
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
      if (etf.lastUpdated) lines.push(`  Last Update: ${formatDate_(etf.lastUpdated)}`);
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
    if (data.earnings.lastUpdated) lines.push(`  Last Update: ${formatDate_(data.earnings.lastUpdated)}`);
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
  addImpliedIndexValuesToEstimates(data);
  addImpliedIndexValuesToEarningsTTM(data);
  var html = [];
  html.push('<div class="container">');
  html.push('<h2 style="margin-top:0;margin-bottom:16px;font-size:1.35em;">S&amp;P 500 Market Analyzer Report</h2>');

  // Index Level
  if (data.sp500Index) {
    html.push('<div class="spx-index-block">');
    html.push('<h2>Current S&P 500 Index Level</h2>');
    html.push(`<div class="spx-index">${data.sp500Index.price}</div>`);
    html.push(`<div class="source-block"><strong>Source:</strong> ${data.sp500Index.sourceName}<br/><strong>URL:</strong> <a href="${data.sp500Index.sourceUrl || '#'}">${data.sp500Index.sourceUrl || ''}</a><br/><strong>Last Update:</strong> ${formatDate_(data.sp500Index.lastUpdated)}</div>`);
    html.push('</div>');
  }

  // Trailing P/E
  if (data.trailingPE) {
    html.push('<h2>S&P 500 Trailing P/E Ratio</h2><hr/>');
    html.push(`<div class="pe-block">P/E: <strong>${data.trailingPE.pe}</strong></div>`);
    html.push(`<div class="source-block"><strong>Source:</strong> ${data.trailingPE.sourceName}<br/><strong>URL:</strong> <a href="${data.trailingPE.sourceUrl || '#'}">${data.trailingPE.sourceUrl || ''}</a><br/><strong>Last Update:</strong> ${formatDate_(data.trailingPE.lastUpdated)}</div>`);
    html.push('');
  }

  // Historical P/E Context (standalone section)
  if (data.trailingPE && data.trailingPE.history) {
    html.push('<h2>Historical P/E Context</h2>');
    html.push('<div class="responsive-table"><table><thead><tr><th>Current</th><th>5-Year Avg</th><th>10-Year Avg</th></tr></thead><tbody>');
    html.push(`<tr><td>${Number(data.trailingPE.pe).toFixed(2)}</td><td>${Number(data.trailingPE.history.avg5).toFixed(2)}</td><td>${Number(data.trailingPE.history.avg10).toFixed(2)}</td></tr>`);
    html.push('</tbody></table></div>');
  }

  // Forward EPS Table
  if (data.forwardEstimates && data.forwardEstimates.length > 0) {
    html.push('<h2>S&P 500 Forward EPS & Implied Index Values (2025 & 2026)</h2><hr/>');
    html.push('<div class="forward-pe-block"><div class="responsive-table"><table><thead><tr><th>Scenario</th><th>Year</th><th>Estimate Date</th><th>Forward EPS</th><th>15x</th><th>% vs Index</th><th>17x</th><th>% vs Index</th><th>20x</th><th>% vs Index</th><th>Source</th></tr></thead><tbody>');
    data.forwardEstimates.forEach(function(est) {
      html.push(`<tr><td>${est.scenario || ''}</td><td>${est.year || ''}</td><td>${est.estimateDate || ''}</td><td><strong>$${est.eps || ''}</strong></td><td>${est.pe15 || ''}</td><td>${est.pe15Pct || ''}</td><td>${est.pe17 || ''}</td><td>${est.pe17Pct || ''}</td><td>${est.pe20 || ''}</td><td>${est.pe20Pct || ''}</td><td>${est.source || ''}</td></tr>`);
    });
    html.push('</tbody></table></div></div>');
  }

  // Market Path
  if (data.marketPath) {
    html.push('<div class="market-path-block"><h2>Market "Path of Least Resistance"</h2><hr/>');
    var rsiValue = typeof data.marketPath.rsi === 'number' ? data.marketPath.rsi.toFixed(1) : 'N/A';
    html.push(`<div class="market-path-value">${data.marketPath.value} (RSI=${rsiValue} <span style='cursor:pointer;color:#2563eb;' title='${getRSIExplanation()}'>?</span>)</div>`);
    html.push(`<div class="source-block"><strong>Source:</strong> ${data.marketPath.sourceName}<br/><strong>URL:</strong> <a href="${data.marketPath.sourceUrl || '#'}">${data.marketPath.sourceUrl || ''}</a><br/><strong>Last Update:</strong> ${formatDate_(data.marketPath.lastUpdated)}</div>`);
    if (data.marketPath.explanation) {
      html.push(`<div class="market-path-expl">${data.marketPath.explanation}</div>`);
    }
    html.push('</div>');
  }

  // ETF Holdings (SPY, QQQ, DIA)
  if (data.etfHoldings && data.etfHoldings.length > 0) {
    data.etfHoldings.forEach(function(etf) {
      html.push(`<h2>Top 5 Weighted Stocks in ${etf.indexName}</h2><hr/>`);
      html.push(`<div class="holdings-block"><h3>${etf.indexName} (${etf.symbol})</h3>`);
      html.push('<div class="responsive-table"><table><thead><tr><th>#</th><th>Ticker</th><th>Company</th><th>Weight</th></tr></thead><tbody>');
      etf.holdings.slice(0, 5).forEach(function(h, i) {
        html.push(`<tr><td>${i + 1}</td><td>${h.symbol}</td><td>${h.name}</td><td>${h.weight}</td></tr>`);
      });
      html.push('</tbody></table></div>');
      html.push(`<div class="source-block"><strong>Source:</strong> ${etf.sourceName}<br/><strong>URL:</strong> <a href="${etf.sourceUrl || '#'}">${etf.sourceUrl || ''}</a><br/><strong>Last Update:</strong> ${formatDate_(etf.lastUpdated)}</div>`);
      html.push('</div>');
    });
  }

  // Trailing EPS Table
  if (data.earnings) {
    html.push('<h2>S&P 500 Earnings Per Share (Trailing 12M)</h2><hr/>');
    html.push('<div class="earnings-block">');
    html.push('<div class="responsive-table"><table><thead><tr><th>Metric</th><th>Value</th></tr></thead><tbody>');
    html.push(`<tr><td><strong>EPS (TTM)</strong></td><td><strong>${data.earnings.eps}</strong></td></tr>`);
    html.push(`<tr><td>S&P 500 Target at <strong>15x</strong></td><td><strong>${data.earnings.pe15}</strong></td></tr>`);
    html.push(`<tr><td>S&P 500 Target at <strong>17x</strong></td><td><strong>${data.earnings.pe17}</strong></td></tr>`);
    html.push(`<tr><td>S&P 500 Target at <strong>20x</strong></td><td><strong>${data.earnings.pe20}</strong></td></tr>`);
    html.push('</tbody></table></div>');
    html.push('<div class="source-block">');
    html.push(`<strong>Source:</strong> ${data.earnings.sourceName}<br/>`);
    html.push(`<strong>URL:</strong> <a href="${data.earnings.sourceUrl}">${data.earnings.sourceUrl}</a><br/>`);
    html.push(`<strong>Last Update:</strong> ${formatDate_(data.earnings.lastUpdated)}`);
    html.push('</div></div>');
  }

  // Data Freshness Table
  if (data.freshness && Array.isArray(data.freshness)) {
    html.push('<div class="freshness-block"><h3>Data Freshness Summary</h3><div class="responsive-table"><table><thead><tr><th>Section</th><th>Last Updated</th><th>Source</th></tr></thead><tbody>');
    data.freshness.forEach(function(row) {
      html.push(`<tr><td>${row.section}</td><td>${row.lastUpdated}</td><td>${row.source}</td></tr>`);
    });
    html.push('</tbody></table></div></div>');
  }

  html.push('</div>'); // container
  return html.join('');
}

/**
 * Helper: Formats ISO date string as YYYY-MM-DD or locale string.
 */
function formatDate_(iso) {
  if (!iso) return '';
  var d = new Date(iso);
  if (!isNaN(d)) {
    return d.toISOString().slice(0, 10);
  }
  return iso;
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
  return "The Relative Strength Index (RSI) is a momentum indicator ranging from 0 to 100. Readings above 70 are considered overbought (potentially overvalued), below 30 are oversold (potentially undervalued), and 40-60 is neutral. The 'path of least resistance' refers to the market's likely short-term direction based on momentum.";
}