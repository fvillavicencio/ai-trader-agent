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
 * Formats the S&P 500 Lambda JSON into an HTML section harmonized with Utils.gs style.
 * @param {Object} lambdaJson - The parsed Lambda JSON (with .body property if raw)
 * @return {String} HTML section for email/report
 */
function formatSP500AnalysisHtml(lambdaJson) {
  var data = lambdaJson && lambdaJson.body ? JSON.parse(lambdaJson.body) : lambdaJson;
  var html = [];
  html.push('<div class="section" style="margin-bottom: 32px;">');
  html.push('<h2 style="margin-top:0;margin-bottom:16px;font-size:1.35em;">S&amp;P 500 Market Summary</h2>');

  // Index Price Card
  if (data.sp500Index) {
    html.push('<div style="background:#f8f9fa;padding:14px 18px 10px 18px;border-radius:8px;margin-bottom:14px;">');
    html.push(`<div style="font-weight:bold;font-size:1.1em;">Index Price: <span style="font-weight:normal;">${data.sp500Index.price}</span></div>`);
    html.push(`<div style="color:#888;font-size:12px;">Last Updated: ${formatDate_(data.sp500Index.lastUpdated)} &nbsp;|&nbsp; Source: <a href="${data.sp500Index.sourceUrl || '#'}" style="color:#2196f3;text-decoration:none;">${data.sp500Index.sourceName}</a></div>`);
    html.push('</div>');
  }
  // Trailing PE Card
  if (data.trailingPE) {
    html.push('<div style="background:#f8f9fa;padding:14px 18px 10px 18px;border-radius:8px;margin-bottom:14px;">');
    html.push(`<div><strong>Trailing P/E:</strong> ${data.trailingPE.pe}</div>`);
    html.push(`<div style="color:#888;font-size:12px;">Source: <a href="${data.trailingPE.sourceUrl || '#'}" style="color:#2196f3;text-decoration:none;">${data.trailingPE.sourceName}</a></div>`);
    html.push('</div>');
  }
  // Forward EPS Estimates
  if (data.forwardEstimates && data.forwardEstimates.length > 0) {
    html.push('<div style="background:#f8f9fa;padding:14px 18px 10px 18px;border-radius:8px;margin-bottom:14px;">');
    html.push('<div style="font-weight:bold;">Forward EPS Estimates:</div>');
    html.push('<ul style="margin:8px 0 0 18px;padding:0;">');
    data.forwardEstimates.forEach(function(est) {
      html.push(`<li style="margin-bottom:2px;">${est.year}: <span style="font-weight:bold;">EPS ${est.eps}</span> <span style="color:#666;font-size:12px;">(${est.scenario}, as of ${est.estimateDate})</span></li>`);
    });
    html.push('</ul>');
    html.push('</div>');
  }
  // Market Path
  if (data.marketPath) {
    html.push('<div style="background:#f8f9fa;padding:14px 18px 10px 18px;border-radius:8px;margin-bottom:14px;">');
    html.push(`<div><strong>Market Path:</strong> ${data.marketPath.value} <span style="color:#888;font-size:12px;">(RSI: ${data.marketPath.rsi.toFixed(1)})</span></div>`);
    html.push(`<div style="color:#888;font-size:12px;">Source: <a href="${data.marketPath.sourceUrl || '#'}" style="color:#2196f3;text-decoration:none;">${data.marketPath.sourceName}</a></div>`);
    html.push('</div>');
  }
  // Moving Averages
  if (data.movingAverages) {
    html.push('<div style="background:#f8f9fa;padding:14px 18px 10px 18px;border-radius:8px;margin-bottom:14px;">');
    html.push(`<div><strong>SPY Moving Averages:</strong> <span style="font-weight:normal;">50-day: ${data.movingAverages.sma50}, 200-day: ${data.movingAverages.sma200}</span></div>`);
    html.push('</div>');
  }
  // ETF Holdings
  if (data.etfHoldings && data.etfHoldings.length > 0) {
    html.push('<div style="background:#f8f9fa;padding:14px 18px 10px 18px;border-radius:8px;margin-bottom:14px;">');
    html.push('<div style="font-weight:bold;">ETF Top Holdings:</div>');
    data.etfHoldings.forEach(function(etf) {
      html.push(`<div style="margin-top:8px;margin-bottom:2px;font-weight:bold;">${etf.symbol} <span style="font-weight:normal;color:#888;">(${etf.indexName})</span></div>`);
      html.push('<div style="margin-left:10px;">');
      etf.holdings.slice(0, 5).forEach(function(h) {
        html.push(`<span style="display:inline-block;background:#e3f2fd;color:#0d47a1;padding:2px 8px;border-radius:4px;margin-right:5px;font-size:12px;">${h.symbol}: ${h.name} (${h.weight})</span>`);
      });
      html.push('</div>');
      html.push(`<div style="color:#888;font-size:12px;">Source: <a href="${etf.sourceUrl || '#'}" style="color:#2196f3;text-decoration:none;">${etf.sourceName}</a> &nbsp;|&nbsp; Last Updated: ${formatDate_(etf.lastUpdated)}</div>`);
    });
    html.push('</div>');
  }
  // Trailing EPS
  if (data.earnings) {
    html.push('<div style="background:#f8f9fa;padding:14px 18px 10px 18px;border-radius:8px;margin-bottom:14px;">');
    html.push(`<div><strong>Trailing EPS:</strong> ${data.earnings.eps} (P/E: ${data.earnings.pe})</div>`);
    html.push(`<div style="color:#888;font-size:12px;">Source: <a href="${data.earnings.sourceUrl || '#'}" style="color:#2196f3;text-decoration:none;">${data.earnings.sourceName}</a></div>`);
    html.push('</div>');
  }
  html.push('</div>');
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