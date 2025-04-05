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
              
              <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px;">
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
                ${analysis.marketIndicators.marketBreadth.status || 
                  (analysis.marketIndicators.marketBreadth.advanceDeclineRatio > 1.5 ? 'Strong' : 
                   analysis.marketIndicators.marketBreadth.advanceDeclineRatio < 0.67 ? 'Weak' : 
                   'Neutral')}
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
 * Formats the trading decision and full analysis as a plain text email
 * 
 * @param {String} decision - The trading decision (Buy, Sell, Hold, etc.)
 * @param {Object} analysis - The full analysis object
 * @param {Date} analysisTime - When the analysis was performed
 * @param {Date} nextAnalysisTime - When the next analysis is scheduled
 * @return {String} Formatted plain text email body
 */
function formatPlainTextEmailBodyWithAnalysis(decision, analysis, analysisTime, nextAnalysisTime) {
  // Format the analysis time
  const formattedAnalysisTime = analysisTime ? 
    Utilities.formatDate(analysisTime, TIME_ZONE, 'MMMM dd, yyyy hh:mm a z') : 
    'N/A';
  
  // Format the next analysis time
  const formattedNextAnalysisTime = nextAnalysisTime ? 
    Utilities.formatDate(nextAnalysisTime, TIME_ZONE, 'MMMM dd, yyyy hh:mm a z') : 
    'N/A';
  
  // Extract data from analysis
  const summary = analysis.summary || 'No summary available.';
  const justification = analysis.justification || 'No justification provided.';
  const marketSentiment = analysis.marketSentiment && analysis.marketSentiment.overall ? 
    analysis.marketSentiment.overall : 'No market sentiment data available.';
  
  // Format fear and greed index if available
  let fearGreedText = 'Fear & Greed Index: Not available';
  if (analysis.marketIndicators && analysis.marketIndicators.fearGreedIndex) {
    const fgi = analysis.marketIndicators.fearGreedIndex;
    fearGreedText = `Fear & Greed Index: ${fgi.value}/100 (${fgi.interpretation || 'N/A'})`;
  }
  
  // Format VIX if available
  let vixText = 'VIX: Not available';
  if (analysis.marketIndicators && analysis.marketIndicators.vix) {
    const vix = analysis.marketIndicators.vix;
    vixText = `VIX: ${vix.value} (${vix.trend || 'N/A'})`;
  }
  
  // Format put/call ratio if available
  let putCallText = 'Put/Call Ratio: Not available';
  if (analysis.marketIndicators && analysis.marketIndicators.putCallRatio) {
    const pcr = analysis.marketIndicators.putCallRatio;
    putCallText = `Put/Call Ratio: ${pcr.value} (${pcr.interpretation || 'N/A'})`;
  }
  
  // Format market breadth if available
  let breadthText = 'Market Breadth: Not available';
  if (analysis.marketIndicators && analysis.marketIndicators.marketBreadth) {
    const mb = analysis.marketIndicators.marketBreadth;
    breadthText = `Market Breadth: ${mb.status || 'N/A'} (A/D Ratio: ${mb.advanceDeclineRatio || 'N/A'})`;
  }
  
  // Build the plain text email
  let text = `
${NEWSLETTER_NAME}
Professional Trading Insights
Analysis Time: ${formattedAnalysisTime}

=== TRADING DECISION ===
${decision.toUpperCase()}

${justification}

=== MARKET SUMMARY ===
${summary}

=== MARKET SENTIMENT ===
${marketSentiment}

=== MARKET INDICATORS ===
${fearGreedText}
${vixText}
${putCallText}
${breadthText}
`;

  // Add fundamental metrics if available
  if (analysis.fundamentalMetrics && analysis.fundamentalMetrics.metrics && analysis.fundamentalMetrics.metrics.length > 0) {
    text += `
=== FUNDAMENTAL METRICS ===`;
    
    analysis.fundamentalMetrics.metrics.forEach(metric => {
      text += `
${metric.symbol} (${metric.name || 'N/A'}): $${metric.price || '---'} ${metric.priceChange || '+/-0.00 (0.00%)'}
P/E Ratio: ${metric.peRatio || 'N/A'}
Market Cap: ${metric.marketCap || 'N/A'}
${metric.analysis || metric.comment || ''}
`;
    });
  }
  
  // Add macroeconomic factors if available
  if (analysis.macroeconomicFactors) {
    const macro = analysis.macroeconomicFactors;
    
    // Treasury yields
    if (macro.treasuryYields) {
      text += `
=== TREASURY YIELDS ===
3-Month: ${macro.treasuryYields.threeMonth || 'N/A'}
2-Year: ${macro.treasuryYields.twoYear || 'N/A'}
5-Year: ${macro.treasuryYields.fiveYear || 'N/A'}
10-Year: ${macro.treasuryYields.tenYear || 'N/A'}
30-Year: ${macro.treasuryYields.thirtyYear || 'N/A'}

Yield Curve: ${macro.treasuryYields.yieldCurveStatus || 'N/A'}
${macro.treasuryYields.yieldCurveAnalysis || 'No yield curve analysis available.'}
`;
    }
    
    // Inflation
    if (macro.inflation) {
      text += `
=== INFLATION METRICS ===
CPI Headline: ${macro.inflation.cpi && macro.inflation.cpi.headline ? macro.inflation.cpi.headline + '%' : 'N/A'}
CPI Core: ${macro.inflation.cpi && macro.inflation.cpi.core ? macro.inflation.cpi.core + '%' : 'N/A'}
PCE Headline: ${macro.inflation.pce && macro.inflation.pce.headline ? macro.inflation.pce.headline + '%' : 'N/A'}
PCE Core: ${macro.inflation.pce && macro.inflation.pce.core ? macro.inflation.pce.core + '%' : 'N/A'}

Trend: ${macro.inflation.trend || 'N/A'}
Outlook: ${macro.inflation.outlook || 'No outlook available.'}
Market Impact: ${macro.inflation.marketImpact || 'No market impact analysis available.'}
`;
    }
    
    // Geopolitical risks
    if (macro.geopoliticalRisks) {
      text += `
=== GEOPOLITICAL RISKS ===
Global Overview: ${macro.geopoliticalRisks.globalOverview || 'No global overview available.'}

Regional Risks:`;
      
      if (macro.geopoliticalRisks.regionalRisks && macro.geopoliticalRisks.regionalRisks.length > 0) {
        macro.geopoliticalRisks.regionalRisks.forEach(region => {
          text += `
- ${region.region}:`;
          
          if (region.risks && region.risks.length > 0) {
            region.risks.forEach(risk => {
              text += `
  * ${risk.impactLevel || 'Impact'}: ${risk.description}`;
            });
          } else {
            text += ` No specific risks identified`;
          }
        });
      } else {
        text += ` No regional risk data available.`;
      }
    }
  }
  
  // Add next analysis time
  text += `

Next analysis scheduled for: ${formattedNextAnalysisTime}

${NEWSLETTER_NAME} - Professional Trading Insights
${new Date().getFullYear()} ${NEWSLETTER_NAME}. All rights reserved.
Delivering data-driven market analysis to help you make informed trading decisions.
`;
  
  return text;
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
          <div style="color: ${trendColor}; font-weight: bold;">
            <span style="background-color: ${trendColor}; color: white; padding: 2px 6px; border-radius: 3px; font-size: 12px;">${trendIcon} ${vixTrend}</span>
          </div>
        </div>
        
        <div style="font-size: 14px; color: #555; padding: 8px; background-color: rgba(0,0,0,0.03); border-radius: 4px; border-left: 3px solid ${vixColor};">${indicators.vix.interpretation || 'Volatility indicator showing market fear and uncertainty.'}</div>
        
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
    // Get fundamental metrics data from the analysis
    //let fundamentalMetrics = analysis.fundamentalMetrics || [];
    let fundamentalMetrics = [];
    
    // If no fundamental metrics in the OpenAI response, try to get them from the cached data
    if (!fundamentalMetrics || fundamentalMetrics.length === 0) {
      Logger.log("No fundamental metrics found in OpenAI response, using data from cached allData");
      try {
        // Get the cached data from the script cache
        const cache = CacheService.getScriptCache();
        const cachedDataJson = cache.get('allData');
        
        if (cachedDataJson) {
          const cachedData = JSON.parse(cachedDataJson);
          
          // Debug logging
          Logger.log("DEBUG - Found cached allData");
          
          // Check if the cached data contains fundamental metrics
          if (cachedData && cachedData.fundamentalMetrics && cachedData.fundamentalMetrics.data) {
            fundamentalMetrics = cachedData.fundamentalMetrics.data;
            Logger.log(`Using ${fundamentalMetrics.length} stocks from cached data instead of OpenAI response`);
          }
        } else {
          Logger.log("No cached allData found");
        }
      } catch (retrievalError) {
        Logger.log("Error retrieving fundamental metrics from cached data: " + retrievalError);
      }
    }
    
    // If we have fundamental metrics from OpenAI, try to merge with cached data
    if (fundamentalMetrics && fundamentalMetrics.length > 0) {
      try {
        // Get the cached data from the script cache
        const cache = CacheService.getScriptCache();
        const cachedDataJson = cache.get('allData');
        
        if (cachedDataJson) {
          const cachedData = JSON.parse(cachedDataJson);
          
          if (cachedData && cachedData.fundamentalMetrics && cachedData.fundamentalMetrics.data) {
            // Create a map of cached stocks by symbol
            const cachedStocks = new Map();
            cachedData.fundamentalMetrics.data.forEach(stock => {
              cachedStocks.set(stock.symbol, stock);
            });
            
            // Merge the OpenAI data with cached data
            fundamentalMetrics = fundamentalMetrics.map(openAiStock => {
              const cachedStock = cachedStocks.get(openAiStock.symbol);
              if (cachedStock) {
                // Merge cached data with OpenAI data, prioritizing OpenAI data for specific fields
                return {
                  ...cachedStock, // Start with all cached data
                  ...openAiStock, // Override with OpenAI data
                  summary: openAiStock.comment, // Use OpenAI comment as summary
                  lastUpdated: analysis.timestamp // Use the analysis timestamp
                };
              }
              return openAiStock; // If no cached data, use OpenAI data
            });
            
            Logger.log(`Merged ${fundamentalMetrics.length} stocks with cached data`);
          }
        }
      } catch (mergeError) {
        Logger.log("Error merging fundamental metrics with cached data: " + mergeError);
      }
    }
    
    // Organize stocks into categories
    const majorIndices = [];
    const magSeven = [];
    const otherStocks = [];
    
    // Define Magnificent Seven symbols
    const magSevenSymbols = ['AAPL', 'MSFT', 'GOOGL', 'GOOG', 'AMZN', 'META', 'NVDA', 'TSLA'];
    
    // Define Major Indices symbols
    const indicesSymbols = ['SPY', 'QQQ', 'DIA', 'IWM', '^GSPC', '^DJI', '^IXIC', '^RUT'];
    
    // Sort stocks into categories
    if (fundamentalMetrics && fundamentalMetrics.length > 0) {
      fundamentalMetrics.forEach(stock => {
        if (indicesSymbols.includes(stock.symbol)) {
          majorIndices.push(stock);
        } else if (magSevenSymbols.includes(stock.symbol)) {
          magSeven.push(stock);
        } else {
          otherStocks.push(stock);
        }
      });
    }
    
    // Function to format numbers to 2 decimal places
    function formatNumber(num) {
      if (num === undefined || num === null || num === '#N/A' || num === 'N/A') {
        return '';
      }
      return Number(num).toFixed(2);
    }

    // Function to calculate and format percentage change
    function formatPercentageChange(price, change) {
      if (price === 0 || price === undefined || price === null || 
          change === undefined || change === null || 
          change === '#N/A' || change === 'N/A') {
        return '';
      }
      const percentage = (change / price) * 100;
      return ` (${formatNumber(percentage)}%)`;
    }

    // Generate stock cards
    function generateStockCard(stock) {
      const metrics = [
        { label: 'PEG Ratio', value: stock.pegRatio },
        { label: 'Forward P/E', value: stock.forwardPE },
        { label: 'Price/Book', value: stock.priceToBook },
        { label: 'Price/Sales', value: stock.priceToSales },
        { label: 'Debt/Equity', value: stock.debtToEquity },
        { label: 'ROE', value: stock.returnOnEquity },
        { label: 'ROA', value: stock.returnOnAssets },
        { label: 'Profit Margin', value: stock.profitMargin },
        { label: 'Dividend Yield', value: stock.dividendYield },
        { label: 'Beta', value: stock.beta }
      ];

      // Filter out N/A values and format numbers
      const filteredMetrics = metrics.filter(m => {
        return m.value !== '#N/A' && m.value !== 'N/A' && m.value !== undefined && m.value !== null;
      }).map(m => ({
        label: m.label,
        value: formatNumber(m.value)
      }));

      // Format price and change
      const price = formatNumber(stock.price);
      const change = formatNumber(stock.priceChange);
      const percentageChange = formatPercentageChange(stock.price, stock.priceChange);

      // Use the company name from the metrics data
      const companyName = stock.name || stock.symbol;

      return `
        <div class="stock-card">
          <div style="flex: 1; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
            <div style="background-color: #f8f9fa; padding: 10px; border-bottom: 1px solid #eee;">
              <div style="font-weight: bold; margin-bottom: 5px;">${stock.symbol}</div>
              <div style="color: #666; font-size: 12px;">${companyName}</div>
            </div>
            
            <div style="padding: 15px;">
              <div style="display: flex; align-items: baseline; margin-bottom: 5px;">
                <div style="font-size: 18px; font-weight: bold;">$${price}</div>
                <div style="color: ${change >= 0 ? '#4caf50' : '#f44336'}; font-weight: bold;">
                  <span style="margin-right: 3px;">${change >= 0 ? '↑' : '↓'}</span>${change}${percentageChange}
                </div>
              </div>
              
              <div style="margin-top: 10px; max-width: 100%; overflow: hidden;">
                <div style="font-weight: bold; margin-bottom: 5px;">Key Metrics</div>
                ${filteredMetrics.length > 0 ? filteredMetrics.map(m => `
                  <div style="display: flex; justify-content: space-between; margin-bottom: 5px; flex-wrap: wrap;">
                    <div style="color: #555; min-width: 80px;">${m.label}</div>
                    <div style="font-weight: bold; text-align: right; overflow: hidden; text-overflow: ellipsis;">${m.value}</div>
                  </div>
                `).join('') : ''}
              </div>
              
              <div style="font-size: 11px; color: #888; margin-top: 10px; text-align: right;">Last updated: ${stock.lastUpdated}</div>
            </div>
          </div>
        </div>
      `;
    }

    // Generate the grid of stock cards
    function generateStockGrid(stocks, category) {
      if (stocks.length === 0) return '';
      
      return `
        <div style="grid-column: 1 / -1; margin-top: 15px; margin-bottom: 10px;">
          <h3 style="color: #2c3e50; border-bottom: 1px solid #eee; padding-bottom: 5px; margin: 0;">${category}</h3>
        </div>
        ${stocks.map(stock => generateStockCard(stock)).join('')}
      `;
    }

    // Generate the HTML for each category
    const html = `
      <div class="stock-grid">
        ${generateStockGrid(majorIndices, 'Major Indices')}
        ${generateStockGrid(magSeven, 'Magnificent Seven')}
        ${generateStockGrid(otherStocks, 'Other Stocks')}
      </div>
    `;

    return `
    <div class="section" style="background-color: white; border-radius: 8px; padding: 15px; margin-bottom: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
      <h2 style="color: #333; border-bottom: 1px solid #eee; padding-bottom: 10px; text-align: center;">Fundamental Metrics</h2>
      ${html}
    </div>
    `;
  } catch (error) {
    Logger.log("Error generating fundamental metrics section: " + error);
    return `
    <div class="section" style="background-color: white; border-radius: 8px; padding: 15px; margin-bottom: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
      <h2 style="color: #333; border-bottom: 1px solid #eee; padding-bottom: 10px; text-align: center;">Fundamental Metrics</h2>
      <p style="text-align: center; color: #757575;">Error generating stock data: ${error}</p>
    </div>
    `;
  }
}

/**
 * Generates the macroeconomic factors section HTML
 * 
 * @param {Object} analysis - The analysis data
 * @return {String} HTML for the macroeconomic factors section
 */
function generateMacroeconomicFactorsSection(analysis) {
  try {
    const macro = analysis.macroeconomicFactors || {};
    
    // Treasury Yields
    let yieldsHtml = '';
    if (macro.treasuryYields) {
      const yields = macro.treasuryYields;
      
      yieldsHtml = `
      <div style="margin-bottom: 20px;">
        <div style="font-weight: bold; margin-bottom: 10px;">Treasury Yields</div>
        <div style="display: flex; flex-wrap: wrap; gap: 10px;">
          ${yields.threeMonth ? `
          <div style="flex: 1 1 calc(33% - 10px); min-width: 100px; padding: 10px; background-color: #ffffff; border-radius: 6px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
            <div style="font-weight: 500; margin-bottom: 5px;">3-Month</div>
            <div style="font-size: 18px; font-weight: bold;">${yields.threeMonth}%</div>
          </div>` : ''}
          
          ${yields.oneYear ? `
          <div style="flex: 1 1 calc(33% - 10px); min-width: 100px; padding: 10px; background-color: #ffffff; border-radius: 6px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
            <div style="font-weight: 500; margin-bottom: 5px;">1-Year</div>
            <div style="font-size: 18px; font-weight: bold;">${yields.oneYear}%</div>
          </div>` : ''}
          
          ${yields.twoYear ? `
          <div style="flex: 1 1 calc(33% - 10px); min-width: 100px; padding: 10px; background-color: #ffffff; border-radius: 6px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
            <div style="font-weight: 500; margin-bottom: 5px;">2-Year</div>
            <div style="font-size: 18px; font-weight: bold;">${yields.twoYear}%</div>
          </div>` : ''}
          
          ${yields.tenYear ? `
          <div style="flex: 1 1 calc(33% - 10px); min-width: 100px; padding: 10px; background-color: #ffffff; border-radius: 6px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
            <div style="font-weight: 500; margin-bottom: 5px;">10-Year</div>
            <div style="font-size: 18px; font-weight: bold;">${yields.tenYear}%</div>
          </div>` : ''}
          
          ${yields.thirtyYear ? `
          <div style="flex: 1 1 calc(33% - 10px); min-width: 100px; padding: 10px; background-color: #ffffff; border-radius: 6px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
            <div style="font-weight: 500; margin-bottom: 5px;">30-Year</div>
            <div style="font-size: 18px; font-weight: bold;">${yields.thirtyYear}%</div>
          </div>` : ''}
        </div>
        
        ${yields.yieldCurve ? `
        <div style="margin-top: 10px; padding: 10px; background-color: #f8f9fa; border-radius: 6px;">
          <div style="font-weight: 500; margin-bottom: 5px;">Yield Curve: <span style="font-weight: bold;">${yields.yieldCurve}</span></div>
          ${yields.implications ? `<div style="font-size: 13px; color: #555;">${yields.implications}</div>` : ''}
        </div>` : ''}
      </div>
      `;
    }
    
    // Inflation Metrics
    let inflationHtml = '';
    if (macro.inflation) {
      const inflation = macro.inflation;
      
      // Determine trend color and icon
      let trendColor = '#757575'; // Default gray
      let trendIcon = '→'; // Default stable
      let trendText = inflation.trend || 'Stable';
      
      if (trendText.toLowerCase().includes('rising') || trendText.toLowerCase().includes('increasing')) {
        trendColor = '#f44336'; // Red for rising inflation
        trendIcon = '↑';
      } else if (trendText.toLowerCase().includes('falling') || trendText.toLowerCase().includes('decreasing')) {
        trendColor = '#4caf50'; // Green for falling inflation
        trendIcon = '↓';
      }
      
      inflationHtml = `
      <div style="margin-bottom: 20px;">
        <div style="font-weight: bold; margin-bottom: 10px;">Inflation Metrics</div>
        <div style="display: flex; margin-bottom: 15px;">
          <!-- CPI Card -->
          ${inflation.cpi && (inflation.cpi.headline !== undefined || inflation.cpi.core !== undefined) ? `
          <div style="flex: 1; margin-right: 5px; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
            <div style="background-color: #f8f9fa; padding: 10px; border-bottom: 1px solid #eee;">
              <div style="font-weight: bold;">Consumer Price Index (CPI)</div>
            </div>
            <div style="padding: 15px;">
              ${inflation.cpi.headline !== undefined ? `
              <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                <div>Headline:</div>
                <div style="font-weight: bold;">${inflation.cpi.headline}%</div>
              </div>` : ''}
              
              ${inflation.cpi.core !== undefined ? `
              <div style="display: flex; justify-content: space-between;">
                <div>Core (ex. Food & Energy):</div>
                <div style="font-weight: bold;">${inflation.cpi.core}%</div>
              </div>` : ''}
            </div>
          </div>` : ''}
          
          <!-- PCE Card -->
          ${inflation.pce && (inflation.pce.headline !== undefined || inflation.pce.core !== undefined) ? `
          <div style="flex: 1; margin-left: 5px; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
            <div style="background-color: #f8f9fa; padding: 10px; border-bottom: 1px solid #eee;">
              <div style="font-weight: bold;">Personal Consumption Expenditures (PCE)</div>
            </div>
            <div style="padding: 15px;">
              ${inflation.pce.headline !== undefined ? `
              <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                <div>Headline:</div>
                <div style="font-weight: bold;">${inflation.pce.headline}%</div>
              </div>` : ''}
              
              ${inflation.pce.core !== undefined ? `
              <div style="display: flex; justify-content: space-between;">
                <div>Core (Fed's Preferred):</div>
                <div style="font-weight: bold;">${inflation.pce.core}%</div>
              </div>` : ''}
            </div>
          </div>` : ''}
        </div>
        
        ${inflation.trend ? `
        <div style="padding: 10px; background-color: #f8f9fa; border-radius: 6px; display: flex; align-items: center;">
          <div style="font-weight: 500; margin-right: 10px;">Trend:</div>
          <div style="color: ${trendColor}; font-weight: bold;">
            <span style="margin-right: 5px;">${trendIcon}</span>${inflation.trend}
          </div>
          ${inflation.outlook ? `
          <div style="margin-left: auto; font-size: 13px; color: #555; max-width: 60%;">${inflation.outlook}</div>` : ''}
        </div>` : ''}
      </div>
      `;
    }
    
    return `
    <div class="section" style="background-color: white; border-radius: 8px; padding: 15px; margin-bottom: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
      <h2 style="color: #333; border-bottom: 1px solid #eee; padding-bottom: 10px; text-align: center;">Macroeconomic Factors</h2>
      ${yieldsHtml}
      ${inflationHtml}
    </div>
    `;
  } catch (error) {
    Logger.log("Error generating macroeconomic factors section: " + error);
    return `
    <div class="section" style="background-color: white; border-radius: 8px; padding: 15px; margin-bottom: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
      <h2 style="color: #333; border-bottom: 1px solid #eee; padding-bottom: 10px; text-align: center;">Macroeconomic Factors</h2>
      <p style="text-align: center; color: #757575;">Error generating macroeconomic factors section: ${error}</p>
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

 /**
function generateGeopoliticalRisksSection(analysis) {
  try {
    // Get geopolitical risks data
    const geopoliticalRisks = analysis.geopoliticalRisks || [];
    
    // If no data and no overview, return empty section
    if ((!geopoliticalRisks || geopoliticalRisks.length === 0) && !analysis.geopoliticalOverview) {
      return `
      <div class="section">
        <h2>Geopolitical Risks</h2>
        <p>No geopolitical risk data available</p>
      </div>
      `;
    }
    
    // Generate global overview if available
    let overviewHtml = '';
    if (analysis.geopoliticalOverview) {
      overviewHtml = `
      <div style="margin-bottom: 15px; padding: 10px; background-color: #f8f9fa; border-radius: 6px; border-left: 4px solid #ff9800;">
        <div style="font-weight: bold; margin-bottom: 5px; color: #ff9800;">Global Overview</div>
        <div style="color: #333;">${analysis.geopoliticalOverview}</div>
      </div>
      `;
    }
    
    // Generate regional risks
    let risksHtml = '';
    if (geopoliticalRisks.length > 0) {
      risksHtml = `
      <div style="margin-top: 15px;">
        <div style="font-weight: bold; margin-bottom: 10px; color: #333;">Regional Risks</div>
      `;
      
      geopoliticalRisks.forEach(risk => {
        // Determine risk level color
        let riskColor = '#ff9800'; // Default moderate
        if (risk.level && risk.level.toLowerCase() === 'high') {
          riskColor = '#f44336';
        } else if (risk.level && risk.level.toLowerCase() === 'severe') {
          riskColor = '#d32f2f';
        } else if (risk.level && risk.level.toLowerCase() === 'low') {
          riskColor = '#4caf50';
        }
        
        risksHtml += `
        <div style="margin-bottom: 15px;">
          <div style="margin-bottom: 10px; padding: 10px; background-color: white; border-radius: 4px;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
            <div style="font-weight: bold; color: #333;">${risk.region || 'Global'}</div>
            <div style="color: ${riskColor}; font-weight: bold; font-size: 13px;">
              <span style="background-color: ${riskColor}; color: white; padding: 2px 6px; border-radius: 3px;">${risk.level || 'Moderate'}</span>
            </div>
            </div>
            <div style="color: #555; margin-bottom: 5px;">${risk.description || 'No description available'}</div>
            ${risk.source ? `
            <div style="font-size: 11px; color: #888; text-align: right;">
              Source: ${risk.source} ${risk.lastUpdated ? `| Last updated: ${risk.lastUpdated}` : ''}
            </div>
            ` : ''}
          </div>
        </div>
        `;
      });
      
      risksHtml += `</div>`;
    }
    
    // Return the complete HTML for the geopolitical risks section
    return `
    <div class="section">
      <h2>Geopolitical Risks</h2>
      ${overviewHtml}
      ${risksHtml}
    </div>
    `;
  } catch (error) {
    Logger.log("Error generating geopolitical risks section: " + error);
    return `
    <div class="section">
      <h2>Geopolitical Risks</h2>
      <p>Error generating geopolitical risks section: ${error}</p>
    </div>
    `;
  }
}
*/

/**
 * Generates the geopolitical risks section HTML using the correct JSON structure.
 * 
 * @param {Object} analysis - The analysis data
 * @return {String} HTML for the geopolitical risks section
 */
function generateGeopoliticalRisksSection(analysis) {
  try {
    // Retrieve geopolitical risks from macroeconomicFactors
    const geoRisks = analysis.macroeconomicFactors && analysis.macroeconomicFactors.geopoliticalRisks;
    
    // If no geopolitical risks data is available, return a message indicating so.
    if (!geoRisks) {
      return `
      <div class="section" style="background-color: white; border-radius: 8px; padding: 15px; margin-bottom: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
        <h2 style="color: #333; border-bottom: 1px solid #eee; padding-bottom: 10px; text-align: center;">Geopolitical Risks</h2>
        <p style="text-align: center; color: #757575;">No geopolitical risk data available</p>
      </div>
      `;
    }
    
    // Global overview from geoRisks.global (if available)
    let overviewHtml = '';
    if (geoRisks.global) {
      overviewHtml = `
      <div style="margin-bottom: 15px; padding: 10px; background-color: #f8f9fa; border-radius: 6px; border-left: 4px solid #ff9800;">
        <div style="font-weight: bold; margin-bottom: 5px; color: #ff9800;">Global Overview</div>
        <div style="color: #333;">${geoRisks.global}</div>
      </div>
      `;
    }
    
    // Generate regional risks using the regions array from geoRisks
    let risksHtml = '';
    if (geoRisks.regions && geoRisks.regions.length > 0) {
      risksHtml = `
      <div style="margin-top: 15px;">
        <div style="font-weight: bold; margin-bottom: 10px; color: #333;">Regional Risks</div>
      `;
      
      geoRisks.regions.forEach(regionData => {
        risksHtml += `
        <div style="margin-bottom: 15px;">
          <div style="font-weight: bold; color: #333;">${regionData.region || 'Global'}</div>
        `;
        if (regionData.risks && regionData.risks.length > 0) {
          regionData.risks.forEach(risk => {
            // Use risk.impactLevel instead of risk.level
            let riskColor = '#ff9800'; // default moderate
            if (risk.impactLevel && risk.impactLevel.toLowerCase() === 'high') {
              riskColor = '#f44336';
            } else if (risk.impactLevel && risk.impactLevel.toLowerCase() === 'severe') {
              riskColor = '#d32f2f';
            } else if (risk.impactLevel && risk.impactLevel.toLowerCase() === 'low') {
              riskColor = '#4caf50';
            }
            
            risksHtml += `
            <div style="padding: 10px; background-color: white; border-radius: 4px; margin-top: 5px;">
              <div style="display: flex; justify-content: space-between;">
              <div style="color: #555;">${risk.description || 'No description available'}</div>
              <div style="color: ${riskColor}; font-weight: bold; font-size: 13px;">
                <span style="background-color: ${riskColor}; color: white; padding: 2px 6px; border-radius: 3px;">${risk.impactLevel || 'Moderate'}</span>
                </div>
              </div>
              ${risk.source ? `<div style="font-size: 11px; text-align: right; color: #888;">Source: ${risk.source}${risk.lastUpdated ? ` | Last updated: ${risk.lastUpdated}` : ''}</div>` : ''}
            </div>
            `;
          });
        } else {
          risksHtml += `<div style="color: #757575;">No specific risks identified</div>`;
        }
        risksHtml += `</div>`;
      });
      
      risksHtml += `</div>`;
    }
    
    // Return the complete HTML for the geopolitical risks section
    return `
    <div class="section" style="background-color: white; border-radius: 8px; padding: 15px; margin-bottom: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
      <h2 style="color: #333; border-bottom: 1px solid #eee; padding-bottom: 10px; text-align: center;">Geopolitical Risks</h2>
      ${overviewHtml}
      ${risksHtml}
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
 * Test function to retrieve stock data and fundamentals from FMP
 * @return {Object} The stock data and fundamentals
 */
function testFMPStockData() {
  const apiKey = PropertiesService.getScriptProperties().getProperty('FMP_API_KEY');
  if (!apiKey) {
    throw new Error('FMP_API_KEY not found in script properties');
  }

  // Test with a well-known stock symbol
  const symbol = 'AAPL';
  
  try {
    // Get company quote
    const quoteUrl = `https://financialmodelingprep.com/api/v3/quote/${symbol}?apikey=${apiKey}`;
    const quoteResponse = UrlFetchApp.fetch(quoteUrl);
    const quoteData = JSON.parse(quoteResponse.getContentText())[0];

    // Get company profile
    const profileUrl = `https://financialmodelingprep.com/api/v3/profile/${symbol}?apikey=${apiKey}`;
    const profileResponse = UrlFetchApp.fetch(profileUrl);
    const profileData = JSON.parse(profileResponse.getContentText())[0];

    // Get key metrics
    const metricsUrl = `https://financialmodelingprep.com/api/v3/key-metrics/${symbol}?period=quarter&limit=1&apikey=${apiKey}`;
    const metricsResponse = UrlFetchApp.fetch(metricsUrl);
    const metricsData = JSON.parse(metricsResponse.getContentText())[0];

    // Combine all data into a single object
    const result = {
      symbol: symbol,
      quote: quoteData,
      profile: profileData,
      metrics: metricsData,
      timestamp: new Date().toISOString()
    };

    Logger.log('Successfully retrieved FMP data');
    return result;
  } catch (error) {
    Logger.log(`Error retrieving FMP data: ${error}`);
    throw error;
  }
}
