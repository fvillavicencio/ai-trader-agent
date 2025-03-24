/**
 * Updated sections for the preferred email template
 * Incorporating elements from the original template
 */

/**
 * Generate the market sentiment section
 * @param {Object} analysis - Analysis data
 * @returns {String} Market sentiment section HTML
 */
function generateMarketSentimentSection(analysis) {
  // Get sentiment data, handling both sentiment and marketSentiment fields
  const sentimentData = analysis.analysis.marketSentiment || analysis.analysis.sentiment || {};
  const overallSentiment = sentimentData.overall || 'Neutral';
  const analysts = sentimentData.analysts || [];
  
  // Determine sentiment color
  let sentimentColor = '#FFA500'; // Orange for neutral
  if (overallSentiment.toLowerCase().includes('bullish')) {
    sentimentColor = '#4caf50'; // Green
  } else if (overallSentiment.toLowerCase().includes('bearish')) {
    sentimentColor = '#f44336'; // Red
  }
  
  // Generate sentiment circle
  const sentimentCircleHtml = `
    <div style="text-align: center; margin-bottom: 20px;">
      <div style="display: inline-block; width: 100px; height: 100px; border-radius: 50%; background-color: #f5f5f5; border: 2px solid ${sentimentColor}; display: flex; align-items: center; justify-content: center;">
        <span style="color: ${sentimentColor}; font-weight: bold; font-size: 18px;">${overallSentiment}</span>
      </div>
    </div>
  `;
  
  // Generate analysts HTML
  let analystsHtml = '';
  if (analysts.length > 0) {
    analystsHtml = analysts.map(analyst => {
      const symbols = analyst.mentionedSymbols || [];
      const symbolsHtml = symbols.length > 0 
        ? `<div style="margin-top: 5px;">Symbols: ${symbols.join(', ')}</div>`
        : '';
      
      const source = analyst.source 
        ? `<div style="text-align: right; font-size: 12px; color: #888;">Source: ${analyst.source}</div>`
        : '';
      
      return `
        <div style="padding: 12px; margin-bottom: 10px; background-color: #f8f9fa; border-radius: 4px;">
          <div style="font-weight: bold; margin-bottom: 5px;">${analyst.analyst}</div>
          <div style="font-style: italic; margin-bottom: 5px;">"${analyst.comment}"</div>
          ${symbolsHtml}
          ${source}
        </div>
      `;
    }).join('');
  } else {
    analystsHtml = `
      <div style="padding: 15px; background-color: #f5f5f5; border-radius: 6px; text-align: center; color: #757575;">
        No analyst commentary available
      </div>
    `;
  }
  
  // Generate source information
  const sourceInfo = sentimentData.source 
    ? `<div style="font-size: 12px; color: #888; margin-top: 10px; text-align: right;">
         Source: ${sentimentData.source} | Last Updated: ${sentimentData.lastUpdated || 'N/A'}
       </div>`
    : '';
  
  return `
  <div class="section" style="background-color: white; border-radius: 8px; padding: 15px; margin-bottom: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
    <h2 style="color: #333; border-bottom: 1px solid #eee; padding-bottom: 10px; margin-top: 0;">Market Sentiment</h2>
    ${sentimentCircleHtml}
    <div style="margin-top: 15px;">
      <div style="font-weight: bold; margin-bottom: 10px;">Analyst Commentary</div>
      ${analystsHtml}
    </div>
    ${sourceInfo}
  </div>
  `;
}

/**
 * Generate the fundamental metrics section
 * @param {Object} analysis - Analysis data
 * @returns {String} Fundamental metrics section HTML
 */
function generateFundamentalMetricsSection(analysis) {
  // Get the stocks directly from fundamentalMetrics array
  const stocks = analysis.analysis.fundamentalMetrics || [];
  
  // Debug the stocks
  console.log(`Processing ${stocks.length} stocks in generateFundamentalMetricsSection`);
  console.log(`Stock symbols being processed: ${stocks.map(stock => stock.symbol).join(', ')}`);
  
  // Generate stocks HTML
  let stocksHtml = '';
  if (stocks.length > 0 && stocks.some(stock => stock.symbol)) {
    // Create a grid layout for stocks with max-width to ensure it stays within container
    stocksHtml = `
      <div class="stock-grid">
    `;
    
    // Add each stock to the grid
    stocks.forEach(stock => {
      stocksHtml += `
        <div class="stock-card">
          ${generateStockCard(stock)}
        </div>
      `;
    });
    
    // If odd number of stocks, add an empty cell to maintain grid alignment
    if (stocks.length % 2 !== 0) {
      stocksHtml += `
        <div class="stock-card">
          <div style="flex: 1; background-color: #f8f9fa; border-radius: 6px; padding: 15px; box-shadow: 0 1px 2px rgba(0,0,0,0.05); visibility: hidden;">
            <!-- Empty placeholder to maintain grid alignment -->
          </div>
        </div>
      `;
    }
    
    stocksHtml += `</div>`;
  } else {
    stocksHtml = `
      <div style="padding: 15px; background-color: #f5f5f5; border-radius: 6px; text-align: center; color: #757575;">
        No stock data available
      </div>
    `;
  }
  
  // Generate source information
  const sourceInfo = stocks.length > 0 && stocks[0].source 
    ? `<div style="font-size: 12px; color: #888; margin-top: 10px; text-align: right;">
         Source: ${stocks[0].source} | Last Updated: ${stocks[0].lastUpdated || 'N/A'}
       </div>`
    : '';
  
  return `
  <div class="section" style="background-color: white; border-radius: 8px; padding: 15px; margin-bottom: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
    <h2 style="color: #333; border-bottom: 1px solid #eee; padding-bottom: 10px; margin-top: 0;">Fundamental Metrics</h2>
    ${stocksHtml}
    ${sourceInfo}
  </div>
  `;
}

/**
 * Generate a stock card
 * @param {Object} stock - Stock data
 * @returns {String} Stock card HTML
 */
function generateStockCard(stock) {
  if (!stock || !stock.symbol) return '';
  
  // Determine if price change is positive, negative, or neutral
  let priceChangeColor = '#757575'; // Gray for neutral
  let priceChangeIcon = '→';
  
  // Parse the price change to determine if it's positive or negative
  const priceChangeText = stock.priceChange || '+/-0.00 (0.00%)';
  if (priceChangeText.includes('+')) {
    priceChangeColor = '#4CAF50'; // Green for positive
    priceChangeIcon = '↑';
  } else if (priceChangeText.includes('-')) {
    priceChangeColor = '#F44336'; // Red for negative
    priceChangeIcon = '↓';
  }
  
  // Format price - use a placeholder value if price is 0 or undefined
  const price = (stock.price && stock.price !== 0) ? stock.price : '---';
  
  // Generate metrics HTML
  const metricsHtml = `
    <div style="margin-top: 10px; max-width: 100%; overflow: hidden;">
      <div style="font-weight: bold; margin-bottom: 5px; color: #333;">Key Metrics</div>
      <div style="display: flex; justify-content: space-between; margin-bottom: 5px; flex-wrap: wrap;">
        <div style="color: #555; min-width: 80px;">Market Cap</div>
        <div style="font-weight: bold; text-align: right; overflow: hidden; text-overflow: ellipsis;">${stock.marketCap || 'N/A'}</div>
      </div>
      <div style="display: flex; justify-content: space-between; flex-wrap: wrap;">
        <div style="color: #555; min-width: 80px;">P/E Ratio</div>
        <div style="font-weight: bold; text-align: right; overflow: hidden; text-overflow: ellipsis;">${stock.forwardPE || 'N/A'}</div>
      </div>
    </div>
  `;
  
  // Generate comment HTML
  const commentHtml = stock.comment 
    ? `<div style="margin-top: 10px; font-style: italic; font-size: 13px; color: #555; border-left: 3px solid #ddd; padding-left: 10px;">${stock.comment}</div>`
    : '';
  
  // Generate source HTML - only show timestamp, not the source
  const sourceHtml = stock.lastUpdated 
    ? `<div style="font-size: 11px; color: #888; margin-top: 10px; text-align: right;">Last updated: ${stock.lastUpdated}</div>`
    : '';
  
  return `
    <div style="flex: 1; border-radius: 6px; overflow: hidden; box-shadow: 0 1px 2px rgba(0,0,0,0.05); max-width: 100%;">
      <div style="display: flex; justify-content: space-between; padding: 10px; background-color: #f8f9fa; align-items: center; overflow: hidden;">
        <div style="font-weight: bold; font-size: 16px; color: #2c3e50;">${stock.symbol}</div>
        <div style="font-size: 14px; color: #555; max-width: 60%; text-overflow: ellipsis; overflow: hidden; white-space: nowrap;">${stock.name}</div>
      </div>
      <div style="padding: 15px; background-color: white; overflow: hidden;">
        <div style="display: flex; align-items: baseline; margin-bottom: 5px; flex-wrap: wrap;">
          <div style="font-size: 18px; font-weight: bold; color: #2c3e50; margin-right: 10px;">$${price}</div>
          <div style="color: ${priceChangeColor}; font-weight: bold;">
            <span style="margin-right: 3px;">${priceChangeIcon}</span>${priceChangeText}
          </div>
        </div>
        ${metricsHtml}
        ${commentHtml}
        ${sourceHtml}
      </div>
    </div>
  `;
}

/**
 * Generate the geopolitical risks section
 * @param {Object} analysis - Analysis data
 * @returns {String} Geopolitical risks section HTML
 */
function generateGeopoliticalRisksSection(analysis) {
  const macro = analysis.analysis.macroeconomicFactors || {};
  const geopoliticalRisks = macro.geopoliticalRisks || {};
  
  if (!geopoliticalRisks.summary && (!geopoliticalRisks.regions || geopoliticalRisks.regions.length === 0)) {
    return '';
  }
  
  // Generate summary HTML
  const summaryHtml = geopoliticalRisks.summary 
    ? `<div style="background-color: #f5f5f5; padding: 12px; margin-bottom: 15px; border-left: 4px solid #607d8b;">
         <div style="font-weight: bold; margin-bottom: 5px;">Geopolitical Risks</div>
         <div>${geopoliticalRisks.summary}</div>
       </div>`
    : '';
  
  // Generate regions HTML
  let regionsHtml = '';
  if (geopoliticalRisks.regions && geopoliticalRisks.regions.length > 0) {
    regionsHtml = geopoliticalRisks.regions.map(region => {
      // Determine risk level and color
      let riskColor = '#FFA500'; // Orange for moderate
      let riskBadge = '';
      
      if (region.riskLevel) {
        if (region.riskLevel.toLowerCase().includes('high')) {
          riskColor = '#DC3545'; // Red
          riskBadge = '<span style="background-color: #DC3545; color: white; padding: 2px 8px; border-radius: 3px; font-size: 12px; float: right;">High</span>';
        } else if (region.riskLevel.toLowerCase().includes('severe')) {
          riskColor = '#721C24'; // Dark red
          riskBadge = '<span style="background-color: #721C24; color: white; padding: 2px 8px; border-radius: 3px; font-size: 12px; float: right;">Severe</span>';
        } else if (region.riskLevel.toLowerCase().includes('low')) {
          riskColor = '#28A745'; // Green
          riskBadge = '<span style="background-color: #28A745; color: white; padding: 2px 8px; border-radius: 3px; font-size: 12px; float: right;">Low</span>';
        } else {
          riskBadge = '<span style="background-color: #FFA500; color: white; padding: 2px 8px; border-radius: 3px; font-size: 12px; float: right;">Moderate</span>';
        }
      }
      
      return `
        <div style="margin-bottom: 10px; padding: 12px; background-color: #f8f9fa; border-left: 4px solid ${riskColor};">
          <div style="font-weight: bold; margin-bottom: 5px; color: #333;">${region.name} ${riskBadge}</div>
          <div style="color: #555;">${region.description || ''}</div>
        </div>
      `;
    }).join('');
  }
  
  // Generate source information
  const sourceInfo = geopoliticalRisks.source 
    ? `<div style="font-size: 12px; color: #888; margin-top: 10px; text-align: right;">
         Source: ${geopoliticalRisks.source} | Last Updated: ${geopoliticalRisks.lastUpdated || 'N/A'}
       </div>`
    : '';
  
  return `
  <div class="section" style="background-color: white; border-radius: 8px; padding: 15px; margin-bottom: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
    <h2 style="color: #333; border-bottom: 1px solid #eee; padding-bottom: 10px; margin-top: 0;">Geopolitical Risks</h2>
    ${summaryHtml}
    ${regionsHtml}
    ${sourceInfo}
  </div>
  `;
}

/**
 * Generate the macroeconomic factors section
 * @param {Object} analysis - Analysis data
 * @returns {String} Macroeconomic factors section HTML
 */
function generateMacroeconomicFactorsSection(analysis) {
  const macro = analysis.analysis.macroeconomicFactors || {};
  
  // Generate treasury yields HTML
  const treasuryYieldsHtml = generateTreasuryYieldsSection(macro.treasuryYields || {});
  
  // Generate inflation HTML
  const inflationHtml = generateInflationSection(macro.inflation || {});
  
  // Generate geopolitical risks HTML
  const geopoliticalHtml = generateGeopoliticalRisksSection(analysis);
  
  // Generate source information
  const sourceInfo = macro.source 
    ? `<div style="font-size: 12px; color: #888; margin-top: 10px; text-align: right;">
         Source: ${macro.source} | Last Updated: ${macro.lastUpdated || 'N/A'}
       </div>`
    : '';
  
  return `
  <div class="section" style="background-color: white; border-radius: 8px; padding: 15px; margin-bottom: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
    <h2 style="color: #333; border-bottom: 1px solid #eee; padding-bottom: 10px; margin-top: 0;">Macroeconomic Factors</h2>
    ${treasuryYieldsHtml}
    ${inflationHtml}
    ${sourceInfo}
  </div>
  ${geopoliticalHtml}
  `;
}

/**
 * Generate the treasury yields section
 * @param {Object} treasuryYields - Treasury yields data
 * @returns {String} Treasury yields section HTML
 */
function generateTreasuryYieldsSection(treasuryYields) {
  if (Object.keys(treasuryYields).length === 0) {
    return '';
  }
  
  // Create an array of yield terms and values
  const yields = [
    { term: '3-Month', value: treasuryYields.threeMonth },
    { term: '1-Year', value: treasuryYields.oneYear },
    { term: '2-Year', value: treasuryYields.twoYear },
    { term: '5-Year', value: treasuryYields.fiveYear },
    { term: '10-Year', value: treasuryYields.tenYear },
    { term: '30-Year', value: treasuryYields.thirtyYear }
  ].filter(y => y.value); // Filter out undefined values
  
  if (yields.length === 0) {
    return '';
  }
  
  // Generate yields HTML
  const yieldsHtml = yields.map(yield => `
    <div style="flex: 1 1 calc(33.333% - 10px); min-width: 100px; padding: 10px; background-color: #f8f9fa; border-radius: 4px; text-align: center; box-shadow: 0 1px 2px rgba(0,0,0,0.05);">
      <div style="font-size: 12px; color: #666; margin-bottom: 5px;">${yield.term}</div>
      <div style="font-size: 16px; font-weight: bold; color: #333;">${yield.value || 'N/A'}</div>
    </div>
  `).join('');
  
  // Generate source information
  const sourceInfo = treasuryYields.source 
    ? `<div style="font-size: 11px; color: #888; margin-top: 8px; text-align: right;">
         Source: ${treasuryYields.source} | Last Updated: ${treasuryYields.lastUpdated || 'N/A'}
       </div>`
    : '';
  
  return `
    <div style="margin-bottom: 20px;">
      <div style="font-weight: bold; margin-bottom: 10px;">Treasury Yields</div>
      <div style="display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 10px;">
        ${yieldsHtml}
      </div>
      ${sourceInfo}
    </div>
  `;
}

/**
 * Generate the inflation section
 * @param {Object} inflation - Inflation data
 * @returns {String} Inflation section HTML
 */
function generateInflationSection(inflation) {
  if (!inflation.cpi && !inflation.pce) {
    return '';
  }
  
  // Generate CPI HTML
  const cpiHtml = inflation.cpi ? `
    <div style="flex: 1 1 calc(50% - 10px); min-width: 200px; padding: 15px; background-color: #f8f9fa; border-radius: 6px; box-shadow: 0 1px 2px rgba(0,0,0,0.05);">
      <div style="font-weight: bold; margin-bottom: 10px;">Consumer Price Index (CPI)</div>
      
      <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
        <div>Headline</div>
        <div style="font-weight: bold;">${inflation.cpi.headline || 'N/A'}</div>
      </div>
      
      <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
        <div>Core</div>
        <div style="font-weight: bold;">${inflation.cpi.core || 'N/A'}</div>
      </div>
      
      <div style="display: flex; justify-content: space-between;">
        <div>Monthly Change</div>
        <div>${inflation.cpi.monthlyChange || 'N/A'}</div>
      </div>
      
      ${inflation.cpi.source ? `
        <div style="font-size: 11px; color: #888; margin-top: 10px; text-align: right;">
          Source: ${inflation.cpi.source} | Last Updated: ${inflation.cpi.lastUpdated || 'N/A'}
        </div>
      ` : ''}
    </div>
  ` : '';
  
  // Generate PCE HTML
  const pceHtml = inflation.pce ? `
    <div style="flex: 1 1 calc(50% - 10px); min-width: 200px; padding: 15px; background-color: #f8f9fa; border-radius: 6px; box-shadow: 0 1px 2px rgba(0,0,0,0.05);">
      <div style="font-weight: bold; margin-bottom: 10px;">Personal Consumption Expenditures (PCE)</div>
      
      <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
        <div>Headline</div>
        <div style="font-weight: bold;">${inflation.pce.headline || 'N/A'}</div>
      </div>
      
      <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
        <div>Core</div>
        <div style="font-weight: bold;">${inflation.pce.core || 'N/A'}</div>
      </div>
      
      <div style="display: flex; justify-content: space-between;">
        <div>Monthly Change</div>
        <div>${inflation.pce.monthlyChange || 'N/A'}</div>
      </div>
      
      ${inflation.pce.source ? `
        <div style="font-size: 11px; color: #888; margin-top: 10px; text-align: right;">
          Source: ${inflation.pce.source} | Last Updated: ${inflation.pce.lastUpdated || 'N/A'}
        </div>
      ` : ''}
    </div>
  ` : '';
  
  return `
    <div style="margin-bottom: 20px;">
      <div style="font-weight: bold; margin-bottom: 10px;">Inflation Metrics</div>
      <div style="display: flex; flex-wrap: wrap; gap: 15px;">
        ${cpiHtml}
        ${pceHtml}
      </div>
    </div>
  `;
}

/**
 * Generate the justification section
 * @param {Object} analysis - Analysis data
 * @returns {String} Justification section HTML
 */
function generateJustificationSection(analysis) {
  return `
  <div class="section" style="background-color: white; border-radius: 8px; padding: 15px; margin-bottom: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
    <h2 style="color: #333; border-bottom: 1px solid #eee; padding-bottom: 10px; margin-top: 0;">Detailed Justification</h2>
    <div style="line-height: 1.6; color: #444; font-size: 13px;">${analysis.justification}</div>
  </div>
  `;
}

module.exports = {
  generateMarketSentimentSection,
  generateFundamentalMetricsSection,
  generateMacroeconomicFactorsSection,
  generateGeopoliticalRisksSection,
  generateJustificationSection
};
