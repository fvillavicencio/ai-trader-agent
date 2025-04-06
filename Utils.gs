/**
 * Enhanced version of cleanAnalysisResult function with improved JSON parsing
 * @param {String} content - The content from OpenAI
 * @return {Object} The cleaned analysis result
 */
function enhancedCleanAnalysisResult(content) {
  try {
    // First attempt: Try to parse the content as JSON directly
    try {
      return JSON.parse(content);
    } catch (jsonError) {
      Logger.log(`Initial JSON parsing failed: ${jsonError}`);
      
      // Second attempt: Try to extract JSON from the content
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          return JSON.parse(jsonMatch[0]);
        } catch (extractError) {
          Logger.log(`Extracted JSON parsing failed: ${extractError}`);
          
          // Third attempt: Try to fix common JSON syntax errors
          let fixedJson = jsonMatch[0];
          
          // Fix 1: Remove trailing commas before closing brackets or braces
          fixedJson = fixedJson.replace(/,(\s*[\]}])/g, '$1');
          
          // Fix 2: Add missing quotes around property names
          fixedJson = fixedJson.replace(/([{,]\s*)([a-zA-Z0-9_]+)(\s*:)/g, '$1"$2"$3');
          
          // Fix 3: Ensure string values have proper quotes
          fixedJson = fixedJson.replace(/:(\s*)([a-zA-Z0-9_]+)([,}])/g, ':"$2"$3');
          
          // Fix 4: Handle unescaped quotes in strings
          fixedJson = fixedJson.replace(/"([^"]*?)\\?"([^"]*?)"/g, '"$1\\"$2"');
          
          // Fix 5: Handle line breaks in strings
          fixedJson = fixedJson.replace(/"\s*\n\s*"/g, ' ');
          
          // Fix 6: Replace single quotes with double quotes
          fixedJson = fixedJson.replace(/'([^']*?)'/g, '"$1"');
          
          // Log the fixed JSON for debugging
          Logger.log("Modified JSON for parsing: " + fixedJson.substring(0, 200) + "...");
          
          try {
            Logger.log("Attempting to parse fixed JSON");
            return JSON.parse(fixedJson);
          } catch (fixError) {
            Logger.log(`Fixed JSON parsing failed: ${fixError}`);
            
            // Last resort: Create a minimal valid JSON with essential fields
            Logger.log("Creating fallback JSON object");
            return {
              decision: "Watch for Better Price Action",
              summary: "Unable to parse analysis result",
              justification: "The analysis result could not be parsed correctly. Please check the logs for details.",
              error: `JSON parsing error: ${fixError}`,
              timestamp: new Date().toISOString(),
              analysis: {
                marketSentiment: {
                  overall: "Unable to parse market sentiment data"
                },
                marketIndicators: {
                  fearGreedIndex: { value: 0, interpretation: "Data unavailable" }
                },
                fundamentalMetrics: [],
                macroeconomicFactors: {
                  treasuryYields: { 
                    threeMonth: 0.00, 
                    oneYear: 0.00, 
                    twoYear: 0.00, 
                    tenYear: 0.00, 
                    thirtyYear: 0.00,
                    yieldCurve: "unknown" 
                  },
                  inflation: { 
                    currentRate: 0.0,
                    cpi: { headline: 0.0, core: 0.0 },
                    pce: { headline: 0.0, core: 0.0 }
                  }
                }
              }
            };
          }
        }
      } else {
        throw new Error("Could not extract JSON from response");
      }
    }
  } catch (error) {
    Logger.log(`Error cleaning analysis result: ${error}`);
    throw new Error(`Failed to clean analysis result: ${error}`);
  }
}

/**
 * Test function to verify the enhanced JSON parsing
 */
function testEnhancedJsonParsing() {
  // Sample problematic JSON response from OpenAI
  const sampleResponse = `{
    decision: "Watch for Better Price Action",
    summary: "Markets are showing mixed signals with elevated volatility",
    analysis: {
      marketSentiment: {
        overall: "Cautiously optimistic with concerns about valuation"
      },
      marketIndicators: {
        fearGreedIndex: {value: 45, interpretation: "Neutral"},
        vix: {value: 22.5, trend: "Elevated"}
      },
      fundamentalMetrics: [
        {symbol: "AAPL", price: 175.25, priceChange: "-2.50 (-1.41%)"},
        {symbol: "MSFT", price: 325.75, priceChange: "+1.25 (0.38%)"}
      ],
      macroeconomicFactors: {
        treasuryYields: {tenYear: 4.25, twoYear: 4.75, yieldCurve: "inverted"},
        inflation: {currentRate: 3.2, cpi: {headline: 3.2, core: 3.8}}
      }
    },
    justification: "Given the mixed signals in the market, it's prudent to wait for better price action."
  }`;
  
  // Test the enhanced parsing
  const result = enhancedCleanAnalysisResult(sampleResponse);
  Logger.log("Test result:");
  Logger.log(JSON.stringify(result, null, 2));
  
  return result;
}

/**
 * Generates the complete HTML email template for trading analysis
 * 
 * @param {Object} analysisResult - The complete analysis result object
 * @param {Boolean} isTest - Whether this is a test email
 * @return {String} Complete HTML email template
 */
function generateEmailTemplate(analysisResult, isTest = false) {
  try {
    // Extract data from analysis result
    const decision = analysisResult.decision || 'No Decision';
    const analysis = analysisResult.analysis || {};
    const analysisTime = analysisResult.timestamp ? new Date(analysisResult.timestamp) : new Date();
    
    // Define colors based on decision
    let decisionColor = '#757575'; // Default gray
    let decisionIcon = '⚠️'; // Default warning icon
    
    // Set colors and icon based on decision
    if (decision.toLowerCase().includes('buy')) {
      decisionColor = '#4caf50'; // Green
      decisionIcon = '🔼';
    } else if (decision.toLowerCase().includes('sell')) {
      decisionColor = '#f44336'; // Red
      decisionIcon = '🔽';
    } else if (decision.toLowerCase().includes('hold')) {
      decisionColor = '#ff9800'; // Orange
      decisionIcon = '⏸️';
    } else if (decision.toLowerCase().includes('watch')) {
      decisionColor = '#FFA500'; // Orange/Amber
      decisionIcon = '⚠️';
    }
    
    // Format the analysis time
    const formattedAnalysisTime = formatDate(analysisTime);
    
    // Generate the sentiment section HTML
    const sentimentHtml = generateMarketSentimentSection(analysis);
    
    // Generate the market indicators section HTML
    const marketIndicatorsHtml = generateMarketIndicatorsSection(analysis);
    
    // Generate the fundamental metrics section HTML
    const fundamentalMetricsHtml = generateFundamentalMetricsSection(analysis);
    
    // Generate the macroeconomic factors section HTML
    const macroeconomicFactorsHtml = generateMacroeconomicFactorsSection(analysis);
    
    // Generate the geopolitical risks section HTML
    const geopoliticalRisksHtml = generateGeopoliticalRisksSection(analysis);
    
    // Generate the HTML email
    let html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${NEWSLETTER_NAME}</title>
      <style>
        body {
          font-family: 'Segoe UI', Arial, sans-serif;
          background-color: #f5f7fa;
          color: #333;
          line-height: 1.5;
          margin: 0;
          padding: 0;
        }
        
        .container {
          max-width: 800px;
          margin: 0 auto;
          padding: 20px;
        }
        
        .header {
          text-align: center;
          margin-bottom: 30px;
        }
        
        .logo {
          margin-bottom: 15px;
        }
        
        .title {
          font-size: 24px;
          font-weight: bold;
          color: #2c3e50;
          margin: 0;
        }
        
        .subtitle {
          font-size: 14px;
          color: #7f8c8d;
          margin: 5px 0 0;
        }
        
        .decision-banner {
          background-color: #f8f9fa;
          border-radius: 8px;
          padding: 20px;
          margin-bottom: 20px;
          text-align: center;
          box-shadow: 0 2px 5px rgba(0,0,0,0.1);
        }
        
        .decision-text {
          font-size: 28px;
          font-weight: bold;
          margin: 0;
        }
        
        .section {
          background-color: white;
          border-radius: 8px;
          padding: 20px;
          margin-bottom: 20px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        
        .section h2 {
          color: #333;
          border-bottom: 1px solid #eee;
          padding-bottom: 10px;
          margin-top: 0;
          margin-bottom: 15px;
          text-align: center;
          font-size: 18px;
        }
        
        .stock-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
          gap: 15px;
        }
        
        .stock-card {
          display: flex;
          flex-direction: column;
        }
        
        .footer {
          text-align: center;
          font-size: 12px;
          color: #95a5a6;
          margin-top: 30px;
        }
        
        .disclaimer {
          font-size: 11px;
          color: #95a5a6;
          margin-top: 10px;
          text-align: center;
        }
        
        @media (max-width: 600px) {
          .container {
            padding: 15px;
          }
          
          .stock-grid {
            grid-template-columns: 1fr;
          }
        }
        
        /* Enhanced styles for fundamental metrics section */
        .subsection {
          margin-bottom: 20px;
        }
        
        .stocks-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 15px;
          margin-top: 15px;
        }
        
        .stock-card {
          background-color: #ffffff;
          border-radius: 6px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          padding: 15px;
        }
        
        .stock-header {
          display: flex;
          align-items: center;
          margin-bottom: 10px;
          border-bottom: 1px solid #eee;
          padding-bottom: 10px;
        }
        
        .stock-symbol {
          font-weight: bold;
          font-size: 16px;
          color: #2c3e50;
          margin-right: 10px;
        }
        
        .stock-name {
          font-size: 14px;
          color: #666;
          margin-right: auto;
        }
        
        .stock-price {
          font-size: 16px;
          font-weight: bold;
          color: #2c3e50;
        }
        
        .stock-metrics {
          margin: 15px 0;
        }
        
        .metric-group {
          display: flex;
          justify-content: space-between;
          margin-bottom: 10px;
        }
        
        .metric {
          flex: 1;
          min-width: 100px;
        }
        
        .metric-label {
          display: block;
          font-size: 12px;
          color: #666;
          margin-bottom: 3px;
        }
        
        .metric-value {
          font-size: 14px;
          font-weight: 500;
        }
        
        .positive {
          color: #4caf50;
        }
        
        .negative {
          color: #f44336;
        }
        
        .stock-footer {
          border-top: 1px solid #eee;
          padding-top: 10px;
          margin-top: 15px;
          font-size: 12px;
          color: #666;
        }
        
        .last-updated {
          display: block;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <!-- Header -->
        <div style="text-align: center; margin-bottom: 25px;">
          <h1 style="margin: 0; color: #2c3e50; font-size: 28px;">${NEWSLETTER_NAME}</h1>
          <p style="color: #7f8c8d; margin: 5px 0 0;">Generated on ${formattedAnalysisTime}</p>
          ${isTest ? '<p style="color: #f44336; font-weight: bold;">TEST EMAIL - NOT ACTUAL TRADING ADVICE</p>' : ''}
        </div>
        
        <!-- Decision Box -->
        <div style="padding: 20px; margin: 25px 0; border-radius: 8px; text-align: center; background-color: #FFF8E1; border-left: 5px solid ${decisionColor}; box-shadow: 0 3px 6px rgba(0,0,0,0.1);">
          <div style="font-size: 28px; font-weight: bold; color: ${decisionColor}; margin: 0 0 10px;">
            <span style="margin-right: 10px;">${decisionIcon}</span>${decision}
          </div>
          <p style="font-size: 16px; color: #555; margin: 0;">${analysisResult.summary || 'No summary available.'}</p>
        </div>
        
        <!-- Justification Section -->
        <div class="section">
          <h2>Justification</h2>
          <div style="line-height: 1.6; color: #444; font-size: 13px;">${analysisResult.justification || 'No justification provided.'}</div>
        </div>
        
        <!-- Market Sentiment Section -->
        ${sentimentHtml}
        
        <!-- Market Indicators Section -->
        ${marketIndicatorsHtml}
        
        <!-- Fundamental Metrics Section -->
        ${fundamentalMetricsHtml}
        
        <!-- Macroeconomic Factors Section -->
        ${macroeconomicFactorsHtml}
        
        <!-- Geopolitical Risks Section -->
        ${geopoliticalRisksHtml}
        
        <!-- Footer -->
        <div style="background-color: #1a365d; padding: 20px; text-align: center; color: white; border-radius: 6px;">
          <p style="margin: 0; font-size: 14px;">${NEWSLETTER_NAME} - Professional Trading Insights</p>
          <p style="margin: 5px 0 0 0; font-size: 12px;">${new Date().getFullYear()} ${NEWSLETTER_NAME}</p>
          <p style="margin: 10px 0 0 0; font-size: 11px; color: #aaaaaa;">
            This email contains information based on market data and analysis algorithms. 
            It is not financial advice. Always conduct your own research before making investment decisions.
          </p>
        </div>
      </div>
    </body>
    </html>`;
    
    Logger.log('Generated Email Template:\n' + html);
    return html;
  } catch (error) {
    Logger.log("Error generating email template: " + error);
    return `<p>Error generating email template: ${error}</p>`;
  }
}

/**
 * Generates the market sentiment section HTML
 * 
 * @param {Object} analysis - The analysis data
 * @return {String} HTML for the market sentiment section
 */
function generateMarketSentimentSection(analysis) {
  try {
    // Get sentiment data, handling both sentiment and marketSentiment fields
    const sentimentData = analysis.marketSentiment || analysis.sentiment || {};
    const overallSentiment = sentimentData.overall || 'Neutral';
    const analysts = sentimentData.analysts || [];
    
    // Generate analysts HTML
    let analystsHtml = '';
    if (analysts.length > 0) {
      analystsHtml = analysts.map(analyst => {
        const symbols = analyst.mentionedSymbols || [];
        const symbolsHtml = symbols.length > 0 
          ? `<div style="margin-top: 8px;">
              <div style="margin-bottom: 3px;">Mentioned:</div>
              ${symbols.map(symbol => `<span style="display: inline-block; background-color: #e3f2fd; color: #0d47a1; padding: 2px 8px; border-radius: 4px; margin-right: 5px; font-size: 12px;">${symbol}</span>`).join('')}
             </div>`
          : '';
        
        const source = analyst.source 
          ? `<div style="margin-top: 8px; font-size: 12px; color: #666;">Source: <span style="color: #2196f3;">${analyst.source}</span></div>`
          : '';
        
        return `
          <div style="padding: 15px 0; border-top: 1px solid #e0e0e0;">
            <div style="font-weight: bold; margin-bottom: 8px;">${analyst.analyst || 'Unknown Analyst'}</div>
            <div style="font-style: italic; margin-bottom: 5px;">"${analyst.comment || 'No comment'}"</div>
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
    <div class="section">
      <h2>Market Sentiment</h2>
      
      <div style="background-color: #f8f9fa; padding: 12px; margin-bottom: 15px; border-radius: 4px;">
        <div style="font-weight: bold; display: inline;">Overall:</div>
        <div style="display: inline; margin-left: 5px;">${overallSentiment}</div>
      </div>
      
      ${analystsHtml}
      ${sourceInfo}
    </div>
    `;
  } catch (error) {
    Logger.log("Error generating market sentiment section: " + error);
    return `
    <div class="section">
      <h2>Market Sentiment</h2>
      <p>Error generating market sentiment section: ${error}</p>
    </div>
    `;
  }
}

/**
 * Generates the market indicators section HTML
 * 
 * @param {Object} analysis - The analysis data
 * @return {String} HTML for the market indicators section
 */
function generateMarketIndicatorsSection(analysis) {
  try {
    const indicators = analysis.marketIndicators || {};
    
    // Fear & Greed Index
    let fearGreedHtml = '';
    if (indicators.fearGreedIndex) {
      const fgValue = indicators.fearGreedIndex.value || 50;
      const fgInterpretation = indicators.fearGreedIndex.interpretation || 
        (fgValue <= 25 ? 'Extreme Fear' : 
         fgValue <= 40 ? 'Fear' : 
         fgValue <= 60 ? 'Neutral' : 
         fgValue <= 75 ? 'Greed' : 
         'Extreme Greed');
      
      const fgColor = fgValue <= 25 ? '#f44336' : 
                      fgValue >= 75 ? '#4caf50' : 
                      fgValue >= 50 ? '#8bc34a' : 
                      '#ff9800';
      
      fearGreedHtml = `
      <div style="padding: 15px; background-color: #f8f9fa; border-radius: 6px; margin-bottom: 15px;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
          <div style="font-weight: bold; font-size: 1.3em;">Fear & Greed Index:</div>
          <div style="font-weight: bold; color: ${fgColor}; font-size: 1.69em;">${fgValue}</div>
        </div>
        
        <div style="position: relative; height: 10px; background: linear-gradient(to right, #e53935 0%, #fb8c00 25%, #ffeb3b 50%, #7cb342 75%, #43a047 100%); border-radius: 5px; margin: 10px 0;">
          <div style="position: absolute; top: 0; left: ${fgValue}%; transform: translateX(-50%); width: 15px; height: 15px; background-color: #333; border-radius: 50%;"></div>
          <div style="position: absolute; top: -6px; left: calc(${fgValue}% - 6px); width: 12px; height: 12px; background-color: #fff; border: 2px solid #333; border-radius: 50%;"></div>
        </div>
        
        <div style="display: flex; justify-content: space-between; font-size: 12px; color: #757575; margin-top: 5px;">
          <div>Extreme Fear</div>
          <div>Fear</div>
          <div>Neutral</div>
          <div>Greed</div>
          <div>Extreme Greed</div>
        </div>
        
        <div style="font-size: 14px; color: #555; margin-top: 10px; padding: 8px; background-color: rgba(0,0,0,0.03); border-radius: 4px; border-left: 3px solid ${fgColor};">
          <span style="font-weight: bold;">${fgInterpretation}:</span> <span>${indicators.fearGreedIndex.description || 'Market sentiment indicator based on various market factors.'}</span>
        </div>
        
        <div style="font-size: 12px; color: #888; margin-top: 10px; text-align: right;">
          Source: ${indicators.fearGreedIndex.source || 'CNN'} (${indicators.fearGreedIndex.sourceUrl || 'N/A'}), as of ${formatDate(indicators.fearGreedIndex.lastUpdated)}
        </div>
      </div>
      `;
    }
    
    // VIX Volatility Index
    let vixHtml = '';
    if (indicators.vix) {
      const vixValue = indicators.vix.value || 'N/A';
      const vixTrend = indicators.vix.trend || 'Stable';
      const vixColor = vixValue >= 30 ? '#f44336' : 
                       vixValue >= 20 ? '#ff9800' : 
                       '#4caf50';
      
      const trendIcon = vixTrend.toLowerCase().includes('rising') ? '↑' :
                        vixTrend.toLowerCase().includes('falling') ? '↓' : '→';
      
      const trendColor = vixTrend.toLowerCase().includes('rising') ? '#f44336' :
                         vixTrend.toLowerCase().includes('falling') ? '#4caf50' : '#757575';
      
      vixHtml = `
      <div style="padding: 15px; background-color: #f8f9fa; border-radius: 6px; margin-bottom: 15px;">
        <div style="display: flex; align-items: center; margin-bottom: 5px;">
          <div style="font-weight: bold; margin-right: 10px; font-size: 1.3em;">VIX: ${vixValue}</div>
          <div style="color: ${trendColor}; font-weight: bold; font-size: 1.69em;">
            <span style="background-color: ${trendColor}; color: white; padding: 2px 6px; border-radius: 3px;">${trendIcon} ${vixTrend}</span>
            </div>
          </div>
        
        <div style="font-size: 14px; color: #555; margin-top: 10px;">
          ${indicators.vix.interpretation || 'Volatility indicator showing market fear and uncertainty.'}
        </div>
        
        <div style="font-size: 12px; color: #888; margin-top: 10px; text-align: right;">
          Source: ${indicators.vix.source || 'CBOE'} (${indicators.vix.sourceUrl || 'N/A'}), as of ${formatDate(indicators.vix.lastUpdated)}
        </div>
      </div>
      `;
    }
    
    // Generate source information
    const sourceInfo = indicators.source 
      ? `<div style="font-size: 12px; color: #888; margin-top: 10px; text-align: right;">
           Source: ${indicators.source} | Last Updated: ${indicators.lastUpdated || 'N/A'}
         </div>`
      : '';
    
    return `
    <div class="section">
      <h2>Key Market Indicators</h2>
      <div style='margin-top: 15px;'>
        ${fearGreedHtml}
        ${vixHtml}
        ${sourceInfo}
      </div>
    </div>
    `;
  } catch (error) {
    Logger.log("Error generating market indicators section: " + error);
    return `
    <div class="section">
      <h2>Key Market Indicators</h2>
      <p>Error generating market indicators section: ${error}</p>
    </div>
    `;
  }
}

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

/**
 * Generates the macroeconomic factors section HTML
 * 
 * @param {Object} macroeconomicAnalysis - The analysis data containing macroeconomic factors
 * @return {String} HTML for the macroeconomic factors section
 */
function generateMacroeconomicFactorsSection(macroeconomicAnalysis) {
  try {
    // Check if macro data exists
    if (!macroeconomicAnalysis) {
      return `
      <div class="section" style="background-color: white; border-radius: 8px; padding: 15px; margin-bottom: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
        <h2 style="color: #333; border-bottom: 1px solid #eee; padding-bottom: 10px; margin-top: 0; text-align: center;">Macroeconomic Factors</h2>
        <p style="text-align: center; color: #757575;">No macroeconomic data available</p>
      </div>
      `;
    }
    
    // Retrieve macroeconomic factors
    const macro = retrieveMacroeconomicFactors();
    if (!macro.success) {
      return {
        success: false,
        message: "Failed to retrieve macroeconomic factors",
        error: macro.error
      };
    }
    
    // Treasury Yields
    let yieldsHtml = '';
    if (macro.treasuryYields?.yields) {
      yieldsHtml = `
        <div style="margin-bottom: 20px;">
          <div style="font-weight: bold; margin-bottom: 10px;">Treasury Yields</div>
          <div style="display: flex; background-color: #f8f9fa; padding: 15px; border-radius: 6px; margin-bottom: 10px;">
            ${macro.treasuryYields.yields.map(yield => `
              <div style="flex: 1; text-align: center; padding: 0 10px; position: relative;">
                <div style="color: #666; font-size: 14px; margin-bottom: 8px;">${yield.term}</div>
                <div style="color: #4CAF50; font-weight: bold; font-size: 20px;">${formatValue(yield.yield)}%</div>
                <div style="position: absolute; top: 0; bottom: 0; left: 0; width: 3px; background-color: #4CAF50;"></div>
              </div>
            `).join('')}
          </div>
          
          <div style="margin-top: 15px; padding-left: 15px; border-left: 4px solid #FFA500;">
            <div style="font-weight: bold; margin-bottom: 5px;">Yield Curve: ${macro.treasuryYields.yieldCurve?.status || 'N/A'}</div>
            <div style="color: #555; font-size: 14px;">${macro.treasuryYields.yieldCurve?.analysis || 'N/A'}</div>
          </div>

          <div style="font-size: 12px; color: #888; margin-top: 10px; text-align: right;">
            Source: ${macro.treasuryYields.source || 'N/A'} (${macro.treasuryYields.sourceUrl || 'N/A'}), as of ${formatDate(macro.treasuryYields.lastUpdated)}
          </div>
        </div>
      `;
    }

    // Fed Policy
    let fedHtml = '';
    if (macro.fedPolicy) {
      fedHtml = `
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #2196F3;">
          <div style="font-weight: bold; margin-bottom: 15px; font-size: 1.2em;">Federal Reserve Policy</div>
          
          <div style="background-color: white; padding: 20px; border-radius: 6px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
            <!-- Commentary Section -->
            <div style="margin-bottom: 15px;">
              <div style="font-size: 16px; color: #333; line-height: 1.6;">${macro.fedPolicy.commentary || 'N/A'}</div>
            </div>
            
            <!-- Current Rate Section -->
            <div style="margin-bottom: 15px;">
              <div style="font-weight: bold; margin-bottom: 5px;">Current Rate</div>
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <div style="color: #4CAF50; font-size: 1.2em; font-weight: bold;">${formatValue(macro.fedPolicy.currentRate.rate)}%</div>
                <div style="color: #666; font-size: 14px;">Range: ${formatValue(macro.fedPolicy.currentRate.lowerBound)}% - ${formatValue(macro.fedPolicy.currentRate.upperBound)}%</div>
              </div>
            </div>
            
            <!-- Meeting Schedule Section -->
            <div style="margin-bottom: 15px;">
              <div style="font-weight: bold; margin-bottom: 5px;">Meeting Schedule</div>
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <div style="color: #666; font-size: 14px;">Last Meeting: ${formatDate(macro.fedPolicy.lastMeeting.date)}</div>
                <div style="color: #666; font-size: 14px;">Next Meeting: ${formatDate(macro.fedPolicy.nextMeeting.date)}</div>
              </div>
            </div>
            
            <!-- Rate Change Probabilities Section -->
            <div style="margin-bottom: 10px;">
              <div style="font-weight: bold; margin-bottom: 5px;">Rate Change Probabilities</div>
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <div style="color: #f44336; font-size: 14px;">
                  <span style="font-size: 1.5em;">↑</span> ${macro.fedPolicy.nextMeeting.probabilityOfHike}%
                </div>
                <div style="color: #757575; font-size: 14px;">
                  <span style="font-size: 1.5em;">→</span> ${macro.fedPolicy.nextMeeting.probabilityOfNoChange}%
                </div>
                <div style="color: #4CAF50; font-size: 14px;">
                  <span style="font-size: 1.5em;">↓</span> ${macro.fedPolicy.nextMeeting.probabilityOfCut}%
                </div>
              </div>
            </div>
          </div>

          <!-- Source Information -->
          <div style="font-size: 12px; color: #888; margin-top: 15px; text-align: right;">
            Source: ${macro.fedPolicy.source || 'N/A'} (${macro.fedPolicy.sourceUrl || 'N/A'}), as of ${formatDate(macro.fedPolicy.lastUpdated)}
          </div>
        </div>
      `;
    }
    
    // Inflation
    let inflationHtml = '';
    const inflationData = macroeconomicAnalysis?.macroeconomicFactors?.inflation;
      
    if (inflationData) {
      inflationHtml = `
      <div style="margin-bottom: 20px;">
        <div style="font-weight: bold; margin-bottom: 10px;">Inflation</div>
        <div style="display: flex; margin-bottom: 15px;">
          <!-- CPI Card -->
          <div style="flex: 1; margin-right: 5px; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
            <div style="text-align: center; padding: 8px 0; font-weight: bold; background-color: #3498db; color: white; line-height: 1.2;">Consumer Price Index<br>(CPI)</div>
            <div style="padding: 10px; text-align: center; background-color: white; border: 1px solid #3498db; border-top: none; border-bottom-left-radius: 8px; border-bottom-right-radius: 8px;">
              <div style="display: flex; justify-content: space-around;">
                <div>
                  <div style="color: #555; font-size: 13px; margin-bottom: 2px;">Headline</div>
                  <div style="color: #2c3e50; font-weight: bold; font-size: 20px;">${inflationData.cpi.headline.toFixed(1)}%</div>
                </div>
                <div>
                  <div style="color: #555; font-size: 13px; margin-bottom: 2px;">Core</div>
                  <div style="color: #2c3e50; font-weight: bold; font-size: 20px;">${inflationData.cpi.core.toFixed(1)}%</div>
                </div>
              </div>
            </div>
          </div>
          
          <!-- PCE Card -->
          <div style="flex: 1; margin-left: 5px; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
            <div style="text-align: center; padding: 8px 0; font-weight: bold; background-color: #e67e22; color: white; line-height: 1.2;">Personal Consumption Expenditure<br>(PCE)</div>
            <div style="padding: 10px; text-align: center; background-color: white; border: 1px solid #e67e22; border-top: none; border-bottom-left-radius: 8px; border-bottom-right-radius: 8px;">
              <div style="display: flex; justify-content: space-around;">
                <div>
                  <div style="color: #555; font-size: 13px; margin-bottom: 2px;">Headline</div>
                  <div style="color: #2c3e50; font-weight: bold; font-size: 20px;">${inflationData.pce.headline.toFixed(1)}%</div>
                </div>
                <div>
                  <div style="color: #555; font-size: 13px; margin-bottom: 2px;">Core</div>
                  <div style="color: #2c3e50; font-weight: bold; font-size: 20px;">${inflationData.pce.core.toFixed(1)}%</div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div style="font-size: 12px; color: #888; margin-top: 10px; text-align: right;">
          Source: Bureau of Labor Statistics, Federal Reserve | Last updated: ${inflationData.lastUpdated}
        </div>
      </div>
      
      <div style="display: flex; margin-bottom: 15px;">
        <div style="flex: 1; background-color: #f1f8e9; padding: 15px; border-radius: 4px; margin-right: 10px; border-left: 4px solid #4CAF50;">
          <div style="font-weight: bold; color: #4CAF50; margin-bottom: 5px;">Inflation Trend Analysis</div>
          <div style="color: #333;">${inflationData.trend}</div>
        </div>
        
        <div style="flex: 1; padding: 15px; background-color: #f8f9fa; border-radius: 4px; margin-right: 10px;">
          <div style="font-weight: bold; margin-bottom: 5px;">Outlook</div>
          <div style="color: #555; font-size: 14px;">${inflationData.outlook}</div>
        </div>
        
        <div style="flex: 1; padding: 15px; background-color: #f8f9fa; border-radius: 4px;">
          <div style="font-weight: bold; margin-bottom: 5px;">Market Impact</div>
          <div style="color: #555; font-size: 14px;">${inflationData.marketImpact}</div>
        </div>
      </div>
      `;
    }
    
    // Return the complete HTML for the macroeconomic factors section
    return `
    <div class="section" style="background-color: white; border-radius: 8px; padding: 15px; margin-bottom: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
      <h2 style="color: #333; border-bottom: 1px solid #eee; padding-bottom: 10px; margin-top: 0; text-align: center;">Macroeconomic Factors</h2>
      
      ${yieldsHtml}
      ${fedHtml}
      ${inflationHtml}
    </div>
    `;
  } catch (error) {
    Logger.log("Error generating macroeconomic factors section: " + error);
    return `
    <div class="section" style="background-color: white; border-radius: 8px; padding: 15px; margin-bottom: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
      <h2 style="color: #333; border-bottom: 1px solid #eee; padding-bottom: 10px; margin-top: 0; text-align: center;">Macroeconomic Factors</h2>
      <p style="text-align: center; color: #757575;">Error generating macroeconomic factors data</p>
    </div>
    `;
  }
}

/**
 * Generates the geopolitical risks section HTML
 * 
 * @param {Object} analysis - The analysis data
 * @return {String} HTML for the geopolitical risks section
 */
function generateGeopoliticalRisksSection(analysis) {
  try {
    // Retrieve real macroeconomic data
    const macroData = retrieveMacroeconomicFactors();
    const geoRisks = macroData && macroData.data && macroData.data.geopoliticalRisks;
    
    // If no geopolitical risks data is available, return a message indicating so.
    if (!geoRisks) {
      return `
      <div class="section" style="background-color: white; border-radius: 8px; padding: 15px; margin-bottom: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
        <h2 style="color: #333; border-bottom: 1px solid #eee; padding-bottom: 10px; margin-top: 0; text-align: center;">Geopolitical Risks</h2>
        <p style="text-align: center; color: #757575;">No geopolitical risk data available</p>
      </div>
      `;
    }
    
    // Generate global overview HTML if available
    let globalOverviewHtml = '';
    if (analysis && analysis.macroeconomicFactors && analysis.macroeconomicFactors.geopoliticalRisks && analysis.macroeconomicFactors.geopoliticalRisks.global) {
      globalOverviewHtml = `
      <div style="margin-bottom: 15px; padding: 10px; background-color: #f8f9fa; border-radius: 6px; border-left: 4px solid #ff9800;">
        <div style="font-weight: bold; margin-bottom: 5px;">Global Overview</div>
        <div style="color: #333;">${analysis.macroeconomicFactors.geopoliticalRisks.global}</div>
      </div>
      `;
    }

    // Sort risks by impact level (descending)
    const sortedRisks = [...geoRisks.risks].sort((a, b) => {
      if (a.impactLevel === undefined || a.impactLevel === null) return 1;
      if (b.impactLevel === undefined || b.impactLevel === null) return -1;
      return b.impactLevel - a.impactLevel;
    });

    // Generate risk cards
    let riskCardsHtml = '';
    sortedRisks.forEach(risk => {
      // Get the impact level from the data structure
      let riskLevel = risk.impactLevel || 'Medium';
      
      // Determine color based on the impact level
      let riskColor;
      switch (riskLevel.toLowerCase()) {
        case 'high':
          riskColor = '#f44336'; // red
          break;
        case 'medium':
          riskColor = '#ff9800'; // orange
          break;
        case 'severe':
          riskColor = '#d32f2f'; // darker red
          break;
        default:
          riskColor = '#4caf50'; // green for 'Low'
      }
      
      riskCardsHtml += `
      <div style="display: flex; margin-bottom: 15px;">
        <div style="flex: 1; background-color: #f8f9fa; padding: 15px; border-radius: 6px; margin-right: 10px;">
          <div style="font-weight: bold; margin-bottom: 5px;">${risk.name || 'Unknown Risk'}</div>
          <div style="color: #555; margin-bottom: 5px;">${risk.description || 'No description available'}</div>
          <div style="font-size: 12px; color: #757575;">
            Region: ${risk.region || ''} • Impact Level: ${riskLevel}
          </div>
        </div>
        <div style="width: 80px; text-align: center; background-color: ${riskColor}; color: white; border-radius: 6px; padding: 8px 0; display: flex; align-items: center; justify-content: center;">
          <div style="font-size: 14px; font-weight: bold; line-height: 1.2;">${riskLevel}</div>
        </div>
      </div>
      `;
    });

    return `
    <div class="section" style="background-color: white; border-radius: 8px; padding: 15px; margin-bottom: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
      <h2 style="color: #333; border-bottom: 1px solid #eee; padding-bottom: 10px; margin-top: 0; text-align: center;">Geopolitical Risks</h2>
      ${globalOverviewHtml}
      ${riskCardsHtml}
      <div style="font-size: 12px; color: #888; margin-top: 10px; text-align: right;">
        Last Updated: ${formatDate(geoRisks.lastUpdated)}
      </div>
    </div>
    `;
  } catch (error) {
    Logger.log("Error generating geopolitical risks section: " + error);
    return `
    <div class="section" style="background-color: white; border-radius: 8px; padding: 15px; margin-bottom: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
      <h2 style="color: #333; border-bottom: 1px solid #eee; padding-bottom: 10px; margin-top: 0; text-align: center;">Geopolitical Risks</h2>
      <p style="text-align: center; color: #757575;">Error generating geopolitical risks data</p>
    </div>
    `;
  }
}

/**
 * Helper function to format dates consistently
 * @param {Date} date - The date to format
 * @return {String} Formatted date
 */
function formatDate(date) {
  if (!date) return 'N/A';
  
  // Convert to Date object if needed
  const d = date instanceof Date ? date : new Date(date);
  
  // Format date and time
  const options = {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZoneName: 'short'
  };
  
  return d.toLocaleString('en-US', options);
}

/**
 * Saves the given content to Google Drive
 * 
 * @param {String} filename - The filename to use for the saved file
 * @param {String} content - The content to save
 * @return {String} The URL of the saved file
 */
function saveToGoogleDrive(filename, content) {
  try {
    const folderName = 'Trading Analysis Emails';
    const folders = DriveApp.getFoldersByName(folderName);
    
    if (!folders.hasNext()) {
      throw new Error(`Folder '${folderName}' not found in Google Drive`);
    }
    
    const folder = folders.next();
    
    // Check if file already exists
    const files = folder.getFilesByName(filename);
    let file;
    
    if (files.hasNext()) {
      file = files.next();
      file.setContent(content);
    } else {
      file = folder.createFile(filename, content);
    }
    
    return file.getUrl();
  } catch (error) {
    Logger.log('Error saving to Google Drive: ' + error);
    throw new Error('Failed to save file to Google Drive: ' + error);
  }
}

/**
 * Helper function to format values safely
 * @param {Number} value - The value to format
 * @param {Number} decimals - Number of decimal places (default: 2)
 * @return {String} Formatted value
 */
function formatValue(value, decimals = 2) {
  if (value === undefined || value === null || isNaN(value)) {
    return "N/A";
  }
  return value.toFixed(decimals);
}

/**
 * Helper function to generate the Macroeconomic Factors section with real data
 * @return {String} HTML for the macroeconomic factors section
 */
function generateMacroeconomicFactorsHelper() {
  try {
    // Retrieve real macroeconomic data
    const macroData = retrieveMacroeconomicFactors();
    
    // Log the raw data for debugging
    Logger.log('Retrieved Macroeconomic Data:\n' + JSON.stringify(macroData, null, 2));
    
    // Generate the HTML section
    const html = generateMacroeconomicFactorsSection(macroData);
    
    // Log the resulting HTML
    Logger.log('Generated Macroeconomic Factors HTML:\n' + html);
    
    return html;
  } catch (error) {
    Logger.log('Error in generateMacroeconomicFactorsHelper: ' + error);
    throw error;
  }
}

function formatNumberWithSuffix(value, suffix = '') {
  if (value === 'N/A' || value === null || value === undefined) return 'N/A';
  if (typeof value !== 'number') return value;
  
  if (suffix === 'B') return (value / 1e9).toFixed(1) + 'B';
  if (suffix === 'M') return (value / 1e6).toFixed(1) + 'M';
  if (suffix === 'K') return (value / 1e3).toFixed(1) + 'K';
  
  return value.toFixed(2);
}
