/**
 * Fundamental Metrics Module
 * Generates the Fundamental Metrics section of the Ghost post
 */

const { addHeading, addHTML } = require('../utils/mobiledoc-helpers');

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
 * Helper function to format currency values with commas
 * @param {string} value - The currency value to format
 * @returns {string} - Formatted currency value
 */
const formatCurrencyWithCommas = (value) => {
  if (!value) return 'N/A';
  
  // If the value already has a dollar sign, remove it
  const numericValue = value.replace(/^\$/, '');
  
  // Split by decimal point to handle dollars and cents separately
  const parts = numericValue.split('.');
  
  // Format the dollars part with commas
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  
  // Return with dollar sign and join back with decimal if it exists
  return '$' + (parts.length > 1 ? parts.join('.') : parts[0]);
};

/**
 * Creates a stock card HTML for a given stock
 * @param {object} stock - The stock data object
 * @returns {string} - The HTML for the stock card
 */
const createStockCard = (stock) => {
  const isPositive = parseFloat(stock.priceChange) >= 0;
  const color = isPositive ? '#10b981' : '#ef4444';
  const arrow = isPositive ? '▲' : '▼';
  const changePrefix = '';
  
  // Calculate the correct percentage change
  let percentChange;
  if (stock.price && stock.priceChange) {
    // Calculate percentage change based on price and priceChange
    const priceValue = parseFloat(stock.price);
    const changeValue = parseFloat(stock.priceChange);
    
    if (!isNaN(priceValue) && !isNaN(changeValue) && priceValue !== 0) {
      // Calculate percentage: (change / (price - change)) * 100
      const basePrice = priceValue - changeValue;
      if (basePrice !== 0) {
        const calculatedPercent = (changeValue / basePrice) * 100;
        percentChange = calculatedPercent.toFixed(2) + '%';
      } else {
        percentChange = '0.00%';
      }
    } else {
      percentChange = '0.00%';
    }
  } else if (typeof stock.percentChange === 'string' && stock.percentChange.includes('%')) {
    // If we can't calculate, but have a percentage string, clean it up
    const numericPart = parseFloat(stock.percentChange.replace('%', ''));
    if (!isNaN(numericPart)) {
      // Format to 2 decimal places
      percentChange = numericPart.toFixed(2) + '%';
    } else {
      percentChange = '0.00%';
    }
  } else if (typeof stock.percentChange === 'number') {
    // If it's a number, format it as percentage
    percentChange = stock.percentChange.toFixed(2) + '%';
  } else {
    percentChange = '0.00%';
  }
  
  // Get all metrics to display
  const metrics = stock.metrics || [];
  
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
          <div style="font-weight: bold; font-size: 0.95em; color: ${color}; margin-bottom: 2px; white-space: nowrap;">$${formatNumber(stock.price)} <span style="color: ${color};">${arrow}</span> <span style="color: ${color}; font-weight: normal;">$${formatNumber(Math.abs(stock.priceChange))}</span> <span style="color: ${color}; font-weight: normal;">(${percentChange})</span></div>
        </div>
      </div>
      <!-- Metrics Table -->
      <div style="padding: 10px 12px; background-color: white;">
        <table style="width: 100%; border-collapse: collapse; font-size: 0.9em;">
          <tbody>
            ${metrics.map(metric => {
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
};

/**
 * Adds the S&P 500 Analysis content
 * @param {object} data - The data object containing S&P 500 analysis information
 * @returns {string} - The HTML content for the S&P 500 Analysis section
 */
const addSP500AnalysisContent = (data) => {
  const sp500Data = data.sp500 || {};
  
  return `
    <div class="sp500-analysis-section" style="margin-bottom: 30px;">
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
                <tr style="background-color: #800020; text-align: center; font-weight: 600; color: white;">
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
                <tr style="background:#166534; text-align: center; font-weight: 600; color: white;">
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
        <div class="forward-eps-header label-col" style="font-weight: bold; font-size: clamp(1.1rem,2vw,1.25rem); margin-bottom: 15px; color: #1a365d; text-align: center;">S&P 500 Forward EPS & Implied Index Values</div>
        <div class="forward-eps-table" style="overflow-x:auto;">
          <table style="width:100%; border-collapse:separate; border-spacing:0 14px; background: #fff; margin-bottom: 10px; border-radius:10px; overflow:hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.04); font-size: clamp(0.95rem, 2vw, 1.05rem);">
            <thead>
              <tr style="background:#166534; text-align: center; font-weight: 600; color: white;">
                <th style="padding:16px 0 12px 0;">Annual Estimate</th>
                <th>Forward EPS</th>
                <th>15x</th>
                <th>17x</th>
                <th>20x</th>
              </tr>
            </thead>
            <tbody>
              ${data.sp500?.forwardEps?.map((item, index) => {
                return `
                  <tr style="text-align:center; background:#fff; border-bottom:1px solid #e5e7eb; color:#111;">
                    <td style="font-weight:bold; color:#111; font-size: 0.85rem;">${item.year}</td>
                    <td style="font-weight:bold; color:#111; font-size: 0.85rem;">${item.eps}</td>
                    <td style="color:#111; font-size: 0.85rem;">${formatCurrencyWithCommas(item.targetAt15x)} <span style="font-size: 0.75rem; color: ${parseFloat(item.percentVsIndex15x) >= 0 ? '#10b981' : '#ef4444'};">(${parseFloat(item.percentVsIndex15x) >= 0 ? '▲' : '▼'} ${Math.abs(parseFloat(item.percentVsIndex15x)).toFixed(2)}%)</span></td>
                    <td style="color:#111; font-size: 0.85rem;">${formatCurrencyWithCommas(item.targetAt17x)} <span style="font-size: 0.75rem; color: ${parseFloat(item.percentVsIndex17x) >= 0 ? '#10b981' : '#ef4444'};">(${parseFloat(item.percentVsIndex17x) >= 0 ? '▲' : '▼'} ${Math.abs(parseFloat(item.percentVsIndex17x)).toFixed(2)}%)</span></td>
                    <td style="color:#111; font-size: 0.85rem;">${formatCurrencyWithCommas(item.targetAt20x)} <span style="font-size: 0.75rem; color: ${parseFloat(item.percentVsIndex20x) >= 0 ? '#10b981' : '#ef4444'};">(${parseFloat(item.percentVsIndex20x) >= 0 ? '▲' : '▼'} ${Math.abs(parseFloat(item.percentVsIndex20x)).toFixed(2)}%)</span></td>
                  </tr>
                `;
              }).join('') || `
                <tr>
                  <td colspan="5" style="text-align: center; padding: 15px;">No forward EPS data available</td>
                </tr>
              `}
            </tbody>
          </table>
        </div>
        <div class="forward-eps-source" style="font-size: 10px; color: #888; margin-top: 8px; text-align: right;">
          Source: <a href="${data.sp500?.forwardEpsSource?.url || '#'}" target="_blank" style="color:#2563eb; text-decoration:underline;">${data.sp500?.forwardEpsSource?.name || 'S&P Global'}</a>, as of ${data.sp500?.forwardEpsSource?.asOf || data.sp500?.source?.asOf || 'N/A'}
        </div>
      </div>
    </div>
  `;
};

/**
 * Adds the Top Holdings content
 * @param {object} data - The data object
 * @returns {string} - HTML content
 */
const addTopHoldingsContent = (data) => {
  const topHoldings = data.sp500?.topHoldings || data.full?.topHoldings || [];
  
  return `
    <div class="top-holdings-section" style="margin-bottom: 30px;">
      <div style="background-color: white; border-radius: 8px; padding: 12px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); margin-bottom: 15px;">
        <div style="font-size: 1.1rem; font-weight: bold; color: #4a5568;">Top 5 Weighted Stocks in Major Indices</div>
      </div>
      
      <div class="etf-holdings-cards" style="display: flex; flex-direction: row; gap: 10px; justify-content: space-between; flex-wrap: wrap; width: 100%;">
        ${topHoldings.map(index => {
          return `
            <div class="etf-holding-card" style="flex: 1 1 calc(32% - 10px); min-width: 250px; max-width: 32%; background: #fff; border-radius: 10px; box-shadow: 0 1px 4px rgba(0,0,0,0.07); padding: 15px 12px 10px 12px; border-left: 5px solid #2563eb; display: flex; flex-direction: column; align-items: flex-start; margin-bottom: 10px;">
              <div style="font-weight: bold; font-size: clamp(0.95rem, 2vw, 1.05rem); margin-bottom: 4px;">${index.name} <span style="font-weight: normal; font-size: 0.9em; color: #666;">(${index.symbol})</span></div>
              <div style="margin-bottom: 10px; font-size: clamp(0.9rem, 2vw, 1rem); color: #444;">Top 5 Holdings:</div>
              <div style="display: flex; flex-direction: column; gap: 6px; width: 100%; margin-bottom: 10px;">
                ${index.holdings.map(holding => {
                  return `
                    <div style="display: flex; justify-content: space-between; align-items: center; background: #f8f9fa; border-radius: 4px; padding: 5px 6px;">
                      <span style="font-weight: bold; color: #2563eb; font-size: 0.85em;">${holding.symbol}</span>
                      <span style="flex: 1; margin-left: 8px; color: #222; font-size: 0.75em;">${holding.name}</span>
                      <span style="margin-left: 8px; color: #444; font-size: 0.75em;">${holding.weight}%</span>
                    </div>
                  `;
                }).join('')}
              </div>
              <div style="font-size: 10px; color: #888; margin-top: auto; text-align: right; width: 100%;">
                Source: <a href="${index.sourceUrl}" target="_blank" style="color:#2563eb; text-decoration:underline;">${index.source}</a>, as of ${index.asOf}
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;
};

/**
 * Generates the Major Indices content
 * @param {object} data - The data object containing market indicators information
 * @returns {string} - The HTML content for the Major Indices section
 */
const addMajorIndicesContent = (data) => {
  // Get major indices data from the data object
  const majorIndices = data.fundamentalMetrics?.majorIndices || [
    {
      symbol: "SPY",
      name: "SPDR S&P 500",
      price: 554.54,
      priceChange: 0.22,
      percentChange: "0.00%",
      metrics: [
        { name: "ROE", value: "0.00%" },
        { name: "Beta", value: "1.00" },
        { name: "Volume", value: "75.6M" },
        { name: "52W High", value: "$613.23" },
        { name: "52W Low", value: "$481.80" },
        { name: "Sector", value: "Financial Services" },
        { name: "Industry", value: "Asset Management" }
      ]
    },
    {
      symbol: "QQQ",
      name: "Invesco QQQ Trust, Series 1",
      price: 475.47,
      priceChange: -0.06,
      percentChange: "0.00%",
      metrics: [
        { name: "ROE", value: "0.00%" },
        { name: "Beta", value: "1.17" },
        { name: "Volume", value: "43.5M" },
        { name: "52W High", value: "$540.81" },
        { name: "52W Low", value: "$402.39" },
        { name: "Sector", value: "Financial Services" },
        { name: "Industry", value: "Asset Management" }
      ]
    },
    {
      symbol: "DIA",
      name: "SPDR Dow Jones Industrial Average ETF",
      price: 406.34,
      priceChange: 1.13,
      percentChange: "0.00%",
      metrics: [
        { name: "Volume", value: "2.5M" },
        { name: "52W High", value: "$451.55" },
        { name: "52W Low", value: "$366.32" }
      ]
    },
    {
      symbol: "IWM",
      name: "iShares Russell 2000 ETF",
      price: 194.86,
      priceChange: -1.23,
      percentChange: "0.00%",
      metrics: [
        { name: "ROE", value: "0.00%" },
        { name: "Beta", value: "1.17" },
        { name: "Volume", value: "28.7M" },
        { name: "52W High", value: "$244.98" },
        { name: "52W Low", value: "$171.73" },
        { name: "Sector", value: "Financial Services" },
        { name: "Industry", value: "Asset Management" }
      ]
    }
  ];
  
  return `
    <div class="major-indices-section" style="margin-bottom: 30px;">
      <div style="background-color: white; border-radius: 8px; padding: 12px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); margin-bottom: 15px;">
        <div style="font-size: 1.1rem; font-weight: bold; color: #4a5568;">Major Indices</div>
      </div>
      
      <div class="stock-cards-container" style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; justify-content: center; margin-bottom: 20px;">
        ${majorIndices.map(index => createStockCard(index)).join('')}
      </div>
    </div>
  `;
};

/**
 * Generates the Magnificent Seven content
 * @param {object} data - The data object containing stock information
 * @returns {string} - The HTML content for the Magnificent Seven section
 */
const addMagnificentSevenContent = (data) => {
  // Get Magnificent Seven data from the data object
  const magnificentSeven = data.fundamentalMetrics?.magnificentSeven || [];
  
  if (magnificentSeven.length === 0) {
    return '';
  }
  
  return `
    <div class="magnificent-seven-section" style="margin-bottom: 30px;">
      <div style="background-color: white; border-radius: 8px; padding: 12px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); margin-bottom: 15px;">
        <div style="font-size: 1.1rem; font-weight: bold; color: #4a5568;">Magnificent Seven</div>
      </div>
      
      <div class="stock-cards-container" style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; justify-content: center; margin-bottom: 20px;">
        ${magnificentSeven.map(stock => createStockCard(stock)).join('')}
      </div>
    </div>
  `;
};

/**
 * Generates the Other Stocks content
 * @param {object} data - The data object containing stock information
 * @returns {string} - The HTML content for the Other Stocks section
 */
const addOtherStocksContent = (data) => {
  // Get Other Stocks data from the data object
  const otherStocks = data.fundamentalMetrics?.otherStocks || [];
  
  if (otherStocks.length === 0) {
    return '';
  }
  
  return `
    <div class="other-stocks-section" style="margin-bottom: 30px;">
      <div style="background-color: white; border-radius: 8px; padding: 12px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); margin-bottom: 15px;">
        <div style="font-size: 1.1rem; font-weight: bold; color: #4a5568;">Other Stocks</div>
      </div>
      
      <div class="stock-cards-container" style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; justify-content: center; margin-bottom: 20px;">
        ${otherStocks.map(stock => createStockCard(stock)).join('')}
      </div>
    </div>
  `;
};

/**
 * Adds the Fundamental Metrics section to the mobiledoc
 * @param {object} mobiledoc - The mobiledoc object to add content to
 * @param {object} data - The data object containing fundamental metrics information
 */
const addFundamentalMetrics = (mobiledoc, data) => {
  // Skip adding the heading - remove h2 tag as requested
  // addHeading(mobiledoc, 'Fundamental Metrics', 2);
  
  // Add the content
  const html = `
    <div class="market-pulse-section fundamental-metrics-container" style="margin: 0; padding: 0; margin-top: 20px;">
      <div class="collapsible-section" data-section="fundamental-metrics">
        <div class="collapsible-header" style="background-color: #3182ce; padding: 15px; border-radius: 8px; display: flex; flex-direction: column; align-items: flex-start;">
          <div style="display: flex; justify-content: space-between; width: 100%; align-items: center;">
            <div style="margin: 0; font-size: 2rem; font-weight: bold; color: white;">Fundamental Metrics</div>
            <div class="collapsible-icon" style="font-size: 14px; color: white;">▼</div>
          </div>
          <div style="margin-top: 10px; line-height: 1.5; color: white; font-size: 1.2rem; font-weight: normal; text-align: center; width: 100%;">
            <span style="white-space: nowrap;">S&P 500: ${formatNumber(data.sp500?.indexLevel)}</span> | 
            <span style="white-space: nowrap;">P/E Ratio: ${formatNumber(data.sp500?.peRatio?.current)}</span> | 
            <span style="white-space: nowrap;">EPS (TTM): $${formatNumber(data.sp500?.eps?.ttm?.replace('$', ''))}</span>
          </div>
        </div>
        
        <!-- Collapsible Content -->
        <div class="collapsible-content" style="max-height: 0; overflow: hidden; transition: max-height 0.3s ease-out;">
          ${addSP500AnalysisContent(data)}
          ${addTopHoldingsContent(data)}
          ${addMajorIndicesContent(data)}
          ${addMagnificentSevenContent(data)}
          ${addOtherStocksContent(data)}
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
            if (content.style.maxHeight === '0px' || content.style.maxHeight === '') {
              content.style.maxHeight = '1000px';
              icon.style.transform = 'rotate(180deg)';
            } else {
              content.style.maxHeight = '0px';
              icon.style.transform = 'rotate(0deg)';
            }
          });
        });
      });
    </script>
  `;
  
  addHTML(mobiledoc, html);
};

module.exports = {
  addFundamentalMetrics
};
