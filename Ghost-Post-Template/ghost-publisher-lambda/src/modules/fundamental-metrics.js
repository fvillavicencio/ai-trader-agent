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
        percentChange = Math.abs(calculatedPercent).toFixed(2) + '%';
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
      // Format to 2 decimal places and use absolute value to remove negative sign
      percentChange = Math.abs(numericPart).toFixed(2) + '%';
    } else {
      percentChange = '0.00%';
    }
  } else if (typeof stock.percentChange === 'number') {
    // If it's a number, format it as percentage using absolute value
    percentChange = Math.abs(stock.percentChange).toFixed(2) + '%';
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
        <table style="width: 100%; border-collapse: collapse; border: 0; font-size: 0.9em;">
          <tbody>
            ${metrics.map(metric => {
              return `
                <tr style="border: 0;">
                  <td style="color: #777; padding: 4px 10px 4px 0; text-align: left; border: 0;">${metric.name}</td>
                  <td style="font-weight: bold; color: #222; padding: 4px 0; text-align: right; border: 0;">
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
      
      <div class="sp500-snapshot-card" style="background-color: white; border-radius: 8px; padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); margin-bottom: 20px;">
        <h3 class="sp500-snapshot-title" style="font-size: 1.2rem; margin-bottom: 20px;">S&P 500 Market Snapshot</h3>
        
        <!-- Top row with key metrics -->
        <div class="sp500-snapshot-content" style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 30px; flex-wrap: wrap;">
          <!-- Index Level -->
          <div class="sp500-snapshot-item" style="flex: 1; min-width: 150px; text-align: center; padding: 0 10px;">
            <div style="font-size: 2.2rem; font-weight: bold; color: #333; margin-bottom: 5px;">${formatNumber(sp500Data.indexLevel)}</div>
            <div style="color: #666; font-size: 0.9rem;">Current Index Level</div>
          </div>
          
          <!-- P/E Ratio -->
          <div class="sp500-snapshot-item" style="flex: 1; min-width: 150px; text-align: center; padding: 0 10px; border-left: 1px solid #eee; border-right: 1px solid #eee;">
            <div style="font-size: 2.2rem; font-weight: bold; color: #2C9464; margin-bottom: 5px;">${formatNumber(sp500Data.peRatio?.current)}×</div>
            <div style="color: #666; font-size: 0.9rem;">Trailing P/E (TTM)</div>
            <div style="font-size: 0.8rem; color: #777; margin-top: 5px;">
              5-yr avg <strong>${formatNumber(sp500Data.peRatio?.fiveYearAvg)}×</strong> • 10-yr avg <strong>${formatNumber(sp500Data.peRatio?.tenYearAvg)}×</strong>
            </div>
          </div>
          
          <!-- EPS Value -->
          <div class="sp500-snapshot-item" style="flex: 1; min-width: 150px; text-align: center; padding: 0 10px;">
            <div style="font-size: 2.2rem; font-weight: bold; color: #2C9464; margin-bottom: 5px;">$${formatNumber(sp500Data.eps?.ttm?.replace('$', ''))}</div>
            <div style="color: #666; font-size: 0.9rem;">Trailing EPS (TTM)</div>
          </div>
        </div>
        
        <!-- P/E Ratio Trend Chart -->
        <div class="sp500-chart-container">
          <div style="font-size: 1rem; font-weight: 500; color: #444; margin-bottom: 15px; text-align: center;">P/E Ratio Trend (5-Year History)</div>
          <div style="text-align: center;">
            ${sp500Data.peRatioChartUrl ? 
              `<img src="${sp500Data.peRatioChartUrl}" alt="P/E ratio trend over 5 years" style="max-width: 100%; height: auto; border-radius: 4px;">` : 
              sp500Data.historicalPE ? 
                `<img src="https://image-charts.com/chart?cht=lc&chd=t:${sp500Data.historicalPE[0]},${sp500Data.historicalPE[1]},${sp500Data.historicalPE[2]},${sp500Data.historicalPE[3]},${sp500Data.historicalPE[4]},${sp500Data.peRatio?.current}&chxl=0:|2020|2021|2022|2023|2024|Current&chxt=x,y&chs=600x250&chf=bg,s,FFFFFF&chco=38a169&chm=o,38a169,0,-1,6&chds=20,30&chxr=1,20,30,2&chg=10,10,1,1,0,0,EEEEEE&chls=2" alt="P/E ratio trend over 5 years" style="max-width: 100%; height: auto; border-radius: 4px;">` : 
                `<img src="https://image-charts.com/chart?cht=lc&chd=t:22.5,23.7,25.2,26.6,24.8,24.7&chxl=0:|2020|2021|2022|2023|2024|Current&chxt=x,y&chs=600x250&chf=bg,s,FFFFFF&chco=38a169&chm=o,38a169,0,-1,6&chds=20,30&chxr=1,20,30,2&chg=10,10,1,1,0,0,EEEEEE&chls=2" alt="P/E ratio trend over 5 years" style="max-width: 100%; height: auto; border-radius: 4px;">`
            }
          </div>
        </div>
        
        <!-- Source info -->
        <div style="font-size: 10px; color: #888; text-align: right; margin-top: 15px;">
          Source: <a href="${sp500Data.sourceUrl || 'https://finance.yahoo.com/quote/%5EGSPC/'}" target="_blank" style="color:#2563eb; text-decoration:underline;">${sp500Data.source?.name || 'Yahoo Finance'}</a>, as of ${sp500Data.asOf || 'N/A'}
        </div>
      </div>
      
      <!-- S&P 500 Forward EPS & Implied Index Values -->
      <div class="forward-eps-container" style="margin: 20px 0; padding: 28px 32px; background-color: white; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
        <div class="forward-eps-header label-col" style="font-weight: bold; font-size: clamp(1.1rem,2vw,1.25rem); margin-bottom: 15px; color: #1a365d; text-align: center;">S&P 500 Forward EPS & Implied Index Values</div>
        <div style="overflow-x: auto; -webkit-overflow-scrolling: touch; max-width: 100%;">
          <table style="width: 100%; min-width: 400px; border-collapse: collapse; margin-bottom: 10px;">
            <thead>
              <tr style="background-color: #0c6e3d; text-align: center; font-weight: 600; color: white;">
                <th style="padding: 12px 8px; white-space: nowrap;">Annual Estimate</th>
                <th style="padding: 12px 8px; white-space: nowrap;">Forward EPS</th>
                <th style="padding: 12px 8px; white-space: nowrap;">15x</th>
                <th style="padding: 12px 8px; white-space: nowrap;">17x</th>
                <th style="padding: 12px 8px; white-space: nowrap;">20x</th>
              </tr>
            </thead>
            <tbody>
              ${data.sp500?.forwardEps?.map((item, index) => {
                return `
                  <tr style="text-align: center; background: white;">
                    <td style="padding: 15px 8px; font-weight: bold; font-size: 0.95rem;">${item.year}</td>
                    <td style="padding: 15px 8px; font-weight: bold; font-size: 0.95rem;">${item.eps}</td>
                    <td style="padding: 15px 8px; font-size: 0.95rem;">${formatCurrencyWithCommas(item.targetAt15x)} <span style="font-size: 0.75rem; color: ${parseFloat(item.percentVsIndex15x) >= 0 ? '#10b981' : '#ef4444'};">(${parseFloat(item.percentVsIndex15x) >= 0 ? '▲' : '▼'} ${Math.abs(parseFloat(item.percentVsIndex15x)).toFixed(2)}%)</span></td>
                    <td style="padding: 15px 8px; font-size: 0.95rem;">${formatCurrencyWithCommas(item.targetAt17x)} <span style="font-size: 0.75rem; color: ${parseFloat(item.percentVsIndex17x) >= 0 ? '#10b981' : '#ef4444'};">(${parseFloat(item.percentVsIndex17x) >= 0 ? '▲' : '▼'} ${Math.abs(parseFloat(item.percentVsIndex17x)).toFixed(2)}%)</span></td>
                    <td style="padding: 15px 8px; font-size: 0.95rem;">${formatCurrencyWithCommas(item.targetAt20x)} <span style="font-size: 0.75rem; color: ${parseFloat(item.percentVsIndex20x) >= 0 ? '#10b981' : '#ef4444'};">(${parseFloat(item.percentVsIndex20x) >= 0 ? '▲' : '▼'} ${Math.abs(parseFloat(item.percentVsIndex20x)).toFixed(2)}%)</span></td>
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
 * Generates the Top Index Holdings content
 * @param {object} data - The data object containing stock information
 * @returns {string} - The HTML content for the Top Index Holdings section
 */
const addTopIndexHoldingsContent = (data) => {
  // Get Top Index Holdings data from the data object
  const topHoldings = data.fundamentalMetrics?.topHoldings || [];
  
  if (topHoldings.length === 0) {
    return '';
  }
  
  return `
    <div class="top-holdings-section" style="margin-bottom: 30px;">
      <div style="background-color: white; border-radius: 8px; padding: 12px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); margin-bottom: 15px;">
        <div style="font-size: 1.1rem; font-weight: bold; color: #4a5568;">Top Index Holdings</div>
      </div>
      
      <div class="stock-cards-container" style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; justify-content: center; margin-bottom: 20px;">
        ${topHoldings.map(stock => createStockCard(stock)).join('')}
      </div>
    </div>
  `;
};

/**
 * Generates the Market Movers content
 * @param {object} data - The data object containing stock information
 * @returns {string} - The HTML content for the Market Movers section
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
        <div style="font-size: 1.1rem; font-weight: bold; color: #4a5568;">Market Movers</div>
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
          ${addTopIndexHoldingsContent(data)}
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
