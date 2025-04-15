/**
 * Fundamental Metrics Section Generator
 */

/**
 * Generate the fundamental metrics section
 * @param {Object} analysis - The analysis data
 * @returns {String} HTML for the fundamental metrics section
 */
function generateFundamentalMetricsSection(analysis) {
  // Handle both data formats
  let stocks = [];
  
  if (analysis.analysis && analysis.analysis.fundamentalMetrics) {
    if (Array.isArray(analysis.analysis.fundamentalMetrics)) {
      // Old format - direct array
      stocks = analysis.analysis.fundamentalMetrics;
    } else if (analysis.analysis.fundamentalMetrics.stocks && Array.isArray(analysis.analysis.fundamentalMetrics.stocks)) {
      // New format - nested under stocks property
      stocks = analysis.analysis.fundamentalMetrics.stocks;
    }
  }
  
  if (stocks.length === 0) {
    return `
    <div style="margin-bottom: 20px; padding: 15px; background-color: #ffffff; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.12);">
      <h2 style="margin: 0 0 15px 0; padding-bottom: 10px; border-bottom: 1px solid #eaeaea; color: #2c3e50; font-size: 18px;">Fundamental Metrics</h2>
      <p>No fundamental metrics data available</p>
    </div>`;
  }
  
  // Process stocks in pairs for two cards per row
  let stockCardsHtml = '';
  for (let i = 0; i < stocks.length; i += 2) {
    const stock1 = stocks[i];
    const stock2 = i + 1 < stocks.length ? stocks[i + 1] : null;
    
    // Start row
    stockCardsHtml += `<div style="display: flex; width: 100%; gap: 15px; flex-wrap: wrap; margin-bottom: 15px;">`;
    
    // First stock card
    stockCardsHtml += formatStockCard(stock1);
    
    // Second stock card (if exists)
    if (stock2) {
      stockCardsHtml += formatStockCard(stock2);
    } else {
      // Empty placeholder to maintain layout
      stockCardsHtml += `<div style="flex: 1; min-width: 250px;"></div>`;
    }
    
    // End row
    stockCardsHtml += `</div>`;
  }
  
  return `
  <div style="margin-bottom: 20px; padding: 15px; background-color: #ffffff; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.12);">
    <h2 style="margin: 0 0 15px 0; padding-bottom: 10px; border-bottom: 1px solid #eaeaea; color: #2c3e50; font-size: 18px;">Fundamental Metrics</h2>
    
    <div style="display: flex; flex-wrap: wrap; gap: 15px;">
      ${stockCardsHtml}
    </div>
  </div>`;
}

/**
 * Format an individual stock card
 * @param {Object} stock - The stock data
 * @returns {String} HTML for the stock card
 */
function formatStockCard(stock) {
  if (!stock) return '';

  // Extract stock data
  const symbol = stock.symbol || stock.ticker || 'N/A';
  const name = stock.name || stock.companyName || 'N/A';

  // Format price (ensure $ is present but not duplicated)
  const price = stock.price || 'N/A';
  const formattedPrice = price.toString().startsWith('$') ? price : `$${price}`;

  // Format price change
  const priceChange = stock.priceChange || stock.change || '0%';
  const priceChangeValue = parseFloat(priceChange.replace('%', '').replace('+', ''));
  const priceChangeColor = priceChangeValue > 0 ? '#4caf50' : priceChangeValue < 0 ? '#f44336' : '#757575';
  const priceChangeArrow = priceChangeValue > 0 ? '▲' : priceChangeValue < 0 ? '▼' : '';
  const priceChangeFormatted = priceChangeValue > 0 ? `+${priceChange}` : priceChange;

  // PE ratio (could be pe or peRatio depending on format)
  const peRatio = stock.pe || stock.peRatio || 'N/A';

  // Market cap
  const marketCap = stock.marketCap || 'N/A';

  // Comment or analysis
  const comment = stock.comment || stock.analysis || '';

  // Source information
  const source = stock.source || 'N/A';
  const sourceUrl = stock.sourceUrl || '#';
  const lastUpdated = stock.lastUpdated || 'N/A';

  return `
  <div style="flex: 1; min-width: 250px; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
    <!-- Stock Header -->
    <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px 15px; border-bottom: 1px solid #e0e0e0; background-color: #f9f9ff;">
      <div style="font-size: 18px; font-weight: 600; color: #5e35b1;">${symbol}</div>
      <div style="font-size: 14px; color: #666; font-style: italic;">${name}</div>
    </div>
    <!-- Stock Price -->
    <div style="padding: 15px; background-color: #f5f5f5;">
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <div style="font-size: 22px; font-weight: bold;">${formattedPrice}</div>
        <div style="display: flex; align-items: center;">
          <span style="font-size: 14px; color: ${priceChangeColor}; margin-right: 4px;">${priceChangeArrow}</span>
          <span style="font-size: 14px; color: ${priceChangeColor};">${priceChangeFormatted}</span>
        </div>
      </div>
    </div>
    <!-- Fundamentals -->
    <div style="padding: 10px 15px;">
      <div style="font-size: 14px; color: #333;">
        <span style="margin-right: 16px;"><strong>P/E:</strong> ${peRatio}</span>
        <span><strong>Market Cap:</strong> ${marketCap}</span>
      </div>
      ${comment ? `<div style=\"margin-top: 8px; color: #5e35b1; font-size: 13px; font-style: italic;\">${comment}</div>` : ''}
    </div>
    <!-- Source and Timestamp -->
    <div style="padding: 8px 15px 10px 15px; font-size: 12px; color: #888; background: #fafafa; border-top: 1px solid #e0e0e0;">
      <span>Source: <a href="${sourceUrl}" style="color: #5e35b1; text-decoration: underline;">${source}</a></span>
      <span style="float: right;">${lastUpdated}</span>
    </div>
  </div>
  `;
}

module.exports = generateFundamentalMetricsSection;
