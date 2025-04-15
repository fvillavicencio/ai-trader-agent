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
    const analysis = analysisResult.analysis || {};
    const analysisTime = analysisResult.timestamp ? new Date(analysisResult.timestamp) : new Date();
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
    
    return generateHTML(formattedAnalysisTime, sentimentHtml, marketIndicatorsHtml, fundamentalMetricsHtml, macroeconomicFactorsHtml, geopoliticalRisksHtml, analysisResult, isTest);
  } catch (error) {
    Logger.log('Error in generateEmailTemplate: ' + error.toString());
    throw error;
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
    
    // Get inflation expectations data
    const inflation = analysis.macroeconomicFactors?.inflation || {};
    
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
          <div style="padding: 15px; background-color: #f8f9fa; border-radius: 6px; margin-bottom: 15px;">
            <div style="font-weight: bold; margin-bottom: 5px;">${analyst.analyst || 'Unknown Analyst'}</div>
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
      ? `<div style="font-size: 10px; color: #888; margin-top: 10px; text-align: right;">
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
    let indicators = retrieveKeyMarketIndicators() || {};
    if (!indicators || !indicators.success) {
      indicators = analysis.marketIndicators || {};
    }
      
    if (debugMode) {
      Logger.log("Debug mode enabled - got this indicators: " + JSON.stringify(indicators));
    }
    
    // Major Indices
    let indicesHtml = '';
    if (indicators.majorIndices && Array.isArray(indicators.majorIndices)) {
      indicesHtml = `
      <div style="margin-bottom: 15px; padding: 12px; background-color: #f9f9f9; border-radius: 6px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
        <div style="font-weight: bold; font-size: 16px; margin-bottom: 10px;">Major Indices</div>
        <div style="display: flex; flex-direction: column; gap: 8px;">
          ${indicators.majorIndices.map(index => {
            const price = index.price || 'N/A';
            const change = index.change || 0;
            const percentChange = index.percentChange || 0;
            const changeColor = percentChange >= 0 ? '#4caf50' : '#f44336';
            const changeIcon = percentChange >= 0 ? '&#8593;' : '&#8595;';
            
            return `
            <div style="display: flex; align-items: center; padding: 8px; background-color: #ffffff; border-radius: 4px; border-left: 3px solid ${changeColor};">
              <div style="font-weight: bold; width: 200px;">${index.name}</div>
              <div style="flex: 1; text-align: right;">${price}</div>
              <div style="color: ${changeColor}; font-weight: bold; margin-left: 10px;">${changeIcon} ${typeof change === 'number' && isFinite(change) ? change.toFixed(2) : 'N/A'}</div>
            </div>
            `;
          }).join('')}
        </div>
        <div style="font-size: 10px; color: #888; margin-top: 10px; text-align: right;">
          Source: <a href="https://finance.yahoo.com/markets/">Yahoo Finance</a>, as of ${formatDate(indicators.majorIndices[0]?.timestamp)}
        </div>
      </div>
      `;
    }
    
    // Sector Performance
    let sectorsHtml = '';
    if (indicators.sectorPerformance && Array.isArray(indicators.sectorPerformance)) {
      sectorsHtml = `
      <div style="margin-bottom: 15px; padding: 12px; background-color: #f9f9f9; border-radius: 6px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
        <div style="font-weight: bold; font-size: 16px; margin-bottom: 10px;">Sector Performance</div>
        <div style="display: flex; flex-direction: column; gap: 8px;">
          ${indicators.sectorPerformance.map(sector => {
            const percentChange = sector.percentChange || 0;
            const changeColor = percentChange >= 0 ? '#4caf50' : '#f44336';
            const changeIcon = percentChange >= 0 ? '&#8593;' : '&#8595;';
            
            return `
            <div style="display: flex; align-items: center; padding: 8px; background-color: #ffffff; border-radius: 4px; border-left: 3px solid ${changeColor};">
              <div style="font-weight: bold; width: 200px;">${sector.name}</div>
              <div style="color: ${changeColor}; font-weight: bold; margin-left: 10px;">${changeIcon} ${typeof percentChange === 'number' && isFinite(percentChange) ? percentChange.toFixed(1) : 'N/A'}%</div>
            </div>
            `;
          }).join('')}
        </div>
        <div style="font-size: 10px; color: #888; margin-top: 10px; text-align: right;">
           Source: <a href="https://finance.yahoo.com/sectors/">Yahoo Finance</a>, as of ${formatDate(indicators.majorIndices[0]?.timestamp)}
        </div>
      </div>
      `;
    }
    
    // Fear & Greed Index
    let fearGreedHtml = '';
    if (indicators.fearAndGreedIndex && !indicators.fearAndGreedIndex.error) {
      const fgValue = indicators.fearAndGreedIndex.currentValue || 50;
      const fgInterpretation = indicators.fearAndGreedIndex.rating || 
        (fgValue <= 25 ? 'Extreme Fear' : 
         fgValue <= 40 ? 'Fear' : 
         fgValue <= 60 ? 'Neutral' : 
         fgValue <= 75 ? 'Greed' : 
         'Extreme Greed');
      
      const fgColor = fgValue <= 25 ? '#f44336' : 
                      fgValue >= 75 ? '#4caf50' : 
                      fgValue >= 50 ? '#8bc34a' : 
                      '#ff9800';
      
      const previousValues = {
        previousClose: indicators.fearAndGreedIndex.previousClose || 'N/A',
        oneWeekAgo: indicators.fearAndGreedIndex.oneWeekAgo || 'N/A',
        oneMonthAgo: indicators.fearAndGreedIndex.oneMonthAgo || 'N/A',
        oneYearAgo: indicators.fearAndGreedIndex.oneYearAgo || 'N/A'
      };
      
      fearGreedHtml = `
      <div style="padding: 15px; background-color: #f8f9fa; border-radius: 6px; margin-bottom: 15px;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
          <div style="font-weight: bold; font-size: 1.3em;">Fear & Greed Index:</div>
          <div style="font-weight: bold; color: ${fgColor}; font-size: 1.69em;">${typeof fgValue === 'number' && isFinite(fgValue) ? fgValue.toFixed(0) : 'N/A'}</div>
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
          <span style="font-weight: bold;">${fgInterpretation}:</span> <span>${indicators.fearAndGreedIndex.analysis || 'Market sentiment indicator based on various market factors.'}</span>
          <span style="margin-left: 50px; font-size: 12px; color: #888;">
            ${Object.entries(previousValues)
              .filter(([_, value]) => value && value !== 'N/A')
              .map(([key, value]) => {
                const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
                return ` ${label}: ${value}`;
              }).join(' | ')}
          </span>
        </div>
        
        <div style="font-size: 10px; color: #888; margin-top: 15px; text-align: right;">
          Source: <a href="https://www.cnn.com/markets/fear-and-greed">CNN</a>, as of ${formatDate(indicators.fearAndGreedIndex.timestamp)}
        </div>
      </div>
      `;
    }
    
    // Volatility Indices
    let vixHtml = '';
    if (indicators.volatilityIndices && Array.isArray(indicators.volatilityIndices)) {
      vixHtml = `
      <div style="margin-bottom: 15px; padding: 12px; background-color: #f9f9f9; border-radius: 6px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
        <div style="font-weight: bold; font-size: 16px; margin-bottom: 10px;">Volatility Indices</div>
        <div style="display: flex; flex-direction: column; gap: 8px;">
          ${indicators.volatilityIndices.map(vix => {
            const vixValue = vix.value || 'N/A';
            const vixTrend = vix.trend || 'Stable';
            const vixColor = vixValue >= 30 ? '#f44336' : 
                           vixValue >= 20 ? '#ff9800' : 
                           '#4caf50';
            
            const trendIcon = vixTrend.toLowerCase().includes('rising') ? '&#8593;' :
                            vixTrend.toLowerCase().includes('falling') ? '&#8595;' : '&#8594;';
            
            const trendColor = vixTrend.toLowerCase().includes('rising') ? '#f44336' :
                            vixTrend.toLowerCase().includes('falling') ? '#4caf50' : '#757575';
            
            return `
            <div style="display: flex; align-items: center; padding: 8px; background-color: #ffffff; border-radius: 4px; border-left: 3px solid ${vixColor};">
              <div style="font-weight: bold; width: 200px;">${vix.name}</div>
              <div style="flex: 1; text-align: right;">${vixValue}</div>
              <div style="color: ${trendColor}; font-weight: bold; margin-left: 10px;">${trendIcon} ${vixTrend}</div>
            </div>
            `;
          }).join('')}
        </div>
        <div style="font-size: 10px; color: #888; margin-top: 10px; text-align: right;">
          Source: <a href="https://finance.yahoo.com/quote/%5EVIX/">Yahoo Finance</a>, as of ${formatDate(indicators.volatilityIndices[0]?.timestamp)}
        </div>
      </div>
      `;
    }

    // Upcoming Economic Events
    let eventsHtml = '';
    if (indicators.upcomingEconomicEvents && Array.isArray(indicators.upcomingEconomicEvents) && indicators.upcomingEconomicEvents.length > 0) {
      // Sort events by date
      const sortedEvents = [...indicators.upcomingEconomicEvents].sort((a, b) => {
        const dateA = parseEconomicEventDate(a.date);
        const dateB = parseEconomicEventDate(b.date);
        
        // Log for debugging
        Logger.log(`Comparing dates: ${a.date} (${dateA.getTime()}) vs ${b.date} (${dateB.getTime()})`);
        
        return dateA.getTime() - dateB.getTime();
      });

      eventsHtml = `
      <div style="margin-bottom: 15px; padding: 12px; background-color: #f9f9f9; border-radius: 6px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
        <div style="font-weight: bold; font-size: 16px; margin-bottom: 10px;">Upcoming Events</div>
        <div style="display: flex; flex-direction: column; gap: 8px;">
          ${sortedEvents.map(event => {
            const actual = (event.actual && event.actual !== 'N/A') ? `Actual: ${event.actual}` : '';
            const forecast = (event.forecast && event.forecast !== 'N/A') ? `Forecast: ${event.forecast}` : '';
            const previous = (event.previous && event.previous !== 'N/A') ? `Previous: ${event.previous}` : '';
            const period = event.period ? `${event.period} ` : '';
            const values = [actual, forecast, previous].filter(Boolean).join(', ');
            
            // Use the separate event and source fields
            const eventName = event.event;
            const eventSource = event.source;
            
            return `
            <div style="display: flex; margin-bottom: 15px;">
              <div style="min-width: 10px;">
                <div style="font-weight: bold; color: #2196f3; font-size: 13px;">${event.date}</div>
              </div>
              <div style="flex: 1; margin: 0 15px;">
                <div style="font-weight: bold; margin-bottom: 2px;">${eventName}</div>
                <div style="font-size: 12px; color: #666;">${eventSource}</div>
              </div>
              <div style="min-width: 10px; text-align: right; color: #555; font-size: 11px;">
                ${values}
              </div>
            </div>
            `;
          }).join('')}
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
        ${indicesHtml}
        ${sectorsHtml}
        ${fearGreedHtml}
        ${vixHtml}
        ${eventsHtml}
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
                if (
                  value === 'N/A' || value === null || value === undefined ||
                  value === '' || value === false ||
                  (typeof value === 'number' && (isNaN(value) || !isFinite(value))) ||
                  (typeof value === 'string' && ['n/a', 'na', 'nan', 'null', 'undefined', '-'].includes(value.trim().toLowerCase()))
                ) return '';
                return `
                  <div style="display: flex; justify-content: space-between; margin-bottom: 5px; flex-wrap: wrap;">
                    <div style="color: #000; min-width: 80px;">${label}</div>
                    <div style="font-weight: bold; text-align: right; color: #000; overflow: hidden; text-overflow: ellipsis;">${formatNumberWithSuffix(value, suffix)}</div>
                  </div>
                `;
              };

              // Dynamically render all available metrics from the stock object, excluding non-values
              const metricLabels = {
                marketCap: 'Market Cap',
                peRatio: 'P/E Ratio',
                forwardPE: 'Forward PE',
                pegRatio: 'PEG Ratio',
                pegForwardRatio: 'PEG Forward Ratio',
                priceToBook: 'Price/Book',
                priceToSales: 'Price/Sales',
                debtToEquity: 'Debt/Equity',
                returnOnEquity: 'ROE',
                returnOnAssets: 'ROA',
                profitMargin: 'Profit Margin',
                dividendYield: 'Dividend Yield',
                beta: 'Beta',
                volume: 'Volume',
                open: 'Open',
                close: 'Previous Close',
                dayHigh: 'Day High',
                dayLow: 'Day Low',
                fiftyTwoWeekHigh: '52W High',
                fiftyTwoWeekLow: '52W Low',
                sector: 'Sector',
                industry: 'Industry',
                // Add more fields as needed from StockDataRetriever.gs
              };

              // Determine company name: prefer 'name', fallback to 'company', fallback to symbol if all else fails
              let companyName = '';
              if (stock.name && typeof stock.name === 'string' && stock.name.trim() && stock.name.trim().toUpperCase() !== 'N/A') {
                companyName = stock.name.trim();
              } else if (stock.company && typeof stock.company === 'string' && stock.company.trim() && stock.company.trim().toUpperCase() !== 'N/A') {
                companyName = stock.company.trim();
              } else {
                companyName = stock.symbol || '';
              }

              // Arrow logic: prefer string sign, fallback to number, fallback to neutral
              let arrow = '';
              if (typeof stock.priceChange === 'string') {
                arrow = stock.priceChange.trim().startsWith('-') ? '&#8595;' : '&#8593;';
              } else if (typeof stock.priceChange === 'number') {
                arrow = stock.priceChange < 0 ? '&#8595;' : '&#8593;';
              } else {
                arrow = '';
              }

              // Price change display: show string if string, else formatted number, else N/A
              let priceChangeDisplay = 'N/A';
              if (typeof stock.priceChange === 'string') {
                priceChangeDisplay = stock.priceChange;
              } else if (typeof stock.priceChange === 'number' && isFinite(stock.priceChange)) {
                priceChangeDisplay = stock.priceChange.toFixed(2);
              }

              // Percent change display: only if number and finite
              let percentChangeDisplay = '';
              if (typeof stock.changesPercentage === 'number' && isFinite(stock.changesPercentage)) {
                percentChangeDisplay = '(' + stock.changesPercentage.toFixed(2) + '%)';
              }

              // --- Compose the top-right price line ---
              // Example: $94.65 ↑ 1.87 (2.02%)
              let priceChangeAbs = '';
              if (typeof stock.priceChange === 'number' && isFinite(stock.priceChange)) {
                priceChangeAbs = Math.abs(stock.priceChange).toFixed(2);
              } else if (typeof stock.priceChange === 'string' && stock.priceChange.trim() && stock.priceChange !== 'N/A') {
                priceChangeAbs = stock.priceChange.replace(/^[-+]/, '');
              }
              let priceLine = `$${formatValue(stock.price)}`;
              if (arrow) priceLine += ` <span style=\"color: ${getColor(stock.priceChange)};\">${arrow}</span>`;
              if (priceChangeAbs) priceLine += ` <span style=\"color: ${getColor(stock.priceChange)}; font-weight: normal;\">${priceChangeAbs}</span>`;
              if (percentChangeDisplay && percentChangeDisplay !== '(N/A%)') priceLine += ` <span style=\"color: #555; font-weight: normal;\">${percentChangeDisplay}</span>`;

              // --- Helper to add $ prefix for open/close ---
              function renderDollarValue(val) {
                if (val === undefined || val === null || val === '' || isNaN(val)) return '';
                return `$${formatValue(val)}`;
              }

              return `
                <div class=\"stock-card\">
                  <div style=\"flex: 1; border-radius: 6px; overflow: hidden; box-shadow: none; max-width: 100%; border: 1px solid ${getColor(stock.priceChange)};\">
                    <div style=\"display: flex; justify-content: space-between; align-items: flex-start; padding: 10px; background-color: #f8f9fa; overflow: hidden;\">
                      <!-- Left: Symbol and Company Name -->
                      <div style=\"display: flex; flex-direction: column; align-items: flex-start; min-width: 120px;\">
                        <div style=\"font-weight: bold; font-size: 18px; color: #000; letter-spacing: 1px;\">${stock.symbol}</div>
                        <div style=\"font-size: 11px; font-style: italic; color: #555; font-weight: normal; margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 120px;\">${companyName}</div>
                      </div>
                      <!-- Right: Price, Arrow, Price Change, Percent Change (single line) -->
                      <div style=\"display: flex; flex-direction: column; align-items: flex-end; min-width: 110px;\">
                        <div style=\"font-weight: bold; font-size: 1.1em; color: ${getColor(stock.priceChange)}; margin-bottom: 2px; white-space: nowrap;\">${priceLine}</div>
                      </div>
                    </div>
                    <!-- Metrics Table -->
                    <div style=\"padding: 10px; background-color: white;\">
                      <table style=\"width: 100%; border-collapse: collapse; font-size: 0.97em;\">
                        <tbody>
                          ${Object.keys(metricLabels).map(key => {
                            if (stock[key] === undefined || stock[key] === null || stock[key] === '') return '';
                            let displayValue = stock[key];
                            if (key === 'open' || key === 'close') displayValue = renderDollarValue(stock[key]);
                            if (key === 'marketCap') displayValue = formatMarketCap(stock[key]);
                            return `<tr><td style=\"color: #777; padding: 2px 8px 2px 0;\">${metricLabels[key]}</td><td style=\"font-weight: bold; color: #222; padding: 2px 0; text-align: right;\">${displayValue}</td></tr>`;
                          }).join('')}
                        </tbody>
                      </table>
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
                <div style="color: #4CAF50; font-weight: bold; font-size: 20px;">${typeof yield.yield === 'number' && isFinite(yield.yield) ? yield.yield.toFixed(2) : 'N/A'}%</div>
                <div style="position: absolute; top: 0; bottom: 0; left: 0; width: 3px; background-color: #4CAF50;"></div>
              </div>
            `).join('')}
          </div>
          
          <div style="margin-top: 15px; padding-left: 15px; border-left: 4px solid #FFA500;">
            <div style="font-weight: bold; margin-bottom: 5px;">Yield Curve: ${macro.treasuryYields.yieldCurve?.status || 'N/A'}</div>
            <div style="color: #555; font-size: 14px;">${macro.treasuryYields.yieldCurve?.analysis || 'N/A'}</div>
          </div>

          <div style="font-size: 10px; color: #888; margin-top: 10px; text-align: right;">
            Source: <a href="${macro.treasuryYields.sourceUrl}">${macro.treasuryYields.source}</a>, as of ${formatDate(macro.treasuryYields.lastUpdated)}
          </div>
        </div>
      `;
    }

    // Fed Policy
    if (debugMode) {
      Logger.log("Fed Policy: " + JSON.stringify(macro.fedPolicy));
    }
    let fedHtml = '';
    if (macro.fedPolicy) {
      fedHtml = `
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #2196F3;">
          <div style="font-weight: bold; margin-bottom: 15px; font-size: 1.2em;">Federal Reserve Policy</div>
          
          <div style="background-color: white; padding: 20px; border-radius: 6px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
            <!-- Forward Guidance Section -->
            <div style="margin-bottom: 15px;">
              <div style="font-size: 16px; color: #333; line-height: 1.6;">${macro.fedPolicy.forwardGuidance || 'N/A'}</div>
              <!-- Source Information -->
              <div style="font-size: 10px; color: #888; margin-top: 15px; text-align: right;">
                Source: <a href="${macro.fedPolicy.source.components.forwardGuidance.components.url || 'N/A'}">${macro.fedPolicy.source.components.forwardGuidance.components.name || 'N/A'}</a>, as of ${formatDate(macro.fedPolicy.source.components.forwardGuidance.components.timestamp || 'N/A')}
              </div>
            </div>
            
            <!-- Current Rate Section -->
            <div style="margin-bottom: 15px;">
              <div style="font-weight: bold; margin-bottom: 5px;">Current Federal Funds Rate</div>
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <div style="color: #4CAF50; font-size: 1.5em; font-weight: bold;">${typeof macro.fedPolicy.currentRate.currentRate === 'number' && isFinite(macro.fedPolicy.currentRate.currentRate) ? macro.fedPolicy.currentRate.currentRate.toFixed(2) : 'N/A'}%</div>
                <div style="color: #666; font-size: 14px;">Range: ${typeof macro.fedPolicy.currentRate.rangeLow === 'number' && isFinite(macro.fedPolicy.currentRate.rangeLow) ? macro.fedPolicy.currentRate.rangeLow.toFixed(2) : 'N/A'}% - ${typeof macro.fedPolicy.currentRate.rangeHigh === 'number' && isFinite(macro.fedPolicy.currentRate.rangeHigh) ? macro.fedPolicy.currentRate.rangeHigh.toFixed(2) : 'N/A'}%</div>
              </div>
              <div style="font-size: 10px; color: #888; margin-top: 15px; text-align: right;">
                Source: <a href="${macro.fedPolicy.source.components.fedFundsRate.components.url || 'N/A'}">${macro.fedPolicy.source.components.fedFundsRate.components.name || 'N/A'}</a>, as of ${formatDate(macro.fedPolicy.source.components.fedFundsRate.components.timestamp || 'N/A')}
              </div>
            </div>
            
            <!-- Federal Funds Futures Section -->
            <div style="margin-bottom: 15px;">
              <div style="font-weight: bold; margin-bottom: 5px;">Federal Funds Futures</div>
              <div style="display: flex; flex-direction: column; gap: 8px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;margin-top: 5px">
                  <div style="color: #666; font-size: 1em;">Current Price: <span style="font-weight: bold; font-size: 1.5em;">${macro.fedPolicy.futures.currentPrice || 'N/A'}</span></div>
                  <div style="color: #666; font-size: 1em;">Implied Rate: <span style="font-weight: bold; font-size: 1.5em;">${typeof macro.fedPolicy.futures.impliedRate === 'number' && isFinite(macro.fedPolicy.futures.impliedRate) ? macro.fedPolicy.futures.impliedRate.toFixed(2) : 'N/A'}%</span></div>
                </div>
              </div>
              <div style="font-weight: bold; margin-bottom: 5px;">Rate Change Probabilities</div>
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <div style="display: flex; align-items: center; gap: 5px;">
                  <span style="color: #4CAF50; font-size: 1.5em;font-weight: bold;">&#8595;</span>
                  <div style="color: #4CAF50; font-size: 1.5em;font-weight: bold;">${typeof macro.fedPolicy.futures.probabilities.cut === 'number' && isFinite(macro.fedPolicy.futures.probabilities.cut) ? macro.fedPolicy.futures.probabilities.cut.toFixed(0) : 'N/A'}%</div>
                </div>
                <div style="display: flex; align-items: center; gap: 5px;">
                  <span style="color: #757575; font-size: 1.5em;font-weight: bold;">&#8594;</span>
                  <div style="color: #757575; font-size: 1.5em;font-weight: bold;">${typeof macro.fedPolicy.futures.probabilities.hold === 'number' && isFinite(macro.fedPolicy.futures.probabilities.hold) ? macro.fedPolicy.futures.probabilities.hold.toFixed(0) : 'N/A'}%</div>
                </div>
                <div style="display: flex; align-items: center; gap: 5px;">
                  <span style="color: #f44336; font-size: 1.5em;font-weight: bold;">&#8593;</span>
                  <div style="color: #f44336; font-size: 1.5em;font-weight: bold;">${typeof macro.fedPolicy.futures.probabilities.hike === 'number' && isFinite(macro.fedPolicy.futures.probabilities.hike) ? macro.fedPolicy.futures.probabilities.hike.toFixed(0) : 'N/A'}%</div>
                </div>
              </div>
              <!-- Source Information -->
              <div style="font-size: 10px; color: #888; margin-top: 15px; text-align: right;">
                Source: <a href="${macro.fedPolicy.source.components.futures.components.url || 'N/A'}">${macro.fedPolicy.source.components.futures.components.name || 'N/A'}</a>, as of ${formatDate(macro.fedPolicy.source.components.futures.components.timestamp || 'N/A')}
              </div>
            </div>
            
            <!-- Meeting Schedule Section -->
            <div style="margin-bottom: 15px;">
              <div style="font-weight: bold; margin-bottom: 5px;">Meeting Schedule</div>
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <div style="color: #666; font-size: 14px;">Last ${macro.fedPolicy.lastMeeting.fullText}</div>
                <div style="color: #666; font-size: 14px;">Next ${macro.fedPolicy.nextMeeting.fullText}</div>
              </div>
              <div style="font-size: 10px; color: #888; margin-top: 15px; text-align: right;">
                Source: <a href="${macro.fedPolicy.source.components.meetings.components.url || 'N/A'}">${macro.fedPolicy.source.components.meetings.components.name || 'N/A'}</a>, as of ${formatDate(macro.fedPolicy.source.components.meetings.components.timestamp || 'N/A')}
              </div>
            </div>
            
          </div>
        </div>
      `;
    }
    
    // Inflation
    let inflationHtml = '';
    var inflationData = macroeconomicAnalysis?.macroeconomicFactors?.inflation;
      
    if (inflationData) {
      if (!inflationData.expectations) {
        inflationData.expectations = retrieveInflationExpectations();
      }
      if (debugMode) {
        Logger.log("Inflation Data: " + JSON.stringify(inflationData));
      } 
 
      inflationHtml = `
      <div style="margin-bottom: 20px;">
        <div style="font-weight: bold; margin-bottom: 10px; font-size: 1.2em;">Inflation</div>
        <div style="display: flex; margin-bottom: 15px;">
          <!-- CPI Card -->
          <div style="flex: 1; margin-right: 5px; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
            <div style="text-align: center; padding: 8px 0; font-weight: bold; background-color: #3498db; color: white; line-height: 1.2;">Consumer Price Index<br>(CPI)</div>
            <div style="padding: 10px; text-align: center; background-color: white; border: 1px solid #3498db; border-top: none; border-bottom-left-radius: 8px; border-bottom-right-radius: 8px;">
              <div style="display: flex; justify-content: space-around;">
                <div>
                  <div style="color: #555; font-size: 1.1em; margin-bottom: 2px;">Headline</div>
                  <div style="color: #2c3e50; font-weight: bold; font-size: 1.5em;">${typeof inflationData.cpi.headline === 'number' && isFinite(inflationData.cpi.headline) ? inflationData.cpi.headline.toFixed(1) : 'N/A'}%</div>
                </div>
                <div>
                  <div style="color: #555; font-size: 1.1em; margin-bottom: 2px;">Core</div>
                  <div style="color: #2c3e50; font-weight: bold; font-size: 1.5em;">${typeof inflationData.cpi.core === 'number' && isFinite(inflationData.cpi.core) ? inflationData.cpi.core.toFixed(1) : 'N/A'}%</div>
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
                  <div style="color: #555; font-size: 1.1em; margin-bottom: 2px;">Headline</div>
                  <div style="color: #2c3e50; font-weight: bold; font-size: 1.5em;">${typeof inflationData.pce.headline === 'number' && isFinite(inflationData.pce.headline) ? inflationData.pce.headline.toFixed(1) : 'N/A'}%</div>
                </div>
                <div>
                  <div style="color: #555; font-size: 1.1em; margin-bottom: 2px;">Core</div>
                  <div style="color: #2c3e50; font-weight: bold; font-size: 1.5em;">${typeof inflationData.pce.core === 'number' && isFinite(inflationData.pce.core) ? inflationData.pce.core.toFixed(1) : 'N/A'}%</div>
                </div>
              </div>
            </div>
          </div>
        </div>
       
        <!-- Inflation Expectations -->
        ${inflationData?.expectations && inflationData.expectations.oneYear && inflationData.expectations.fiveYear && inflationData.expectations.tenYear 
          ? `
        <div style="background-color: #f8f9fa; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
          <div style="background-color:rgb(19, 52, 79); color: white; padding: 12px; text-align: center;">
            <div style="font-size: 1.1em; font-weight: bold; margin-bottom: 4px;">Inflation Expectations</div>
            <div style="font-size: 0.9em; color: rgba(255,255,255,0.8);">Market Consensus</div>
          </div>
          <div style="padding: 15px; background-color: white;">
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px;">
              <div style="text-align: center;">
                <div style="color: #4CAF50; font-size: 1.1em; margin-bottom: 6px;">1-Year</div>
                <div style="color: #2c3e50; font-weight: bold; font-size: 1.5em;">${typeof inflationData.expectations.oneYear.value === 'number' && isFinite(inflationData.expectations.oneYear.value) ? inflationData.expectations.oneYear.value.toFixed(1) : 'N/A'}%</div>
                <div style="color: #666; font-size: 0.8em; margin-top: 4px;">${formatDate(new Date(inflationData.expectations.oneYear.lastUpdated))}</div>
              </div>
              <div style="text-align: center;">
                <div style="color: #2196F3; font-size: 1.1em; margin-bottom: 6px;">5-Year</div>
                <div style="color: #2c3e50; font-weight: bold; font-size: 1.5em;">${typeof inflationData.expectations.fiveYear.value === 'number' && isFinite(inflationData.expectations.fiveYear.value) ? inflationData.expectations.fiveYear.value.toFixed(1) : 'N/A'}%</div>
                <div style="color: #666; font-size: 0.8em; margin-top: 4px;">${formatDate(new Date(inflationData.expectations.fiveYear.lastUpdated))}</div>
              </div>
              <div style="text-align: center;">
                <div style="color: #9C27B0; font-size: 1.1em; margin-bottom: 6px;">10-Year</div>
                <div style="color: #2c3e50; font-weight: bold; font-size: 1.5em;">${typeof inflationData.expectations.tenYear.value === 'number' && isFinite(inflationData.expectations.tenYear.value) ? inflationData.expectations.tenYear.value.toFixed(1) : 'N/A'}%</div>
                <div style="color: #666; font-size: 0.8em; margin-top: 4px;">${formatDate(new Date(inflationData.expectations.tenYear.lastUpdated))}</div>
              </div>
            </div>
            <div style="font-size: 0.8em; color: #888; margin-top: 15px; text-align: right; padding-right: 15px;">
              Source: <a href="${inflationData.expectations.source.url || 'N/A'}" style="color: #2196F3; text-decoration: none;">${inflationData.expectations.source.name || 'N/A'}</a>. Last Updated: ${formatDate(new Date(inflationData.expectations.lastUpdated))}
            </div>
          </div>
        </div>
          ` : ''}
      </div>
      `;
    }
    
    // Inflation Trend Analysis Section
    let inflationTrendHtml = '';
    if (inflationData.trend && inflationData.outlook && inflationData.marketImpact) {
      inflationTrendHtml = `
      <div style="margin-top: 20px; padding: 20px; background-color: #f8f9fa; border-radius: 12px; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
        <div style="background-color: #4CAF50; color: white; padding: 12px; border-radius: 8px 8px 0 0; text-align: center;">
          <div style="font-size: 1.2em; font-weight: bold; margin-bottom: 4px;">Inflation Trend Analysis</div>
          <div style="font-size: 0.9em; color: rgba(255,255,255,0.8);">Current Market Insights</div>
        </div>
        <div style="padding: 20px; background-color: white; border-radius: 0 0 8px 8px;">
          <div style="display: flex; justify-content: space-between; align-items: top;">
            <div style="flex: 1; text-align: center; padding: 0 15px;">
              <div style="color: #4CAF50; font-size: 1.2em; margin-bottom: 15px; font-weight: bold;">Trend</div>
              <div style="color: #2c3e50; font-size: 0.8em; line-height: 1.2;">${inflationData.trend}</div>
            </div>
            <div style="flex: 1; text-align: center; padding: 0 15px; border-left: 1px solid #eee;">
              <div style="color: #2196F3; font-size: 1.2em; margin-bottom: 15px; font-weight: bold;">Outlook</div>
              <div style="color: #2c3e50; font-size: 0.8em; line-height: 1.2;">${inflationData.outlook}</div>
            </div>
            <div style="flex: 1; text-align: center; padding: 0 15px; border-left: 1px solid #eee;">
              <div style="color: #9C27B0; font-size: 1.2em; margin-bottom: 15px; font-weight: bold;">Market Impact</div>
              <div style="color: #2c3e50; font-size: 0.8em; line-height: 1.2;">${inflationData.marketImpact}</div>
            </div>
          </div>
          <div style="font-size: 0.8em; color: #888; margin-top: 15px; text-align: right; padding-right: 15px;">
            Source: <a href="${inflationData.sourceUrl}" style="color: #2196F3; text-decoration: none;">${inflationData.source}</a>. Last Updated: ${formatDate(inflationData.lastUpdated)}
          </div>
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
      ${inflationTrendHtml}
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
      if (debugMode) {
        Logger.log("Risk:\n"+ JSON.stringify(risk, null, 2));
      }
      riskCardsHtml += `
      <div style="display: flex; margin-bottom: 15px;">
        <div style="flex: 1; background-color: #f8f9fa; padding: 15px; border-radius: 6px; margin-right: 10px;">
          <div style="font-weight: bold; margin-bottom: 5px;">${risk.name || 'Unknown Risk'}</div>
          <div style="color: #555; margin-bottom: 5px;">${risk.description || 'No description available'}</div>
          <div style="font-size: 12px; color: #757575;">
            Region: ${risk.region || ''} • Source: ${risk.source || 'N/A'}
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
  // Handle undefined, null, or NaN values
  if (value === undefined || value === null || isNaN(value)) {
    return "N/A";
  }
  
  // Convert to number if it's not already
  if (typeof value !== 'number') {
    // Try to parse as number if it's a string
    if (typeof value === 'string') {
      const parsed = parseFloat(value);
      if (!isNaN(parsed)) {
        return parsed.toFixed(decimals);
      }
    }
    // For other non-number types, return N/A
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
  // Handle obvious missing or error values
  if (
    value === null ||
    value === undefined ||
    value === '' ||
    value === 'N/A' ||
    value === '#ERROR!' ||
    (typeof value === 'string' && value.trim() === '')
  ) {
    return 'N/A';
  }

  var num = Number(value);
  if (!isFinite(num)) return 'N/A';

  if (suffix === 'B') return (num / 1e9).toFixed(1) + 'B';
  if (suffix === 'M') return (num / 1e6).toFixed(1) + 'M';
  if (suffix === 'K') return (num / 1e3).toFixed(1) + 'K';

  return num.toFixed(2);
}

/**
 * Mapping of metrics keys to human-readable labels for stock cards
 */
const METRIC_LABELS = {
  marketCap: 'Market Cap',
  volume: 'Volume',
  open: 'Open',
  close: 'Close',
  peRatio: 'P/E Ratio',
  beta: 'Beta',
  dayHigh: 'Day High',
  dayLow: 'Day Low',
  fiftyTwoWeekHigh: '52W High',
  fiftyTwoWeekLow: '52W Low',
  priceToBook: 'P/B Ratio',
  priceToSales: 'P/S Ratio',
  forwardPE: 'Forward P/E',
  debtToEquity: 'Debt/Equity',
  returnOnEquity: 'ROE',
  returnOnAssets: 'ROA',
  profitMargin: 'Profit Margin',
  dividendYield: 'Dividend Yield',
  sector: 'Sector',
  industry: 'Industry',
};

/**
 * Format a market cap or large number as $X.XXB, $X.XXM, etc.
 * @param {Number} value
 * @return {String}
 */
function formatMarketCap(value) {
  if (value == null || isNaN(value)) return 'N/A';
  if (value >= 1e12) return `$${(value / 1e12).toFixed(2)}T`;
  if (value >= 1e9)  return `$${(value / 1e9).toFixed(2)}B`;
  if (value >= 1e6)  return `$${(value / 1e6).toFixed(2)}M`;
  if (value >= 1e3)  return `$${(value / 1e3).toFixed(2)}K`;
  return `$${value}`;
}

/**
 * Format price, change, and percent change for stock card top-right display
 * @param {Number} price
 * @param {Number} priceChange
 * @param {Number} changePercent
 * @return {String} e.g. "$539.12 ↑5.18 (0.97%)"
 */
function formatPriceLine(price, priceChange, changePercent) {
  if (price == null) return '';
  
  const arrow = priceChange > 0 ? '↑' : priceChange < 0 ? '↓' : '';
  const absChange = priceChange != null ? Math.abs(priceChange).toFixed(2) : '';
  const pct = changePercent != null ? `(${changePercent.toFixed(2)}%)` : '';
  return `$${Number(price).toFixed(2)} ${arrow}${absChange} ${pct}`.trim();
}

/**
 * Parse a date string in the format "Apr 10, 2025, 8:30 AM EDT" into a Date object
 * @param {string} dateString - The date string to parse
 * @return {Date} The parsed date
 */
function parseEconomicEventDate(dateString) {
  try {
    // Extract components using regex
    const match = dateString.match(/^(\w{3})\s+(\d{1,2}),\s+(\d{4}),\s+(\d{1,2}):(\d{2})\s+(\w{2})\s+(\w{3})$/);
    if (!match) {
      Logger.log(`Invalid date format: ${dateString}`);
      return null;
    }

    const [, month, day, year, hour, minute, ampm, tz] = match;
    const monthNum = monthToNum[month];
    
    // Convert 12-hour time to 24-hour time
    let hour24 = parseInt(hour);
    if (ampm === 'PM' && hour24 < 12) hour24 += 12;
    if (ampm === 'AM' && hour24 === 12) hour24 = 0;

    // Create ISO string
    const dateStrIso = `${year}-${monthNum.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}T${hour24.toString().padStart(2, '0')}:${minute}:00-04:00`;
    
    // Parse the date
    const date = new Date(dateStrIso);
    
    // Log for debugging
    Logger.log(`Parsed date: ${dateString} -> ${date.toISOString()}`);
    
    return date;
  } catch (e) {
    Logger.log(`Error parsing date: ${dateString}, error: ${e}`);
    return null;
  }
}

const monthToNum = {
  'Jan': 1,
  'Feb': 2,
  'Mar': 3,
  'Apr': 4,
  'May': 5,
  'Jun': 6,
  'Jul': 7,
  'Aug': 8,
  'Sep': 9,
  'Oct': 10,
  'Nov': 11,
  'Dec': 12
};

/**
 * Helper function to format large numbers with suffixes (T, B, M)
 * @param {Number} value - The number to format
 * @return {String} Formatted number with suffix
 */
function formatLargeNumber(value) {
  if (!value || value === 'N/A') return 'N/A';
  
  if (typeof value === 'string') {
    value = parseFloat(value.replace(/[^\d.-]+/g, ''));
  }
  
  if (isNaN(value)) return 'N/A';
  
  if (value >= 1e12) return (value / 1e12).toFixed(2) + 'T';
  if (value >= 1e9) return (value / 1e9).toFixed(2) + 'B';
  if (value >= 1e6) return (value / 1e6).toFixed(2) + 'M';
  return value.toFixed(2);
}
