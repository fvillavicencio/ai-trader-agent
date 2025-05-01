/**
 * Fundamental Metrics Module
 * Generates the Fundamental Metrics section of the Ghost post
 */

const { addHeading, addHTML, addDivider } = require('../utils/mobiledoc-helpers');

/**
 * Formats a number with commas for thousands and fixed decimal places
 * @param {number|string} value - The number to format
 * @param {number} decimals - Number of decimal places
 * @returns {string} - Formatted number string
 */
const formatNumber = (value, decimals = 2) => {
  if (value === undefined || value === null || value === '') return 'N/A';
  
  // Remove any existing commas and dollar signs
  const cleanValue = typeof value === 'string' 
    ? value.replace(/[$,]/g, '') 
    : value.toString();
  
  // Parse as float and check if it's a valid number
  const num = parseFloat(cleanValue);
  if (isNaN(num)) return 'N/A';
  
  // Format with commas and fixed decimal places
  return num.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
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
    <div class="collapsible-section" style="border: 1px solid #e2e8f0; border-radius: 6px; overflow: hidden; width: 100%; margin-bottom: 20px;">
      <!-- Section Header with blue background -->
      <div class="collapsible-header" style="background-color: #3182ce; padding: 15px; border-radius: 8px; display: flex; flex-direction: column; align-items: flex-start;">
        <div style="display: flex; justify-content: space-between; width: 100%; align-items: center;">
          <h2 style="margin: 0; font-size: 1.5rem; font-weight: bold; color: white;">Fundamental Metrics</h2>
          <div class="collapsible-icon" style="font-size: 14px; color: white;">▼</div>
        </div>
        <div style="margin-top: 10px; line-height: 1.5; color: white; font-size: 1rem; font-weight: normal; text-align: center; width: 100%;">
          <span style="white-space: nowrap;">S&P 500: ${formatNumber(data.sp500?.indexLevel)}</span> | 
          <span style="white-space: nowrap;">P/E Ratio: ${formatNumber(data.sp500?.peRatio?.current)}</span> | 
          <span style="white-space: nowrap;">EPS (TTM): $${formatNumber(data.sp500?.eps?.ttm?.replace('$', ''))}</span>
        </div>
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
 * Adds the S&P 500 Analysis content
 * @param {object} data - The data object containing S&P 500 analysis information
 * @returns {string} - The HTML content for the S&P 500 Analysis section
 */
const addSP500AnalysisContent = (data) => {
  const sp500Data = data.sp500 || {};
  
  return `
    <div class="sp500-analysis-section" style="margin-bottom: 20px;">
      <div style="background-color: white; border-radius: 8px; padding: 12px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); margin-bottom: 15px;">
        <div style="font-size: 1.1rem; font-weight: bold; color: #4a5568;">S&P 500 Analysis</div>
      </div>
      
      <div class="row" style="display: flex; flex-direction: row; gap: 12px; justify-content: flex-start; align-items: stretch; margin-bottom: 24px; flex-wrap: wrap;">
        <!-- Current S&P 500 Index Level -->
        <div class="index-card" style="flex:1.15; min-width:280px; max-width:100%; display:flex; flex-direction:column; align-items:center; justify-content:center; background-color: #f9f9f9; border-radius: 6px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); margin-right:8px; gap:0; width:100%; position: relative; padding: 20px 15px; border: 1px solid #e2e8f0;">
          <div class="index-card-header" style="font-weight: 700; font-size: clamp(1rem,2vw,1.1rem); color: #1e293b; margin-bottom: 14px; text-align:center; letter-spacing:0.01em;">Current S&P 500 Index Level</div>
          <div class="index-card-value" style="font-size: clamp(2rem, 5vw, 2.4em); font-weight: bold; color: #2563eb; letter-spacing:0.01em; line-height:1; margin-bottom: 7px;">${formatNumber(sp500Data.indexLevel)}</div>
          <div class="index-card-source" style="font-size: 10px; color: #888; width: 100%; text-align: right; margin-top: 15px; line-height:1.35;">
            Source: <a href="https://finance.yahoo.com/quote/%5EGSPC/" target="_blank" style="color:#2563eb; text-decoration:underline;">Yahoo Finance</a>, as of ${sp500Data.asOf || 'N/A'}
          </div>
        </div>
      
        <!-- S&P 500 Trailing P/E Ratio -->
        <div class="pe-card" style="flex:1; min-width:280px; background-color: #f9f9f9; border-radius: 6px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); padding: 15px; display: flex; flex-direction: column; justify-content: center; border: 1px solid #e2e8f0; max-width:100%; width:100%; position: relative;">
          <div style="font-weight: 700; font-size: clamp(1rem,2vw,1.1rem); color: #1e293b; margin-bottom: 15px; text-align:center;">S&P 500 Trailing P/E Ratio</div>
          
          <div style="overflow-x: auto;">
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 10px;">
              <thead>
                <tr style="background-color: #4B2991; text-align: center; font-weight: 600; color: white;">
                  <th style="padding: 12px 8px; white-space: nowrap;">Current</th>
                  <th style="padding: 12px 8px; white-space: nowrap;">5-Year Avg</th>
                  <th style="padding: 12px 8px; white-space: nowrap;">10-Year Avg</th>
                </tr>
              </thead>
              <tbody>
                <tr style="text-align: center; background: white;">
                  <td style="padding: 15px 8px; font-weight: bold; font-size: 1.25rem;">${formatNumber(sp500Data.peRatio?.current)}</td>
                  <td style="padding: 15px 8px; font-size: 1.25rem;">${formatNumber(sp500Data.peRatio?.fiveYearAvg)}</td>
                  <td style="padding: 15px 8px; font-size: 1.25rem;">${formatNumber(sp500Data.peRatio?.tenYearAvg)}</td>
                </tr>
              </tbody>
            </table>
          </div>
          
          <div style="font-size: 10px; color: #888; width: 100%; text-align: right; margin-top: 5px;">
            Source: <a href="${sp500Data.peRatio?.sourceUrl || 'https://finance.yahoo.com/quote/%5EGSPC/'}" target="_blank" style="color:#2563eb; text-decoration:underline;">${sp500Data.peRatio?.source || 'Yahoo Finance'}</a>, as of ${sp500Data.peRatio?.asOf || sp500Data.asOf || 'N/A'}
          </div>
        </div>
      </div>
      
      <!-- EPS Information -->
      <div class="row" style="display: flex; flex-direction: row; gap: 12px; justify-content: flex-start; align-items: stretch; flex-wrap: wrap;">
        <!-- EPS Card -->
        <div class="eps-card" style="flex:1; min-width:280px; background-color: #f9f9f9; border-radius: 6px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); padding: 15px; display: flex; flex-direction: column; justify-content: center; border: 1px solid #e2e8f0; max-width:100%; width:100%; position: relative;">
          <div style="font-weight: 700; font-size: clamp(1rem,2vw,1.1rem); color: #1e293b; margin-bottom: 15px; text-align:center;">S&P 500 Earnings Per Share (Trailing 12M)</div>
          
          <div style="overflow-x: auto;">
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 10px;">
              <thead>
                <tr style="background-color: #B91C1C; text-align: center; font-weight: 600; color: white;">
                  <th style="padding: 12px 8px; white-space: nowrap;">S&P 500 EPS (TTM)</th>
                  <th style="padding: 12px 8px; white-space: nowrap;">Target at 15x</th>
                  <th style="padding: 12px 8px; white-space: nowrap;">Target at 17x</th>
                  <th style="padding: 12px 8px; white-space: nowrap;">Target at 20x</th>
                </tr>
              </thead>
              <tbody>
                <tr style="text-align: center; background: white;">
                  <td style="padding: 15px 8px; font-weight: bold; font-size: 1.25rem;">$${formatNumber(sp500Data.eps?.ttm?.replace('$', ''))}</td>
                  <td style="padding: 15px 8px; font-size: 1.25rem;">$${formatNumber(sp500Data.eps?.targetAt15x?.replace('$', ''))}</td>
                  <td style="padding: 15px 8px; font-size: 1.25rem;">$${formatNumber(sp500Data.eps?.targetAt17x?.replace('$', ''))}</td>
                  <td style="padding: 15px 8px; font-size: 1.25rem;">$${formatNumber(sp500Data.eps?.targetAt20x?.replace('$', ''))}</td>
                </tr>
              </tbody>
            </table>
          </div>
          
          <div style="font-size: 10px; color: #888; width: 100%; text-align: right; margin-top: 5px;">
            Source: <a href="${sp500Data.eps?.sourceUrl || 'https://finance.yahoo.com/quote/%5EGSPC/'}" target="_blank" style="color:#2563eb; text-decoration:underline;">${sp500Data.eps?.source || 'Yahoo Finance'}</a>, as of ${sp500Data.eps?.asOf || sp500Data.asOf || 'N/A'}
          </div>
        </div>
      </div>
      
      <!-- S&P 500 Forward EPS & Implied Index Values -->
      <div class="forward-eps-container" style="margin: 20px 0; padding: 28px 32px; background-color: white; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
        <div class="forward-eps-header label-col" style="font-weight: bold; font-size: clamp(1.1rem,2vw,1.25rem); margin-bottom: 15px; color: #1a365d; text-align: center;">S&P 500 Forward EPS & Implied Index Values (2025 & 2026)</div>
        <div class="forward-eps-table" style="overflow-x:auto;">
          <table style="width:100%; border-collapse:separate; border-spacing:0 14px; background: #fff; margin-bottom: 10px; border-radius:10px; overflow:hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.04); font-size: clamp(0.95rem, 2vw, 1.05rem);">
            <thead>
              <tr style="background:#166534; text-align:center; font-weight:600; color:#fff; font-size:0.9em;">
                <th style="padding:16px 0 12px 0;">Annual Estimate</th>
                <th>Forward EPS</th>
                <th>15x</th>
                <th>% vs Index</th>
                <th>17x</th>
                <th>% vs Index</th>
                <th>20x</th>
                <th>% vs Index</th>
              </tr>
            </thead>
            <tbody>
              ${data.sp500?.forwardEps?.map((item, index) => {
                return `
                  <tr style="text-align:center; background:#fff; border-bottom:1px solid #e5e7eb; color:#111;">
                    <td style="font-weight:bold; color:#111; font-size: 0.85rem;">${item.year}</td>
                    <td style="font-weight:bold; color:#111; font-size: 0.85rem;">${item.eps}</td>
                    <td style="color:#111; font-size: 0.85rem;">${item.targetAt15x}</td>
                    <td style="color:#111; font-size: 0.85rem;">${item.percentVsIndex15x}%</td>
                    <td style="color:#111; font-size: 0.85rem;">${item.targetAt17x}</td>
                    <td style="color:#111; font-size: 0.85rem;">${item.percentVsIndex17x}%</td>
                    <td style="color:#111; font-size: 0.85rem;">${item.targetAt20x}</td>
                    <td style="color:#111; font-size: 0.85rem;">${item.percentVsIndex20x}%</td>
                  </tr>
                `;
              }).join('') || `
                <tr>
                  <td colspan="8" style="text-align: center; padding: 15px;">No forward EPS data available</td>
                </tr>
              `}
            </tbody>
          </table>
        </div>
        <div class="forward-eps-source" style="font-size: 10px; color: #888; margin-top: 8px; text-align: right;">
          Source: <a href="${data.sp500?.forwardEpsSource?.url || '#'}" target="_blank" style="color:#2563eb; text-decoration:underline;">${data.sp500?.forwardEpsSource?.name || 'S&P Global'}</a>, as of ${data.sp500?.forwardEpsSource?.asOf || 'N/A'}
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
  const topHoldings = data.full?.topHoldings || [];
  
  return `
    <div class="top-holdings-section" style="margin-bottom: 20px;">
      <h3 style="color: #333; border-bottom: 1px solid #eee; padding-bottom: 10px; margin-top: 0; text-align: center; font-size: 1.5rem;">S&P 500 Top Holdings</h3>
      
      <div class="top-holdings-table-container" style="overflow-x: auto; margin-bottom: 10px;">
        <table style="width: 100%; border-collapse: collapse; min-width: 600px;">
          <thead>
            <tr style="background-color: #f1f5f9;">
              <th style="padding: 10px; text-align: left; border-bottom: 1px solid #e2e8f0; font-weight: 600; color: #334155;">Company</th>
              <th style="padding: 10px; text-align: right; border-bottom: 1px solid #e2e8f0; font-weight: 600; color: #334155;">Weight</th>
              <th style="padding: 10px; text-align: right; border-bottom: 1px solid #e2e8f0; font-weight: 600; color: #334155;">Price</th>
              <th style="padding: 10px; text-align: right; border-bottom: 1px solid #e2e8f0; font-weight: 600; color: #334155;">Change</th>
              <th style="padding: 10px; text-align: right; border-bottom: 1px solid #e2e8f0; font-weight: 600; color: #334155;">Market Cap</th>
            </tr>
          </thead>
          <tbody>
            ${topHoldings.slice(0, 10).map((holding, index) => {
              const changeColor = parseFloat(holding.change) >= 0 ? '#10b981' : '#ef4444';
              const changePrefix = parseFloat(holding.change) >= 0 ? '+' : '';
              
              return `
                <tr style="background-color: ${index % 2 === 0 ? '#ffffff' : '#f8fafc'};">
                  <td style="padding: 10px; border-bottom: 1px solid #e2e8f0;">
                    <div style="font-weight: 500; color: #334155;">${holding.symbol}</div>
                    <div style="font-size: 0.85rem; color: #64748b;">${holding.name}</div>
                  </td>
                  <td style="padding: 10px; text-align: right; border-bottom: 1px solid #e2e8f0; color: #334155;">${holding.weight}%</td>
                  <td style="padding: 10px; text-align: right; border-bottom: 1px solid #e2e8f0; color: #334155;">$${formatNumber(holding.price)}</td>
                  <td style="padding: 10px; text-align: right; border-bottom: 1px solid #e2e8f0; color: ${changeColor};">${changePrefix}${formatNumber(holding.change)}%</td>
                  <td style="padding: 10px; text-align: right; border-bottom: 1px solid #e2e8f0; color: #334155;">${formatCurrency(holding.marketCap)}</td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
      
      <div style="font-size: 10px; color: #888; text-align: right;">
        Source: <a href="https://www.slickcharts.com/sp500" target="_blank" style="color:#2563eb; text-decoration:underline;">SlickCharts</a>, as of ${data.full?.topHoldings?.[0]?.asOf || 'N/A'}
      </div>
    </div>
  `;
};

/**
 * Generates the Stock Cards content
 * @param {object} data - The data object containing stock information
 * @returns {string} - The HTML content for the Stock Cards section
 */
const addStockCardsContent = (data) => {
  const magnificentSeven = data.full?.magnificentSeven || [];
  
  return `
    <div class="magnificent-seven-section" style="margin-bottom: 20px;">
      <h3 style="color: #333; border-bottom: 1px solid #eee; padding-bottom: 10px; margin-top: 0; text-align: center; font-size: 1.5rem;">Magnificent Seven</h3>
      
      <div class="stock-cards-container" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 15px;">
        ${magnificentSeven.map(stock => {
          const color = parseFloat(stock.priceChange) >= 0 ? '#10b981' : '#ef4444';
          const arrow = parseFloat(stock.priceChange) >= 0 ? '▲' : '▼';
          
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
                  <div style="font-weight: bold; font-size: 0.95em; color: ${color}; margin-bottom: 2px; white-space: nowrap;">$${formatNumber(stock.price)} <span style="color: ${color};">${arrow}</span> <span style="color: ${color}; font-weight: normal;">$${formatNumber(stock.priceChange)}</span> <span style="color: ${color}; font-weight: normal;">(${stock.percentChange})</span></div>
                </div>
              </div>
              <!-- Metrics Table -->
              <div style="padding: 10px 12px; background-color: white;">
                <table style="width: 100%; border-collapse: collapse; font-size: 0.9em;">
                  <tbody>
                    ${stock.metrics.slice(0, 4).map(metric => {
                      return `
                        <tr>
                          <td style="color: #777; padding: 4px 10px 4px 0; text-align: left; white-space: nowrap;">${metric.name}</td>
                          <td style="font-weight: bold; color: #222; padding: 4px 0; text-align: right; white-space: nowrap;">
                            ${formatNumber(metric.value)}
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
