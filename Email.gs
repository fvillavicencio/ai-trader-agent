/**
 * Email formatting and sending functions
 */

/**
 * Formats the trading decision and justification as an HTML email
 * 
 * @param {string} decision - The trading decision (Buy Now, Sell Now, Watch for Better Price Action)
 * @param {string} justification - The justification for the decision in JSON format
 * @param {Date} analysisTime - The time of the current analysis
 * @param {Date} nextAnalysisTime - The time of the next scheduled analysis
 * @return {string} - The formatted HTML email body
 */
function formatHtmlEmailBody(decision, justification, analysisTime, nextAnalysisTime) {
  const formattedAnalysisDate = Utilities.formatDate(analysisTime, TIME_ZONE, "MMMM dd, yyyy 'at' hh:mm a 'ET'");
  const formattedNextDate = Utilities.formatDate(nextAnalysisTime, TIME_ZONE, "MMMM dd, yyyy 'at' hh:mm a 'ET'");
  
  // Determine color based on decision
  let decisionColor = "#FFA500"; // Default orange for "Watch for Better Price Action"
  let decisionIcon = "⚠️"; // Default icon for Watch
  let decisionBg = "#FFF8E1"; // Light yellow background
  
  if (decision.includes("Buy")) {
    decisionColor = "#4CAF50"; // Green for Buy
    decisionIcon = "🔼"; // Up arrow for Buy
    decisionBg = "#E8F5E9"; // Light green background
  } else if (decision.includes("Sell")) {
    decisionColor = "#F44336"; // Red for Sell
    decisionIcon = "🔽"; // Down arrow for Sell
    decisionBg = "#FFEBEE"; // Light red background
  }
  
  // Parse the JSON data
  let jsonData;
  try {
    jsonData = JSON.parse(justification);
  } catch (e) {
    Logger.log("Error parsing JSON: " + e);
    // If parsing fails, create a basic structure
    jsonData = {
      decision: decision,
      summary: "Unable to parse analysis data",
      analysis: {},
      justification: "The analysis data could not be properly parsed."
    };
  }
  
  // Create HTML email template with improved design
  return `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 800px;
      margin: 0 auto;
      background-color: #f9f9f9;
    }
    .container {
      padding: 25px;
      border-radius: 8px;
      background-color: #ffffff;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
    .header {
      text-align: center;
      margin-bottom: 30px;
      border-bottom: 2px solid #eee;
      padding-bottom: 20px;
    }
    .header h1 {
      color: #444;
      margin-bottom: 10px;
      font-size: 28px;
    }
    .header p {
      color: #666;
      font-size: 16px;
      margin-top: 5px;
    }
    .decision-container {
      text-align: center;
      margin: 30px 0;
    }
    .decision {
      font-size: 24px;
      font-weight: bold;
      color: white;
      background-color: ${decisionColor};
      padding: 12px 25px;
      border-radius: 50px;
      display: inline-block;
      margin-bottom: 20px;
      box-shadow: 0 4px 8px rgba(0,0,0,0.1);
    }
    .decision-icon {
      font-size: 32px;
      margin-right: 10px;
    }
    .summary {
      background-color: ${decisionBg};
      border-left: 5px solid ${decisionColor};
      padding: 20px;
      border-radius: 5px;
      margin: 20px 0;
      font-size: 18px;
    }
    h2 {
      color: #2c3e50;
      border-bottom: 1px solid #eee;
      padding-bottom: 10px;
      margin-top: 30px;
    }
    h3 {
      color: #3498db;
      margin-top: 20px;
    }
    .analyst {
      margin-bottom: 20px;
      padding: 15px;
      background-color: #f9f9f9;
      border-radius: 8px;
      border-left: 4px solid #3498db;
    }
    .analyst-name {
      font-weight: bold;
      color: #2c3e50;
    }
    .timestamp {
      font-style: italic;
      color: #7f8c8d;
      font-size: 0.9em;
    }
    .source {
      font-size: 0.9em;
      color: #3498db;
    }
    .indicator {
      margin-bottom: 15px;
    }
    .indicator-name {
      font-weight: bold;
    }
    .event {
      margin-bottom: 10px;
    }
    .stock {
      margin-bottom: 20px;
      padding: 15px;
      background-color: #f9f9f9;
      border-radius: 8px;
    }
    .stock-header {
      display: flex;
      justify-content: space-between;
      margin-bottom: 10px;
    }
    .stock-name {
      font-weight: bold;
      color: #2c3e50;
    }
    .stock-metrics {
      display: flex;
      gap: 15px;
      margin-bottom: 10px;
    }
    .metric {
      background-color: #e8f4f8;
      padding: 5px 10px;
      border-radius: 4px;
      font-size: 0.9em;
    }
    .justification {
      margin-top: 30px;
      padding: 20px;
      background-color: #f5f5f5;
      border-radius: 8px;
      line-height: 1.8;
    }
    .footer {
      margin-top: 40px;
      font-size: 14px;
      color: #777;
      border-top: 1px solid #eee;
      padding-top: 20px;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>AI Trading Analysis</h1>
      <p>Generated on ${formattedAnalysisDate}</p>
    </div>
    
    <div class="decision-container">
      <div class="decision">
        <span class="decision-icon">${decisionIcon}</span> ${decision}
      </div>
    </div>
    
    ${jsonData.summary ? `<div class="summary">${jsonData.summary}</div>` : ''}
    
    <h2>Market Sentiment</h2>
    ${jsonData.analysis && jsonData.analysis.marketSentiment ? 
      jsonData.analysis.marketSentiment.map(analyst => `
        <div class="analyst">
            <div class="analyst-name">${analyst.analyst}</div>
            <div class="comment">${analyst.comment}</div>
            ${analyst.timestamp ? `<div class="timestamp">Time: ${analyst.timestamp}</div>` : ''}
            ${analyst.source ? `<div class="source">Source: <a href="${analyst.source}" target="_blank">${analyst.source}</a></div>` : ''}
        </div>
      `).join('') : '<p>No market sentiment data available</p>'}
    
    <h2>Key Market Indicators</h2>
    ${jsonData.analysis && jsonData.analysis.marketIndicators ? `
        <div class="indicators">
            ${jsonData.analysis.marketIndicators.fearGreedIndex ? `
                <div class="indicator">
                    <div class="indicator-name">CNN Fear & Greed Index</div>
                    <div>Value: ${jsonData.analysis.marketIndicators.fearGreedIndex.value}</div>
                    <div>Interpretation: ${jsonData.analysis.marketIndicators.fearGreedIndex.interpretation}</div>
                </div>
            ` : ''}
            
            ${jsonData.analysis.marketIndicators.vix ? `
                <div class="indicator">
                    <div class="indicator-name">CBOE Volatility Index (VIX)</div>
                    <div>Value: ${jsonData.analysis.marketIndicators.vix.value}</div>
                    <div>Trend: ${jsonData.analysis.marketIndicators.vix.trend}</div>
                </div>
            ` : ''}
            
            ${jsonData.analysis.marketIndicators.upcomingEvents && jsonData.analysis.marketIndicators.upcomingEvents.length > 0 ? `
                <div class="indicator">
                    <div class="indicator-name">Upcoming Economic Events</div>
                    ${jsonData.analysis.marketIndicators.upcomingEvents.map(event => `
                        <div class="event">
                            <div>${event.event} - ${event.date}</div>
                        </div>
                    `).join('')}
                </div>
            ` : ''}
        </div>
    ` : '<p>No market indicator data available</p>'}
    
    <h2>Fundamental Metrics</h2>
    ${jsonData.analysis && jsonData.analysis.fundamentalMetrics && jsonData.analysis.fundamentalMetrics.length > 0 ? 
      jsonData.analysis.fundamentalMetrics.map(stock => `
        <div class="stock">
            <div class="stock-header">
                <div class="stock-name">${stock.symbol} - ${stock.name}</div>
            </div>
            <div class="stock-metrics">
                <div class="metric">PEG Ratio: ${stock.pegRatio}</div>
                <div class="metric">Forward P/E: ${stock.forwardPE}</div>
            </div>
            <div>${stock.comment}</div>
        </div>
      `).join('') : '<p>No fundamental metrics data available</p>'}
    
    <h2>Macroeconomic Factors</h2>
    ${jsonData.analysis && jsonData.analysis.macroeconomicFactors ? `
        <div class="macro">
            ${jsonData.analysis.macroeconomicFactors.treasuryYields ? `
                <h3>Treasury Yields</h3>
                <div style="margin-left: 15px; display: flex; flex-wrap: wrap;">
                    <div style="margin-right: 30px;">
                        <p><strong>10-Year:</strong> ${formatYieldValue(jsonData.analysis.macroeconomicFactors.treasuryYields.tenYear)}%</p>
                        <p><strong>2-Year:</strong> ${formatYieldValue(jsonData.analysis.macroeconomicFactors.treasuryYields.twoYear)}%</p>
                    </div>
                    <div>
                        ${jsonData.analysis.macroeconomicFactors.treasuryYields.date ? 
                          `<p><strong>Date:</strong> ${jsonData.analysis.macroeconomicFactors.treasuryYields.date}</p>` : ''}
                        ${jsonData.analysis.macroeconomicFactors.treasuryYields.yieldCurve ? 
                          `<p><strong>Yield Curve:</strong> ${jsonData.analysis.macroeconomicFactors.treasuryYields.yieldCurve}</p>` : ''}
                    </div>
                </div>
                <div style="margin-left: 15px;">
                    <p><strong>Sources:</strong> 
                      <a href="https://home.treasury.gov/resource-center/data-chart-center/interest-rates/TextView?type=daily_treasury_yield_curve&field_tdr_date_value_month=${getCurrentYearMonth()}" target="_blank">U.S. Treasury Daily Yield Curve Rates</a>
                      ${jsonData.analysis.macroeconomicFactors.treasuryYields.sources && jsonData.analysis.macroeconomicFactors.treasuryYields.sources.fallback ? 
                        ` | <a href="https://www.marketwatch.com/investing/bond/tmubmusd10y?countrycode=bx" target="_blank">MarketWatch 10-Year</a> | 
                           <a href="https://www.marketwatch.com/investing/bond/tmubmusd02y?countrycode=bx" target="_blank">MarketWatch 2-Year</a>` : ''}
                    </p>
                    ${jsonData.analysis.macroeconomicFactors.treasuryYields.implications ? 
                      `<p><strong>Implications:</strong> ${jsonData.analysis.macroeconomicFactors.treasuryYields.implications}</p>` : ''}
                </div>
            ` : ''}
            
            ${jsonData.analysis.macroeconomicFactors.fedPolicy ? `
                <h3>Federal Reserve Policy</h3>
                <div style="margin-left: 15px;">
                    <p><strong>Federal Funds Rate:</strong> ${typeof jsonData.analysis.macroeconomicFactors.fedPolicy === 'object' ? 
                      (jsonData.analysis.macroeconomicFactors.fedPolicy.federalFundsRate || 'N/A') : 'N/A'}</p>
                    
                    <div style="display: flex; flex-wrap: wrap;">
                        <div style="margin-right: 30px;">
                            ${typeof jsonData.analysis.macroeconomicFactors.fedPolicy === 'object' && jsonData.analysis.macroeconomicFactors.fedPolicy.fomcMeetingDate ? 
                              `<p><strong>FOMC Meeting Date:</strong> ${jsonData.analysis.macroeconomicFactors.fedPolicy.fomcMeetingDate}</p>` : ''}
                        </div>
                        <div>
                            ${typeof jsonData.analysis.macroeconomicFactors.fedPolicy === 'object' && jsonData.analysis.macroeconomicFactors.fedPolicy.source ? 
                              `<p><strong>Source:</strong> ${typeof jsonData.analysis.macroeconomicFactors.fedPolicy.source === 'string' && 
                                jsonData.analysis.macroeconomicFactors.fedPolicy.source.startsWith('http') ? 
                                `<a href="${jsonData.analysis.macroeconomicFactors.fedPolicy.source}" target="_blank">${jsonData.analysis.macroeconomicFactors.fedPolicy.source}</a>` : 
                                jsonData.analysis.macroeconomicFactors.fedPolicy.source}</p>` : ''}
                        </div>
                    </div>
                    
                    ${typeof jsonData.analysis.macroeconomicFactors.fedPolicy === 'object' && jsonData.analysis.macroeconomicFactors.fedPolicy.forwardGuidance ? 
                      `<p><strong>Forward Guidance:</strong> ${jsonData.analysis.macroeconomicFactors.fedPolicy.forwardGuidance}</p>` : ''}
                </div>
            ` : ''}
            
            ${jsonData.analysis.macroeconomicFactors.inflation ? `
                <h3>Inflation</h3>
                <div style="margin-left: 15px;">
                    ${typeof jsonData.analysis.macroeconomicFactors.inflation === 'object' && jsonData.analysis.macroeconomicFactors.inflation.cpi ? `
                        <h4>CPI:</h4>
                        <div style="margin-left: 15px; display: flex; flex-wrap: wrap;">
                            <div style="margin-right: 30px;">
                                <p><strong>Headline:</strong> ${typeof jsonData.analysis.macroeconomicFactors.inflation.cpi === 'object' ? 
                                  (jsonData.analysis.macroeconomicFactors.inflation.cpi.headline || 'N/A') : 'N/A'}</p>
                                <p><strong>Core:</strong> ${typeof jsonData.analysis.macroeconomicFactors.inflation.cpi === 'object' ? 
                                  (jsonData.analysis.macroeconomicFactors.inflation.cpi.core || 'N/A') : 'N/A'}</p>
                            </div>
                            <div>
                                ${typeof jsonData.analysis.macroeconomicFactors.inflation.cpi === 'object' && jsonData.analysis.macroeconomicFactors.inflation.cpi.releaseDate ? 
                                  `<p><strong>Release Date:</strong> ${jsonData.analysis.macroeconomicFactors.inflation.cpi.releaseDate}</p>` : ''}
                                ${typeof jsonData.analysis.macroeconomicFactors.inflation.cpi === 'object' && jsonData.analysis.macroeconomicFactors.inflation.cpi.source ? 
                                  `<p><strong>Source:</strong> ${typeof jsonData.analysis.macroeconomicFactors.inflation.cpi.source === 'string' && 
                                    jsonData.analysis.macroeconomicFactors.inflation.cpi.source.startsWith('http') ? 
                                    `<a href="${jsonData.analysis.macroeconomicFactors.inflation.cpi.source}" target="_blank">${jsonData.analysis.macroeconomicFactors.inflation.cpi.source}</a>` : 
                                    jsonData.analysis.macroeconomicFactors.inflation.cpi.source}</p>` : ''}
                            </div>
                        </div>
                    ` : ''}
                    
                    ${typeof jsonData.analysis.macroeconomicFactors.inflation === 'object' && jsonData.analysis.macroeconomicFactors.inflation.pce ? `
                        <h4>PCE:</h4>
                        <div style="margin-left: 15px; display: flex; flex-wrap: wrap;">
                            <div style="margin-right: 30px;">
                                <p><strong>Headline:</strong> ${typeof jsonData.analysis.macroeconomicFactors.inflation.pce === 'object' ? 
                                  (jsonData.analysis.macroeconomicFactors.inflation.pce.headline || 'N/A') : 'N/A'}</p>
                                <p><strong>Core:</strong> ${typeof jsonData.analysis.macroeconomicFactors.inflation.pce === 'object' ? 
                                  (jsonData.analysis.macroeconomicFactors.inflation.pce.core || 'N/A') : 'N/A'}</p>
                            </div>
                            <div>
                                ${typeof jsonData.analysis.macroeconomicFactors.inflation.pce === 'object' && jsonData.analysis.macroeconomicFactors.inflation.pce.releaseDate ? 
                                  `<p><strong>Release Date:</strong> ${jsonData.analysis.macroeconomicFactors.inflation.pce.releaseDate}</p>` : ''}
                                ${typeof jsonData.analysis.macroeconomicFactors.inflation.pce === 'object' && jsonData.analysis.macroeconomicFactors.inflation.pce.source ? 
                                  `<p><strong>Source:</strong> ${typeof jsonData.analysis.macroeconomicFactors.inflation.pce.source === 'string' && 
                                    jsonData.analysis.macroeconomicFactors.inflation.pce.source.startsWith('http') ? 
                                    `<a href="${jsonData.analysis.macroeconomicFactors.inflation.pce.source}" target="_blank">${jsonData.analysis.macroeconomicFactors.inflation.pce.source}</a>` : 
                                    jsonData.analysis.macroeconomicFactors.inflation.pce.source}</p>` : ''}
                            </div>
                        </div>
                    ` : ''}
                    
                    <div style="margin-top: 10px;">
                        ${typeof jsonData.analysis.macroeconomicFactors.inflation === 'object' && jsonData.analysis.macroeconomicFactors.inflation.trend ? 
                          `<p><strong>Trend:</strong> ${jsonData.analysis.macroeconomicFactors.inflation.trend}</p>` : ''}
                        ${typeof jsonData.analysis.macroeconomicFactors.inflation === 'object' && jsonData.analysis.macroeconomicFactors.inflation.impactOnFedPolicy ? 
                          `<p><strong>Impact on Fed Policy:</strong> ${jsonData.analysis.macroeconomicFactors.inflation.impactOnFedPolicy}</p>` : ''}
                    </div>
                </div>
            ` : ''}
            
            ${jsonData.analysis.macroeconomicFactors.geopoliticalRisks && jsonData.analysis.macroeconomicFactors.geopoliticalRisks.length > 0 ? `
                <h3>Geopolitical Risks</h3>
                <div style="margin-left: 15px;">
                    <ul style="margin-top: 5px; padding-left: 20px;">
                        ${Array.isArray(jsonData.analysis.macroeconomicFactors.geopoliticalRisks) ? 
                          jsonData.analysis.macroeconomicFactors.geopoliticalRisks.map(risk => {
                            if (typeof risk === 'object' && risk.description) {
                              return `<li>${risk.description}</li>`;
                            } else if (typeof risk === 'string') {
                              return `<li>${risk}</li>`;
                            }
                            return '';
                          }).join('') : 
                          (typeof jsonData.analysis.macroeconomicFactors.geopoliticalRisks === 'string' ? 
                            `<li>${jsonData.analysis.macroeconomicFactors.geopoliticalRisks}</li>` : '')}
                    </ul>
                    ${typeof jsonData.analysis.macroeconomicFactors.geopoliticalRisksImpact === 'string' ? 
                      `<p style="margin-top: 10px;"><strong>Market Impact:</strong> ${jsonData.analysis.macroeconomicFactors.geopoliticalRisksImpact}</p>` : ''}
                </div>
            ` : ''}
        </div>
    ` : '<p>No macroeconomic factors data available</p>'}
    
    ${jsonData.justification ? `
      <h2>Detailed Justification</h2>
      <div class="justification">
          ${jsonData.justification}
      </div>
    ` : ''}
    
    <div class="footer">
      <p>Next analysis scheduled for ${formattedNextDate}</p>
      <p>AI Trading Agent - Automated Analysis</p>
    </div>
  </div>
</body>
</html>
  `;
}

function formatYieldValue(value) {
  if (typeof value === 'number') {
    return value.toFixed(2);
  } else if (typeof value === 'string') {
    return value;
  } else {
    return 'N/A';
  }
}

/**
 * Formats the trading decision and justification as a plain text email (fallback)
 * 
 * @param {string} decision - The trading decision (Buy Now, Sell Now, Watch for Better Price Action)
 * @param {string} justification - The justification for the decision
 * @param {Date} analysisTime - The time of the current analysis
 * @param {Date} nextAnalysisTime - The time of the next scheduled analysis
 * @return {string} - The formatted plain text email body
 */
function formatPlainTextEmailBody(decision, justification, analysisTime, nextAnalysisTime) {
  const formattedAnalysisDate = Utilities.formatDate(analysisTime, TIME_ZONE, "MMMM dd, yyyy 'at' hh:mm a 'ET'");
  const formattedNextDate = Utilities.formatDate(nextAnalysisTime, TIME_ZONE, "MMMM dd, yyyy 'at' hh:mm a 'ET'");
  
  return `AI TRADING DECISION
  
Analysis completed on ${formattedAnalysisDate}

Decision: ${decision}

Justification:
${justification}

Next Analysis Scheduled: ${formattedNextDate}

This analysis was generated by AI Trading Agent using Perplexity API with native web browsing.`;
}

/**
 * Sends an email with the trading decision and justification
 * 
 * @param {string} decision - The trading decision (Buy Now, Sell Now, Watch for Better Price Action)
 * @param {string} justification - The justification for the decision
 * @param {Date} analysisTime - The time of the current analysis
 * @param {Date} nextAnalysisTime - The time of the next scheduled analysis
 */
function sendTradingDecisionEmail(decision, justification, analysisTime, nextAnalysisTime) {
  const formattedDate = Utilities.formatDate(analysisTime, TIME_ZONE, "yyyy-MM-dd");
  const subject = `${EMAIL_SUBJECT_PREFIX}${decision} - ${formattedDate}`;
  
  // Create both HTML and plain text versions of the email
  const htmlBody = formatHtmlEmailBody(decision, justification, analysisTime, nextAnalysisTime);
  const plainTextBody = formatPlainTextEmailBody(decision, justification, analysisTime, nextAnalysisTime);
  
  // Get the recipients array from the Config.gs function
  const recipients = getEmailRecipients();
  
  // Join multiple recipients with commas for a single email
  const recipientString = recipients.join(',');
  
  // Send a single email to all recipients
  GmailApp.sendEmail(recipientString, subject, plainTextBody, {
    htmlBody: htmlBody
  });
  
  Logger.log(`Email sent to ${recipientString} with decision: ${decision}`);
}

function getCurrentYearMonth() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}${month}`;
}
