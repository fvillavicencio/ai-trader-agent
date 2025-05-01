/**
 * Market Indicators Module
 * Generates the Key Market Indicators section of the Ghost post
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
 * Adds the Major Indices section to the mobiledoc
 * @param {object} mobiledoc - The mobiledoc object to add content to
 * @param {object} data - The data object containing major indices information
 */
const addMajorIndices = (mobiledoc, data) => {
  if (!data.marketIndicators || !data.marketIndicators.majorIndices || data.marketIndicators.majorIndices.length === 0) return;
  
  const indicesHtml = `
    <div class="market-pulse-section major-indices-container" style="width: 100%; margin: 0; padding: 0; margin-bottom: 15px;">
      <div style="background-color: white; border-radius: 8px; padding: 12px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); margin-bottom: 5px;">
        <div style="font-size: 1.1rem; font-weight: bold; color: #4a5568;">Major Indices</div>
      </div>
      <div style="margin-top: 10px;">
        <div class="major-indices-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(100%, 1fr)); gap: 8px; width: 100%;">
          ${data.marketIndicators.majorIndices.map(index => {
            const isPositive = index.isPositive !== undefined ? index.isPositive : parseFloat(index.change) >= 0;
            const changeColor = isPositive ? '#48bb78' : '#f56565';
            const changeSign = isPositive ? '+' : '';
            const changeIcon = isPositive ? '↑' : '↓';
            return `
              <div class="market-index-card" style="background-color: #f8f9fa; border-radius: 8px; padding: 12px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); border-left: 4px solid ${changeColor};">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                  <div style="font-size: 0.95rem; color: #2d3748;">${index.name}</div>
                  <div style="display: flex; align-items: center; gap: 15px;">
                    <div style="font-size: 0.95rem;">${formatNumber(index.price)}</div>
                    <div style="color: ${changeColor}; font-weight: 500; font-size: 0.95rem;">
                      ${changeIcon} ${changeSign}${index.percentChange || index.change + '%'}
                    </div>
                  </div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
        <div style="font-size: 0.8rem; color: #718096; margin-top: 10px; text-align: right;">
          Source: <a href="${data.marketIndicators.indicesSourceUrl || '#'}" target="_blank" style="color: #3182ce; text-decoration: none;">${data.marketIndicators.indicesSource || 'Yahoo Finance'}</a> as of ${data.marketIndicators.indicesAsOf || new Date().toLocaleDateString()}
        </div>
      </div>
    </div>
  `;
  
  addHTML(mobiledoc, indicesHtml);
};

/**
 * Adds the Sector Performance section to the mobiledoc
 * @param {object} mobiledoc - The mobiledoc object to add content to
 * @param {object} data - The data object containing sector performance information
 */
const addSectorPerformance = (mobiledoc, data) => {
  if (!data.marketIndicators || !data.marketIndicators.sectorPerformance || data.marketIndicators.sectorPerformance.length === 0) return;
  
  const sectorsHtml = `
    <div class="market-pulse-section sector-performance-container" style="width: 100%; margin: 0; padding: 0; margin-bottom: 15px;">
      <div style="background-color: white; border-radius: 8px; padding: 12px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); margin-bottom: 5px;">
        <div style="font-size: 1.1rem; font-weight: bold; color: #4a5568;">Sector Performance</div>
      </div>
      <div style="margin-top: 10px;">
        <div class="sector-performance-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(100%, 1fr)); gap: 8px; width: 100%;">
          ${data.marketIndicators.sectorPerformance.map(sector => {
            const isPositive = sector.isPositive !== undefined ? sector.isPositive : parseFloat(sector.change) >= 0;
            const changeColor = isPositive ? '#48bb78' : '#f56565';
            const changeSign = isPositive ? '+' : '';
            const changeIcon = isPositive ? '↑' : '↓';
            return `
              <div class="sector-card" style="background-color: #f8f9fa; border-radius: 8px; padding: 12px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); border-left: 4px solid ${changeColor};">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                  <div class="sector-name" style="font-size: 0.95rem; color: #2d3748;">${sector.name}</div>
                  <div class="sector-change" style="color: ${changeColor}; font-weight: 500; font-size: 0.95rem;">
                    ${changeIcon} ${changeSign}${sector.change}%
                  </div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
        <div style="font-size: 0.8rem; color: #718096; margin-top: 10px; text-align: right;">
          Source: <a href="${data.marketIndicators.sectorSourceUrl || '#'}" target="_blank" style="color: #3182ce; text-decoration: none;">${data.marketIndicators.sectorSource || 'Yahoo Finance'}</a> as of ${data.marketIndicators.sectorAsOf || new Date().toLocaleDateString()}
        </div>
      </div>
    </div>
  `;
  
  addHTML(mobiledoc, sectorsHtml);
};

/**
 * Adds the Market Futures section to the mobiledoc
 * @param {object} mobiledoc - The mobiledoc object to add content to
 * @param {object} data - The data object containing market futures information
 */
const addMarketFutures = (mobiledoc, data) => {
  if (!data.marketIndicators || !data.marketIndicators.marketFutures || data.marketIndicators.marketFutures.length === 0) return;
  
  const futuresHtml = `
    <div class="market-pulse-section futures-container" style="width: 100%; margin: 0; padding: 0; margin-bottom: 15px;">
      <div style="background-color: white; border-radius: 8px; padding: 12px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); margin-bottom: 5px;">
        <div style="font-size: 1.1rem; font-weight: bold; color: #4a5568;">Market Futures</div>
      </div>
      <div style="margin-top: 10px;">
        <div class="market-futures-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(100%, 1fr)); gap: 8px; width: 100%;">
          ${data.marketIndicators.marketFutures.map(future => {
            const isPositive = future.isPositive !== undefined ? future.isPositive : parseFloat(future.change) >= 0;
            const changeColor = isPositive ? '#48bb78' : '#f56565';
            const changeSign = isPositive ? '+' : '';
            const changeIcon = isPositive ? '↑' : '↓';
            return `
              <div class="future-card" style="background-color: #f8f9fa; border-radius: 8px; padding: 12px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); border-left: 4px solid ${changeColor};">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                  <div class="future-name" style="font-size: 0.95rem; color: #2d3748;">${future.name}</div>
                  <div class="future-change" style="color: ${changeColor}; font-weight: 500; font-size: 0.95rem;">
                    ${changeIcon} ${changeSign}${future.change}%
                  </div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
        <div style="font-size: 0.8rem; color: #718096; margin-top: 10px; text-align: right;">
          Source: <a href="${data.marketIndicators.futuresSourceUrl || '#'}" target="_blank" style="color: #3182ce; text-decoration: none;">${data.marketIndicators.futuresSource || 'CNBC'}</a> as of ${data.marketIndicators.futuresAsOf || new Date().toLocaleDateString()}
        </div>
      </div>
    </div>
  `;
  
  addHTML(mobiledoc, futuresHtml);
};

/**
 * Adds the Volatility Indices section to the mobiledoc
 * @param {object} mobiledoc - The mobiledoc object to add content to
 * @param {object} data - The data object containing volatility information
 */
const addVolatilityIndices = (mobiledoc, data) => {
  if (!data.marketIndicators || !data.marketIndicators.volatilityIndices || data.marketIndicators.volatilityIndices.length === 0) return;
  
  const volatilityHtml = `
    <div class="market-pulse-section volatility-container" style="width: 100%; margin: 0; padding: 0; margin-bottom: 15px;">
      <div style="background-color: white; border-radius: 8px; padding: 12px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); margin-bottom: 5px;">
        <div style="font-size: 1.1rem; font-weight: bold; color: #4a5568;">Volatility Indices</div>
      </div>
      <div style="margin-top: 10px;">
        <div class="volatility-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(100%, 1fr)); gap: 8px; width: 100%;">
          ${data.marketIndicators.volatilityIndices.map(index => {
            // For volatility indices, rising is typically considered negative (red)
            const isPositive = index.trend ? index.trend.toLowerCase() === 'falling' : index.change < 0;
            const changeColor = isPositive ? '#48bb78' : '#f56565';
            const changeIcon = isPositive ? '↓' : '↑';
            const trendText = index.trend || (isPositive ? 'Falling' : 'Rising');
            
            return `
              <div class="volatility-card" style="background-color: #f8f9fa; border-radius: 8px; padding: 12px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); border-left: 4px solid ${changeColor};">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                  <div class="volatility-name" style="font-size: 0.95rem; color: #2d3748;">${index.name}</div>
                  <div style="display: flex; align-items: center; gap: 15px;">
                    <div style="font-size: 0.95rem;">${formatNumber(index.value)}</div>
                    <div class="volatility-change" style="color: ${changeColor}; font-weight: 500; font-size: 0.95rem;">
                      ${changeIcon} ${trendText}
                    </div>
                  </div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
        <div style="font-size: 0.8rem; color: #718096; margin-top: 10px; text-align: right;">
          Source: <a href="${data.marketIndicators.volatilitySourceUrl || '#'}" target="_blank" style="color: #3182ce; text-decoration: none;">${data.marketIndicators.volatilitySource || 'Yahoo Finance'}</a> as of ${data.marketIndicators.volatilityAsOf || new Date().toLocaleDateString()}
        </div>
      </div>
    </div>
  `;
  
  addHTML(mobiledoc, volatilityHtml);
};

/**
 * Adds the Fear & Greed Index section to the mobiledoc
 * @param {object} mobiledoc - The mobiledoc object to add content to
 * @param {object} data - The data object containing fear & greed index information
 */
const addFearGreedIndex = (mobiledoc, data) => {
  // Check for fearGreed in the correct location in marketIndicators
  const fearGreedData = data.marketIndicators?.fearGreed;
  
  // Also check for fearGreed directly in data (different structure)
  const altFearGreedData = data.fearGreed;
  
  // Use whichever data is available
  const fgData = fearGreedData || altFearGreedData;
  
  if (!fgData) return;
  
  const current = fgData.value || 0;
  const previousClose = fgData.previousValue || fgData.previousClose || 0;
  const oneWeekAgo = fgData.oneWeekAgo || 0;
  const oneMonthAgo = fgData.oneMonthAgo || 0;
  
  // Determine the category based on the value
  const getCategory = (value) => {
    if (value <= 25) return 'Extreme Fear';
    if (value <= 40) return 'Fear';
    if (value <= 60) return 'Neutral';
    if (value <= 75) return 'Greed';
    return 'Extreme Greed';
  };
  
  const getColor = (value) => {
    if (value <= 25) return '#48bb78'; // Dark red for extreme fear
    if (value <= 40) return '#ed8936'; // Orange for Fear
    if (value <= 60) return '#ecc94b'; // Yellow
    if (value <= 75) return '#48bb78'; // Green
    return '#2f855a'; // Darker green
  };
  
  // Use category from data if available
  const fearGreedCategory = fgData.category || getCategory(current);
  const fearGreedColor = fgData.color || getColor(current);
  
  const chartHtml = `
    <div style="margin-top: 40px;">
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 15px;">
        <h4 style="margin-top: 0; margin-bottom: 15px; font-size: 1rem; font-weight: bold; color: #2d3748;">Historical Trend</h4>
        <div style="font-size: 0.9rem; color: #718096;">${fgData.description || ''}</div>
      </div>
      <div style="position: relative; height: 150px; background-color: #fff; border-radius: 8px; padding: 10px;">
        <!-- Background color bands -->
        <div style="position: absolute; top: 30px; left: 0; right: 0; height: 40px; display: flex;">
          <div style="flex: 1; background-color: rgba(197, 48, 48, 0.1);"></div>
          <div style="flex: 1; background-color: rgba(237, 137, 54, 0.1);"></div>
          <div style="flex: 1; background-color: rgba(236, 201, 75, 0.1);"></div>
          <div style="flex: 1; background-color: rgba(72, 187, 120, 0.1);"></div>
          <div style="flex: 1; background-color: rgba(47, 133, 90, 0.1);"></div>
        </div>
        
        <!-- X-axis labels -->
        <div style="position: absolute; bottom: 10px; left: 0; right: 0; display: flex; justify-content: space-between;">
          <div style="font-size: 0.8rem; color: #718096;">One Month Ago</div>
          <div style="font-size: 0.8rem; color: #718096;">One Week Ago</div>
          <div style="font-size: 0.8rem; color: #718096;">Previous Close</div>
          <div style="font-size: 0.8rem; color: #718096; font-weight: bold;">Current</div>
        </div>
        
        <!-- SVG Chart -->
        <svg width="100%" height="100" style="overflow: visible; position: relative; z-index: 2;">
          <!-- Line connecting points with curve -->
          <path d="M30,${100 - oneMonthAgo} C90,${100 - (oneMonthAgo + oneWeekAgo) / 2} 150,${100 - oneWeekAgo} 210,${100 - (oneWeekAgo + previousClose) / 2} C270,${100 - previousClose} 330,${100 - (previousClose + current) / 2} 370,${100 - current}" stroke="#3182ce" stroke-width="3" fill="none"></path>
          
          <!-- Data points with values -->
          <circle cx="30" cy="${100 - oneMonthAgo}" r="5" fill="${getColor(oneMonthAgo)}" stroke="#fff" stroke-width="2"></circle>
          <text x="30" y="${90 - oneMonthAgo}" text-anchor="middle" font-size="10" fill="#4a5568">${oneMonthAgo}</text>
          
          <circle cx="150" cy="${100 - oneWeekAgo}" r="5" fill="${getColor(oneWeekAgo)}" stroke="#fff" stroke-width="2"></circle>
          <text x="150" y="${90 - oneWeekAgo}" text-anchor="middle" font-size="10" fill="#4a5568">${oneWeekAgo}</text>
          
          <circle cx="270" cy="${100 - previousClose}" r="5" fill="${getColor(previousClose)}" stroke="#fff" stroke-width="2"></circle>
          <text x="270" y="${90 - previousClose}" text-anchor="middle" font-size="10" fill="#4a5568">${previousClose}</text>
          
          <circle cx="370" cy="${100 - current}" r="7" fill="${getColor(current)}" stroke="#fff" stroke-width="2"></circle>
          <text x="370" y="${90 - current}" text-anchor="middle" font-size="10" font-weight="bold" fill="#4a5568">${current}</text>
        </svg>
      </div>
    </div>
  `;
  
  const html = `
    <div class="market-pulse-section fear-greed-container" style="width: 100%; margin: 0; padding: 0; margin-bottom: 15px;">
      <div style="background-color: white; border-radius: 8px; padding: 12px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); margin-bottom: 5px;">
        <div style="font-size: 1.1rem; font-weight: bold; color: #4a5568;">Fear & Greed Index: <span style="color: ${fearGreedColor};">${current} (${fearGreedCategory})</span></div>
      </div>
      <div style="margin-top: 10px;">
        ${chartHtml}
        <div style="font-size: 0.8rem; color: #718096; margin-top: 10px; text-align: right;">
          Source: <a href="${fgData.sourceUrl || 'https://money.cnn.com/data/fear-and-greed/'}" target="_blank" style="color: #3182ce; text-decoration: none;">${fgData.source || 'CNN Business Fear & Greed Index'}</a> as of ${fgData.timestamp || new Date().toLocaleDateString()}
        </div>
      </div>
    </div>
  `;
  
  addHTML(mobiledoc, html);
};

/**
 * Adds the RSI (Relative Strength Index) section to the mobiledoc
 * @param {object} mobiledoc - The mobiledoc object to add content to
 * @param {object} data - The data object containing RSI information
 */
const addRSI = (mobiledoc, data) => {
  const rsi = data.rsi || data.marketIndicators?.rsi;
  if (!rsi) return;

  const rsiValue = rsi.value;
  const rsiCategory = rsi.category;  // Use category directly from JSON, no fallback calculation
  const rsiColor = getRSIColor(rsiValue);
  
  const source = rsi.source || 'Tradier (RSI)';
  const sourceUrl = rsi.sourceUrl || 'https://developer.tradier.com/documentation/markets/get-timesales';
  const asOf = rsi.asOf || '';

  const html = `
    <div style="margin-top: 20px; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
      <h3 style="margin-top: 0; margin-bottom: 15px; font-size: 1.25rem; font-weight: bold; color: #2d3748;">Path of Least Resistance</h3>
      
      <div style="margin-bottom: 10px;">
        <div style="display: flex; align-items: center; margin-bottom: 5px;">
          <div style="font-weight: bold; font-size: 0.95rem;">14-day Relative Strength Index (RSI):</div>
          <div style="font-size: 0.95rem; margin-left: 8px; color: ${rsiColor}">${rsiValue} (${rsiCategory})</div>
        </div>
        
        <div style="position: relative; height: 20px; background: linear-gradient(to right, #e53e3e 0%, #e53e3e 30%, #718096 30%, #718096 70%, #38a169 70%, #38a169 100%); border-radius: 10px; margin-bottom: 5px;">
          <div style="position: absolute; top: 50%; left: calc(${rsiValue}% - 8px); transform: translateY(-50%); width: 16px; height: 16px; background-color: white; border: 2px solid #2d3748; border-radius: 50%;"></div>
        </div>
        
        <div style="display: flex; justify-content: space-between; font-size: 0.9rem; color: #4a5568;">
          <div>Oversold</div>
          <div>Neutral</div>
          <div>Overbought</div>
        </div>
      </div>
      
      <p style="margin-top: 15px; font-size: 0.85rem; line-height: 1.5; color: #4a5568;">
        Developed by J. Welles Wilder Jr. in 1978, the <a href="${sourceUrl}" target="_blank" style="color: #3182ce; text-decoration: none;">Relative Strength Index (RSI)</a> is a 0-100 momentum oscillator: 
        readings > 70 signal overbought, < 30 oversold, and 30-70 neutral (with 50 marking "no trend"). Values above 
        50 imply bullish momentum; below 50, bearish momentum.
      </p>
      
      <div style="margin-top: 10px; font-size: 0.8rem; color: #718096; text-align: right;">
        Source: <a href="${sourceUrl}" target="_blank" style="color: #4299e1; text-decoration: none;">${source}</a>, as of ${asOf}
      </div>
    </div>
  `;

  addHTML(mobiledoc, html);
};

/**
 * Get the Fear & Greed category based on the value
 * @param {number} value - The Fear & Greed value
 * @returns {string} - The category
 */
const getFearGreedCategory = (value) => {
  if (value <= 0) return 'Unknown';
  if (value <= 20) return 'Extreme Fear';
  if (value <= 40) return 'Fear';
  if (value <= 60) return 'Neutral';
  if (value <= 80) return 'Greed';
  return 'Extreme Greed';
};

/**
 * Get the Fear & Greed color based on the value
 * @param {number} value - The Fear & Greed value
 * @returns {string} - The color
 */
const getFearGreedColor = (value) => {
  if (value <= 0) return '#718096';  // Gray for unknown
  if (value <= 20) return '#b91c1c';  // Dark red for extreme fear
  if (value <= 40) return '#ed8936';  // Orange for fear
  if (value <= 60) return '#ecc94b';  // Yellow for neutral
  if (value <= 75) return '#48bb78';  // Green
  return '#2f855a';  // Darker green
};

/**
 * Get the RSI category based on the value
 * @param {number} value - The RSI value
 * @returns {string} - The category
 */
const getRSICategory = (value) => {
  if (!value) return 'Unknown';
  if (value <= 30) return 'Oversold';
  if (value <= 50) return 'Downtrend';
  if (value <= 70) return 'Uptrend';
  return 'Overbought';
};

/**
 * Get the RSI color based on the value
 * @param {number} value - The RSI value
 * @returns {string} - The color
 */
const getRSIColor = (value) => {
  if (!value) return '#718096';  // Gray for unknown
  if (value <= 30) return '#c53030';  // Dark red for oversold
  if (value <= 50) return '#ed8936';  // Orange for downtrend
  if (value <= 70) return '#48bb78';  // Green for uptrend
  return '#2f855a';  // Dark green for overbought
};

/**
 * Adds the header with key market data
 * @param {object} mobiledoc - The mobiledoc object to add content to
 * @param {object} data - The data object containing market data
 */
const addMarketHeader = (mobiledoc, data) => {
  if (!data) return;
  
  // Get S&P 500 data
  const sp500 = data.marketIndicators?.majorIndices?.find(index => index.symbol === '^GSPC' || index.name.includes('S&P 500'));
  const sp500Price = sp500 ? formatNumber(sp500.price) : '';
  const sp500Change = sp500 ? parseFloat(sp500.percentChange || sp500.change) : 0;
  const sp500IsPositive = sp500 ? (sp500.isPositive !== undefined ? sp500.isPositive : sp500Change >= 0) : false;
  const sp500ChangeIcon = sp500IsPositive ? '↑' : '↓';
  const sp500ChangeSign = sp500IsPositive ? '+' : '';
  const sp500Color = sp500IsPositive ? '#48bb78' : '#f56565';

  // Get Fear & Greed data
  const fearGreedData = data.fearGreed || data.marketIndicators?.fearGreed;
  const fearGreedValue = fearGreedData ? fearGreedData.value : 0;
  const fearGreedCategory = getFearGreedCategory(fearGreedValue);
  
  // Determine the color based on the value
  const getFearGreedColor = (value) => {
    if (value <= 25) return '#b91c1c'; // Dark red for extreme fear
    if (value <= 40) return '#ed8936'; // Orange for fear
    if (value <= 60) return '#ecc94b'; // Yellow for neutral
    if (value <= 75) return '#48bb78'; // Green
    return '#2f855a'; // Darker green
  };
  
  const fearGreedColor = getFearGreedColor(fearGreedValue);

  // Get VIX data
  const vix = data.marketIndicators?.volatilityIndices?.find(index => index.symbol === '^VIX' || index.name.includes('VIX'));
  const vixValue = vix ? formatNumber(vix.value) : '';
  const vixTrend = vix?.trend || '';
  const vixColor = vixTrend.toLowerCase() === 'rising' ? '#f56565' : '#48bb78';
  
  // Get RSI data
  const rsi = data.rsi || data.marketIndicators?.rsi;
  const rsiValue = rsi ? rsi.value : '';
  const rsiCategory = rsi?.category || '';  // Use category directly from JSON, no fallback calculation
  const rsiColor = getRSIColor(rsiValue);

  const headerHtml = `
    <div class="market-pulse-header" style="background-color: #e2e8f0; color: black; padding: 20px; border-radius: 8px; margin-bottom: 20px; text-align: center;">
      <div style="font-size: 1.8rem; font-weight: bold; margin-bottom: 5px;">
        Market Pulse Daily
      </div>
      <div style="margin-top: 10px; line-height: 1.5; color: black; font-size: 1rem; font-weight: normal; text-align: center; width: 100%; display: flex; flex-wrap: wrap; justify-content: center; gap: 5px;">
        <span style="white-space: nowrap;">S&P 500: ${sp500Price} <span style="color: ${sp500Color}">(${sp500ChangeIcon} ${sp500ChangeSign}${sp500Change}%)</span></span> | 
        <span style="white-space: nowrap;">Fear & Greed Index: <span style="color: ${fearGreedColor}">${fearGreedValue} (${fearGreedCategory})</span></span> | 
        <span style="white-space: nowrap;">VIX: <span style="color: ${vixColor}">${vixValue} (${vixTrend})</span></span> | 
        <span style="white-space: nowrap;">RSI: <span style="color: ${rsiColor}">${rsiValue} (${rsiCategory})</span></span>
      </div>
    </div>
  `;
  
  addHTML(mobiledoc, headerHtml);
};

/**
 * Adds the Key Market Indicators section to the mobiledoc
 * @param {object} mobiledoc - The mobiledoc object to add content to
 * @param {object} data - The data object containing market indicators information
 */
const addMarketIndicators = (mobiledoc, data) => {
  if (!data.marketIndicators) return;

  // Find S&P 500 data
  const sp500 = data.marketIndicators.majorIndices?.find(i => i.name === 'S&P 500');
  const sp500Price = sp500?.price ? formatNumber(sp500.price) : '0';
  const sp500Change = sp500?.percentChange || (sp500?.change ? sp500.change + '%' : '0%');
  const sp500IsPositive = sp500?.isPositive !== undefined ? sp500.isPositive : (parseFloat(sp500?.change || 0) >= 0);
  const sp500ChangeIcon = sp500IsPositive ? '↑' : '↓';
  const sp500ChangeSign = sp500IsPositive ? '+' : '';
  const sp500Color = sp500IsPositive ? '#48bb78' : '#f56565';

  // Get Fear & Greed data
  const fearGreedData = data.fearGreed || data.marketIndicators?.fearGreed;
  const fearGreedValue = fearGreedData?.value || 50;
  const fearGreedCategory = fearGreedData?.category || getFearGreedCategory(fearGreedValue);
  const fearGreedColor = getFearGreedColor(fearGreedValue);
  
  // Get VIX data
  const vix = data.marketIndicators?.volatilityIndices?.find(index => index.name.includes('CBOE'));
  const vixValue = vix ? formatNumber(vix.value) : '';
  const vixTrend = vix?.trend || '';
  const vixColor = vixTrend.toLowerCase() === 'rising' ? '#f56565' : '#48bb78';
  
  // Get RSI data
  const rsi = data.rsi || data.marketIndicators?.rsi;
  const rsiValue = rsi ? rsi.value : '';
  const rsiCategory = rsi?.category || '';  // Use category directly from JSON, no fallback calculation
  const rsiColor = getRSIColor(rsiValue);

  // Create the main container with collapsible header
  const html = `
    <div class="market-pulse-section market-indicators-container" style="margin: 0; padding: 0;">
      <div class="collapsible-section" data-section="market-indicators">
        <div class="collapsible-header" style="background-color: #e2e8f0; padding: 15px; border-radius: 8px; display: flex; flex-direction: column; align-items: flex-start;">
          <div style="display: flex; justify-content: space-between; width: 100%; align-items: center;">
            <h2 style="margin: 0; font-size: 1.5rem; font-weight: bold; color: black;">Key Market Indicators</h2>
            <div class="collapsible-icon" style="font-size: 14px; color: black;">▼</div>
          </div>
          <div style="margin-top: 10px; line-height: 1.5; color: black; font-size: 1rem; font-weight: normal; text-align: center; width: 100%; display: flex; flex-wrap: wrap; justify-content: center; gap: 5px;">
            <span style="white-space: nowrap;">S&P 500: ${sp500Price} <span style="color: ${sp500Color}">(${sp500ChangeIcon} ${sp500ChangeSign}${sp500Change})</span></span> | 
            <span style="white-space: nowrap;">Fear & Greed Index: <span style="color: ${fearGreedColor}">${fearGreedValue} (${fearGreedCategory})</span></span> | 
            <span style="white-space: nowrap;">VIX: <span style="color: ${vixColor}">${vixValue} (${vixTrend})</span></span> | 
            <span style="white-space: nowrap;">RSI: <span style="color: ${rsiColor}">${rsiValue} (${rsiCategory})</span></span>
          </div>
        </div>
        <div class="collapsible-content">
  `;
  
  addHTML(mobiledoc, html);

  // Add individual sections
  addMajorIndices(mobiledoc, data);
  addSectorPerformance(mobiledoc, data);
  addMarketFutures(mobiledoc, data);
  addVolatilityIndices(mobiledoc, data);
  addFearGreedIndex(mobiledoc, data);
  addRSI(mobiledoc, data);

  // Close the container
  const closingHtml = `
        </div>
      </div>
    </div>
  `;
  
  addHTML(mobiledoc, closingHtml);
};

module.exports = { 
  addMarketIndicators,
  addMajorIndices,
  addSectorPerformance,
  addMarketFutures,
  addFearGreedIndex,
  addVolatilityIndices,
  addRSI
};
