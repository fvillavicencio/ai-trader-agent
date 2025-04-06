/**
 * Generates the fundamental metrics section HTML
 * 
 * @param {Object} analysis - The analysis data
 * @return {String} HTML for the fundamental metrics section
 */
function generateFundamentalMetricsSection(analysis) {
  try {
    // Get the fundamental metrics data from the cache
    const cache = CacheService.getScriptCache();
    const cachedDataJson = cache.get('allData');
    
    if (!cachedDataJson) {
      Logger.log("No cached data found for fundamental metrics");
      return "";
    }
    
    const cachedData = JSON.parse(cachedDataJson);
    const fundamentalMetricsData = cachedData?.fundamentalMetrics?.metrics?.metrics;
    
    if (!fundamentalMetricsData) {
      Logger.log("No fundamental metrics data available in cached data");
      return "";
    }

    // Organize stocks into categories
    const majorIndices = [];
    const magSeven = [];
    const otherStocks = [];
    
    // Define category symbols
    const indicesSymbols = ['SPY', 'QQQ', 'DIA', 'IWM'];
    const magSevenSymbols = ['AAPL', 'MSFT', 'GOOGL', 'GOOG', 'AMZN', 'META', 'NVDA', 'TSLA'];

    // Sort stocks into categories
    Object.entries(fundamentalMetricsData).forEach(([symbol, metrics]) => {
      if (indicesSymbols.includes(symbol)) {
        majorIndices.push(metrics);
      } else if (magSevenSymbols.includes(symbol)) {
        magSeven.push(metrics);
      } else {
        otherStocks.push(metrics);
      }
    });

    // Generate HTML for each category
    const generateStocksSection = (stocks, title) => {
      if (!stocks || stocks.length === 0) return '';
      
      return `
        <div class="subsection">
          <h3>${title}</h3>
          <div class="stocks-grid">
            ${stocks.map(stock => {
              // Get the color based on price change
              const getColor = (value) => {
                if (typeof value !== 'number') return '#555';
                return value >= 0 ? '#4CAF50' : '#f44336';
              };

              // Create metric items only for non-N/A values
              const createMetricItem = (label, value, suffix = '') => {
                if (value === 'N/A' || value === null || value === undefined) return '';
                return `
                  <div style="display: flex; justify-content: space-between; margin-bottom: 5px; flex-wrap: wrap;">
                    <div style="color: #000; min-width: 80px;">${label}</div>
                    <div style="font-weight: bold; text-align: right; color: #000; overflow: hidden; text-overflow: ellipsis;">${formatNumberWithSuffix(value, suffix)}</div>
                  </div>
                `;
              };

              return `
                <div class="stock-card">
                  <div style="flex: 1; border-radius: 6px; overflow: hidden; box-shadow: none; max-width: 100%; border: 1px solid ${getColor(stock.priceChange)};">
                    <div style="display: flex; justify-content: space-between; padding: 10px; background-color: #f8f9fa; align-items: center; overflow: hidden;">
                      <div style="font-weight: bold; font-size: 16px; color: #000;">${stock.symbol}</div>
                      <div style="font-size: 14px; color: #000; max-width: 60%; text-overflow: ellipsis; overflow: hidden; white-space: nowrap;">${stock.company || 'N/A'}${stock.sector ? ` - ${stock.sector}` : ''}${stock.industry ? ` - ${stock.industry}` : ''}</div>
                    </div>
                    <div style="padding: 15px; background-color: white; overflow: hidden;">
                      <div style="display: flex; align-items: baseline; margin-bottom: 5px; flex-wrap: wrap;">
                        <div style="font-size: 18px; font-weight: bold; color: #000; margin-right: 10px;">$${formatNumberWithSuffix(stock.price, '')}</div>
                        <div style="color: ${getColor(stock.priceChange)}; font-weight: bold;">
                          <span style="margin-right: 3px;">${stock.priceChange >= 0 ? '↑' : '↓'}</span>
                          ${typeof stock.priceChange === 'number' ? (stock.priceChange >= 0 ? '+' : '') + stock.priceChange.toFixed(2) + '%' : stock.priceChange || 'N/A'}
                        </div>
                      </div>
                      
                      <div style="margin-top: 10px; max-width: 100%; overflow: hidden;">
                        ${createMetricItem('Market Cap', stock.marketCap, 'B')}
                        ${createMetricItem('P/E Ratio', stock.peRatio)}
                        ${createMetricItem('Forward PE', stock.forwardPE)}
                        ${createMetricItem('PEG Ratio', stock.pegRatio)}
                        ${createMetricItem('Price/Book', stock.priceToBook)}
                        ${createMetricItem('Price/Sales', stock.priceToSales)}
                        ${createMetricItem('Debt/Equity', stock.debtToEquity)}
                        ${createMetricItem('ROE', stock.returnOnEquity)}
                        ${createMetricItem('ROA', stock.returnOnAssets)}
                        ${createMetricItem('Profit Margin', stock.profitMargin)}
                        ${createMetricItem('Dividend Yield', stock.dividendYield)}
                      </div>
                      
                      ${stock.summary ? `<div style="margin-top: 10px; font-style: italic; font-size: 13px; color: ${getColor(stock.priceChange)}; border-left: 3px solid #ddd; padding-left: 10px;">${stock.summary}</div>` : ''}
                      
                      <div style="font-size: 11px; color: #888; margin-top: 10px; text-align: right;">Last updated: ${formatDate(stock.lastUpdated)}</div>
                    </div>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      `;
    };

    // Generate HTML for all categories
    const html = `
      <div class="section">
        <h2>Fundamental Metrics</h2>
        ${generateStocksSection(majorIndices, 'Major Indices')}
        ${generateStocksSection(magSeven, 'Magnificent Seven')}
        ${generateStocksSection(otherStocks, 'Other Stocks')}
      </div>
    `;

    return html;
  } catch (error) {
    Logger.log("Error generating fundamental metrics section: " + error);
    return `
      <div class="section">
        <h2>Fundamental Metrics</h2>
        <p>Error generating fundamental metrics section: ${error}</p>
      </div>
    `;
  }
}
