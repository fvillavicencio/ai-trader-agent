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
 * Adds the S&P 500 Analysis section to the mobiledoc
 * @param {object} mobiledoc - The mobiledoc object to add content to
 * @param {object} data - The data object containing S&P 500 analysis information
 */
const addSP500Analysis = (mobiledoc, data) => {
  if (!data.sp500Analysis) return;
  
  addHeading(mobiledoc, 'S&P 500 Analysis', 2);
  
  const sp500Analysis = data.sp500Analysis;
  
  const sp500Html = `
    <div class="market-pulse-section sp500-analysis-container collapsible-section" data-section="sp500-analysis">
      <div class="collapsible-header">
        <div class="collapsible-title">S&P 500: <span style="color: ${sp500Analysis.change >= 0 ? '#48bb78' : '#e53e3e'};">${sp500Analysis.price.toFixed(2)} ${sp500Analysis.change >= 0 ? '↑' : '↓'} ${Math.abs(sp500Analysis.change).toFixed(2)}%</span></div>
        <div class="collapsible-icon">▼</div>
      </div>
      <div class="collapsible-content">
        <div style="display: flex; flex-wrap: wrap; gap: 20px; margin-bottom: 20px;">
          <!-- Left column - Technical Analysis -->
          <div style="flex: 1 1 400px; min-width: 0;">
            <div style="background-color: #f8f9fa; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); padding: 15px; border-left: 4px solid #3182ce; margin-bottom: 20px;">
              <div style="font-weight: bold; font-size: 1.1rem; color: #2c5282; margin-bottom: 10px;">
                Technical Analysis
              </div>
              
              <!-- Support & Resistance Levels -->
              <div style="margin-bottom: 15px;">
                <div style="font-weight: 500; margin-bottom: 5px;">Support & Resistance Levels:</div>
                <div style="display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 10px;">
                  <div style="flex: 1; min-width: 0;">
                    <div style="font-size: 0.9rem; color: #718096;">Support</div>
                    <div style="display: flex; flex-direction: column;">
                      ${sp500Analysis.supportLevels ? sp500Analysis.supportLevels.map(level => `
                        <div style="margin-top: 5px; font-weight: 500;">${level}</div>
                      `).join('') : ''}
                    </div>
                  </div>
                  <div style="flex: 1; min-width: 0;">
                    <div style="font-size: 0.9rem; color: #718096;">Resistance</div>
                    <div style="display: flex; flex-direction: column;">
                      ${sp500Analysis.resistanceLevels ? sp500Analysis.resistanceLevels.map(level => `
                        <div style="margin-top: 5px; font-weight: 500;">${level}</div>
                      `).join('') : ''}
                    </div>
                  </div>
                </div>
              </div>
              
              <!-- Moving Averages -->
              <div style="margin-bottom: 15px;">
                <div style="font-weight: 500; margin-bottom: 5px;">Moving Averages:</div>
                <div style="display: flex; flex-wrap: wrap; gap: 10px;">
                  ${sp500Analysis.movingAverages ? Object.entries(sp500Analysis.movingAverages).map(([period, value]) => `
                    <div style="flex: 1 1 100px; min-width: 0; background-color: white; padding: 8px; border-radius: 4px; box-shadow: 0 1px 2px rgba(0,0,0,0.05);">
                      <div style="font-size: 0.9rem; color: #718096;">${period}</div>
                      <div style="font-weight: 500; margin-top: 3px;">${value}</div>
                    </div>
                  `).join('') : ''}
                </div>
              </div>
            </div>
          </div>
          
          <!-- Right column - Market Breadth -->
          <div style="flex: 1 1 400px; min-width: 0;">
            <div style="background-color: #f8f9fa; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); padding: 15px; border-left: 4px solid #3182ce; margin-bottom: 20px;">
              <div style="font-weight: bold; font-size: 1.1rem; color: #2c5282; margin-bottom: 10px;">
                Market Breadth
              </div>
              
              <!-- Advance/Decline -->
              <div style="margin-bottom: 15px;">
                <div style="font-weight: 500; margin-bottom: 5px;">Advance/Decline:</div>
                <div style="display: flex; gap: 15px;">
                  <div style="flex: 1; min-width: 0; background-color: white; padding: 10px; border-radius: 4px; box-shadow: 0 1px 2px rgba(0,0,0,0.05);">
                    <div style="font-size: 0.9rem; color: #718096;">Advancing</div>
                    <div style="font-weight: 500; margin-top: 3px; color: #48bb78;">${sp500Analysis.marketBreadth?.advancing || 'N/A'}</div>
                  </div>
                  <div style="flex: 1; min-width: 0; background-color: white; padding: 10px; border-radius: 4px; box-shadow: 0 1px 2px rgba(0,0,0,0.05);">
                    <div style="font-size: 0.9rem; color: #718096;">Declining</div>
                    <div style="font-weight: 500; margin-top: 3px; color: #e53e3e;">${sp500Analysis.marketBreadth?.declining || 'N/A'}</div>
                  </div>
                </div>
              </div>
              
              <!-- New Highs/Lows -->
              <div style="margin-bottom: 15px;">
                <div style="font-weight: 500; margin-bottom: 5px;">New Highs/Lows:</div>
                <div style="display: flex; gap: 15px;">
                  <div style="flex: 1; min-width: 0; background-color: white; padding: 10px; border-radius: 4px; box-shadow: 0 1px 2px rgba(0,0,0,0.05);">
                    <div style="font-size: 0.9rem; color: #718096;">New Highs</div>
                    <div style="font-weight: 500; margin-top: 3px; color: #48bb78;">${sp500Analysis.marketBreadth?.newHighs || 'N/A'}</div>
                  </div>
                  <div style="flex: 1; min-width: 0; background-color: white; padding: 10px; border-radius: 4px; box-shadow: 0 1px 2px rgba(0,0,0,0.05);">
                    <div style="font-size: 0.9rem; color: #718096;">New Lows</div>
                    <div style="font-weight: 500; margin-top: 3px; color: #e53e3e;">${sp500Analysis.marketBreadth?.newLows || 'N/A'}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Source Information -->
        <div style="font-size: 0.8rem; color: #718096; margin-top: 10px; text-align: right;">
          Source: <a href="${sp500Analysis.sourceUrl || '#'}" target="_blank">${sp500Analysis.source || 'Market Data Providers'}</a>
          ${sp500Analysis.asOf ? `<br>As of: ${sp500Analysis.asOf}` : ''}
        </div>
      </div>
    </div>
  `;
  
  addHTML(mobiledoc, sp500Html);
  addDivider(mobiledoc);
};

/**
 * Adds the Top 5 Weighted Stocks section to the mobiledoc
 * @param {object} mobiledoc - The mobiledoc object to add content to
 * @param {object} data - The data object containing top holdings information
 */
const addTopWeightedStocks = (mobiledoc, data) => {
  if (!data.marketIndicators || !data.marketIndicators.topHoldings || data.marketIndicators.topHoldings.length === 0) return;
  
  addHeading(mobiledoc, 'Top 5 Weighted Stocks in Major Indices', 3);
  
  const topHoldingsHtml = `
    <div class="market-pulse-section top-holdings-container collapsible-section" data-section="top-holdings">
      <div class="collapsible-header">
        <div class="collapsible-title">Top 5 Weighted Stocks in Major Indices</div>
        <div class="collapsible-icon">▼</div>
      </div>
      <div class="collapsible-content">
        <div style="display: flex; flex-wrap: wrap; gap: 15px; justify-content: space-between;">
          <div style="flex: 1 1 300px; min-width: 0; background-color: #f8f9fa; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); padding: 15px; border-left: 4px solid #3182ce;">
            <div style="font-weight: bold; font-size: 1.1rem; color: #2c5282; margin-bottom: 10px;">
              S&P 500 (SPY)
            </div>
            <div style="font-weight: 500; margin-bottom: 5px;">Top 5 Holdings:</div>
            <div style="display: flex; flex-direction: column; gap: 8px;">
              ${data.marketIndicators.topHoldings
                .filter(etf => etf.index === 'S&P 500' || etf.symbol === 'SPY')
                .flatMap(etf => etf.holdings || [])
                .slice(0, 5)
                .map(holding => `
                  <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div>
                      <span style="color: #3182ce; font-weight: 500;">${holding.symbol}</span>
                      <span style="margin-left: 5px; font-size: 0.9rem;">${holding.name}</span>
                    </div>
                    <div style="font-weight: 500;">${holding.weight}%</div>
                  </div>
                `).join('')}
            </div>
            <div style="font-size: 0.8rem; color: #718096; margin-top: 15px; text-align: right;">
              Source: <a href="${data.marketIndicators.topHoldings[0]?.sourceUrl || '#'}" target="_blank">${data.marketIndicators.topHoldings[0]?.source || 'State Street Global Advisors'}</a>
              ${data.marketIndicators.topHoldings[0]?.asOf ? `<br>As of: ${data.marketIndicators.topHoldings[0].asOf}` : ''}
            </div>
          </div>
          
          <div style="flex: 1 1 300px; min-width: 0; background-color: #f8f9fa; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); padding: 15px; border-left: 4px solid #3182ce;">
            <div style="font-weight: bold; font-size: 1.1rem; color: #2c5282; margin-bottom: 10px;">
              NASDAQ 100 (QQQ)
            </div>
            <div style="font-weight: 500; margin-bottom: 5px;">Top 5 Holdings:</div>
            <div style="display: flex; flex-direction: column; gap: 8px;">
              ${data.marketIndicators.topHoldings
                .filter(etf => etf.index === 'NASDAQ 100' || etf.symbol === 'QQQ')
                .flatMap(etf => etf.holdings || [])
                .slice(0, 5)
                .map(holding => `
                  <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div>
                      <span style="color: #3182ce; font-weight: 500;">${holding.symbol}</span>
                      <span style="margin-left: 5px; font-size: 0.9rem;">${holding.name}</span>
                    </div>
                    <div style="font-weight: 500;">${holding.weight}%</div>
                  </div>
                `).join('')}
            </div>
            <div style="font-size: 0.8rem; color: #718096; margin-top: 15px; text-align: right;">
              Source: <a href="${data.marketIndicators.topHoldings[0]?.sourceUrl || '#'}" target="_blank">${data.marketIndicators.topHoldings[0]?.source || 'Invesco'}</a>
              ${data.marketIndicators.topHoldings[0]?.asOf ? `<br>As of: ${data.marketIndicators.topHoldings[0].asOf}` : ''}
            </div>
          </div>
          
          <div style="flex: 1 1 300px; min-width: 0; background-color: #f8f9fa; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); padding: 15px; border-left: 4px solid #3182ce;">
            <div style="font-weight: bold; font-size: 1.1rem; color: #2c5282; margin-bottom: 10px;">
              Dow Jones 30 (DIA)
            </div>
            <div style="font-weight: 500; margin-bottom: 5px;">Top 5 Holdings:</div>
            <div style="display: flex; flex-direction: column; gap: 8px;">
              ${data.marketIndicators.topHoldings
                .filter(etf => etf.index === 'Dow Jones' || etf.symbol === 'DIA')
                .flatMap(etf => etf.holdings || [])
                .slice(0, 5)
                .map(holding => `
                  <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div>
                      <span style="color: #3182ce; font-weight: 500;">${holding.symbol}</span>
                      <span style="margin-left: 5px; font-size: 0.9rem;">${holding.name}</span>
                    </div>
                    <div style="font-weight: 500;">${holding.weight}%</div>
                  </div>
                `).join('')}
            </div>
            <div style="font-size: 0.8rem; color: #718096; margin-top: 15px; text-align: right;">
              Source: <a href="${data.marketIndicators.topHoldings[0]?.sourceUrl || '#'}" target="_blank">${data.marketIndicators.topHoldings[0]?.source || 'State Street Global Advisors'}</a>
              ${data.marketIndicators.topHoldings[0]?.asOf ? `<br>As of: ${data.marketIndicators.topHoldings[0].asOf}` : ''}
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
  
  addHTML(mobiledoc, topHoldingsHtml);
};

/**
 * Adds the Stock Cards section to the mobiledoc
 * @param {object} mobiledoc - The mobiledoc object to add content to
 * @param {object} data - The data object containing stock information
 */
const addStockCards = (mobiledoc, data) => {
  // Add Top Stocks
  if (data.marketIndicators && data.marketIndicators.topStocks && data.marketIndicators.topStocks.length > 0) {
    addHeading(mobiledoc, 'Top Performing Stocks', 3);
    
    const topStocksHtml = `
      <div class="market-pulse-section">
        <div class="stock-cards-grid">
          ${data.marketIndicators.topStocks.map(stock => {
            const changeColor = stock.change >= 0 ? '#38a169' : '#e53e3e';
            const changeClass = stock.change >= 0 ? 'positive' : 'negative';
            const changeSign = stock.change >= 0 ? '+' : '';
            const changeIcon = stock.change >= 0 ? '↑' : '↓';
            
            return `
              <div class="stock-card ${changeClass}">
                <div class="stock-header">
                  <div>
                    <div class="stock-symbol">${stock.symbol}</div>
                    <div class="stock-name">${stock.name || ''}</div>
                  </div>
                  <div class="stock-price">
                    <div>${stock.price ? `$${stock.price.toFixed(2)}` : 'N/A'}</div>
                    <div style="color: ${changeColor};">${changeSign}${stock.change ? `${stock.change.toFixed(2)}%` : 'N/A'} ${changeIcon}</div>
                  </div>
                </div>
                
                <div class="stock-metrics">
                  ${stock.volume ? `
                    <div class="metric-item">
                      <div class="metric-label">Volume</div>
                      <div class="metric-value">${formatNumber(stock.volume)}</div>
                    </div>
                  ` : ''}
                  
                  ${stock.marketCap ? `
                    <div class="metric-item">
                      <div class="metric-label">Market Cap</div>
                      <div class="metric-value">${formatCurrency(stock.marketCap)}</div>
                    </div>
                  ` : ''}
                  
                  ${stock.pe ? `
                    <div class="metric-item">
                      <div class="metric-label">P/E Ratio</div>
                      <div class="metric-value">${stock.pe.toFixed(2)}</div>
                    </div>
                  ` : ''}
                  
                  ${stock.sector ? `
                    <div class="metric-item">
                      <div class="metric-label">Sector</div>
                      <div class="metric-value">${stock.sector}</div>
                    </div>
                  ` : ''}
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
    
    addHTML(mobiledoc, topStocksHtml);
  }
  
  // Add Bottom Stocks
  if (data.marketIndicators && data.marketIndicators.bottomStocks && data.marketIndicators.bottomStocks.length > 0) {
    addHeading(mobiledoc, 'Bottom Performing Stocks', 3);
    
    const bottomStocksHtml = `
      <div class="market-pulse-section">
        <div class="stock-cards-grid">
          ${data.marketIndicators.bottomStocks.map(stock => {
            const changeColor = stock.change >= 0 ? '#38a169' : '#e53e3e';
            const changeClass = stock.change >= 0 ? 'positive' : 'negative';
            const changeSign = stock.change >= 0 ? '+' : '';
            const changeIcon = stock.change >= 0 ? '↑' : '↓';
            
            return `
              <div class="stock-card ${changeClass}">
                <div class="stock-header">
                  <div>
                    <div class="stock-symbol">${stock.symbol}</div>
                    <div class="stock-name">${stock.name || ''}</div>
                  </div>
                  <div class="stock-price">
                    <div>${stock.price ? `$${stock.price.toFixed(2)}` : 'N/A'}</div>
                    <div style="color: ${changeColor};">${changeSign}${stock.change ? `${stock.change.toFixed(2)}%` : 'N/A'} ${changeIcon}</div>
                  </div>
                </div>
                
                <div class="stock-metrics">
                  ${stock.volume ? `
                    <div class="metric-item">
                      <div class="metric-label">Volume</div>
                      <div class="metric-value">${formatNumber(stock.volume)}</div>
                    </div>
                  ` : ''}
                  
                  ${stock.marketCap ? `
                    <div class="metric-item">
                      <div class="metric-label">Market Cap</div>
                      <div class="metric-value">${formatCurrency(stock.marketCap)}</div>
                    </div>
                  ` : ''}
                  
                  ${stock.pe ? `
                    <div class="metric-item">
                      <div class="metric-label">P/E Ratio</div>
                      <div class="metric-value">${stock.pe.toFixed(2)}</div>
                    </div>
                  ` : ''}
                  
                  ${stock.sector ? `
                    <div class="metric-item">
                      <div class="metric-label">Sector</div>
                      <div class="metric-value">${stock.sector}</div>
                    </div>
                  ` : ''}
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
    
    addHTML(mobiledoc, bottomStocksHtml);
  }
};

/**
 * Adds all Fundamental Metrics sections to the mobiledoc
 * @param {object} mobiledoc - The mobiledoc object to add content to
 * @param {object} data - The data object containing all fundamental metrics information
 */
const addFundamentalMetrics = (mobiledoc, data) => {
  addHeading(mobiledoc, 'Fundamental Metrics', 2);
  
  // Add each section in order
  addSP500Analysis(mobiledoc, data);
  addTopWeightedStocks(mobiledoc, data);
  addStockCards(mobiledoc, data);
  
  addDivider(mobiledoc);
};

module.exports = {
  addFundamentalMetrics,
  addSP500Analysis,
  addTopWeightedStocks,
  addStockCards
};
