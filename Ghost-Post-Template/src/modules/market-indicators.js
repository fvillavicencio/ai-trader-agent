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
const addMarketIndices = (mobiledoc, data) => {
  if (!data.marketIndicators || !data.marketIndicators.indices || data.marketIndicators.indices.length === 0) return;
  
  addHeading(mobiledoc, 'Major Indices', 3);
  
  const indicesHtml = `
    <div class="market-pulse-section indices-container collapsible-section" data-section="indices">
      <div class="collapsible-header">
        <div class="collapsible-title">Major Indices</div>
        <div class="collapsible-icon">▼</div>
      </div>
      <div class="collapsible-content">
        <div class="indices-grid">
          ${data.marketIndicators.indices.map(index => {
            const changeColor = index.change >= 0 ? '#48bb78' : '#e53e3e';
            const changeSign = index.change >= 0 ? '+' : '';
            const changeIcon = index.change >= 0 ? '↑' : '↓';
            
            return `
              <div class="index-card">
                <div class="index-name">${index.name}</div>
                <div class="index-value">${formatNumber(index.value)}</div>
                <div class="index-change" style="color: ${changeColor};">
                  ${changeSign}${index.change}% ${changeIcon}
                </div>
              </div>
            `;
          }).join('')}
        </div>
        
        <div style="font-size: 0.8rem; color: #718096; margin-top: 10px; text-align: right;">
          Source: <a href="${data.marketIndicators.indices[0]?.sourceUrl || '#'}" target="_blank">${data.marketIndicators.indices[0]?.source || 'Market Data Providers'}</a>
          ${data.marketIndicators.indices[0]?.asOf ? `<br>As of: ${data.marketIndicators.indices[0].asOf}` : ''}
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
  
  addHeading(mobiledoc, 'Sector Performance', 3);
  
  const sectorPerformanceHtml = `
    <div class="market-pulse-section sector-performance-container collapsible-section" data-section="sector-performance">
      <div class="collapsible-header">
        <div class="collapsible-title">Sector Performance</div>
        <div class="collapsible-icon">▼</div>
      </div>
      <div class="collapsible-content">
        <div class="sector-performance-grid">
          ${data.marketIndicators.sectorPerformance.map(sector => {
            const changeColor = sector.change >= 0 ? '#48bb78' : '#e53e3e';
            const changeSign = sector.change >= 0 ? '+' : '';
            
            return `
              <div class="sector-card">
                <div class="sector-name">${sector.name}</div>
                <div class="sector-change" style="color: ${changeColor};">
                  ${changeSign}${sector.change}%
                </div>
              </div>
            `;
          }).join('')}
        </div>
        
        <div style="font-size: 0.8rem; color: #718096; margin-top: 10px; text-align: right;">
          Source: <a href="${data.marketIndicators.sectorPerformance[0]?.sourceUrl || '#'}" target="_blank">${data.marketIndicators.sectorPerformance[0]?.source || 'Market Data Providers'}</a>
          ${data.marketIndicators.sectorPerformance[0]?.asOf ? `<br>As of: ${data.marketIndicators.sectorPerformance[0].asOf}` : ''}
        </div>
      </div>
    </div>
  `;
  
  addHTML(mobiledoc, sectorPerformanceHtml);
};

/**
 * Adds the Market Futures section to the mobiledoc
 * @param {object} mobiledoc - The mobiledoc object to add content to
 * @param {object} data - The data object containing market futures information
 */
const addMarketFutures = (mobiledoc, data) => {
  if (!data.marketIndicators || !data.marketIndicators.marketFutures || data.marketIndicators.marketFutures.length === 0) return;
  
  addHeading(mobiledoc, 'Market Futures', 3);
  
  const futuresHtml = `
    <div class="market-pulse-section futures-container collapsible-section" data-section="futures">
      <div class="collapsible-header">
        <div class="collapsible-title">Market Futures</div>
        <div class="collapsible-icon">▼</div>
      </div>
      <div class="collapsible-content">
        <div class="futures-grid">
          ${data.marketIndicators.marketFutures.map(future => {
            const isPositive = future.change > 0 || future.isPositive;
            return `
              <div class="futures-card" style="background-color: #f8f9fa; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); padding: 15px; border-left: 4px solid ${isPositive ? '#48bb78' : '#e53e3e'};">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                  <div style="font-weight: bold; font-size: 1.1rem; color: #2c5282;">${future.name}</div>
                  <div style="font-weight: 500; color: ${isPositive ? '#48bb78' : '#e53e3e'};">
                    ${isPositive ? '+' : ''}${future.change}%
                  </div>
                </div>
                ${future.price ? `
                  <div style="margin-top: 5px; font-size: 0.9rem; color: #4a5568;">
                    Price: ${future.price}
                  </div>
                ` : ''}
              </div>
            `;
          }).join('')}
        </div>
        
        <div style="font-size: 0.8rem; color: #718096; margin-top: 10px; text-align: right;">
          Source: <a href="${data.marketIndicators.marketFutures.sourceUrl || '#'}" target="_blank">${data.marketIndicators.marketFutures.source || 'Market Data Providers'}</a>
          ${data.marketIndicators.marketFutures.asOf ? `<br>As of: ${data.marketIndicators.marketFutures.asOf}` : ''}
        </div>
      </div>
    </div>
  `;
  
  addHTML(mobiledoc, futuresHtml);
};

/**
 * Adds the Fear & Greed Index section to the mobiledoc
 * @param {object} mobiledoc - The mobiledoc object to add content to
 * @param {object} data - The data object containing fear & greed index information
 */
const addFearGreedIndex = (mobiledoc, data) => {
  // Check for either fearGreedIndex or fearAndGreed in the data
  const fearGreedData = data.fearGreedIndex || data.marketIndicators?.fearAndGreed;
  if (!fearGreedData) return;
  
  const fearGreedValue = fearGreedData.value || 0;
  
  // Determine the category based on the value
  let fearGreedCategory;
  let fearGreedColor;
  
  if (fearGreedValue <= 25) {
    fearGreedCategory = 'Extreme Fear';
    fearGreedColor = '#e53e3e';
  } else if (fearGreedValue <= 40) {
    fearGreedCategory = 'Fear';
    fearGreedColor = '#f56565';
  } else if (fearGreedValue <= 60) {
    fearGreedCategory = 'Neutral';
    fearGreedColor = '#718096';
  } else if (fearGreedValue <= 75) {
    fearGreedCategory = 'Greed';
    fearGreedColor = '#68d391';
  } else {
    fearGreedCategory = 'Extreme Greed';
    fearGreedColor = '#48bb78';
  }
  
  // Use category from data if available
  if (fearGreedData.category) {
    fearGreedCategory = fearGreedData.category;
  }
  
  addHeading(mobiledoc, 'Fear & Greed Index', 3);
  
  const fearGreedHtml = `
    <div class="market-pulse-section fear-greed-container collapsible-section" data-section="fear-greed">
      <div class="collapsible-header">
        <div class="collapsible-title">Fear & Greed Index: <span style="color: ${fearGreedColor};">${fearGreedValue} (${fearGreedCategory})</span></div>
        <div class="collapsible-icon">▼</div>
      </div>
      <div class="collapsible-content">
        <div class="fear-greed-meter">
          <div class="fear-greed-indicator" style="left: ${fearGreedValue}%;"></div>
        </div>
        
        <div class="fear-greed-labels">
          <div>Extreme Fear</div>
          <div>Fear</div>
          <div>Neutral</div>
          <div>Greed</div>
          <div>Extreme Greed</div>
        </div>
        
        <div style="margin-top: 20px;">
          <div style="font-weight: bold; margin-bottom: 10px;">Historical Comparison</div>
          <div style="display: flex; flex-wrap: wrap; gap: 15px;">
            <div style="flex: 1 1 150px; min-width: 0; background-color: white; padding: 10px; border-radius: 4px; box-shadow: 0 1px 2px rgba(0,0,0,0.05);">
              <div style="font-size: 0.9rem; color: #718096;">Previous Day</div>
              <div style="font-weight: 500; margin-top: 5px;">${fearGreedData.previousDay || fearGreedData.previousValue || 'N/A'}</div>
            </div>
            <div style="flex: 1 1 150px; min-width: 0; background-color: white; padding: 10px; border-radius: 4px; box-shadow: 0 1px 2px rgba(0,0,0,0.05);">
              <div style="font-size: 0.9rem; color: #718096;">One Week Ago</div>
              <div style="font-weight: 500; margin-top: 5px;">${fearGreedData.oneWeekAgo || 'N/A'}</div>
            </div>
            <div style="flex: 1 1 150px; min-width: 0; background-color: white; padding: 10px; border-radius: 4px; box-shadow: 0 1px 2px rgba(0,0,0,0.05);">
              <div style="font-size: 0.9rem; color: #718096;">One Month Ago</div>
              <div style="font-weight: 500; margin-top: 5px;">${fearGreedData.oneMonthAgo || 'N/A'}</div>
            </div>
          </div>
        </div>
        
        ${fearGreedData.description ? `
          <div style="margin-top: 20px; line-height: 1.5;">
            ${fearGreedData.description}
          </div>
        ` : ''}
        
        <div style="font-size: 0.8rem; color: #718096; margin-top: 15px; text-align: right;">
          Source: <a href="${fearGreedData.sourceUrl || '#'}" target="_blank">${fearGreedData.source || 'CNN Money Fear & Greed Index'}</a>
          ${fearGreedData.asOf ? `<br>As of: ${fearGreedData.asOf}` : ''}
        </div>
      </div>
    </div>
  `;
  
  addHTML(mobiledoc, fearGreedHtml);
};

/**
 * Adds the Volatility Indices section to the mobiledoc
 * @param {object} mobiledoc - The mobiledoc object to add content to
 * @param {object} data - The data object containing volatility indices information
 */
const addVolatilityIndices = (mobiledoc, data) => {
  if (!data.marketIndicators || !data.marketIndicators.volatilityIndices || data.marketIndicators.volatilityIndices.length === 0) return;
  
  addHeading(mobiledoc, 'Volatility Indices', 3);
  
  const volatilityHtml = `
    <div class="market-pulse-section">
      ${data.marketIndicators.volatilityIndices.map(index => {
        const trend = index.trend || '';
        const trendColor = trend.toLowerCase().includes('rising') ? '#f87171' : '#10b981';
        
        return `
          <div style="display: flex; justify-content: space-between; align-items: center; padding: 15px 0; border-bottom: 1px solid #e2e8f0;">
            <div style="display: flex; align-items: center;">
              <div style="width: 4px; height: 24px; background-color: #f87171; margin-right: 15px;"></div>
              <div style="font-weight: 500;">${index.name}</div>
            </div>
            <div style="display: flex; align-items: center;">
              <div style="font-weight: 500; margin-right: 10px;">${index.value}</div>
              <div style="color: ${trendColor};">↑ ${trend}</div>
            </div>
          </div>
        `;
      }).join('')}
      
      <div style="font-size: 0.8rem; color: #718096; margin-top: 10px; text-align: right;">
        Source: <a href="${data.marketIndicators.volatilityIndices[0]?.sourceUrl || '#'}" target="_blank">${data.marketIndicators.volatilityIndices[0]?.source || 'Yahoo Finance'}</a>, as of ${data.marketIndicators.volatilityIndices[0]?.asOf || 'April 30, 2025 at 6:55 PM EDT'}
      </div>
    </div>
  `;
  
  addHTML(mobiledoc, volatilityHtml);
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
        <div class="collapsible-title">Relative Strength Index (14-day): <span style="color: ${rsiValue > 50 ? '#48bb78' : '#e53e3e'};">${rsiValue.toFixed(1)}</span></div>
        <div class="collapsible-icon">▼</div>
      </div>
      <div class="collapsible-content">
        <div class="rsi-meter">
          <div class="rsi-indicator" style="left: ${rsiValue}%;"></div>
        </div>
        
        <div class="rsi-labels">
          <div class="rsi-label">Oversold</div>
          <div class="rsi-label">Neutral</div>
          <div class="rsi-label">Overbought</div>
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
 * Adds all Market Indicators sections to the mobiledoc
 * @param {object} mobiledoc - The mobiledoc object to add content to
 * @param {object} data - The data object containing all market indicators information
 */
const addMarketIndicators = (mobiledoc, data) => {
  if (!data.marketIndicators) return;
  
  addHeading(mobiledoc, 'Market Indicators', 2);
  
  // Add each section in order
  addMarketIndices(mobiledoc, data);
  addSectorPerformance(mobiledoc, data);
  addMarketFutures(mobiledoc, data);
  addFearGreedIndex(mobiledoc, data);
  addVolatilityIndices(mobiledoc, data);
  addRSI(mobiledoc, data);
  
  addDivider(mobiledoc);
};

module.exports = { 
  addMarketIndicators,
  addMarketIndices,
  addSectorPerformance,
  addMarketFutures,
  addFearGreedIndex,
  addVolatilityIndices,
  addRSI
};
