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
  
  // Consistent color function for both slider and data points
  const getColor = (value) => {
    if (value <= 25) return '#e53935'; // Red for extreme fear
    if (value <= 40) return '#fb8c00'; // Orange for Fear
    if (value <= 60) return '#ffeb3b'; // Yellow for Neutral
    if (value <= 75) return '#7cb342'; // Light green for Greed
    return '#43a047'; // Dark green for Extreme Greed
  };
  
  // Use category from data if available
  const fearGreedCategory = fgData.category || getCategory(current);
  const fearGreedColor = fgData.color || getColor(current);
  const formattedDate = fgData.asOf || new Date().toLocaleDateString('en-US', { 
    month: 'long', 
    day: 'numeric', 
    year: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    timeZoneName: 'short'
  });
  
  // Calculate proper Y-axis position based on value (0-100 scale)
  // Chart height is 130px
  const chartHeight = 130;
  const getYPosition = (value) => {
    // For a value of 0, we want y=chartHeight (bottom)
    // For a value of 100, we want y=0 (top)
    return chartHeight - (value * chartHeight / 100);
  };
  
  // Create data points array for easier handling
  const dataPoints = [
    { label: 'One Month Ago', value: oneMonthAgo, x: 10, isCurrent: false },
    { label: 'One Week Ago', value: oneWeekAgo, x: 35, isCurrent: false },
    { label: 'Previous Close', value: previousClose, x: 65, isCurrent: false },
    { label: 'Current', value: current, x: 90, isCurrent: true }
  ];
  
  // Create SVG path for the line connecting data points
  let pathD = '';
  dataPoints.forEach((point, index) => {
    const x = `${point.x}%`;
    const y = getYPosition(point.value);
    if (index === 0) {
      pathD += `M${x},${y}`;
    } else {
      pathD += ` L${x},${y}`;
    }
  });
  
  const chartHtml = `
    <div style="margin-top: 20px;">
      <!-- Slider visualization with thicker height and adjusted gradient -->
      <div style="position: relative; height: 8px; background: linear-gradient(to right, #e53935 0%, #fb8c00 20%, #ffeb3b 35%, #ffeb3b 65%, #7cb342 80%, #43a047 100%); border-radius: 5px; margin: 10px 0;">
        <!-- Thumb -->
        <div style="position: absolute; top: 50%; left: ${current}%; transform: translate(-50%, -50%); width: 12px; height: 12px; background-color: #fff; border: 2px solid #333; border-radius: 50%; z-index: 2;"></div>
      </div>
      
      <div style="display: flex; justify-content: space-between; font-size: 12px; color: #718096; margin-top: 5px;">
        <div>Extreme Fear</div>
        <div>Fear</div>
        <div>Neutral</div>
        <div>Greed</div>
        <div>Extreme Greed</div>
      </div>
      
      <div style="font-size: 0.9rem; color: #718096; margin-top: 15px; padding: 8px; background-color: rgba(0,0,0,0.03); border-radius: 4px; border-left: 3px solid ${fearGreedColor}; display: flex; flex-wrap: wrap; justify-content: flex-start; align-items: center; gap: 8px; overflow: hidden;">
        <span style="font-weight: bold; flex-shrink: 0;">${fearGreedCategory}:</span>
        ${fgData.description || 'The Fear and Greed Index is currently in a state of fear, indicating a moderate level of market anxiety. This may be a good time to consider buying opportunities.'}
      </div>
      
      <h4 style="margin-top: 20px; margin-bottom: 15px; font-size: 1rem; font-weight: bold; color: #2d3748;">Historical Trend</h4>
      
      <div style="position: relative; height: 180px; background-color: #fff; border-radius: 8px; padding: 20px 20px 40px 20px; margin-top: 15px; margin-bottom: 25px; display: flex; justify-content: center;">
        <!-- Background color bands (horizontal) with proper scale alignment -->
        <div style="position: absolute; top: 20px; left: 20px; right: 20px; bottom: 40px;">
          <!-- Extreme Greed: 75-100 -->
          <div style="position: absolute; top: 0%; left: 0; right: 0; height: 25%; background-color: rgba(67, 160, 71, 0.6);"></div>
          <!-- Greed: 60-75 -->
          <div style="position: absolute; top: 25%; left: 0; right: 0; height: 15%; background-color: rgba(124, 179, 66, 0.6);"></div>
          <!-- Neutral: 40-60 -->
          <div style="position: absolute; top: 40%; left: 0; right: 0; height: 20%; background-color: rgba(255, 235, 59, 0.6);"></div>
          <!-- Fear: 25-40 -->
          <div style="position: absolute; top: 60%; left: 0; right: 0; height: 15%; background-color: rgba(251, 140, 0, 0.6);"></div>
          <!-- Extreme Fear: 0-25 -->
          <div style="position: absolute; top: 75%; left: 0; right: 0; height: 25%; background-color: rgba(229, 57, 53, 0.6);"></div>
        </div>
        
        <!-- SVG Chart - aligned with bottom of chart area -->
        <svg width="calc(100% - 40px)" height="${chartHeight}" style="position: absolute; z-index: 2; left: 20px; top: 20px;">
          <!-- Straight black line connecting data points -->
          <path d="${pathD}" stroke="#000000" stroke-width="2" fill="none"></path>
          
          <!-- Data points with values -->
          ${dataPoints.map(point => `
            <!-- Vertical line from data point to x-axis -->
            <line x1="${point.x}%" y1="${getYPosition(point.value)}" x2="${point.x}%" y2="${chartHeight}" stroke="#000000" stroke-width="1" stroke-dasharray="2,2"></line>
            <circle cx="${point.x}%" cy="${getYPosition(point.value)}" r="${point.isCurrent ? 7 : 5}" fill="${getColor(point.value)}" stroke="#000000" stroke-width="2"></circle>
            <text x="${point.x}%" y="${getYPosition(point.value) - 10}" text-anchor="middle" font-size="10" ${point.isCurrent ? 'font-weight="bold"' : ''} fill="#4a5568">${point.value}</text>
          `).join('')}
        </svg>
        
        <!-- X-axis labels aligned with data points - all condensed to two lines -->
        <div style="position: absolute; bottom: 15px; left: 20px; right: 20px; display: flex; height: 25px;">
          ${dataPoints.map(point => `
            <div style="font-size: 0.65rem; color: #718096; width: 10%; text-align: center; position: absolute; left: ${point.x}%; transform: translateX(-50%); line-height: 1.2; ${point.isCurrent ? 'font-weight: bold;' : ''}">${point.label === 'One Month Ago' ? 'One<br>Month Ago' : point.label === 'One Week Ago' ? 'One<br>Week Ago' : point.label === 'Previous Close' ? 'Previous<br>Close' : point.label}</div>
          `).join('')}
        </div>
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
        <div style="font-size: 0.8rem; color: #718096; margin-top: 15px; text-align: right;">
          Source: <a href="${fgData.sourceUrl || 'https://money.cnn.com/data/fear-and-greed/'}" target="_blank" style="color: #3182ce; text-decoration: none;">${fgData.source || 'CNN Business Fear & Greed Index'}</a> as of ${formattedDate}
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
  // Check for RSI in the correct location in marketIndicators
  const rsiData = data.marketIndicators?.rsi;
  
  // Also check for RSI directly in data (different structure)
  const altRsiData = data.rsi;
  
  // Use whichever data is available
  const rsi = rsiData || altRsiData;
  
  // Skip if RSI object doesn't exist or if RSI value is null
  if (!rsi || rsi.value === null) return;
  
  const rsiValue = rsi.value || 0;
  const rsiSource = rsi.source || 'Tradier (RSI)';
  const rsiTimestamp = rsi.asOf || new Date().toLocaleDateString('en-US', { 
    month: 'long', 
    day: 'numeric', 
    year: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    timeZoneName: 'short'
  });
  
  // Determine the position of the marker (as a percentage)
  const position = rsiValue;
  
  // Determine the sentiment text and color
  let sentiment = 'Neutral';
  let sentimentColor = '#718096';
  
  if (rsiValue >= 70) {
    sentiment = 'Overbought';
    sentimentColor = '#2f855a';
  } else if (rsiValue <= 30) {
    sentiment = 'Oversold';
    sentimentColor = '#c53030';
  } else {
    sentimentColor = '#718096';
  }
  
  const rsiHtml = `
    <div style="margin-top: 20px;">
      <h3 style="font-size: 1.25rem; font-weight: bold; color: #2d3748; margin-bottom: 10px;">Path of Least Resistance</h3>
      
      <div style="font-size: 1rem; margin-bottom: 10px;">
        <span style="font-weight: bold;">14-day Relative Strength Index (RSI):</span> 
        <span style="color: ${sentimentColor};">${rsiValue} (${getRSICategory(parseFloat(rsiValue))})</span>
      </div>
      
      <!-- RSI Slider with thicker height and expanded gray range -->
      <div style="position: relative; height: 8px; background: linear-gradient(to right, #c53030 0%, #c53030 30%, #718096 30%, #718096 70%, #2f855a 70%, #2f855a 100%); border-radius: 5px; margin-bottom: 5px;">
        <div style="position: absolute; top: 50%; left: ${position}%; transform: translate(-50%, -50%); width: 12px; height: 12px; background-color: #fff; border: 2px solid #333; border-radius: 50%;"></div>
      </div>
      
      <div style="display: flex; justify-content: space-between; font-size: 12px; color: #718096; margin-bottom: 15px;">
        <div>Oversold</div>
        <div>Neutral</div>
        <div>Overbought</div>
      </div>
      
      <div style="font-size: 0.8rem; color: #4a5568; margin-bottom: 15px; line-height: 1.5;">
        Developed by J. Welles Wilder Jr. in 1978, the <a href="https://www.investopedia.com/terms/r/rsi.asp" target="_blank" style="color: #3182ce; text-decoration: none;">Relative Strength Index (RSI)</a> is a 0-100 momentum oscillator: readings > 70 signal overbought, < 30 oversold, and 30-70 neutral (with 50 marking "no trend"). Values above 50 imply bullish momentum; below 50, bearish momentum.
      </div>
      
      <div style="font-size: 0.8rem; color: #718096; text-align: right; margin-top: 10px;">
        Source: <a href="${rsiSource}" target="_blank" style="color: #3182ce; text-decoration: none;">Tradier (RSI)</a> as of ${rsiTimestamp}
      </div>
    </div>
  `;
  
  addHTML(mobiledoc, rsiHtml);
};

/**
 * Get the RSI color based on the value
 * @param {number} value - The RSI value
 * @returns {string} - The color
 */
const getRSIColor = (value) => {
  if (!value) return '#718096';  // Gray for unknown
  if (value <= 30) return '#c53030';  // Dark red for oversold
  if (value >= 70) return '#2f855a';  // Dark green for overbought
  return '#718096';  // Gray for neutral (30-70)
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
  
  // Get VIX data
  const vix = data.marketIndicators?.volatilityIndices?.find(index => index.symbol === '^VIX' || index.name.includes('VIX'));
  const vixValue = vix ? formatNumber(vix.value) : '';
  const vixTrend = vix?.trend || '';
  const vixColor = vixTrend.toLowerCase() === 'rising' ? '#f56565' : '#48bb78';
  
  // Get RSI data
  const rsi = data.rsi || data.marketIndicators?.rsi;
  const showRSI = rsi && rsi.value !== null;
  const rsiValue = showRSI ? rsi.value : '';
  const rsiCategory = showRSI ? (rsi?.category || getRSICategory(parseFloat(rsiValue))) : '';  // Calculate category if not provided
  const rsiColor = showRSI ? getRSIColor(rsiValue) : '';

  const headerHtml = `
    <div class="market-pulse-header" style="background-color: #e2e8f0; color: black; padding: 20px; border-radius: 8px; margin-bottom: 20px; text-align: center;">
      <div style="font-size: 1.8rem; font-weight: bold; margin-bottom: 5px;">
        Market Pulse Daily
      </div>
      <div style="margin-top: 10px; line-height: 1.5; color: black; font-size: 1.2rem; font-weight: normal; text-align: center; width: 100%; display: flex; flex-wrap: wrap; justify-content: center; gap: 5px;">
        <span style="white-space: nowrap;">S&P 500: ${sp500Price} <span style="color: ${sp500Color}">(${sp500ChangeIcon} ${sp500ChangeSign}${sp500Change}%)</span></span> | 
        <span style="white-space: nowrap;">Fear & Greed Index: <span style="color: ${fearGreedColor}">${fearGreedValue} (${fearGreedCategory})</span></span> | 
        <span style="white-space: nowrap;">VIX: <span style="color: ${vixColor}">${vixValue} (${vixTrend})</span></span>${showRSI ? ` | 
        <span style="white-space: nowrap;">RSI: <span style="color: ${rsiColor}">${rsiValue} (${rsiCategory})</span></span>` : ''}
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
  const showRSI = rsi && rsi.value !== null;
  const rsiValue = showRSI ? rsi.value : '';
  const rsiCategory = showRSI ? (rsi?.category || getRSICategory(parseFloat(rsiValue))) : '';  // Calculate category if not provided
  const rsiColor = showRSI ? getRSIColor(rsiValue) : '';

  // Create the main container with collapsible header
  const html = `
    <div class="market-pulse-section market-indicators-container" style="margin: 0; padding: 0;">
      <div class="collapsible-section" data-section="market-indicators">
        <div class="collapsible-header" style="background-color: white; padding: 15px; border-radius: 8px; display: flex; flex-direction: column; align-items: flex-start; border: 2px solid #5D4037;">
          <div style="display: flex; justify-content: space-between; width: 100%; align-items: center;">
            <div style="margin: 0; font-size: 2rem; font-weight: bold; color: black;">Key Market Indicators</div>
            <div class="collapsible-icon" style="font-size: 14px; color: black;">▼</div>
          </div>
          <div style="margin-top: 10px; line-height: 1.5; color: black; font-size: 1.2rem; font-weight: normal; text-align: center; width: 100%; display: flex; flex-wrap: wrap; justify-content: center; gap: 5px;">
            <span style="white-space: nowrap;">S&P 500: ${sp500Price} <span style="color: ${sp500Color}">(${sp500ChangeIcon} ${sp500ChangeSign}${sp500Change})</span></span> | 
            <span style="white-space: nowrap;">Fear & Greed Index: <span style="color: ${fearGreedColor}">${fearGreedValue} (${fearGreedCategory})</span></span> | 
            <span style="white-space: nowrap;">VIX: <span style="color: ${vixColor}">${vixValue} (${vixTrend})</span></span>${showRSI ? ` | 
            <span style="white-space: nowrap;">RSI: <span style="color: ${rsiColor}">${rsiValue} (${rsiCategory})</span></span>` : ''}
          </div>
        </div>
        <div class="collapsible-content" style="max-height: 0; overflow: hidden; transition: max-height 0.3s ease-out;">
  `;
  
  addHTML(mobiledoc, html);

  // Add individual sections
  addMajorIndices(mobiledoc, data);
  addSectorPerformance(mobiledoc, data);
  addMarketFutures(mobiledoc, data);
  addVolatilityIndices(mobiledoc, data);
  addFearGreedIndex(mobiledoc, data);
  if (showRSI) {
    addRSI(mobiledoc, data);
  }

  // Close the container
  const closingHtml = `
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
  
  addHTML(mobiledoc, closingHtml);
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

module.exports = { 
  addMarketIndicators,
  addMajorIndices,
  addSectorPerformance,
  addMarketFutures,
  addFearGreedIndex,
  addVolatilityIndices,
  addRSI
};
