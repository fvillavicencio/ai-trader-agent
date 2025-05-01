/**
 * Fundamental Metrics Module
 * Generates the Fundamental Metrics section of the Ghost post
 */

const { addHeading, addHTML, addDivider } = require('../utils/mobiledoc-helpers');

/**
 * Formats a number with commas for thousands
 * @param {number} num - The number to format
 * @returns {string} - The formatted number string
 */
const formatNumber = (num) => {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
};

/**
 * Formats a currency value
 * @param {number} value - The value to format
 * @returns {string} - The formatted currency string
 */
const formatCurrency = (value) => {
  if (value >= 1e12) {
    return `$${(value / 1e12).toFixed(2)}T`;
  } else if (value >= 1e9) {
    return `$${(value / 1e9).toFixed(2)}B`;
  } else if (value >= 1e6) {
    return `$${(value / 1e6).toFixed(2)}M`;
  } else {
    return `$${formatNumber(value)}`;
  }
};

/**
 * Adds the Fundamental Metrics section to the mobiledoc
 * @param {object} mobiledoc - The mobiledoc object to add content to
 * @param {object} data - The data object containing fundamental metrics information
 */
const addFundamentalMetrics = (mobiledoc, data) => {
  // Add section heading
  addHeading(mobiledoc, 'Fundamental Metrics', 2);
  
  // Create the collapsible section with a blue background
  const fundamentalMetricsHtml = `
    <div class="market-pulse-section fundamental-metrics-container" style="margin-bottom: 20px;">
      <div class="collapsible-section" style="border: 1px solid #e2e8f0; border-radius: 6px; overflow: hidden; width: 100%;">
        <!-- Section Header with blue background -->
        <div class="collapsible-header" style="display: flex; justify-content: space-between; align-items: center; padding: 15px 20px; background-color: #3182ce; color: white; cursor: pointer; width: 100%;">
          <div class="collapsible-title" style="font-weight: bold; font-size: clamp(1.1rem, 3vw, 1.25rem); color: white;">Fundamental Metrics</div>
          <div class="collapsible-icon" style="font-size: 1.25rem; transition: transform 0.3s ease; color: white;">▼</div>
        </div>
        
        <!-- Collapsible Content -->
        <div class="collapsible-content" style="display: none; padding: 15px; background-color: #f8f9fa;">
          <!-- S&P 500 Analysis -->
          ${addSP500AnalysisContent(data)}
          
          <!-- Top Holdings -->
          ${addTopHoldingsContent(data)}
          
          <!-- Stock Cards -->
          ${addStockCardsContent(data)}
        </div>
      </div>
    </div>
    
    <script>
      // Add click event to toggle collapsible sections
      document.addEventListener('DOMContentLoaded', function() {
        const headers = document.querySelectorAll('.collapsible-header');
        headers.forEach(header => {
          header.addEventListener('click', function() {
            const content = this.nextElementSibling;
            const icon = this.querySelector('.collapsible-icon');
            
            // Toggle display
            if (content.style.display === 'none' || content.style.display === '') {
              content.style.display = 'block';
              icon.style.transform = 'rotate(180deg)';
            } else {
              content.style.display = 'none';
              icon.style.transform = 'rotate(0deg)';
            }
          });
        });
      });
    </script>
  `;
  
  addHTML(mobiledoc, fundamentalMetricsHtml);
};

/**
 * Generates the S&P 500 Analysis content
 * @param {object} data - The data object containing S&P 500 analysis information
 * @returns {string} - The HTML content for the S&P 500 Analysis section
 */
const addSP500AnalysisContent = (data) => {
  if (!data.sp500) return '';
  
  const sp500 = data.sp500;
  
  return `
    <div class="sp500-analysis-section" style="margin-bottom: 20px;">
      <h3 style="color: #333; border-bottom: 1px solid #eee; padding-bottom: 10px; margin-top: 0; text-align: center; font-size: 1.5rem;">S&P 500 Analysis</h3>
      
      <div class="row" style="display: flex; flex-direction: row; gap: 12px; justify-content: flex-start; align-items: stretch; margin-bottom: 24px; flex-wrap: wrap;">
        <!-- Current S&P 500 Index Level -->
        <div class="index-card" style="flex:1.15; min-width:220px; max-width:100%; display:flex; flex-direction:column; align-items:center; justify-content:center; background-color: #f9f9f9; border-radius: 6px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); margin-right:8px; gap:0; width:100%; position: relative; padding-bottom: 20px; border: 1px solid #e2e8f0;">
          <div class="index-card-header" style="font-weight: 700; font-size: clamp(1rem,2vw,1.1rem); color: #1e293b; margin-bottom: 14px; text-align:center; letter-spacing:0.01em;">Current S&P 500 Index Level</div>
          <div class="index-card-value" style="font-size: clamp(2rem, 5vw, 2.4em); font-weight: bold; color: #2563eb; letter-spacing:0.01em; line-height:1; margin-bottom: 7px;">${sp500.indexLevel.toFixed(2)}</div>
          <div class="index-card-source" style="font-size: 10px; color: #888; position: absolute; bottom: 6px; right: 10px; line-height:1.35;">
            Source: <a href="${sp500.sourceUrl}" target="_blank" style="color:#2563eb; text-decoration:underline;">${sp500.source.name}</a>, as of ${sp500.asOf}
          </div>
        </div>
      
        <!-- S&P 500 Trailing P/E Ratio -->
        <div class="pe-card" style="flex:1; min-width:220px; background-color: #f9f9f9; border-radius: 6px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); padding: 20px 24px 18px 24px; display: flex; flex-direction: column; justify-content: center; border: 1px solid #e2e8f0; max-width:100%; width:100%; position: relative; padding-bottom: 24px;">
          <div class="pe-card-header" style="font-weight: bold; font-size: clamp(1rem,2vw,1.1rem); margin-bottom: 8px;">S&P 500 Trailing P/E Ratio</div>
          <div class="pe-card-table" style="overflow-x:auto;">
            <table style="width: 100%; border-collapse:separate; border-spacing:0 14px; background: #fff; margin-bottom: 10px; border-radius:10px; overflow:hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.04); font-size: clamp(0.95rem, 2vw, 1.05rem);">
              <thead>
                <tr style="background:#4B2991; text-align:center; font-weight:600; color:#fff; font-size:0.9em;">
                  <th style="padding:16px 0 12px 0;">Current</th>
                  <th>5-Year Avg</th>
                  <th>10-Year Avg</th>
                </tr>
              </thead>
              <tbody>
                <tr style="text-align:center; background:#fff; border-bottom:1px solid #e5e7eb; color:#111;">
                  <td style="font-weight:bold; color:#111; font-size: 0.85rem;">${sp500.peRatio.current.toFixed(2)}</td>
                  <td style="color:#111; font-size: 0.85rem;">${sp500.peRatio.fiveYearAvg.toFixed(2)}</td>
                  <td style="color:#111; font-size: 0.85rem;">${sp500.peRatio.tenYearAvg.toFixed(2)}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div class="pe-card-source" style="font-size: 10px; color: #888; position: absolute; bottom: 6px; right: 10px; line-height:1.35;">
            Source: <a href="${sp500.peRatio.sourceUrl}" target="_blank" style="color:#2563eb; text-decoration:underline;">${sp500.peRatio.source}</a>, as of ${sp500.peRatio.asOf}
          </div>
        </div>
      </div>

      <!-- S&P 500 Earnings Per Share (Trailing 12M) -->
      <div class="earnings-container" style="margin-bottom: 15px; padding: 28px 32px; background-color: white; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
        <div class="earnings-header label-col" style="font-weight: bold; font-size: clamp(1.1rem,2vw,1.25rem); margin-bottom: 15px; color: #1a365d; text-align: center;">S&P 500 Earnings Per Share (Trailing 12M)</div>
        <div class="earnings-table" style="overflow-x:auto;">
          <table style="width:100%; border-collapse:separate; border-spacing:0 14px; background: #fff; margin-bottom: 10px; border-radius:10px; overflow:hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.04); font-size: clamp(0.95rem, 2vw, 1.05rem);">
            <thead>
              <tr style="background:#B91C1C; text-align:center; font-weight:600; color:#fff; font-size:0.9em;">
                <th style="padding:16px 0 12px 0;">S&P 500 EPS (TTM)</th>
                <th>Target at 15x</th>
                <th>Target at 17x</th>
                <th>Target at 20x</th>
              </tr>
            </thead>
            <tbody>
              <tr style="text-align:center; background:#fff; border-bottom:1px solid #e5e7eb; color:#111;">
                <td style="font-weight:bold; color:#111; font-size: 0.85rem;">${sp500.eps.ttm}</td>
                <td style="color:#111; font-size: 0.85rem;">${sp500.eps.targetAt15x}</td>
                <td style="color:#111; font-size: 0.85rem;">${sp500.eps.targetAt17x}</td>
                <td style="color:#111; font-size: 0.85rem;">${sp500.eps.targetAt20x}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="earnings-source" style="font-size: 10px; color: #888; margin-top: 8px; text-align: right;">
          Source: <a href="${sp500.eps.sourceUrl}" target="_blank" style="color:#2563eb; text-decoration:underline;">${sp500.eps.source}</a>, as of ${sp500.eps.asOf}
        </div>
      </div>
    </div>
  `;
};

/**
 * Generates the Top Holdings content
 * @param {object} data - The data object containing top holdings information
 * @returns {string} - The HTML content for the Top Holdings section
 */
const addTopHoldingsContent = (data) => {
  if (!data.sp500 || !data.sp500.topHoldings || data.sp500.topHoldings.length === 0) return '';
  
  const topHoldings = data.sp500.topHoldings;
  
  return `
    <div class="top-holdings-section" style="margin-bottom: 20px;">
      <h3 style="color: #333; border-bottom: 1px solid #eee; padding-bottom: 10px; margin-top: 20px; text-align: center; font-size: 1.5rem;">Top Holdings</h3>
      
      ${topHoldings.map(index => {
        return `
          <div class="index-holdings" style="margin-bottom: 20px;">
            <div style="font-weight: bold; font-size: 1.1rem; margin-bottom: 10px;">${index.name} (${index.symbol})</div>
            <div class="holdings-table" style="overflow-x:auto;">
              <table style="width: 100%; border-collapse: collapse; font-size: 0.9rem;">
                <thead>
                  <tr style="background-color: #f1f5f9;">
                    <th style="padding: 8px; text-align: left; border-bottom: 1px solid #e2e8f0;">Symbol</th>
                    <th style="padding: 8px; text-align: left; border-bottom: 1px solid #e2e8f0;">Name</th>
                    <th style="padding: 8px; text-align: right; border-bottom: 1px solid #e2e8f0;">Weight (%)</th>
                  </tr>
                </thead>
                <tbody>
                  ${index.holdings.map(holding => {
                    return `
                      <tr>
                        <td style="padding: 8px; text-align: left; border-bottom: 1px solid #e2e8f0; font-weight: bold;">${holding.symbol}</td>
                        <td style="padding: 8px; text-align: left; border-bottom: 1px solid #e2e8f0;">${holding.name}</td>
                        <td style="padding: 8px; text-align: right; border-bottom: 1px solid #e2e8f0;">${holding.weight.toFixed(2)}%</td>
                      </tr>
                    `;
                  }).join('')}
                </tbody>
              </table>
            </div>
            <div style="font-size: 10px; color: #888; margin-top: 5px; text-align: right;">
              Source: <a href="${index.sourceUrl}" target="_blank" style="color:#2563eb; text-decoration:underline;">${index.source}</a>, as of ${index.asOf}
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
};

/**
 * Generates the Stock Cards content
 * @param {object} data - The data object containing stock information
 * @returns {string} - The HTML content for the Stock Cards section
 */
const addStockCardsContent = (data) => {
  if (!data.stocks || !data.stocks.magnificentSeven || data.stocks.magnificentSeven.length === 0) return '';
  
  const magnificentSeven = data.stocks.magnificentSeven;
  
  return `
    <div class="stocks-section" style="margin-bottom: 20px;">
      <h3 style="margin-top: 30px; color: #333; border-bottom: 1px solid #eee; padding-bottom: 10px; text-align: center; font-size: 1.5rem;">Magnificent Seven</h3>
      <div class="stocks-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 12px 20px; align-items: stretch; justify-items: stretch;">
        ${magnificentSeven.map(stock => {
          const isPositive = parseFloat(stock.priceChange) >= 0;
          const color = isPositive ? '#4CAF50' : '#f44336';
          const arrow = isPositive ? '↑' : '↓';
          
          return `
            <div class="stock-card" style="border-radius: 6px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1); width: 100%; min-width: 100%;">
              <div style="display: flex; justify-content: space-between; align-items: flex-start; padding: 10px 12px; background-color: #f8f9fa;">
                <!-- Left: Symbol and Company Name -->
                <div style="display: flex; flex-direction: column; align-items: flex-start; min-width: 130px;">
                  <div style="font-weight: bold; font-size: 16px; color: #000; letter-spacing: 0.5px;">${stock.symbol}</div>
                  <div style="font-size: 11px; font-style: italic; color: #555; font-weight: normal; margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 150px;">${stock.name}</div>
                </div>
                <!-- Right: Price, Arrow, Price Change, Percent Change (single line) -->
                <div style="display: flex; flex-direction: column; align-items: flex-end; min-width: 130px;">
                  <div style="font-weight: bold; font-size: 0.95em; color: ${color}; margin-bottom: 2px; white-space: nowrap;">$${stock.price.toFixed(2)} <span style="color: ${color};">${arrow}</span> <span style="color: ${color}; font-weight: normal;">$${Math.abs(stock.priceChange).toFixed(2)}</span> <span style="color: ${color}; font-weight: normal;">(${stock.percentChange})</span></div>
                </div>
              </div>
              <!-- Metrics Table -->
              <div style="padding: 10px 12px; background-color: white;">
                <table style="width: 100%; border-collapse: collapse; font-size: 0.9em;">
                  <tbody>
                    ${stock.metrics.slice(0, 4).map(metric => {
                      return `
                        <tr>
                          <td style="color: #777; padding: 4px 10px 4px 0; text-align: left;">${metric.name}</td>
                          <td style="font-weight: bold; color: #222; padding: 4px 0; text-align: right;">
                            ${metric.value}
                          </td>
                        </tr>
                      `;
                    }).join('')}
                  </tbody>
                </table>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;
};

module.exports = {
  addFundamentalMetrics
};
