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
    muteHttpExceptions: true
  };
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
  var lines = [];
  lines.push('S&P 500 Market Summary:');
  if (data.sp500Index) {
    lines.push(`- Index Price: ${data.sp500Index.price} (Last Updated: ${formatDate_(data.sp500Index.lastUpdated)}) [${data.sp500Index.sourceName}]`);
  }
  if (data.trailingPE) {
    lines.push(`- Trailing P/E: ${data.trailingPE.pe} (Source: ${data.trailingPE.sourceName})`);
  }
  if (data.forwardEstimates && data.forwardEstimates.length > 0) {
    lines.push('- Forward EPS Estimates:');
    data.forwardEstimates.forEach(function(est) {
      lines.push(`  • ${est.year}: EPS ${est.eps} (${est.scenario}, as of ${est.estimateDate})`);
    });
  }
  if (data.marketPath) {
    lines.push(`- Market Path: ${data.marketPath.value} (RSI: ${data.marketPath.rsi.toFixed(1)}) [${data.marketPath.sourceName}]`);
  }
  if (data.movingAverages) {
    lines.push(`- Moving Averages: 50-day SMA: ${data.movingAverages.sma50}, 200-day SMA: ${data.movingAverages.sma200}`);
  }
  if (data.etfHoldings && data.etfHoldings.length > 0) {
    lines.push('- ETF Top Holdings:');
    data.etfHoldings.forEach(function(etf) {
      var top = etf.holdings.slice(0, 3).map(function(h) {
        return `${h.symbol} (${h.name}, ${h.weight})`;
      }).join('; ');
      lines.push(`  • ${etf.symbol}: ${top}`);
    });
  }
  if (data.earnings) {
    lines.push(`- Trailing EPS: ${data.earnings.eps} (P/E: ${data.earnings.pe}, Source: ${data.earnings.sourceName})`);
  }
  return lines.join('\n');
}

/**
 * Formats the S&P 500 Lambda JSON into an HTML section styled like Utils.gs.
 * @param {Object} lambdaJson - The parsed Lambda JSON (with .body property if raw)
 * @return {String} HTML section for email/report
 */
function formatSP500AnalysisHtml(lambdaJson) {
  var data = lambdaJson && lambdaJson.body ? JSON.parse(lambdaJson.body) : lambdaJson;
  var html = [];
  html.push('<section class="market-section sp500-section">');
  html.push('<h2>S&amp;P 500 Market Summary</h2>');
  html.push('<ul>');
  if (data.sp500Index) {
    html.push(`<li><strong>Index Price:</strong> ${data.sp500Index.price} <span class="muted">(Last Updated: ${formatDate_(data.sp500Index.lastUpdated)})</span> <span class="source">[${data.sp500Index.sourceName}]</span></li>`);
  }
  if (data.trailingPE) {
    html.push(`<li><strong>Trailing P/E:</strong> ${data.trailingPE.pe} <span class="source">[${data.trailingPE.sourceName}]</span></li>`);
  }
  if (data.forwardEstimates && data.forwardEstimates.length > 0) {
    html.push('<li><strong>Forward EPS Estimates:</strong><ul>');
    data.forwardEstimates.forEach(function(est) {
      html.push(`<li>${est.year}: EPS ${est.eps} (${est.scenario}, as of ${est.estimateDate})</li>`);
    });
    html.push('</ul></li>');
  }
  if (data.marketPath) {
    html.push(`<li><strong>Market Path:</strong> ${data.marketPath.value} (RSI: ${data.marketPath.rsi.toFixed(1)}) <span class="source">[${data.marketPath.sourceName}]</span></li>`);
  }
  if (data.movingAverages) {
    html.push(`<li><strong>Moving Averages:</strong> 50-day SMA: ${data.movingAverages.sma50}, 200-day SMA: ${data.movingAverages.sma200}</li>`);
  }
  if (data.etfHoldings && data.etfHoldings.length > 0) {
    html.push('<li><strong>ETF Top Holdings:</strong><ul>');
    data.etfHoldings.forEach(function(etf) {
      var top = etf.holdings.slice(0, 3).map(function(h) {
        return `${h.symbol} (${h.name}, ${h.weight})`;
      }).join('; ');
      html.push(`<li>${etf.symbol}: ${top}</li>`);
    });
    html.push('</ul></li>');
  }
  if (data.earnings) {
    html.push(`<li><strong>Trailing EPS:</strong> ${data.earnings.eps} (P/E: ${data.earnings.pe}) <span class="source">[${data.earnings.sourceName}]</span></li>`);
  }
  html.push('</ul>');
  html.push('</section>');
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