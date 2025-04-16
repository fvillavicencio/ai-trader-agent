import dotenv from 'dotenv';
dotenv.config();
import { getSP500PE } from './services/sp500.js';
import { getTopHoldings } from './services/etf.js';
import { getSP500Earnings } from './services/earnings.js';
import { getMarketPath } from './services/technicals.js';
import fs from 'fs';

function htmlSectionHeader(title) {
  return `<h2>${title}</h2><hr/>`;
}

function htmlSourceBlock(sourceName, sourceUrl, lastUpdated) {
  return `<div class="source-block"><strong>Source:</strong> ${sourceName}<br/><strong>URL:</strong> <a href="${sourceUrl}">${sourceUrl}</a><br/><strong>Last Update:</strong> ${lastUpdated}</div>`;
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

    // 1. S&P 500 Forward P/E
    const peObj = await getSP500PE();
    html += htmlSectionHeader('S&P 500 Forward P/E Ratio');
    html += `<div class="pe-block">P/E: <strong>${peObj.value}</strong></div>`;
    html += htmlSourceBlock(peObj.sourceName, peObj.sourceUrl, peObj.lastUpdated);

    // 2. Market Path (RSI-based)
    const pathObj = await getMarketPath();
    html += htmlMarketPathBlock(pathObj);

    // 3. Top 5 Weighted Stocks in SPY, QQQ, DIA
    const indices = [
      { symbol: 'SPY', name: 'S&P 500' },
      { symbol: 'QQQ', name: 'NASDAQ 100' },
      { symbol: 'DIA', name: 'Dow Jones 30' }
    ];
    for (const idx of indices) {
      const { holdings, sourceName, sourceUrl, lastUpdated } = await getTopHoldings(idx.symbol);
      html += htmlSectionHeader(`Top 5 Weighted Stocks in ${idx.name}`);
      html += htmlHoldingsBlock(idx.name, idx.symbol, holdings, sourceName, sourceUrl, lastUpdated);
    }

    // 4. S&P 500 Total Earnings (Trailing 12M)
    const earningsObj = await getSP500Earnings();
    html += htmlSectionHeader('S&P 500 Earnings Per Share (Trailing 12M)');
    html += htmlEarningsBlock(earningsObj, [15, 17, 20]);

    html += htmlFooter;
    fs.writeFileSync('report.html', html, 'utf8');
    console.log('HTML report generated: report.html');
  } catch (err) {
    console.error(err);
  }
}

main();
