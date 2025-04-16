import dotenv from 'dotenv';
dotenv.config();
import { getSP500PE } from './services/sp500.js';
import { getTopHoldings } from './services/etf.js';
import { getSP500Earnings } from './services/earnings.js';
import { getMarketPath } from './services/technicals.js';
import { getForwardEpsEstimates } from './services/forwardPE.js';
import { getSP500IndexPrice } from './services/price.js';
import { getSPYMovingAverages } from './services/movingAverages.js';
import fs from 'fs';

function htmlSectionHeader(title) {
  return `<h2>${title}</h2><hr/>`;
}

function htmlSourceBlock(sourceName, sourceUrl, lastUpdated) {
  return `<div class="source-block"><strong>Source:</strong> ${sourceName}<br/><strong>URL:</strong> <a href="${sourceUrl}">${sourceUrl}</a><br/><strong>Last Update:</strong> ${formatTimestamp(lastUpdated)}</div>`;
}

function htmlHoldingsBlock(indexName, symbol, top, sourceName, sourceUrl, lastUpdated) {
  let lines = [`<div class="holdings-block"><h3>${indexName} (${symbol})</h3><table><thead><tr><th>#</th><th>Ticker</th><th>Company</th><th>Weight</th></tr></thead><tbody>`];
  top.forEach((h, i) => {
    lines.push(`<tr><td>${i + 1}</td><td>${h.symbol}</td><td>${h.name}</td><td>${h.weight}</td></tr>`);
  });
  lines.push('</tbody></table>');
  lines.push(htmlSourceBlock(sourceName, sourceUrl, lastUpdated));
  lines.push('</div>');
  return lines.join('\n');
}

function htmlEarningsBlock(earningsObj, multiples) {
  let lines = [`<div class="earnings-block">`];
  lines.push(`<h3>S&P 500 Earnings Per Share (Trailing 12M)</h3>`);
  lines.push(`<div class="eps">EPS: <strong>$${earningsObj.value}</strong></div>`);
  multiples.forEach(multiple => {
    const target = (parseFloat(earningsObj.value) * multiple).toFixed(2);
    lines.push(`<div>S&P 500 Target at <strong>${multiple}x</strong>: <strong>${target}</strong></div>`);
  });
  lines.push(htmlSourceBlock(earningsObj.sourceName, earningsObj.sourceUrl, earningsObj.lastUpdated));
  lines.push('</div>');
  return lines.join('\n');
}

function htmlMarketPathBlock(pathObj) {
  return `<div class="market-path-block">${htmlSectionHeader('Market "Path of Least Resistance"')}<div class="market-path-value">${pathObj.value}</div>${htmlSourceBlock(pathObj.sourceName, pathObj.sourceUrl, pathObj.lastUpdated)}<div class="market-path-expl">Explanation: The 'Path of Least Resistance' is based on the Relative Strength Index (RSI) of SPY. RSI is a momentum indicator that ranges from 0 to 100.<ul><li>RSI &gt; 70: Overbought (market may be due for a pullback)</li><li>RSI &lt; 30: Oversold (market may be due for a rebound)</li><li>RSI between 30 and 70: Neutral (no strong directional bias).</li></ul>Typical values: Most of the time, RSI will be between 30 and 70. Extreme readings above 70 or below 30 are less common and signal potential reversals.</div></div>`;
}

function htmlRSIBlock(pathObj, maObj) {
  return `<div class="market-path-block">${htmlSectionHeader('Market "Path of Least Resistance"')}<div class="market-path-value">${pathObj.value} (RSI period: 14-day)</div>${htmlSourceBlock(pathObj.sourceName, pathObj.sourceUrl, pathObj.lastUpdated)}<div class="market-path-expl">Explanation: RSI is a 14-day lookback. 50-day MA: <b>${maObj.sma50.toFixed(2)}</b>, 200-day MA: <b>${maObj.sma200.toFixed(2)}</b>, SPY last: <b>${maObj.latest.toFixed(2)}</b>. ${maObj.latest > maObj.sma200 ? 'Above' : 'Below'} 200-day MA. ${maObj.latest > maObj.sma50 ? 'Above' : 'Below'} 50-day MA.</div></div>`;
}

function htmlForwardPETable(estimates, multiples, currentIndex) {
  let lines = [
    `<div class="forward-pe-block">`,
    `<h3>S&P 500 Forward EPS & Implied Index Targets</h3>`,
    `<table><thead><tr><th>Scenario</th><th>Year</th><th>Estimate Date</th><th>Forward EPS</th>` +
      multiples.map(m => `<th>${m}x</th><th>% vs Index</th>`).join('') + `<th>Source URL</th></tr></thead><tbody>`
  ];
  estimates.forEach(est => {
    // For now, label as 'Base' (can extend if multiple scenarios)
    const scenario = est.scenario || 'Base';
    lines.push(`<tr><td>${scenario}</td><td>${est.year}</td><td>${formatTimestamp(est.estimateDate || '')}</td><td><strong>$${est.eps.toFixed(2)}</strong></td>` +
      multiples.map(m => {
        const target = est.eps * m;
        const pct = currentIndex ? (((target - currentIndex) / currentIndex) * 100).toFixed(1) + '%' : '';
        return `<td>${target.toFixed(2)}</td><td>${pct}</td>`;
      }).join('') +
      `<td><a href="${est.url}">link</a></td></tr>`);
  });
  lines.push('</tbody></table></div>');
  return lines.join('\n');
}

function htmlHistoricalPEBlock(currentPE, pe5yr, pe10yr) {
  return `<div class="pe-history-block">
    <h3>Historical P/E Context</h3>
    <table><thead><tr><th>Current</th><th>5-Year Avg</th><th>10-Year Avg</th></tr></thead><tbody>
      <tr><td>${currentPE}</td><td>${pe5yr}</td><td>${pe10yr}</td></tr>
    </tbody></table>
    <div class="pe-history-note">Current P/E is ${(currentPE > pe5yr && currentPE > pe10yr) ? 'above' : 'near'} both 5- and 10-year averages.</div>
  </div>`;
}

function htmlStalenessWarning(lastUpdated, maxAgeDays, label) {
  if (!lastUpdated) return '';
  const now = new Date('2025-04-16T18:27:20-04:00'); // Use provided system time
  const updated = new Date(lastUpdated);
  const ageMs = now - updated;
  const ageDays = ageMs / (1000 * 60 * 60 * 24);
  if (ageDays > maxAgeDays) {
    return `<div class="stale-warning"><strong>Warning:</strong> ${label} data may be stale (last updated ${formatTimestamp(lastUpdated)})</div>`;
  }
  return '';
}

function htmlDataFreshnessTable(sections) {
  let lines = [
    '<div class="freshness-block"><h3>Data Freshness Summary</h3><table><thead><tr><th>Section</th><th>Last Updated</th><th>Source</th></tr></thead><tbody>'
  ];
  for (const s of sections) {
    lines.push(`<tr><td>${s.label}</td><td>${formatTimestamp(s.lastUpdated) || ''}</td><td>${s.sourceName || ''}</td></tr>`);
  }
  lines.push('</tbody></table></div>');
  return lines.join('\n');
}

function htmlETFDateConsistencyWarning(dates) {
  if (dates.length < 2) return '';
  const sorted = [...dates].map(d => new Date(d)).sort((a, b) => a - b);
  const maxDiffDays = (sorted[sorted.length - 1] - sorted[0]) / (1000 * 60 * 60 * 24);
  if (maxDiffDays > 2) {
    return `<div class="stale-warning"><strong>Warning:</strong> ETF holdings dates differ by more than 2 days across indices: ${dates.map(formatTimestamp).join(', ')}. Treat with caution.</div>`;
  }
  return '';
}

function formatTimestamp(ts) {
  if (!ts) return '';
  // Always output as 'YYYY-MM-DD HH:mm:ss UTC' (or local time if preferred)
  const d = new Date(ts);
  // Pad with zeros
  const pad = n => n.toString().padStart(2, '0');
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth()+1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())} UTC`;
}

const htmlHeader = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>S&P 500 Market Analyzer Report</title>
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; background: #fafbfc; color: #222; margin: 0; padding: 0; }
    .container { max-width: 800px; margin: 30px auto; background: #fff; border-radius: 12px; box-shadow: 0 4px 24px rgba(0,0,0,0.08); padding: 32px; }
    h1 { text-align: center; margin-bottom: 8px; }
    h2 { margin-top: 32px; color: #2a4d8f; }
    h3 { margin: 20px 0 10px 0; color: #1a2b47; }
    hr { border: none; border-top: 2px solid #e3e7ee; margin: 16px 0; }
    table { border-collapse: collapse; width: 100%; margin-bottom: 10px; }
    th, td { border: 1px solid #e3e7ee; padding: 8px 12px; text-align: left; }
    th { background: #f3f7fa; }
    .source-block { color: #555; font-size: 0.98em; margin: 10px 0 18px 0; }
    .eps { font-size: 1.2em; margin-bottom: 6px; }
    .market-path-value { font-size: 1.1em; margin-bottom: 8px; }
    .market-path-expl { font-size: 0.97em; color: #555; margin-top: 8px; }
    .holdings-block, .earnings-block, .market-path-block { margin-bottom: 32px; }
    .stale-warning { color: #f44336; font-size: 0.98em; margin: 10px 0 18px 0; }
    @media (max-width: 600px) { .container { padding: 8px; } th, td { font-size: 0.97em; } }
  </style>
</head>
<body>
  <div class="container">
    <h1>S&amp;P 500 Market Analyzer Report</h1>`;

const htmlFooter = `  </div>\n</body>\n</html>`;

async function main() {
  try {
    let html = htmlHeader;
    const freshnessSections = [];

    // 0. S&P 500 Index Anchor (always at top)
    const spxObj = await getSP500IndexPrice();
    html += `<div class="spx-index-block"><h2>Current S&P 500 Index Level</h2><div class="spx-index">${spxObj.price.toFixed(2)}</div><div class="source-block"><strong>Source:</strong> ${spxObj.sourceName}<br/><strong>URL:</strong> <a href="${spxObj.sourceUrl}">${spxObj.sourceUrl}</a><br/><strong>Last Update:</strong> ${formatTimestamp(spxObj.lastUpdated)}</div>${htmlStalenessWarning(spxObj.lastUpdated, 2, 'S&P 500 Index')}</div>`;
    freshnessSections.push({ label: 'S&P 500 Index', lastUpdated: spxObj.lastUpdated, sourceName: spxObj.sourceName });

    // 1. S&P 500 Trailing P/E
    const peObj = await getSP500PE();
    html += htmlSectionHeader('S&P 500 Trailing P/E Ratio');
    html += `<div class="pe-block">P/E: <strong>${peObj.value}</strong></div>`;
    html += htmlSourceBlock(peObj.sourceName, peObj.sourceUrl, peObj.lastUpdated);
    html += htmlStalenessWarning(peObj.lastUpdated, 35, 'Trailing P/E');
    freshnessSections.push({ label: 'Trailing P/E', lastUpdated: peObj.lastUpdated, sourceName: peObj.sourceName });

    // 1b. Historical P/E context (always present)
    html += htmlHistoricalPEBlock(peObj.value, 19.1, 17.6);

    // 2. S&P 500 Forward P/E Table (with scenario labels, dates, % moves)
    const forwardEstimates = await getForwardEpsEstimates();
    const forwardDate = forwardEstimates[0]?.estimateDate || spxObj.lastUpdated;
    html += htmlSectionHeader('S&P 500 Forward EPS & Implied Index Values (2025 & 2026)');
    html += htmlForwardPETable(forwardEstimates, [15, 17, 20], spxObj.price);
    html += htmlStalenessWarning(forwardDate, 10, 'Forward EPS');
    freshnessSections.push({ label: 'Forward EPS', lastUpdated: forwardDate, sourceName: forwardEstimates[0]?.source });

    // 3. Market Path (RSI + trend confirmation)
    const pathObj = await getMarketPath();
    const maObj = await getSPYMovingAverages();
    html += htmlRSIBlock(pathObj, maObj);
    html += htmlStalenessWarning(pathObj.lastUpdated, 2, 'RSI/Market Path');
    freshnessSections.push({ label: 'Market Path (RSI)', lastUpdated: pathObj.lastUpdated, sourceName: pathObj.sourceName });

    // 4. Top 5 Weighted Stocks in SPY, QQQ, DIA (with harmonized freshness check)
    const indices = [
      { symbol: 'SPY', name: 'S&P 500' },
      { symbol: 'QQQ', name: 'NASDAQ 100' },
      { symbol: 'DIA', name: 'Dow Jones 30' }
    ];
    const etfDates = [];
    for (const idx of indices) {
      const { holdings, sourceName, sourceUrl, lastUpdated } = await getTopHoldings(idx.symbol);
      html += htmlSectionHeader(`Top 5 Weighted Stocks in ${idx.name}`);
      html += htmlHoldingsBlock(idx.name, idx.symbol, holdings, sourceName, sourceUrl, lastUpdated);
      etfDates.push(lastUpdated);
      freshnessSections.push({ label: `${idx.symbol} Holdings`, lastUpdated, sourceName });
    }
    html += htmlETFDateConsistencyWarning(etfDates);

    // 5. S&P 500 Total Earnings (Trailing 12M)
    const earningsObj = await getSP500Earnings();
    html += htmlSectionHeader('S&P 500 Earnings Per Share (Trailing 12M)');
    html += htmlEarningsBlock(earningsObj, [15, 17, 20]);
    html += htmlStalenessWarning(earningsObj.lastUpdated, 35, 'Trailing EPS');
    freshnessSections.push({ label: 'Trailing EPS', lastUpdated: earningsObj.lastUpdated, sourceName: earningsObj.sourceName });

    // 6. Data freshness summary table (always present)
    html += htmlDataFreshnessTable(freshnessSections);

    html += htmlFooter;
    fs.writeFileSync('report.html', html, 'utf8');
    console.log('HTML report generated: report.html');
  } catch (err) {
    console.error(err);
  }
}

main();
