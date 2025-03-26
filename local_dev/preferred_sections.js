/**
 * Sections for the preferred email template
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
  let sentimentColor = '#9e9e9e'; // default neutral color
  let borderColor = '#9e9e9e';
  if (overallSentiment.toLowerCase().includes('bullish')) {
    sentimentColor = '#4caf50';
    borderColor = '#4caf50';
  } else if (overallSentiment.toLowerCase().includes('bearish')) {
    sentimentColor = '#f44336';
    borderColor = '#f44336';
  }
  
  // Generate analysts HTML
  let analystsHtml = '';
  if (analysts.length > 0) {
    analystsHtml = analysts.map(analyst => {
      const symbols = analyst.mentionedSymbols || [];
      const symbolsHtml = symbols.length > 0 
        ? `<div class="symbols" style="margin-top: 5px;">
            ${symbols.map(symbol => `<span style="display: inline-block; padding: 2px 6px; margin-right: 5px; background-color: #e3f2fd; border-radius: 3px; font-size: 12px; color: #1976d2;">${symbol}</span>`).join('')}
           </div>`
        : '';
      
      const source = analyst.source 
        ? `<div class="source" style="font-size: 12px; margin-top: 3px;">Source: <a href="${analyst.sourceUrl || '#'}" target="_blank" style="color: #2196f3; text-decoration: none;">${analyst.source}</a></div>`
        : '';
      
      return `
        <div class="analyst" style="flex: 1 1 300px; padding: 12px; margin-bottom: 10px; background-color: #ffffff; border-radius: 6px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); border-top: 3px solid #2196f3;">
          <div class="analyst-name" style="font-weight: bold; color: #2196f3; margin-bottom: 5px;">${analyst.analyst}</div>
          <div class="comment" style="font-style: italic; margin-bottom: 8px; color: #424242;">"${analyst.comment}"</div>
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
    ? `<div style="font-size: 12px; color: #9e9e9e; margin-top: 10px; text-align: right;">
         Source: <a href="${sentimentData.sourceUrl || '#'}" style="color: #2196f3; text-decoration: none;">${sentimentData.source}</a>
         ${sentimentData.lastUpdated ? `<span style="margin-left: 10px;">Last Updated: ${sentimentData.lastUpdated}</span>` : ''}
       </div>`
    : '';
  
  return `
  <div class="section">
    <h2 class="section-title">Market Sentiment</h2>
    <div class="overall-sentiment neutral" style="padding: 10px; margin-bottom: 15px; border-radius: 5px; background-color: #f5f5f5; border-left: 4px solid ${borderColor};">
      <h3 style="margin: 0 0 8px 0; font-size: 16px;">Overall Market Sentiment: <span style="color: ${sentimentColor};">${overallSentiment}</span></h3>
    </div>
    
    <div class="analysts-container" style="display: flex; flex-wrap: wrap; gap: 10px; margin-top: 10px;">
      ${analystsHtml}
    </div>
    ${sourceInfo}
  </div>
  `;
}

/**
 * Generate the market indicators section
 * @param {Object} analysis - Analysis data
 * @returns {String} Market indicators section HTML
 */
function generateMarketIndicatorsSection(analysis) {
  const indicators = analysis.analysis.marketIndicators || {};
  const indices = indicators.indices || [];
  const volatility = indicators.volatility || {};
  
  // Generate indices HTML
  let indicesHtml = '';
  if (indices.length > 0) {
    indicesHtml = `
      <div style="margin-bottom: 20px;">
        <div style="font-weight: bold; margin-bottom: 10px; color: #333;">Major Indices</div>
        <div style="display: flex; flex-wrap: wrap; gap: 10px;">
          ${indices.map(index => {
            // Determine color based on price change
            const isPositive = index.change && index.change.includes('+');
            const changeColor = isPositive ? '#4caf50' : '#f44336';
            
            return `
              <div style="flex: 1 1 calc(50% - 10px); min-width: 200px; padding: 12px; background-color: #ffffff; border-radius: 6px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                  <div style="font-weight: bold;">${index.name}</div>
                  <div>${index.symbol}</div>
                </div>
                <div style="display: flex; justify-content: space-between; align-items: baseline;">
                  <div style="font-size: 18px;">${index.price || 'N/A'}</div>
                  <div style="color: ${changeColor};">${index.change || 'N/A'}</div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }
  
  // Generate volatility HTML
  let volatilityHtml = '';
  if (volatility.vix) {
    // Determine VIX level description and color
    let vixDescription = 'Moderate';
    let vixColor = '#ff9800';
    const vixValue = parseFloat(volatility.vix);
    
    if (vixValue < 15) {
      vixDescription = 'Low';
      vixColor = '#4caf50';
    } else if (vixValue > 25) {
      vixDescription = 'High';
      vixColor = '#f44336';
    }
    
    volatilityHtml = `
      <div style="margin-bottom: 20px;">
        <div style="font-weight: bold; margin-bottom: 10px; color: #333;">Market Volatility</div>
        <div style="padding: 15px; background-color: #ffffff; border-radius: 6px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <div>
              <div style="font-weight: bold;">VIX (CBOE Volatility Index)</div>
              <div style="font-size: 12px; color: #757575;">Fear Index</div>
            </div>
            <div style="text-align: right;">
              <div style="font-size: 20px; font-weight: bold;">${volatility.vix}</div>
              <div style="color: ${vixColor};">${vixDescription} Volatility</div>
            </div>
          </div>
        </div>
      </div>
    `;
  }
  
  // Generate source information
  const sourceInfo = indicators.source 
    ? `<div style="font-size: 12px; color: #9e9e9e; margin-top: 10px; text-align: right;">
         Source: <a href="${indicators.sourceUrl || '#'}" style="color: #2196f3; text-decoration: none;">${indicators.source}</a>
         ${indicators.lastUpdated ? `<span style="margin-left: 10px;">Last Updated: ${indicators.lastUpdated}</span>` : ''}
       </div>`
    : '';
  
  return `
  <div class="section">
    <h2 class="section-title">Key Market Indicators</h2>
    <div style='margin-top: 10px;'>
      ${indicesHtml}
      ${volatilityHtml}
      ${sourceInfo}
    </div>
  </div>
  `;
}

/**
 * Generate the fundamental metrics section
 * @param {Object} analysis - Analysis data
 * @returns {String} Fundamental metrics section HTML
 */
function generateFundamentalMetricsSection(analysis) {
  const fundamentals = analysis.analysis.fundamentalMetrics || {};
  const stocks = fundamentals.stocks || [];
  
  // Generate stocks HTML
  let stocksHtml = '';
  if (stocks.length > 0) {
    stocksHtml = `
      <div style="display: flex; flex-wrap: wrap; gap: 12px; margin-top: 10px;">
        ${stocks.map(stock => {
          // Determine if price change is positive or negative
          const priceChange = stock.priceChange || '';
          const isPositive = priceChange.includes('+');
          const changeColor = isPositive ? '#4caf50' : '#f44336';
          const changeIcon = isPositive ? '▲' : '▼';
          
          return `
            <div style="flex: 1 1 48%; max-width: 48%; padding: 15px; background-color: #ffffff; border-radius: 6px; box-shadow: 0 2px 6px rgba(0,0,0,0.1); border-top: 3px solid #673ab7;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                <div style="font-weight: bold; font-size: 18px; color: #673ab7;">${stock.symbol}</div>
                <div style="font-size: 12px; color: #9e9e9e; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 170px;">${stock.name}</div>
              </div>
              
              <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                <div style="font-size: 14px; color: #555;">Price</div>
                <div style="font-weight: bold;">${stock.price || 'N/A'}</div>
              </div>
              
              <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                <div style="font-size: 14px; color: #555;">Change</div>
                <div style="color: ${changeColor};">${changeIcon} ${priceChange || 'N/A'}</div>
              </div>
              
              <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                <div style="font-size: 14px; color: #555;">Volume</div>
                <div>${stock.volume || 'N/A'}</div>
              </div>
              
              <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                <div style="font-size: 14px; color: #555;">Market Cap</div>
                <div>${stock.marketCap || 'N/A'}</div>
              </div>
              
              <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                <div style="font-size: 14px; color: #555;">P/E Ratio</div>
                <div>${stock.forwardPE || 'N/A'}</div>
              </div>
              
              <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                <div style="font-size: 14px; color: #555;">Dividend Yield</div>
                <div>${stock.dividendYield || 'N/A'}</div>
              </div>
              
              ${stock.comment ? `
                <div style="margin-top: 10px; padding: 8px; background-color: #f5f5f5; border-radius: 4px; font-size: 12px; color: #666;">
                  ${stock.comment}
                </div>
              ` : ''}
              
              ${stock.source ? `
                <div style="font-size: 11px; color: #9e9e9e; margin-top: 8px; text-align: right;">
                  Source: <a href="${stock.sourceUrl || '#'}" style="color: #673ab7; text-decoration: none;">${stock.source}</a>
                  ${stock.lastUpdated ? `<span style="margin-left: 5px;">Updated: ${stock.lastUpdated}</span>` : ''}
                </div>
              ` : ''}
            </div>
          `;
        }).join('')}
      </div>
    `;
  } else {
    stocksHtml = `
      <div style="padding: 15px; background-color: #f5f5f5; border-radius: 6px; text-align: center; color: #757575;">
        No stock data available
      </div>
    `;
  }
  
  // Generate source information
  const sourceInfo = fundamentals.source 
    ? `<div style="font-size: 12px; color: #9e9e9e; margin-top: 10px; text-align: right;">
         Source: <a href="${fundamentals.sourceUrl || '#'}" style="color: #2196f3; text-decoration: none;">${fundamentals.source}</a>
         ${fundamentals.lastUpdated ? `<span style="margin-left: 10px;">Last Updated: ${fundamentals.lastUpdated}</span>` : ''}
       </div>`
    : '';
  
  return `
  <div class="section">
    <h2 class="section-title">Fundamental Metrics</h2>
    ${stocksHtml}
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
  const treasuryYields = macro.treasuryYields || {};
  const inflation = macro.inflation || {};
  const geopoliticalRisks = macro.geopoliticalRisks || {};
  
  // Generate treasury yields HTML
  let yieldsHtml = '';
  if (Object.keys(treasuryYields).length > 0) {
    // Create an array of yield terms and values
    const yields = [
      { term: '3-Month', value: treasuryYields.threeMonth },
      { term: '1-Year', value: treasuryYields.oneYear },
      { term: '2-Year', value: treasuryYields.twoYear },
      { term: '5-Year', value: treasuryYields.fiveYear },
      { term: '10-Year', value: treasuryYields.tenYear },
      { term: '30-Year', value: treasuryYields.thirtyYear }
    ].filter(y => y.value); // Filter out undefined values
    
    if (yields.length > 0) {
      yieldsHtml = `
        <div style="margin-bottom: 15px; padding: 15px; background-color: #f9f9f9; border-radius: 6px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
          <div style="font-weight: bold; font-size: 16px; margin-bottom: 10px; color: #333;">Treasury Yields</div>
          
          <div style="display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 10px;">
            ${yields.map(yield => `
              <div style="flex: 1 1 calc(33.333% - 10px); min-width: 100px; padding: 10px; background-color: #ffffff; border-radius: 4px; text-align: center; box-shadow: 0 1px 2px rgba(0,0,0,0.05);">
                <div style="font-size: 12px; color: #666; margin-bottom: 5px;">${yield.term}</div>
                <div style="font-size: 16px; font-weight: bold; color: #333;">${yield.value || 'N/A'}</div>
              </div>
            `).join('')}
          </div>
          
          ${treasuryYields.source ? `
            <div style="font-size: 11px; color: #9e9e9e; text-align: right;">
              Source: <a href="${treasuryYields.sourceUrl || '#'}" style="color: #2196f3; text-decoration: none;">${treasuryYields.source}</a>
              ${treasuryYields.lastUpdated ? `<span style="margin-left: 5px;">Updated: ${treasuryYields.lastUpdated}</span>` : ''}
            </div>
          ` : ''}
        </div>
      `;
    }
  }
  
  // Generate inflation HTML
  let inflationHtml = '';
  if (inflation.cpi || inflation.pce) {
    inflationHtml = `
      <div style="margin-bottom: 15px; padding: 15px; background-color: #f9f9f9; border-radius: 6px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
        <div style="font-weight: bold; font-size: 16px; margin-bottom: 10px; color: #333;">Inflation Metrics</div>
        
        <div style="display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 15px;">
          ${inflation.cpi ? `
            <!-- CPI Headline -->
            <div style="flex: 1 1 calc(50% - 10px); min-width: 200px; padding: 15px; background-color: #ffffff; border-radius: 6px; box-shadow: 0 1px 2px rgba(0,0,0,0.05);">
              <div style="font-weight: bold; margin-bottom: 5px; color: #333;">Consumer Price Index (CPI)</div>
              
              <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                <div style="font-size: 14px; color: #555;">Headline</div>
                <div style="font-weight: bold;">${inflation.cpi.headline || 'N/A'}</div>
              </div>
              
              <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                <div style="font-size: 14px; color: #555;">Core</div>
                <div style="font-weight: bold;">${inflation.cpi.core || 'N/A'}</div>
              </div>
              
              <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                <div style="font-size: 14px; color: #555;">Monthly Change</div>
                <div>${inflation.cpi.monthlyChange || 'N/A'}</div>
              </div>
              
              ${inflation.cpi.source ? `
                <div style="font-size: 11px; color: #9e9e9e; margin-top: 8px; text-align: right;">
                  Source: <a href="${inflation.cpi.sourceUrl || '#'}" style="color: #2196f3; text-decoration: none;">${inflation.cpi.source}</a>
                  ${inflation.cpi.lastUpdated ? `<span style="margin-left: 5px;">Updated: ${inflation.cpi.lastUpdated}</span>` : ''}
                </div>
              ` : ''}
            </div>
          ` : ''}
          
          ${inflation.pce ? `
            <!-- PCE -->
            <div style="flex: 1 1 calc(50% - 10px); min-width: 200px; padding: 15px; background-color: #ffffff; border-radius: 6px; box-shadow: 0 1px 2px rgba(0,0,0,0.05);">
              <div style="font-weight: bold; margin-bottom: 5px; color: #333;">Personal Consumption Expenditures (PCE)</div>
              
              <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                <div style="font-size: 14px; color: #555;">Headline</div>
                <div style="font-weight: bold;">${inflation.pce.headline || 'N/A'}</div>
              </div>
              
              <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                <div style="font-size: 14px; color: #555;">Core</div>
                <div style="font-weight: bold;">${inflation.pce.core || 'N/A'}</div>
              </div>
              
              <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                <div style="font-size: 14px; color: #555;">Monthly Change</div>
                <div>${inflation.pce.monthlyChange || 'N/A'}</div>
              </div>
              
              ${inflation.pce.source ? `
                <div style="font-size: 11px; color: #9e9e9e; margin-top: 8px; text-align: right;">
                  Source: <a href="${inflation.pce.sourceUrl || '#'}" style="color: #2196f3; text-decoration: none;">${inflation.pce.source}</a>
                  ${inflation.pce.lastUpdated ? `<span style="margin-left: 5px;">Updated: ${inflation.pce.lastUpdated}</span>` : ''}
                </div>
              ` : ''}
            </div>
          ` : ''}
        </div>
      </div>
    `;
  }
  
  // Generate geopolitical risks HTML
  let geopoliticalHtml = '';
  if (geopoliticalRisks.summary || (geopoliticalRisks.regions && geopoliticalRisks.regions.length > 0)) {
    // Generate regions HTML if available
    let regionsHtml = '';
    if (geopoliticalRisks.regions && geopoliticalRisks.regions.length > 0) {
      regionsHtml = geopoliticalRisks.regions.map(region => {
        // Determine risk level color
        let riskColor = '#ff9800'; // default moderate risk color
        if (region.riskLevel && region.riskLevel.toLowerCase().includes('high')) {
          riskColor = '#f44336';
        } else if (region.riskLevel && region.riskLevel.toLowerCase().includes('low')) {
          riskColor = '#4caf50';
        }
        
        return `
          <div style="margin-bottom: 10px; padding: 10px; background-color: #fafafa; border-radius: 4px; border-left: 4px solid ${riskColor};">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;">
              <div style="font-weight: bold; color: #455a64;">${region.name}</div>
              <div style="color: ${riskColor}; font-size: 14px; font-weight: bold;">${region.riskLevel || 'Moderate Risk'}</div>
            </div>
            <div style="color: #546e7a; font-size: 14px;">${region.description || ''}</div>
            
            ${region.events && region.events.length > 0 ? `
              <div style="margin-top: 8px;">
                ${region.events.map(event => `
                  <div style="margin-top: 5px; font-size: 13px; color: #607d8b;">• ${event.description} ${event.date ? `(${event.date})` : ''}</div>
                `).join('')}
              </div>
            ` : ''}
          </div>
        `;
      }).join('');
    }
    
    geopoliticalHtml = `
      <div style="margin-bottom: 15px; padding: 15px; background-color: #f9f9f9; border-radius: 6px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
        <div style="font-weight: bold; font-size: 16px; margin-bottom: 10px; color: #333;">Geopolitical Risks</div>
        
        ${geopoliticalRisks.summary ? `
          <div style="margin-bottom: 15px; padding: 10px; background-color: #fafafa; border-radius: 4px; border-left: 4px solid #607d8b;">
            <div style="font-weight: bold; margin-bottom: 5px; color: #455a64;">Global Summary</div>
            <div style="color: #546e7a;">${geopoliticalRisks.summary}</div>
          </div>
        ` : ''}
        
        ${regionsHtml}
        
        ${geopoliticalRisks.source ? `
          <div style="font-size: 11px; color: #9e9e9e; margin-top: 8px; text-align: right;">
            Source: <a href="${geopoliticalRisks.sourceUrl || '#'}" style="color: #2196f3; text-decoration: none;">${geopoliticalRisks.source}</a>
            ${geopoliticalRisks.lastUpdated ? `<span style="margin-left: 5px;">Updated: ${geopoliticalRisks.lastUpdated}</span>` : ''}
          </div>
        ` : ''}
      </div>
    `;
  }
  
  // Generate source information
  const sourceInfo = macro.source 
    ? `<div style="font-size: 12px; color: #9e9e9e; margin-top: 10px; text-align: right;">
         Source: <a href="${macro.sourceUrl || '#'}" style="color: #2196f3; text-decoration: none;">${macro.source}</a>
         ${macro.lastUpdated ? `<span style="margin-left: 10px;">Last Updated: ${macro.lastUpdated}</span>` : ''}
       </div>`
    : '';
  
  return `
  <div class="section">
    <h2 class="section-title">Macroeconomic Factors</h2>
    <div style='margin-top: 10px;'>
      ${yieldsHtml}
      ${inflationHtml}
      ${geopoliticalHtml}
      ${sourceInfo}
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
  <div class="section">
    <h2 class="section-title">Detailed Justification</h2>
    <div class="justification">${analysis.justification}</div>
  </div>
  `;
}

module.exports = {
  generateMarketSentimentSection,
  generateMarketIndicatorsSection,
  generateFundamentalMetricsSection,
  generateMacroeconomicFactorsSection,
  generateJustificationSection
};
