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
 * Formats the trading decision and full analysis as an HTML email
 * 
 * @param {String} decision - The trading decision (Buy, Sell, Hold, etc.)
 * @param {Object} analysis - The full analysis object
 * @param {Date} analysisTime - When the analysis was performed
 * @param {Date} nextAnalysisTime - When the next analysis is scheduled
 * @return {String} Formatted HTML email body
 */
function formatHtmlEmailBodyWithAnalysis(decision, analysis, analysisTime, nextAnalysisTime) {
  // Define colors based on decision
  let decisionColor = '#757575'; // Default gray
  let decisionBgColor = '#f5f5f5';
  let decisionIcon = '⚖️'; // Default neutral icon
  
  // Set colors and icon based on decision
  if (decision.toLowerCase().includes('buy')) {
    decisionColor = '#4caf50'; // Green
    decisionBgColor = '#e8f5e9';
    decisionIcon = '🔼';
  } else if (decision.toLowerCase().includes('sell')) {
    decisionColor = '#f44336'; // Red
    decisionBgColor = '#ffebee';
    decisionIcon = '🔽';
  } else if (decision.toLowerCase().includes('hold')) {
    decisionColor = '#ff9800'; // Orange
    decisionBgColor = '#fff3e0';
    decisionIcon = '⏸️';
  } else if (decision.toLowerCase().includes('watch')) {
    decisionColor = '#2196f3'; // Blue
    decisionBgColor = '#e3f2fd';
    decisionIcon = '👀';
  }
  
  // Format the analysis time
  const formattedAnalysisTime = analysisTime ? 
    Utilities.formatDate(analysisTime, TIME_ZONE, 'MMMM dd, yyyy hh:mm a z') : 
    'N/A';
  
  // Format the next analysis time
  const formattedNextAnalysisTime = nextAnalysisTime ? 
    Utilities.formatDate(nextAnalysisTime, TIME_ZONE, 'MMMM dd, yyyy hh:mm a z') : 
    'N/A';
  
  // Start building the HTML email
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
      <div class="header">
        <h1 class="title">${NEWSLETTER_NAME}</h1>
        <p class="subtitle">Professional Trading Insights</p>
        <p class="subtitle">Analysis Time: ${formattedAnalysisTime}</p>
      </div>
      
      <div class="decision-banner">
        <div class="decision-text">
          <div style="font-size: 36px; margin-bottom: 10px;">${decisionIcon}</div>
          <div style="font-size: 24px; font-weight: bold; color: ${decisionColor}; margin-bottom: 15px;">${decision}</div>
          <div style="font-style: italic; color: #555; white-space: pre-line; text-align: left; padding: 10px; background-color: rgba(255,255,255,0.5); border-radius: 4px;">
            ${analysis.justification || 'No justification provided.'}
          </div>
        </div>
      </div>
      
      <div class="section">
        <h2>Market Summary</h2>
        <div class="summary-box">
          <h3 class="summary-title">Executive Summary</h3>
          <p class="summary-content">${analysis.summary || 'No summary available.'}</p>
        </div>
        
        <!-- Market Sentiment Section -->
        <div style="margin-top: 20px;">
          <h3 style="font-size: 18px; color: #333; margin-bottom: 15px;">Market Sentiment</h3>
          
          <!-- Overall Sentiment -->
          <div style="margin-bottom: 20px; padding: 15px; background-color: #f5f5f5; border-radius: 8px;">
            <div style="font-weight: 500; margin-bottom: 10px; color: #333;">Overall Market Sentiment</div>
            <div style="font-size: 16px; color: #555; line-height: 1.5;">
              ${analysis.marketSentiment && analysis.marketSentiment.overall ? 
                analysis.marketSentiment.overall : 'No overall market sentiment data available.'}
            </div>
          </div>
          
          <!-- Sentiment Indicators -->
          <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 15px;">
            <!-- Fear & Greed Index -->
            ${analysis.marketIndicators && analysis.marketIndicators.fearGreedIndex ? `
            <div style="padding: 15px; background-color: #f9f9f9; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
              <div style="font-weight: 500; margin-bottom: 10px; color: #333;">Fear & Greed Index</div>
              
              <div style="display: flex; align-items: center; margin-bottom: 10px;">
                <div style="flex-grow: 1; height: 10px; background-color: #f5f5f5; border-radius: 5px; overflow: hidden; position: relative;">
                  <div style="position: absolute; top: 0; left: ${analysis.marketIndicators.fearGreedIndex.value}%; transform: translateX(-50%); width: 15px; height: 15px; background-color: #333; border-radius: 50%;"></div>
                  <div style="position: absolute; top: -6px; left: calc(${analysis.marketIndicators.fearGreedIndex.value}% - 6px); width: 12px; height: 12px; background-color: #fff; border: 2px solid #333; border-radius: 50%;"></div>
                </div>
                <div style="min-width: 40px; text-align: right; font-weight: bold; margin-left: 10px;">
                  ${analysis.marketIndicators.fearGreedIndex.value}/100
                </div>
              </div>
              
              <div style="font-size: 14px; color: ${
                analysis.marketIndicators.fearGreedIndex.value <= 25 ? '#f44336' : 
                analysis.marketIndicators.fearGreedIndex.value >= 75 ? '#4caf50' : 
                analysis.marketIndicators.fearGreedIndex.value >= 50 ? '#8bc34a' : 
                '#ff9800'
              }; font-weight: 500; text-align: center; margin-bottom: 5px;">
                ${analysis.marketIndicators.fearGreedIndex.interpretation || 
                  (analysis.marketIndicators.fearGreedIndex.value <= 25 ? 'Extreme Fear' : 
                   analysis.marketIndicators.fearGreedIndex.value <= 40 ? 'Fear' : 
                   analysis.marketIndicators.fearGreedIndex.value <= 60 ? 'Neutral' : 
                   analysis.marketIndicators.fearGreedIndex.value <= 75 ? 'Greed' : 
                   'Extreme Greed')}
              </div>
              
              <div style="font-size: 12px; color: #777; margin-top: 10px;">
                ${analysis.marketIndicators.fearGreedIndex.description || 
                  'The Fear & Greed Index measures market sentiment. Extreme fear can be a buying opportunity, while extreme greed can indicate a market correction is coming.'}
              </div>
            </div>
            ` : ''}
            
            <!-- VIX Volatility Index -->
            ${analysis.marketIndicators && analysis.marketIndicators.vix ? `
            <div style="padding: 15px; background-color: #f9f9f9; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
              <div style="font-weight: 500; margin-bottom: 10px; color: #333;">VIX Volatility Index</div>
              
              <div style="display: flex; align-items: center; margin-bottom: 10px;">
                <div style="font-size: 24px; font-weight: bold; color: ${
                  analysis.marketIndicators.vix.value >= 30 ? '#f44336' : 
                  analysis.marketIndicators.vix.value >= 20 ? '#ff9800' : 
                  '#4caf50'
                }; margin-right: 10px;">${analysis.marketIndicators.vix.value}</div>
                <div style="font-size: 14px; color: #555; text-align: right;">
                  ${analysis.marketIndicators.vix.trend || 'No trend data'}
                </div>
              </div>
              
              <div style="font-size: 14px; color: #555; margin-top: 10px;">
                ${analysis.marketIndicators.vix.interpretation || 
                  (analysis.marketIndicators.vix.value >= 30 ? 'High volatility indicates market fear' : 
                   analysis.marketIndicators.vix.value >= 20 ? 'Elevated volatility suggests caution' : 
                   'Low volatility indicates market complacency')}
              </div>
            </div>
            ` : ''}
            
            <!-- Put/Call Ratio -->
            ${analysis.marketIndicators && analysis.marketIndicators.putCallRatio ? `
            <div style="padding: 15px; background-color: #f9f9f9; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
              <div style="font-weight: 500; margin-bottom: 10px; color: #333;">Put/Call Ratio</div>
              
              <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                <div style="font-size: 24px; font-weight: bold; color: ${
                  analysis.marketIndicators.putCallRatio.value >= 1.2 ? '#f44336' : 
                  analysis.marketIndicators.putCallRatio.value <= 0.7 ? '#4caf50' : 
                  '#ff9800'
                }; margin-right: 10px;">${analysis.marketIndicators.putCallRatio.value}</div>
                <div style="font-size: 14px; color: #555; text-align: right;">
                  ${analysis.marketIndicators.putCallRatio.trend || 'No trend data'}
                </div>
              </div>
              
              <div style="font-size: 14px; color: #555; margin-top: 10px;">
                ${analysis.marketIndicators.putCallRatio.interpretation || 
                  (analysis.marketIndicators.putCallRatio.value >= 1.2 ? 'High put volume indicates bearish sentiment' : 
                   analysis.marketIndicators.putCallRatio.value <= 0.7 ? 'Low put volume indicates bullish sentiment' : 
                   'Balanced put/call ratio suggests neutral market sentiment')}
              </div>
            </div>
            ` : ''}
            
            <!-- Market Breadth -->
            ${analysis.marketIndicators && analysis.marketIndicators.marketBreadth ? `
            <div style="padding: 15px; background-color: #f9f9f9; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
              <div style="font-weight: 500; margin-bottom: 10px; color: #333;">Market Breadth</div>
              
              <div style="font-size: 16px; font-weight: 500; color: ${
                analysis.marketIndicators.marketBreadth.advanceDeclineRatio > 1.5 ? '#4caf50' : 
                analysis.marketIndicators.marketBreadth.advanceDeclineRatio < 0.67 ? '#f44336' : 
                '#ff9800'
              }; margin-bottom: 5px;">
                ${analysis.marketIndicators.marketBreadth.status || 'No status data'}
              </div>
              
              <div style="margin-top: 10px;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                  <span style="font-size: 13px; color: #777;">Advancing Issues</span>
                  <span style="font-weight: 500;">${analysis.marketIndicators.marketBreadth.advancingIssues || 'N/A'}</span>
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                  <span style="font-size: 13px; color: #777;">Declining Issues</span>
                  <span style="font-weight: 500;">${analysis.marketIndicators.marketBreadth.decliningIssues || 'N/A'}</span>
                </div>
                <div style="display: flex; justify-content: space-between;">
                  <span style="font-size: 13px; color: #777;">A/D Ratio</span>
                  <span style="font-weight: 500;">${analysis.marketIndicators.marketBreadth.advanceDeclineRatio || 'N/A'}</span>
                </div>
              </div>
            </div>
            ` : ''}
          </div>
        </div>
      </div>
      
      <div class="next-analysis">
        Next analysis scheduled for ${formattedNextAnalysisTime}
      </div>
    </div>
  </body>
  </html>`;
  
  return html;
}

/**
 * Generates the complete HTML email template for trading analysis
 * 
 * @param {Object} analysisResult - The complete analysis result object
 * @param {Date} nextScheduledTime - When the next analysis is scheduled
 * @param {Boolean} isTest - Whether this is a test email
 * @return {String} Complete HTML email template
 */
function generateEmailTemplate(analysisResult, nextScheduledTime, isTest = false) {
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
    const formattedAnalysisTime = Utilities.formatDate(analysisTime, TIME_ZONE, 'MMMM dd, yyyy \'at\' hh:mm a z');
    
    // Format the next analysis time
    const formattedNextAnalysisTime = nextScheduledTime ? 
      Utilities.formatDate(nextScheduledTime, TIME_ZONE, 'MMMM dd, yyyy \'at\' hh:mm a z') : 
      'Not scheduled';
    
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
    
    // Start building the HTML email
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
        
        <!-- Next Analysis Section -->
        <div style="background-color: #e8f5e9; padding: 15px; border-radius: 6px; margin: 20px 0; text-align: center; color: #2e7d32;">
          <p>Next analysis scheduled for: ${formattedNextAnalysisTime}</p>
        </div>
        
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
        <div style="font-weight: bold; display: inline;">Overall Market Sentiment:</div>
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
          <div style="font-weight: bold;">Fear & Greed Index:</div>
          <div style="font-weight: bold; color: ${fgColor}">${fgValue}</div>
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
          Source: ${indicators.fearGreedIndex.source || 'CNN'} | Last updated: ${indicators.fearGreedIndex.lastUpdated || 'N/A'}
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
          <div style="font-weight: bold; margin-right: 10px;">VIX: ${vixValue}</div>
          <div style="color: ${trendColor}; font-weight: bold; font-size: 13px;">
            <span style="background-color: ${trendColor}; color: white; padding: 2px 6px; border-radius: 3px;">${trendIcon} ${vixTrend}</span>
            </div>
          </div>
        
        <div style="font-size: 14px; color: #555; margin-top: 10px;">
          ${indicators.vix.interpretation || 'Volatility indicator showing market fear and uncertainty.'}
        </div>
        
        <div style="font-size: 12px; color: #888; margin-top: 10px; text-align: right;">
          Source: ${indicators.vix.source || 'CBOE'} | Last updated: ${indicators.vix.lastUpdated || 'N/A'}
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
              // Format metrics with proper suffixes
              const formatMetric = (value, suffix = '') => {
                if (value === 'N/A' || value === null || value === undefined) return 'N/A';
                if (typeof value === 'number') {
                  if (suffix === 'B') return (value / 1e9).toFixed(1) + 'B';
                  if (suffix === 'M') return (value / 1e6).toFixed(1) + 'M';
                  if (suffix === 'K') return (value / 1e3).toFixed(1) + 'K';
                }
                return value;
              };

              return `
                <div class="stock-card">
                  <div class="stock-header">
                    <span class="stock-symbol">${stock.symbol}</span>
                    <span class="stock-name">${stock.company || 'N/A'}</span>
                    <span class="stock-price">$${formatMetric(stock.price, '')}</span>
                  </div>
                  <div class="stock-metrics">
                    <div class="metric-group">
                      <div class="metric">
                        <span class="metric-label">Change</span>
                        <span class="metric-value ${typeof stock.priceChange === 'number' && stock.priceChange >= 0 ? 'positive' : 'negative'}">
                          ${typeof stock.priceChange === 'number' ? (stock.priceChange >= 0 ? '+' : '') + stock.priceChange.toFixed(2) + '%' : stock.priceChange || 'N/A'}
                        </span>
                      </div>
                      <div class="metric">
                        <span class="metric-label">Market Cap</span>
                        <span class="metric-value">${formatMetric(stock.marketCap, 'B')}</span>
                      </div>
                    </div>
                    <div class="metric-group">
                      <div class="metric">
                        <span class="metric-label">PE Ratio</span>
                        <span class="metric-value">${stock.peRatio || 'N/A'}</span>
                      </div>
                      <div class="metric">
                        <span class="metric-label">Forward PE</span>
                        <span class="metric-value">${stock.forwardPE || 'N/A'}</span>
                      </div>
                    </div>
                    <div class="metric-group">
                      <div class="metric">
                        <span class="metric-label">PEG Ratio</span>
                        <span class="metric-value">${stock.pegRatio || 'N/A'}</span>
                      </div>
                      <div class="metric">
                        <span class="metric-label">Price/Book</span>
                        <span class="metric-value">${stock.priceToBook || 'N/A'}</span>
                      </div>
                    </div>
                    <div class="metric-group">
                      <div class="metric">
                        <span class="metric-label">Price/Sales</span>
                        <span class="metric-value">${stock.priceToSales || 'N/A'}</span>
                      </div>
                      <div class="metric">
                        <span class="metric-label">Debt/Equity</span>
                        <span class="metric-value">${stock.debtToEquity || 'N/A'}</span>
                      </div>
                    </div>
                    <div class="metric-group">
                      <div class="metric">
                        <span class="metric-label">ROE</span>
                        <span class="metric-value">${stock.returnOnEquity || 'N/A'}</span>
                      </div>
                      <div class="metric">
                        <span class="metric-label">ROA</span>
                        <span class="metric-value">${stock.returnOnAssets || 'N/A'}</span>
                      </div>
                    </div>
                    <div class="metric-group">
                      <div class="metric">
                        <span class="metric-label">Profit Margin</span>
                        <span class="metric-value">${stock.profitMargin || 'N/A'}</span>
                      </div>
                      <div class="metric">
                        <span class="metric-label">Dividend Yield</span>
                        <span class="metric-value">${stock.dividendYield || 'N/A'}</span>
                      </div>
                    </div>
                    ${stock.summary ? `<div class="metric-group">
                      <div class="metric">
                        <span class="metric-label">Summary</span>
                        <span class="metric-value">${stock.summary}</span>
                      </div>
                    </div>` : ''}
                  </div>
                  <div class="stock-footer">
                    <span class="last-updated">Last Updated: ${stock.lastUpdated || 'N/A'}</span>
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
        <h2 style="color: #333; border-bottom: 1px solid #eee; padding-bottom: 10px; text-align: center;">Macroeconomic Factors</h2>
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
    
    // Helper function to get inflation data with priority to macroeconomicAnalysis
    function getInflationData() {
      const analysisInflation = macroeconomicAnalysis?.analysis?.macroeconomicFactors?.inflation;
      const macroInflation = macro?.inflation;
      
      return {
        currentRate: analysisInflation?.currentRate || macroInflation?.currentRate || 'N/A',
        cpi: {
          headline: analysisInflation?.cpi?.headline || macroInflation?.cpi?.headline || 'N/A',
          core: analysisInflation?.cpi?.core || macroInflation?.cpi?.core || 'N/A'
        },
        pce: {
          headline: analysisInflation?.pce?.headline || macroInflation?.pce?.headline || 'N/A',
          core: analysisInflation?.pce?.core || macroInflation?.pce?.core || 'N/A'
        },
        trend: analysisInflation?.trend || macroInflation?.trend || 'N/A',
        outlook: analysisInflation?.outlook || macroInflation?.outlook || 'N/A',
        marketImpact: analysisInflation?.marketImpact || macroInflation?.marketImpact || 'N/A',
        source: analysisInflation?.source || macroInflation?.source || 'N/A',
        sourceUrl: analysisInflation?.sourceUrl || macroInflation?.sourceUrl || 'N/A',
        lastUpdated: analysisInflation?.lastUpdated || macroInflation?.lastUpdated || 'N/A'
      };
    }

    // Treasury Yields
    let yieldsHtml = '';
    if (macro.treasuryYields?.yields) {
      yieldsHtml = `
        <div style="margin-bottom: 20px;">
          <div style="font-weight: bold; margin-bottom: 10px;">Treasury Yields</div>
          <div style="display: flex; flex-wrap: wrap; gap: 15px;">
            ${macro.treasuryYields.yields.map(yield => `
              <div style="flex: 1 1 calc(33% - 15px); min-width: 150px; padding: 15px; background-color: white; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                <div style="font-weight: 500; margin-bottom: 5px;">${yield.term}</div>
                <div style="font-size: 18px; font-weight: bold;">${formatValue(yield.yield)}% (${formatValue(yield.change)})</div>
              </div>
            `).join('')}
          </div>
          <div style="font-size: 14px; color: #6c757d; margin-top: 10px;">
            <div>Yield Curve: ${macro.treasuryYields.yieldCurve?.status || 'N/A'}</div>
            <div>Analysis: ${macro.treasuryYields.yieldCurve?.analysis || 'N/A'}</div>
            <div>Source: ${macro.treasuryYields.source || 'N/A'} (${macro.treasuryYields.sourceUrl || 'N/A'}), as of ${new Date(macro.treasuryYields.lastUpdated).toLocaleString()}</div>
          </div>
        </div>
      `;
    }

    // Fed Policy
    let fedHtml = '';
    if (macro.fedPolicy) {
      fedHtml = `
        <div style="margin-bottom: 20px;">
          <div style="font-weight: bold; margin-bottom: 10px;">Federal Reserve Policy</div>
          <div style="background-color: white; padding: 15px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
            <div style="font-size: 16px; margin-bottom: 10px;">${macro.fedPolicy.commentary || 'N/A'}</div>
            <div style="font-size: 14px; color: #6c757d; margin-bottom: 5px;">Current Rate: ${formatValue(macro.fedPolicy.currentRate.rate)}% (${formatValue(macro.fedPolicy.currentRate.lowerBound)}% - ${formatValue(macro.fedPolicy.currentRate.upperBound)}%)</div>
            <div style="font-size: 14px; color: #6c757d; margin-bottom: 5px;">Last Meeting: ${new Date(macro.fedPolicy.lastMeeting.date).toLocaleDateString()}</div>
            <div style="font-size: 14px; color: #6c757d; margin-bottom: 5px;">Next Meeting: ${new Date(macro.fedPolicy.nextMeeting.date).toLocaleDateString()}</div>
            <div style="font-size: 14px; color: #6c757d; margin-bottom: 5px;">Probability of Hike: ${macro.fedPolicy.nextMeeting.probabilityOfHike}%</div>
            <div style="font-size: 14px; color: #6c757d; margin-bottom: 5px;">Probability of Cut: ${macro.fedPolicy.nextMeeting.probabilityOfCut}%</div>
            <div style="font-size: 14px; color: #6c757d; margin-bottom: 5px;">Probability of No Change: ${macro.fedPolicy.nextMeeting.probabilityOfNoChange}%</div>
            <div style="font-size: 12px; color: #888;">${macro.fedPolicy.source || 'N/A'} (${macro.fedPolicy.sourceUrl || 'N/A'}), as of ${new Date(macro.fedPolicy.lastUpdated).toLocaleString()}</div>
          </div>
        </div>
      `;
    }

    // Inflation
    let inflationHtml = '';
    const inflationData = getInflationData();
    if (inflationData) {
      inflationHtml = `
        <div style="margin-bottom: 20px;">
          <div style="font-weight: bold; margin-bottom: 10px;">Inflation</div>
          <div style="display: flex; flex-wrap: wrap; gap: 15px;">
            <div style="flex: 1 1 calc(50% - 15px); min-width: 200px; padding: 15px; background-color: white; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
              <div style="font-weight: 500; margin-bottom: 5px;">CPI</div>
              <div style="font-size: 18px; font-weight: bold;">${formatValue(inflationData.cpi.headline)}%</div>
              <div style="font-size: 14px; color: #6c757d; margin-top: 5px;">Core CPI: ${formatValue(inflationData.cpi.core)}%</div>
            </div>
            <div style="flex: 1 1 calc(50% - 15px); min-width: 200px; padding: 15px; background-color: white; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
              <div style="font-weight: 500; margin-bottom: 5px;">PCE</div>
              <div style="font-size: 18px; font-weight: bold;">${formatValue(inflationData.pce.headline)}%</div>
              <div style="font-size: 14px; color: #6c757d; margin-top: 5px;">Core PCE: ${formatValue(inflationData.pce.core)}%</div>
            </div>
          </div>
          <div style="font-size: 14px; color: #6c757d; margin-top: 10px;">
            <div>Trend: ${inflationData.trend}</div>
            <div>Outlook: ${inflationData.outlook}</div>
            <div>Market Impact: ${inflationData.marketImpact}</div>
            <div>Source: ${inflationData.source} (${inflationData.sourceUrl}), as of ${new Date(inflationData.lastUpdated).toLocaleString()}</div>
          </div>
        </div>
      `;
    }

    // Return the complete HTML for the macroeconomic factors section
    return `
    <div class="section" style="background-color: white; border-radius: 8px; padding: 15px; margin-bottom: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
      <h2 style="color: #333; border-bottom: 1px solid #eee; padding-bottom: 10px; text-align: center;">Macroeconomic Factors</h2>
      ${yieldsHtml}
      ${fedHtml}
      ${inflationHtml}
    </div>
    `;
  } catch (error) {
    Logger.log("Error generating macroeconomic factors section: " + error);
    return `
    <div class="section" style="background-color: white; border-radius: 8px; padding: 15px; margin-bottom: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
      <h2 style="color: #333; border-bottom: 1px solid #eee; padding-bottom: 10px; text-align: center;">Macroeconomic Factors</h2>
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
        <h2 style="color: #333; border-bottom: 1px solid #eee; padding-bottom: 10px; text-align: center;">Geopolitical Risks</h2>
        <p style="text-align: center; color: #757575;">No geopolitical risk data available</p>
      </div>
      `;
    }
    
    // Generate global overview HTML if available
    let globalOverviewHtml = '';
    if (analysis && analysis.geopoliticalRisks && analysis.geopoliticalRisks.global) {
      globalOverviewHtml = `
      <div style="margin-top: 15px;">
        <div style="font-weight: bold; margin-bottom: 10px; color: #333;">Global Overview</div>
        <div style="color: #555;">${analysis.geopoliticalRisks.global}</div>
      </div>
      `;
    }
    
    // Generate risks HTML
    let risksHtml = '';
    
    // Sort risks by impact level (descending)
    const sortedRisks = [...geoRisks.risks].sort((a, b) => {
      if (a.impactLevel === undefined || a.impactLevel === null) return 1;
      if (b.impactLevel === undefined || b.impactLevel === null) return -1;
      return b.impactLevel - a.impactLevel;
    });
    
    sortedRisks.forEach(risk => {
      // Determine risk color based on impact level
      let riskColor = '#ff9800'; // default moderate
      if (risk.impactLevel && risk.impactLevel >= 7) {
        riskColor = '#f44336'; // high
      } else if (risk.impactLevel && risk.impactLevel >= 4) {
        riskColor = '#ff9800'; // moderate
      } else if (risk.impactLevel && risk.impactLevel < 4) {
        riskColor = '#4caf50'; // low
      }
      
      risksHtml += `
      <div style="margin-bottom: 15px;">
        <div style="font-weight: bold; color: #333;">${risk.name || 'Unknown Risk'}</div>
        <div style="color: ${riskColor}; font-weight: bold; margin-bottom: 5px;">Impact Level: ${risk.impactLevel || 0}/10</div>
        <div style="color: #555; margin-bottom: 5px;">${risk.description || 'No description available'}</div>
        <div style="font-size: 12px; color: #888;">
          Region: ${risk.region || 'Unknown Region'}<br>
          ${risk.source ? `Source: ${risk.source}${risk.sourceUrl ? ` | <a href="${risk.sourceUrl}" style="color: #2196f3; text-decoration: none;">Link</a>` : ''}` : ''}
          ${risk.lastUpdated ? ` | Last Updated: ${new Date(risk.lastUpdated).toLocaleString()}` : ''}
        </div>
      </div>
      `;
    });
    
    // Return the complete HTML for the geopolitical risks section
    return `
    <div class="section" style="background-color: white; border-radius: 8px; padding: 15px; margin-bottom: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
      <h2 style="color: #333; border-bottom: 1px solid #eee; padding-bottom: 10px; text-align: center;">Geopolitical Risks</h2>
      ${globalOverviewHtml}
      <div style="margin-top: 15px;">
        <div style="font-weight: bold; margin-bottom: 10px; color: #333;">Current Risks</div>
        ${risksHtml}
      </div>
    </div>
    `;
  } catch (error) {
    Logger.log("Error generating geopolitical risks section: " + error);
    return `
    <div class="section" style="background-color: white; border-radius: 8px; padding: 15px; margin-bottom: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
      <h2 style="color: #333; border-bottom: 1px solid #eee; padding-bottom: 10px; text-align: center;">Geopolitical Risks</h2>
      <p style="text-align: center; color: #757575;">Error generating geopolitical risks data</p>
    </div>
    `;
  }
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
