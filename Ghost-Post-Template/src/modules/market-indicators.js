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
 * @param {object} data - The data object containing market indices information
 */
const addMajorIndices = (mobiledoc, data) => {
  if (!data.marketIndicators || !data.marketIndicators.majorIndices || data.marketIndicators.majorIndices.length === 0) return;
  
  const indicesHtml = `
    <div class="market-pulse-section indices-container collapsible-section" data-section="indices">
      <div class="collapsible-header">
        <div class="collapsible-title">Major Indices</div>
        <div class="collapsible-icon">▼</div>
      </div>
      <div class="collapsible-content">
        <div class="market-indices-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 15px; width: 100%;">
          ${data.marketIndicators.majorIndices.map(index => {
            const isPositive = index.isPositive !== undefined ? index.isPositive : parseFloat(index.change) >= 0;
            const changeColor = isPositive ? '#48bb78' : '#f56565';
            const changeSign = isPositive ? '+' : '';
            const changeIcon = isPositive ? '↑' : '↓';
            return `
              <div class="market-index-card" style="background-color: #f8f9fa; border-radius: 8px; padding: 15px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); border-left: 4px solid ${changeColor};">
                <div style="font-weight: bold; font-size: 1.1rem; color: #2d3748;">${index.name}</div>
                <div style="display: flex; justify-content: space-between; align-items: baseline; margin-top: 10px;">
                  <div style="font-size: 1.2rem; font-weight: 600;">${index.value || ''}</div>
                  <div style="color: ${changeColor}; font-weight: 500;">
                    ${changeIcon} ${changeSign}${index.change}${index.percentChange ? ` (${index.percentChange})` : '%'}
                  </div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
        
        <div style="font-size: 0.8rem; color: #718096; margin-top: 10px; text-align: right;">
          Source: <a href="https://finance.yahoo.com" target="_blank" style="color: #3182ce; text-decoration: none;">Yahoo Finance</a>
          <br>As of: ${new Date().toLocaleString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })}
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
    <div class="market-pulse-section sector-performance-container collapsible-section" data-section="sector-performance">
      <div class="collapsible-header">
        <div class="collapsible-title">Sector Performance</div>
        <div class="collapsible-icon">▼</div>
      </div>
      <div class="collapsible-content">
        <div class="sector-performance-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 15px; width: 100%;">
          ${data.marketIndicators.sectorPerformance.map(sector => {
            const isPositive = sector.isPositive !== undefined ? sector.isPositive : parseFloat(sector.change) >= 0;
            const changeColor = isPositive ? '#48bb78' : '#f56565';
            const changeSign = isPositive ? '+' : '';
            const changeIcon = isPositive ? '↑' : '↓';
            return `
              <div class="sector-card" style="background-color: #f8f9fa; border-radius: 8px; padding: 15px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); border-left: 4px solid ${changeColor};">
                <div class="sector-name" style="font-weight: 600; color: #2d3748; margin-bottom: 5px;">${sector.name}</div>
                <div class="sector-change" style="color: ${changeColor}; font-weight: 500;">
                  ${changeIcon} ${changeSign}${sector.change}%
                </div>
              </div>
            `;
          }).join('')}
        </div>
        
        <div style="font-size: 0.8rem; color: #718096; margin-top: 10px; text-align: right;">
          Source: <a href="https://finance.yahoo.com/quote/XLV/" target="_blank" style="color: #3182ce; text-decoration: none;">Yahoo Finance</a>
          <br>As of: ${new Date().toLocaleString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })}
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
    <div class="market-pulse-section futures-container collapsible-section" data-section="futures">
      <div class="collapsible-header">
        <div class="collapsible-title">Market Futures</div>
        <div class="collapsible-icon">▼</div>
      </div>
      <div class="collapsible-content">
        <div class="market-futures-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 15px; width: 100%;">
          ${data.marketIndicators.marketFutures.map(future => {
            const isPositive = future.isPositive !== undefined ? future.isPositive : parseFloat(future.change) >= 0;
            const changeColor = isPositive ? '#48bb78' : '#f56565';
            const changeSign = isPositive ? '+' : '';
            const changeIcon = isPositive ? '↑' : '↓';
            return `
              <div class="market-future-card" style="background-color: #f8f9fa; border-radius: 8px; padding: 15px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); border-left: 4px solid ${changeColor};">
                <div style="font-weight: bold; font-size: 1.1rem; color: #2d3748;">${future.name}</div>
                <div style="display: flex; justify-content: space-between; align-items: baseline; margin-top: 10px;">
                  <div style="font-size: 1.2rem; font-weight: 600;">${future.value || future.price || ''}</div>
                  <div style="color: ${changeColor}; font-weight: 500;">
                    ${changeIcon} ${changeSign}${future.change}${future.percentChange ? ` (${future.percentChange})` : '%'}
                  </div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
        
        <div style="font-size: 0.8rem; color: #718096; margin-top: 10px; text-align: right;">
          Source: <a href="https://finance.yahoo.com/futures/" target="_blank" style="color: #3182ce; text-decoration: none;">Yahoo Finance</a>
          <br>As of: ${new Date().toLocaleString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })}
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
  if (!data.marketIndicators || !data.marketIndicators.volatility || data.marketIndicators.volatility.length === 0) return;
  
  const volatilityHtml = `
    <div class="market-pulse-section volatility-container collapsible-section" data-section="volatility">
      <div class="collapsible-header">
        <div class="collapsible-title">Volatility</div>
        <div class="collapsible-icon">▼</div>
      </div>
      <div class="collapsible-content">
        <div class="volatility-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 15px; width: 100%;">
          ${data.marketIndicators.volatility.map(index => {
            const isPositive = index.isPositive !== undefined ? index.isPositive : parseFloat(index.change) >= 0;
            const changeColor = isPositive ? '#48bb78' : '#f56565';
            const changeSign = isPositive ? '+' : '';
            const changeIcon = isPositive ? '↑' : '↓';
            return `
              <div class="volatility-card" style="background-color: #f8f9fa; border-radius: 8px; padding: 15px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); border-left: 4px solid ${changeColor};">
                <div style="font-weight: bold; font-size: 1.1rem; color: #2d3748;">${index.name}</div>
                <div style="display: flex; justify-content: space-between; align-items: baseline; margin-top: 10px;">
                  <div style="font-size: 1.2rem; font-weight: 600;">${index.value || ''}</div>
                  <div style="color: ${changeColor}; font-weight: 500;">
                    ${changeIcon} ${changeSign}${index.change}${index.percentChange ? ` (${index.percentChange})` : '%'}
                  </div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
        
        <div style="font-size: 0.8rem; color: #718096; margin-top: 10px; text-align: right;">
          Source: <a href="https://finance.yahoo.com/quote/%5EVIX/" target="_blank" style="color: #3182ce; text-decoration: none;">Yahoo Finance</a>
          <br>As of: ${new Date().toLocaleString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })}
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
  // Check for fearGreed in the correct location
  const fearGreedData = data.marketIndicators?.fearGreed;
  if (!fearGreedData) return;
  
  const current = fearGreedData.value || 0;
  const previousClose = fearGreedData.previousClose || 0;
  const oneWeekAgo = fearGreedData.oneWeekAgo || 0;
  const oneMonthAgo = fearGreedData.oneMonthAgo || 0;
  
  // Determine the category based on the value
  const getCategory = (value) => {
    if (value <= 25) return 'Extreme Fear';
    if (value <= 40) return 'Fear';
    if (value <= 60) return 'Neutral';
    if (value <= 75) return 'Greed';
    return 'Extreme Greed';
  };
  
  const getColor = (value) => {
    if (value <= 25) return '#e53e3e';
    if (value <= 40) return '#f56565';
    if (value <= 60) return '#718096';
    if (value <= 75) return '#68d391';
    return '#48bb78';
  };
  
  // Use category from data if available
  const fearGreedCategory = fearGreedData.category || getCategory(current);
  const fearGreedColor = fearGreedData.color || getColor(current);
  
  const html = `
    <div class="market-pulse-section fear-greed-container collapsible-section" data-section="fear-greed">
      <div class="collapsible-header">
        <div class="collapsible-title">Fear & Greed Index: <span style="color: ${fearGreedColor};">${current} (${fearGreedCategory})</span></div>
        <div class="collapsible-icon">▼</div>
      </div>
      <div class="collapsible-content">
        <!-- Slider -->
        <div style="margin: 20px 0; padding: 15px; background-color: #f8f9fa; border-radius: 8px;">
          <div style="position: relative; height: 40px; margin: 10px 0 30px;">
            <!-- Gradient background -->
            <div style="position: absolute; top: 0; left: 0; right: 0; height: 10px; border-radius: 5px; background: linear-gradient(to right, #e53e3e 0%, #f56565 25%, #718096 50%, #68d391 75%, #48bb78 100%);"></div>
            
            <!-- Indicator -->
            <div style="position: absolute; top: -5px; left: ${current}%; transform: translateX(-50%); width: 20px; height: 20px; background-color: #333; border: 3px solid #fff; border-radius: 50%; box-shadow: 0 2px 4px rgba(0,0,0,0.2);"></div>
            
            <!-- Labels -->
            <div style="position: absolute; top: 15px; left: 0; font-size: 0.8rem; color: #e53e3e;">Extreme Fear</div>
            <div style="position: absolute; top: 15px; left: 25%; transform: translateX(-50%); font-size: 0.8rem; color: #f56565;">Fear</div>
            <div style="position: absolute; top: 15px; left: 50%; transform: translateX(-50%); font-size: 0.8rem; color: #718096;">Neutral</div>
            <div style="position: absolute; top: 15px; left: 75%; transform: translateX(-50%); font-size: 0.8rem; color: #68d391;">Greed</div>
            <div style="position: absolute; top: 15px; right: 0; font-size: 0.8rem; color: #48bb78;">Extreme Greed</div>
          </div>
          
          <!-- Historical trend chart -->
          <div style="margin-top: 40px;">
            <h4 style="font-size: 1rem; margin-bottom: 15px; color: #2d3748;">Historical Trend</h4>
            <div style="position: relative; height: 120px; background-color: #fff; border-radius: 8px; padding: 15px; border: 1px solid #e2e8f0;">
              <!-- Background color zones -->
              <div style="position: absolute; top: 0; left: 0; width: 25%; height: 100%; background-color: rgba(229, 62, 62, 0.1); z-index: 1;"></div>
              <div style="position: absolute; top: 0; left: 25%; width: 15%; height: 100%; background-color: rgba(245, 101, 101, 0.1); z-index: 1;"></div>
              <div style="position: absolute; top: 0; left: 40%; width: 20%; height: 100%; background-color: rgba(113, 128, 150, 0.1); z-index: 1;"></div>
              <div style="position: absolute; top: 0; left: 60%; width: 15%; height: 100%; background-color: rgba(104, 211, 145, 0.1); z-index: 1;"></div>
              <div style="position: absolute; top: 0; left: 75%; width: 25%; height: 100%; background-color: rgba(72, 187, 120, 0.1); z-index: 1;"></div>
              
              <!-- Chart line -->
              <svg width="100%" height="70" style="overflow: visible; position: relative; z-index: 2;">
                <!-- Line connecting points -->
                <path d="M50,${100 - oneMonthAgo} L150,${100 - oneWeekAgo} L250,${100 - previousClose} L350,${100 - current}" 
                      stroke="#3182ce" stroke-width="3" fill="none" />
                
                <!-- Data points -->
                <circle cx="50" cy="${100 - oneMonthAgo}" r="5" fill="${getColor(oneMonthAgo)}" stroke="#fff" stroke-width="2" />
                <circle cx="150" cy="${100 - oneWeekAgo}" r="5" fill="${getColor(oneWeekAgo)}" stroke="#fff" stroke-width="2" />
                <circle cx="250" cy="${100 - previousClose}" r="5" fill="${getColor(previousClose)}" stroke="#fff" stroke-width="2" />
                <circle cx="350" cy="${100 - current}" r="7" fill="${getColor(current)}" stroke="#fff" stroke-width="2" />
              </svg>
              
              <!-- X-axis labels -->
              <div style="display: flex; justify-content: space-between; margin-top: 10px;">
                <div style="font-size: 0.8rem; color: #718096;">1 Month Ago</div>
                <div style="font-size: 0.8rem; color: #718096;">1 Week Ago</div>
                <div style="font-size: 0.8rem; color: #718096;">Yesterday</div>
                <div style="font-size: 0.8rem; color: #718096; font-weight: bold;">Today</div>
              </div>
            </div>
          </div>
        </div>
        
        ${fearGreedData.description ? `
          <div style="margin-top: 15px; line-height: 1.5; color: #4a5568; background-color: #f8f9fa; padding: 15px; border-radius: 8px;">
            ${fearGreedData.description}
          </div>
        ` : ''}
        
        <div style="font-size: 0.8rem; color: #718096; margin-top: 10px; text-align: right;">
          Source: <a href="${fearGreedData.sourceUrl || 'https://money.cnn.com/data/fear-and-greed/'}" target="_blank" style="color: #3182ce; text-decoration: none;">${fearGreedData.source || 'CNN Business Fear & Greed Index'}</a>
          ${fearGreedData.asOf ? `<br>As of: ${fearGreedData.asOf}` : ''}
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
  if (!data.marketIndicators || !data.marketIndicators.rsi) return;
  
  const rsi = data.marketIndicators.rsi;
  const rsiValue = rsi.value;
  
  addHeading(mobiledoc, 'Path of Least Resistance', 3);
  
  const rsiHtml = `
    <div class="market-pulse-section rsi-container collapsible-section" data-section="rsi">
      <div class="collapsible-header">
        <div class="collapsible-title">Relative Strength Index (14-day)</div>
        <div class="collapsible-icon">▼</div>
      </div>
      <div class="collapsible-content">
        <div style="text-align: center; margin-bottom: 10px; font-size: 1.2rem; font-weight: bold;">
          Current RSI: <span style="color: ${rsiValue > 70 ? '#e53e3e' : (rsiValue < 30 ? '#e53e3e' : (rsiValue > 50 ? '#48bb78' : '#718096'))};">${rsiValue.toFixed(1)}</span>
        </div>
        
        <div class="rsi-meter" style="position: relative; height: 20px; margin: 15px 0; border-radius: 10px; background: linear-gradient(to right, #e53e3e 0%, #e53e3e 30%, #718096 30%, #718096 50%, #718096 70%, #48bb78 70%, #48bb78 100%);">
          <div class="rsi-indicator" style="position: absolute; top: -10px; left: ${rsiValue}%; width: 0; height: 0; border-left: 10px solid transparent; border-right: 10px solid transparent; border-top: 10px solid #2d3748; transform: translateX(-10px);">
          </div>
          <div style="position: absolute; top: -30px; left: ${rsiValue}%; transform: translateX(-50%); background-color: #2d3748; color: white; padding: 2px 8px; border-radius: 4px; font-size: 0.9rem;">
            ${rsiValue.toFixed(1)}
          </div>
        </div>
        
        <div class="rsi-labels" style="display: flex; justify-content: space-between; margin-top: 5px; font-size: 0.9rem; color: #718096;">
          <div class="rsi-label">Oversold (<30)</div>
          <div class="rsi-label">Neutral</div>
          <div class="rsi-label">Overbought (>70)</div>
        </div>
        
        <div style="margin-top: 1rem; line-height: 1.5;">
          <p>Developed by J. Welles Wilder Jr. in 1978, the <a href="https://www.investopedia.com/terms/r/rsi.asp" target="_blank">Relative Strength Index (RSI)</a> is a 0–100 momentum oscillator: readings > 70 signal overbought, < 30 oversold, and 30–70 neutral (with 50 marking "no trend"). Values above 50 imply bullish momentum; below 50, bearish momentum.</p>
        </div>
        
        <div style="font-size: 0.8rem; color: #718096; margin-top: 10px; text-align: right;">
          Source: <a href="${rsi.sourceUrl || '#'}" target="_blank">${rsi.source || 'Tradier (RSI)'}</a>
          ${rsi.asOf ? `<br>As of: ${rsi.asOf}` : ''}
        </div>
      </div>
    </div>
  `;
  
  addHTML(mobiledoc, rsiHtml);
};

/**
 * Adds the Key Market Indicators section to the mobiledoc
 * @param {object} mobiledoc - The mobiledoc object to add content to
 * @param {object} data - The data object containing market indicators information
 */
const addMarketIndicators = (mobiledoc, data) => {
  if (!data.marketIndicators) return;

  // Create the main container with collapsible header
  const html = `
    <div class="market-pulse-section market-indicators-container">
      <div class="collapsible-section" data-section="market-indicators">
        <div class="collapsible-header" style="background-color: #333333; padding: 15px; border-radius: 8px; display: flex; flex-direction: column; align-items: flex-start;">
          <div style="display: flex; justify-content: space-between; width: 100%; align-items: center;">
            <h2 style="margin: 0; font-size: 1.5rem; color: white;">Key Market Indicators</h2>
            <div class="collapsible-icon" style="font-size: 14px; color: white;">▼</div>
          </div>
          <div style="margin-top: 10px; line-height: 1.5; color: white; font-size: 1rem; font-weight: normal;">
            ${data.marketIndicators.summary || 'Market indicators showing current market conditions and trends.'}
          </div>
        </div>
        <div class="collapsible-content">
  `;
  
  addHTML(mobiledoc, html);

  // Add sections in the requested order
  
  // 1. Major Indices
  addMajorIndices(mobiledoc, data);
  
  // 2. Sector Performance
  addSectorPerformance(mobiledoc, data);
  
  // 3. Market Futures
  if (data.marketIndicators.marketFutures && data.marketIndicators.marketFutures.length > 0) {
    addMarketFutures(mobiledoc, data);
  }
  
  // 4. Volatility
  if (data.marketIndicators.volatility && data.marketIndicators.volatility.length > 0) {
    addVolatilityIndices(mobiledoc, data);
  }
  
  // 5. Fear and Greed Index
  addFearGreedIndex(mobiledoc, data);
  
  // 6. RSI
  addRSI(mobiledoc, data);
  
  // Close the main container
  addHTML(mobiledoc, `
        </div>
      </div>
    </div>
  `);
  
  addDivider(mobiledoc);
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
