/**
 * Configuration settings for the AI Trading Agent
 */

// Perplexity API configuration
const PERPLEXITY_API_KEY = ""; // Don't hardcode the key here, use Script Properties instead
const PERPLEXITY_MODEL = "sonar-pro"; // Using Perplexity's latest model for web browsing
const PERPLEXITY_API_URL = "https://api.perplexity.ai/chat/completions";

// Alpha Vantage API configuration
// Note: Free tier is limited to 25 API calls per day
// For production use, consider upgrading to a paid plan: https://www.alphavantage.co/premium/
const ALPHA_VANTAGE_API_KEY = ""; // Don't hardcode the key here, use Script Properties instead

// Email configuration
const EMAIL_SUBJECT_PREFIX = "[Market Pulse Daily] "; // Prefix for email subject
//const RECIPIENT_EMAILS = ["fvillavicencio@gmail.com", "zitro123@yahoo.com"]; // Array of recipient email addresses
const RECIPIENT_EMAILS = ["fvillavicencio@gmail.com"]; // Array of recipient email addresses

// Schedule configuration
const MORNING_SCHEDULE_HOUR = 8;
const MORNING_SCHEDULE_MINUTE = 50;
const EVENING_SCHEDULE_HOUR = 18;
const EVENING_SCHEDULE_MINUTE = 0;

// Time zone for scheduling
const TIME_ZONE = "America/New_York";

/**
 * Generates the HTML template for the trading analysis email
 * @param {Object} analysisResult - The analysis result from OpenAI
 * @param {Date} nextScheduledTime - The next scheduled analysis time
 * @param {Boolean} isTest - Whether this is a test email
 * @return {String} HTML template as a string
 */
function generateEmailTemplate(analysisResult, nextScheduledTime, isTest = false) {
  try {
    // Format the current date and time
    const now = new Date();
    const options = { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric', 
      hour: 'numeric', 
      minute: '2-digit',
      timeZoneName: 'short'
    };
    const formattedDate = now.toLocaleDateString('en-US', options);
    
    // Format the next scheduled time
    const nextScheduledFormatted = nextScheduledTime.toLocaleDateString('en-US', options);
    
    // Get the decision icon based on the decision
    let decisionIcon = "⚠️"; // Default (Watch)
    let decisionColor = "#FFA500"; // Default (Orange for Watch)
    let decisionBgColor = "#FFF8E1"; // Default (Light yellow for Watch)
    
    // Normalize the decision for comparison (uppercase and trim)
    const normalizedDecision = analysisResult.decision.toUpperCase().trim();
    
    if (normalizedDecision.includes("BUY")) {
      decisionIcon = "🟢"; // Green circle
      decisionColor = "#4CAF50"; // Green
      decisionBgColor = "#E8F5E9"; // Light green
    } else if (normalizedDecision.includes("SELL")) {
      decisionIcon = "🔴"; // Red circle
      decisionColor = "#F44336"; // Red
      decisionBgColor = "#FFEBEE"; // Light red
    } else if (normalizedDecision.includes("WATCH") || normalizedDecision.includes("HOLD") || normalizedDecision.includes("WAIT")) {
      decisionIcon = "⚠️"; // Warning
      decisionColor = "#FFA500"; // Orange
      decisionBgColor = "#FFF8E1"; // Light yellow
    }
    
    // Get the CSS
    const css = getEmailTemplateCSS();
    
    // Build the HTML template
    let html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Market Pulse Daily${isTest ? ' (TEST)' : ''}</title>
  <style>${css}</style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Market Pulse Daily${isTest ? ' (TEST)' : ''}</h1>
      <p>Generated on ${formattedDate}</p>
    </div>
    
    <div class="decision-box" style="background-color: ${decisionBgColor}; border-left: 5px solid ${decisionColor};">
      <p class="decision" style="color: ${decisionColor};"><span class="decision-icon">${decisionIcon}</span> ${analysisResult.decision}</p>
      <p class="summary">${analysisResult.summary}</p>
    </div>
    
    <!-- Detailed Justification Section -->
    <div class="section">
      <h2 class="section-title">Detailed Justification</h2>
      <div class="justification">${analysisResult.justification}</div>
      <div style="margin-top: 8px; font-size: 11px; color: #9e9e9e; text-align: right;">
          Source: <a href="${analysisResult.sourceUrl || "#"}" style="color: #607d8b; text-decoration: none;">${analysisResult.source || "Analysis"}</a>
           | 
          Last updated: ${analysisResult.timestamp || formattedDate}
        </div>
    </div>`;
    
    // Add Market Sentiment section if available
    if (analysisResult.analysis && analysisResult.analysis.marketSentiment) {
      const marketSentiment = analysisResult.analysis.marketSentiment;
      html += `
      <div class="section">
        <h2 class="section-title">Market Sentiment</h2>
        <p><strong>Overall Sentiment:</strong> ${marketSentiment.overall || 'N/A'}</p>
        
        <h3 style="font-size: 16px; color: #34495e; margin-top: 15px;">Analyst Commentary</h3>
        <div style="margin-top: 10px;">`;
        
      // Add analyst comments if available
      if (marketSentiment.analysts && marketSentiment.analysts.length > 0) {
        html += `<ul style="padding-left: 20px; margin-top: 5px;">`;
        marketSentiment.analysts.forEach(analyst => {
          let symbols = '';
          if (analyst.mentionedSymbols && analyst.mentionedSymbols.length > 0) {
            symbols = ` <span style="color: #3498db; font-weight: bold;">(${analyst.mentionedSymbols.join(', ')})</span>`;
          }
          html += `<li style="margin-bottom: 8px;"><strong>${analyst.analyst}:</strong> "${analyst.comment}"${symbols}</li>`;
        });
        html += `</ul>`;
      } else {
        html += `<p>No analyst commentary available.</p>`;
      }
      
      html += `</div>
        <div style="margin-top: 8px; font-size: 11px; color: #9e9e9e; text-align: right;">
          Source: <a href="${marketSentiment.sourceUrl || "#"}" style="color: #607d8b; text-decoration: none;">${marketSentiment.source || "Analysis"}</a>
           | 
          Last updated: ${marketSentiment.lastUpdated || 'N/A'}
        </div>
      </div>`;
    }
    
    // Add Market Indicators section if available
    if (analysisResult.analysis && analysisResult.analysis.marketIndicators) {
      const indicators = analysisResult.analysis.marketIndicators;
      html += `
      <div class="section">
        <h2 class="section-title">Key Market Indicators</h2>
        
        <div style="display: flex; flex-wrap: wrap; gap: 15px; margin-top: 15px;">`;
        
      // Add Fear & Greed Index if available
      if (indicators.fearGreedIndex) {
        const fearGreed = indicators.fearGreedIndex;
        let fearGreedColor = '#95a5a6'; // Default gray
        
        if (fearGreed.value <= 25) {
          fearGreedColor = '#e74c3c'; // Extreme Fear (red)
        } else if (fearGreed.value <= 45) {
          fearGreedColor = '#e67e22'; // Fear (orange)
        } else if (fearGreed.value <= 55) {
          fearGreedColor = '#f1c40f'; // Neutral (yellow)
        } else if (fearGreed.value <= 75) {
          fearGreedColor = '#2ecc71'; // Greed (green)
        } else {
          fearGreedColor = '#27ae60'; // Extreme Greed (dark green)
        }
        
        html += `
          <div style="flex: 1; min-width: 200px; padding: 15px; background-color: #f8f9fa; border-radius: 8px; border-top: 3px solid ${fearGreedColor};">
            <h3 style="margin-top: 0; font-size: 16px; color: #34495e;">Fear & Greed Index</h3>
            <div style="font-size: 24px; font-weight: bold; color: ${fearGreedColor}; text-align: center; margin: 10px 0;">${fearGreed.value}</div>
            <p style="text-align: center; margin: 5px 0; font-style: italic;">${fearGreed.interpretation || 'N/A'}</p>
          </div>`;
      }
      
      // Add VIX if available
      if (indicators.vix) {
        const vix = indicators.vix;
        let vixColor = '#95a5a6'; // Default gray
        
        if (vix.value >= 30) {
          vixColor = '#e74c3c'; // High volatility (red)
        } else if (vix.value >= 20) {
          vixColor = '#f1c40f'; // Moderate volatility (yellow)
        } else {
          vixColor = '#2ecc71'; // Low volatility (green)
        }
        
        html += `
          <div style="flex: 1; min-width: 200px; padding: 15px; background-color: #f8f9fa; border-radius: 8px; border-top: 3px solid ${vixColor};">
            <h3 style="margin-top: 0; font-size: 16px; color: #34495e;">VIX (Volatility Index)</h3>
            <div style="display: flex; justify-content: space-around; text-align: center; color: #2ecc71;">
              <div>
                <div style="color: #666; font-size: 14px; margin-bottom: 5px;">Current</div>
                <div style="font-size: 24px; font-weight: bold;">${vix.value}</div>
              </div>
              <div>
                <div style="color: #666; font-size: 14px; margin-bottom: 5px;">Trend</div>
                <div style="font-size: 18px; font-weight: bold;">${vix.trend || 'N/A'}</div>
              </div>
            </div>
            <p style="text-align: center; margin: 5px 0; font-style: italic; font-size: 13px;">${vix.analysis || 'N/A'}</p>
          </div>`;
      }
      
      html += `</div>`;
      
      // Add upcoming events if available
      if (indicators.upcomingEvents && indicators.upcomingEvents.length > 0) {
        html += `
        <div class="section">
          <h2 class="section-title">Upcoming Economic Events</h2>
          <div style="margin-top: 10px; border-left: 3px solid #3498db;">`;
          
        indicators.upcomingEvents.forEach(event => {
          // Format the date as "Ddd Mmm d, YYYY" with space before the event name
          const eventDate = event.date.replace(':', ' ');
          html += `<div style="padding: 8px 0 8px 15px; border-bottom: 1px solid #eee;">
            <span style="color: #3498db; font-weight: bold;">${eventDate}</span> |&nbsp;${event.event}
            ${event.importance ? `<span style="display: inline-block; margin-left: 5px; padding: 2px 6px; background-color: ${
              event.importance.includes('High') ? '#e74c3c' : 
              event.importance.includes('Medium') ? '#f39c12' : '#2ecc71'
            }; color: white; border-radius: 3px; font-size: 11px;">${event.importance}</span>` : ''}
          </div>`;
        });
        
        html += `</div>
        </div>`;
      }
      
      html += `
        <div style="margin-top: 8px; font-size: 11px; color: #9e9e9e; text-align: right;">
          Source: <a href="${indicators.sourceUrl || "#"}" style="color: #607d8b; text-decoration: none;">${indicators.source || "Analysis"}</a>
           | 
          Last updated: ${indicators.lastUpdated || 'N/A'}
        </div>
      </div>`;
    }
    
    // Add Fundamental Metrics section if available
    if (analysisResult.analysis && analysisResult.analysis.fundamentalMetrics && analysisResult.analysis.fundamentalMetrics.length > 0) {
      const metrics = analysisResult.analysis.fundamentalMetrics;
      html += `
      <div class="section">
        <h2 class="section-title">Fundamental Metrics</h2>
        
        <div style="display: flex; flex-wrap: wrap; gap: 12px; margin-top: 10px; justify-content: space-between;">`;
        
      // Display each stock in a card layout, two per row
      metrics.forEach(stock => {
        html += `
            <div style="flex: 1 1 48%; max-width: 48%; padding: 15px; background-color: #ffffff; border-radius: 6px; box-shadow: 0 2px 6px rgba(0,0,0,0.1); border-top: 3px solid #673ab7;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                <div style="font-weight: bold; font-size: 18px; color: #673ab7;">${stock.symbol}</div>
                <div style="font-size: 12px; color: #9e9e9e; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 170px;">${stock.name}</div>
              </div>
              
              <!-- Price and Change Information -->
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; padding: 8px; background-color: #f5f5f5; border-radius: 4px;">
                <div>
                  <div style="font-size: 18px; font-weight: bold;">${stock.price.replace('$', '')}</div>
                  <div style="color: ${stock.priceChange && stock.priceChange.includes('+') ? '#4caf50' : '#f44336'}; font-weight: bold; font-size: 14px;">
                      ${stock.priceChange && stock.priceChange.includes('+') ? '▲' : '▼'} ${stock.priceChange} (0%)
                    </div>
                </div>
                <div style="text-align: right;">
                  <div style="font-size: 12px; color: #757575;">Volume</div>
                  <div style="font-weight: bold; font-size: 14px;">N/A</div>
                </div>
              </div>
              
              <!-- Key Metrics -->
              <div style="margin-bottom: 12px;">
                <div style="font-weight: bold; font-size: 14px; margin-bottom: 6px; color: #424242;">Key Metrics</div>
                <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px;">
                  
                  ${stock.marketCap ? `
                  <div style="padding: 5px 8px; background-color: #f5f5f5; border-radius: 4px;">
                      <div style="font-size: 11px; color: #757575;">Market Cap</div>
                      <div style="font-size: 12px; font-weight: bold;">$${stock.marketCap}</div>
                    </div>
                    ` : ''}
                  
                </div>
              </div>
              
              <!-- Analyst Comment -->
              <div style="margin-top: 10px; padding: 8px; background-color: #f9f9f9; border-radius: 4px; border-left: 3px solid #673ab7;">
                  <div style="font-style: italic; font-size: 12px; color: #424242; line-height: 1.4;">${stock.comment || 'No analysis available'}</div>
                </div>
              
              <!-- Source and Timestamp -->
              <div style="margin-top: 8px; font-size: 11px; color: #9e9e9e; text-align: right;">
                  Source: <a href="${stock.sourceUrl || "#"}" style="color: #673ab7; text-decoration: none;">${stock.source || "Analysis"}</a>
                   | 
                  Last updated: ${stock.lastUpdated || 'N/A'}
                </div>
            </div>
          `;
      });
      
      html += `
        </div>
        
        <div style="margin-top: 8px; font-size: 11px; color: #9e9e9e; text-align: right;">
          Source: <a href="${metrics[0].sourceUrl || "#"}" style="color: #607d8b; text-decoration: none;">${metrics[0].source || "Analysis"}</a>
           | 
          Last updated: ${metrics[0].lastUpdated || 'N/A'}
        </div>
      </div>`;
    }
    
    // Add Macroeconomic Factors section if available
    if (analysisResult.analysis && analysisResult.analysis.macroeconomicFactors) {
      const macro = analysisResult.analysis.macroeconomicFactors;
      html += `
      <div class="section">
        <h2 class="section-title">Macroeconomic Factors</h2>`;
        
      // Add Treasury Yields if available
      if (macro.treasuryYields) {
        const yields = macro.treasuryYields;
        html += `
        <div style="margin-top: 15px;">
          <h3 style="font-size: 16px; color: #34495e;">Treasury Yields</h3>
          
          <div style="display: flex; flex-wrap: wrap; gap: 10px; margin-top: 10px;">`;
          
        // Add yield values
        if (yields.threeMonth) {
          html += `
            <div style="flex: 1; min-width: 100px; text-align: center; padding: 10px; background-color: #f8f9fa; border-radius: 5px;">
              <div style="font-size: 12px; color: #7f8c8d;">3-Month</div>
              <div style="font-size: 18px; font-weight: bold;">${yields.threeMonth}%</div>
            </div>`;
        }
        
        if (yields.oneYear) {
          html += `
            <div style="flex: 1; min-width: 100px; text-align: center; padding: 10px; background-color: #f8f9fa; border-radius: 5px;">
              <div style="font-size: 12px; color: #7f8c8d;">1-Year</div>
              <div style="font-size: 18px; font-weight: bold;">${yields.oneYear}%</div>
            </div>`;
        }
        
        if (yields.twoYear) {
          html += `
            <div style="flex: 1; min-width: 100px; text-align: center; padding: 10px; background-color: #f8f9fa; border-radius: 5px;">
              <div style="font-size: 12px; color: #7f8c8d;">2-Year</div>
              <div style="font-size: 18px; font-weight: bold;">${yields.twoYear}%</div>
            </div>`;
        }
        
        if (yields.tenYear) {
          html += `
            <div style="flex: 1; min-width: 100px; text-align: center; padding: 10px; background-color: #f8f9fa; border-radius: 5px;">
              <div style="font-size: 12px; color: #7f8c8d;">10-Year</div>
              <div style="font-size: 18px; font-weight: bold;">${yields.tenYear}%</div>
            </div>`;
        }
        
        if (yields.thirtyYear) {
          html += `
            <div style="flex: 1; min-width: 100px; text-align: center; padding: 10px; background-color: #f8f9fa; border-radius: 5px;">
              <div style="font-size: 12px; color: #7f8c8d;">30-Year</div>
              <div style="font-size: 18px; font-weight: bold;">${yields.thirtyYear}%</div>
            </div>`;
        }
        
        html += `
          </div>
          
          <p style="margin-top: 10px;"><strong>Yield Curve:</strong> ${yields.yieldCurve || 'N/A'}</p>
          <p style="margin-top: 5px;"><strong>Implications:</strong> ${yields.implications || 'N/A'}</p>
        </div>`;
      }
      
      // Add Fed Policy if available
      if (macro.fedPolicy) {
        const fed = macro.fedPolicy;
        html += `
        <div style="margin-top: 20px;">
          <h3 style="font-size: 16px; color: #34495e;">Federal Reserve Policy</h3>
          <p style="margin-top: 10px;"><strong>Federal Funds Rate:</strong> ${fed.federalFundsRate}%</p>
          <p style="margin-top: 5px;"><strong>Forward Guidance:</strong> ${fed.forwardGuidance || 'N/A'}</p>
        </div>`;
      }
      
      // Add Inflation if available
      if (macro.inflation) {
        const inflation = macro.inflation;
        
        html += `
        <div style="margin-top: 20px;">
          <h3 style="font-size: 16px; color: #34495e;">Inflation Metrics</h3>
          
          <div style="display: flex; flex-wrap: wrap; gap: 15px;">
            <!-- CPI Section -->
            <div style="flex: 1; min-width: 250px; background-color: #ffffff; border-radius: 4px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); padding: 15px;">
              <h3 style="font-size: 16px; color: #34495e; margin-top: 0; margin-bottom: 15px; text-align: center;">CPI</h3>
              <div style="display: flex; justify-content: space-around; text-align: center;">
                <!-- CPI Headline -->
                <div style="flex: 1;">
                  <div style="font-size: 14px; color: #7f8c8d; margin-bottom: 5px;">CPI Headline</div>
                  <div style="font-size: 24px; font-weight: bold; color: #e67e22;">${inflation.cpi?.headline || 'N/A'}%</div>
                </div>
                <!-- CPI Core -->
                <div style="flex: 1;">
                  <div style="font-size: 14px; color: #7f8c8d; margin-bottom: 5px;">CPI Core</div>
                  <div style="font-size: 24px; font-weight: bold; color: #e67e22;">${inflation.cpi?.core || 'N/A'}%</div>
                </div>
              </div>
            </div>
            
            <!-- PCE Section -->
            <div style="flex: 1; min-width: 250px; background-color: #ffffff; border-radius: 4px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); padding: 15px;">
              <h3 style="font-size: 16px; color: #34495e; margin-top: 0; margin-bottom: 15px; text-align: center;">PCE</h3>
              <div style="display: flex; justify-content: space-around; text-align: center;">
                <!-- PCE Headline -->
                <div style="flex: 1;">
                  <div style="font-size: 14px; color: #7f8c8d; margin-bottom: 5px;">PCE Headline</div>
                  <div style="font-size: 24px; font-weight: bold; color: #e67e22;">${inflation.pce?.headline || 'N/A'}%</div>
                </div>
                <!-- PCE Core -->
                <div style="flex: 1;">
                  <div style="font-size: 14px; color: #7f8c8d; margin-bottom: 5px;">PCE Core</div>
                  <div style="font-size: 24px; font-weight: bold; color: #e67e22;">${inflation.pce?.core || 'N/A'}%</div>
                </div>
              </div>
            </div>
          </div>
          ${inflation.trend ? `
          <div style="margin-top: 15px; padding: 15px; background-color: #e8f5e9; border-radius: 5px; border-left: 4px solid #4caf50;">
              <div style="font-weight: bold; color: #2e7d32; margin-bottom: 5px;">Inflation Trend Analysis</div>
              <div style="color: #333;">${inflation.trend}</div>
            </div>` : ''}
            
          <div style="display: flex; flex-wrap: wrap; gap: 10px; margin-top: 15px;">
              ${inflation.outlook ? `<div style="flex: 1 1 48%; min-width: 250px; padding: 10px; background-color: #fafafa; border-radius: 4px;">
                  <div style="font-weight: bold; color: #424242;">Outlook</div>
                  <div style="color: #616161;">${inflation.outlook}</div>
                </div>` : ''}
                
              ${inflation.marketImpact ? `<div style="flex: 1 1 48%; min-width: 250px; padding: 10px; background-color: #fafafa; border-radius: 4px;">
                  <div style="font-weight: bold; color: #424242;">Market Impact</div>
                  <div style="color: #616161;">${inflation.marketImpact}</div>
                </div>` : ''}
            </div>
            
          <div style="margin-top: 8px; font-size: 11px; color: #9e9e9e; text-align: right;">
              Source: <a href="${inflation.sourceUrl || "#"}" style="color: #607d8b; text-decoration: none;">${inflation.source || "Bureau of Labor Statistics"}</a>
               | 
              Last updated: ${inflation.lastUpdated || 'N/A'}
            </div>
        </div>`;
      }
      
      // Add Geopolitical Risks if available
      if (macro.geopoliticalRisks) {
        const geopoliticalRisks = macro.geopoliticalRisks;
        html += `
        <div class="section">
          <h2 class="section-title">Geopolitical Risks</h2>
          
          <!-- Global Summary -->
          <div style="border-left: 4px solid #607d8b; padding: 10px 15px; margin-bottom: 15px; background-color: #f5f7f9;">
            <h3 style="font-size: 16px; color: #34495e; margin-top: 0; margin-bottom: 8px;">Global Summary</h3>
            <p style="margin: 0;">${geopoliticalRisks.globalSummary || 'No global summary available.'}</p>
            <div style="margin-top: 8px; font-size: 11px; color: #9e9e9e; text-align: right;">
              Source: ${geopoliticalRisks.source || 'N/A'} | Last updated: ${geopoliticalRisks.lastUpdated || 'N/A'}
            </div>
          </div>`;
        
        // Add regional risks if available
        if (geopoliticalRisks.regionalRisks && geopoliticalRisks.regionalRisks.length > 0) {
          geopoliticalRisks.regionalRisks.forEach(risk => {
            let riskColor = "#FFA500"; // Default orange for moderate
            let riskIcon = "🟠"; // Default orange circle for moderate
            
            if (risk.severity && risk.severity.toLowerCase().includes("severe")) {
              riskColor = "#F44336"; // Red for severe
              riskIcon = "🔴"; // Red circle for severe
            } else if (risk.severity && risk.severity.toLowerCase().includes("high")) {
              riskColor = "#FF5722"; // Deep orange for high
              riskIcon = "🔴"; // Red circle for high
            } else if (risk.severity && risk.severity.toLowerCase().includes("low")) {
              riskColor = "#8BC34A"; // Light green for low
              riskIcon = "🟢"; // Green circle for low
            }
            
            // Remove the word "Impact" from the severity
            const cleanSeverity = (risk.severity || "").replace(/impact/i, '').trim();
            
            html += `
            <div style="border: 1px solid #e0e0e0; border-radius: 4px; padding: 15px; margin-bottom: 15px; background-color: #ffffff;">
              <h3 style="font-size: 16px; color: #34495e; margin-top: 0; margin-bottom: 10px;">${risk.region}</h3>
              <p style="margin: 0; display: flex; align-items: center;">
                <span style="color: ${riskColor}; font-weight: bold; margin-right: 8px;">${riskIcon} ${cleanSeverity}:</span> 
                ${risk.description}
              </p>
            </div>`;
          });
        } else {
          html += `<p>No regional risk information available.</p>`;
        }
        
        html += `</div>`;
      }
      
      html += `
        <div style="margin-top: 8px; font-size: 11px; color: #9e9e9e; text-align: right;">
          Source: <a href="${macro.treasuryYields?.sourceUrl || "#"}" style="color: #607d8b; text-decoration: none;">${macro.treasuryYields?.source || "Analysis"}</a>
           | 
          Last updated: ${macro.treasuryYields?.lastUpdated || 'N/A'}
        </div>
      </div>`;
    }
    
    // Add Upcoming Events section if available
    if (analysisResult.analysis && analysisResult.analysis.upcomingEvents && analysisResult.analysis.upcomingEvents.events) {
      const upcomingEvents = analysisResult.analysis.upcomingEvents;
      html += `
      <div class="section">
        <h2 class="section-title">Upcoming Events:</h2>`;
        
      if (upcomingEvents.events.length > 0) {
        upcomingEvents.events.forEach(event => {
          let borderColor = "#2196F3"; // Default blue
          
          if (event.importance && event.importance.toLowerCase().includes("high")) {
            borderColor = "#F44336"; // Red for high importance
          } else if (event.importance && event.importance.toLowerCase().includes("medium")) {
            borderColor = "#FF9800"; // Orange for medium importance
          } else if (event.importance && event.importance.toLowerCase().includes("low")) {
            borderColor = "#4CAF50"; // Green for low importance
          }
          
          html += `
          <div style="border-left: 4px solid ${borderColor}; padding: 10px 15px; margin-bottom: 10px; background-color: #f5f7f9;">
            <p style="margin: 0; font-size: 15px;">${event.date} | ${event.name} (${event.importance})</p>
          </div>`;
        });
      } else {
        html += `<p>No upcoming events available.</p>`;
      }
      
      html += `
        <div style="margin-top: 8px; font-size: 11px; color: #9e9e9e; text-align: right;">
          Source: ${upcomingEvents.source || 'N/A'} | Last updated: ${upcomingEvents.lastUpdated || 'N/A'}
        </div>
      </div>`;
    }
    
    // Add the next analysis section and footer
    html += `
    <div class="next-analysis">
      <strong>Next analysis scheduled for:</strong><br>
      ${nextScheduledFormatted}
    </div>
    
    <div class="footer" style="background-color: #1a365d; color: #fff; padding: 20px; text-align: center; border-radius: 0 0 8px 8px; margin-top: 25px;">
      <p style="margin: 5px 0; font-size: 14px;">Market Pulse Daily - Professional Trading Insights</p>
      <p style="margin: 5px 0; font-size: 12px;">&copy; ${new Date().getFullYear()} Market Pulse Daily</p>
    </div>
  </div>
</body>
</html>`;
    
    return html;
  } catch (error) {
    Logger.log("Error generating email template: " + error.message);
    // Return a simple fallback template
    return `<html><body>
      <h1>Market Pulse Daily${isTest ? ' (TEST)' : ''}</h1>
      <p>Generated on ${new Date().toLocaleString()}</p>
      <p>Next scheduled analysis: ${nextScheduledTime.toLocaleString()}</p>
      <pre>${JSON.stringify(analysisResult, null, 2)}</pre>
    </body></html>`;
  }
}

/**
 * Returns the CSS styles for the email template
 * @return {String} CSS styles as a string
 */
function getEmailTemplateCSS() {
  return `
    body {
      font-family: 'Segoe UI', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      margin: 0;
      padding: 0;
      background-color: #f5f5f5;
    }
    .container {
      max-width: 650px;
      margin: 0 auto;
      padding: 25px;
      background-color: #ffffff;
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.05);
    }
    .header {
      text-align: center;
      margin-bottom: 25px;
      padding-bottom: 15px;
      border-bottom: 2px solid #f0f0f0;
    }
    .header h1 {
      margin: 0;
      color: #2c3e50;
      font-size: 28px;
    }
    .header p {
      color: #7f8c8d;
      margin: 5px 0 0;
    }
    .decision-box {
      padding: 20px;
      margin: 25px 0;
      border-radius: 8px;
      text-align: center;
      background-color: #FFF8E1;
      border-left: 5px solid #FFA500;
      box-shadow: 0 3px 6px rgba(0,0,0,0.1);
    }
    .decision {
      font-size: 28px;
      font-weight: bold;
      color: #FFA500;
      margin: 5px 0;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .decision-icon {
      font-size: 32px;
      margin-right: 10px;
    }
    .summary {
      font-size: 16px;
      margin: 15px 0 5px;
      font-style: italic;
      color: #555;
      line-height: 1.5;
    }
    .section {
      margin: 25px 0;
      padding: 20px;
      background-color: #fff;
      border-radius: 8px;
      box-shadow: 0 2px 5px rgba(0,0,0,0.08);
      border-top: 3px solid #3498db;
    }
    .section-title {
      font-size: 20px;
      font-weight: bold;
      margin-bottom: 15px;
      padding-bottom: 10px;
      border-bottom: 1px solid #eee;
      color: #2c3e50;
    }
    .footer {
      margin-top: 35px;
      text-align: center;
      font-size: 13px;
      color: #95a5a6;
      padding-top: 15px;
      border-top: 1px solid #eee;
    }
    .next-analysis {
      margin-top: 25px;
      padding: 15px;
      background-color: #f8f9fa;
      border-radius: 8px;
      text-align: center;
      font-size: 15px;
      border-left: 4px solid #3498db;
      color: #34495e;
    }
    .justification {
      line-height: 1.7;
      color: #444;
      white-space: pre-line;
    }
    @media only screen and (max-width: 600px) {
      .container {
        padding: 15px;
        width: 100%;
        box-sizing: border-box;
      }
      .decision {
        font-size: 24px;
      }
      .section {
        padding: 15px;
      }
    }
  `;
}

/**
 * Generates a complete HTML email from a trading analysis JSON object
 * This function can be used for testing without making OpenAI API calls
 * 
 * @param {Object} analysisJson - The trading analysis JSON object
 * @param {Date} nextScheduledTime - The next scheduled analysis time
 * @param {Boolean} isTest - Whether this is a test email
 * @return {String} Complete HTML email as a string
 */
function generateHtmlFromAnalysisJson(analysisJson, nextScheduledTime, isTest = false) {
  // Simply pass the JSON to the existing template generator
  return generateEmailTemplate(analysisJson, nextScheduledTime, isTest);
}

/**
 * Gets the Perplexity API key from script properties if not hardcoded
 * For better security, use PropertiesService instead of hardcoding the API key
 */
function getPerplexityApiKey() {
  try {
    // Try to get the API key from script properties first
    const scriptProperties = PropertiesService.getScriptProperties();
    const apiKey = scriptProperties.getProperty('PERPLEXITY_API_KEY');
    
    // If found in script properties, return it
    if (apiKey) {
      return apiKey;
    }
    
    // Otherwise, return the hardcoded key (not recommended for production)
    return PERPLEXITY_API_KEY;
  } catch (error) {
    Logger.log("Error getting API key: " + error.message);
    return PERPLEXITY_API_KEY;
  }
}

/**
 * Gets the Alpha Vantage API key from script properties if not hardcoded
 * For better security, use PropertiesService instead of hardcoding the API key
 * 
 * @return {String} - Alpha Vantage API key
 */
function getAlphaVantageApiKey() {
  try {
    // Try to get the API key from script properties first
    const scriptProperties = PropertiesService.getScriptProperties();
    const apiKey = scriptProperties.getProperty('ALPHA_VANTAGE_API_KEY');
    
    // If found in script properties, return it
    if (apiKey) {
      return apiKey;
    }
    
    // Otherwise, return the hardcoded key (not recommended for production)
    return ALPHA_VANTAGE_API_KEY;
  } catch (error) {
    Logger.log("Error getting Alpha Vantage API key: " + error.message);
    return ALPHA_VANTAGE_API_KEY;
  }
}

/**
 * Gets the OpenAI API key from script properties
 * 
 * @return {String} - OpenAI API key
 */
function getOpenAIApiKey() {
  try {
    const scriptProperties = PropertiesService.getScriptProperties();
    return scriptProperties.getProperty('OPENAI_API_KEY');
  } catch (error) {
    Logger.log("Error getting OpenAI API key: " + error.message);
    return null;
  }
}

/**
 * Gets the Yahoo Finance API key from script properties
 * 
 * @return {String} - Yahoo Finance API key
 */
function getYahooFinanceApiKey() {
  try {
    const scriptProperties = PropertiesService.getScriptProperties();
    return scriptProperties.getProperty('YAHOO_FINANCE_API_KEY');
  } catch (error) {
    Logger.log("Error getting Yahoo Finance API key: " + error.message);
    return null;
  }
}

/**
 * Gets the BLS API key from script properties
 * 
 * @return {String} - BLS API key
 */
function getBLSApiKey() {
  try {
    const scriptProperties = PropertiesService.getScriptProperties();
    return scriptProperties.getProperty('BLS_API_KEY');
  } catch (error) {
    Logger.log("Error getting BLS API key: " + error.message);
    return null;
  }
}

/**
 * Gets the BEA API key from script properties
 * 
 * @return {String} - BEA API key
 */
function getBEAApiKey() {
  try {
    const scriptProperties = PropertiesService.getScriptProperties();
    return scriptProperties.getProperty('BEA_API_KEY');
  } catch (error) {
    Logger.log("Error getting BEA API key: " + error.message);
    return null;
  }
}

/**
 * Gets the FRED API key from script properties
 * 
 * @return {String} - FRED API key
 */
function getFREDApiKey() {
  try {
    const scriptProperties = PropertiesService.getScriptProperties();
    return scriptProperties.getProperty('FRED_API_KEY');
  } catch (error) {
    Logger.log("Error getting FRED API key: " + error.message);
    return null;
  }
}

/**
 * Gets the email recipients from script properties if not hardcoded
 * 
 * @return {Array} - Array of email addresses
 */
function getEmailRecipients() {
  try {
    // Try to get the recipients from script properties first
    const scriptProperties = PropertiesService.getScriptProperties();
    const recipientsProperty = scriptProperties.getProperty('EMAIL_RECIPIENTS');
    
    // If found in script properties, parse the comma-separated string into an array
    if (recipientsProperty) {
      return recipientsProperty.split(',').map(email => email.trim());
    }
    
    // Otherwise, return the hardcoded array (not recommended for production)
    return RECIPIENT_EMAILS;
  } catch (error) {
    Logger.log("Error getting email recipients: " + error.message);
    return RECIPIENT_EMAILS;
  }
}

/**
 * Tests all API keys and their functionality
 * Run this function to verify that all API keys are properly set up and working
 */
function testAllAPIKeys() {
  const scriptProperties = PropertiesService.getScriptProperties();
  const results = {
    apiKeys: {},
    testResults: {}
  };
  
  // List of all API keys used in the application
  const apiKeys = [
    "PERPLEXITY_API_KEY",
    "OPENAI_API_KEY",
    "ALPHA_VANTAGE_API_KEY",
    "BLS_API_KEY",
    "BEA_API_KEY",
    "FRED_API_KEY",
    "YAHOO_FINANCE_API_KEY"
  ];
  
  // Check if each API key is set
  Logger.log("=== API KEYS STATUS ===");
  apiKeys.forEach(key => {
    const value = scriptProperties.getProperty(key);
    const status = value ? " Found" : " Not found";
    results.apiKeys[key] = !!value;
    Logger.log(`${key}: ${status}`);
  });
  
  // Test Perplexity API
  Logger.log("\n=== TESTING PERPLEXITY API ===");
  try {
    const perplexityKey = scriptProperties.getProperty("PERPLEXITY_API_KEY");
    if (perplexityKey) {
      const testResult = testPerplexityAPI(perplexityKey);
      results.testResults.perplexity = testResult;
      Logger.log(`Perplexity API: ${testResult.success ? " Working" : " Failed"}`);
      if (!testResult.success) {
        Logger.log(`Error: ${testResult.error}`);
      }
    } else {
      Logger.log("Perplexity API:  Key not found");
      results.testResults.perplexity = { success: false, error: "API key not found" };
    }
  } catch (error) {
    Logger.log(`Perplexity API:  Error - ${error}`);
    results.testResults.perplexity = { success: false, error: error.toString() };
  }
  
  // Test OpenAI API
  Logger.log("\n=== TESTING OPENAI API ===");
  try {
    const openaiKey = scriptProperties.getProperty("OPENAI_API_KEY");
    if (openaiKey) {
      const testResult = testOpenAIAPI(openaiKey);
      results.testResults.openai = testResult;
      Logger.log(`OpenAI API: ${testResult.success ? " Working" : " Failed"}`);
      if (!testResult.success) {
        Logger.log(`Error: ${testResult.error}`);
      }
    } else {
      Logger.log("OpenAI API:  Key not found");
      results.testResults.openai = { success: false, error: "API key not found" };
    }
  } catch (error) {
    Logger.log(`OpenAI API:  Error - ${error}`);
    results.testResults.openai = { success: false, error: error.toString() };
  }
  
  // Test Alpha Vantage API
  Logger.log("\n=== TESTING ALPHA VANTAGE API ===");
  try {
    const alphaVantageKey = scriptProperties.getProperty("ALPHA_VANTAGE_API_KEY");
    if (alphaVantageKey) {
      const testResult = testAlphaVantageAPI(alphaVantageKey);
      results.testResults.alphaVantage = testResult;
      Logger.log(`Alpha Vantage API: ${testResult.success ? " Working" : " Failed"}`);
      if (!testResult.success) {
        Logger.log(`Error: ${testResult.error}`);
      }
    } else {
      Logger.log("Alpha Vantage API:  Key not found");
      results.testResults.alphaVantage = { success: false, error: "API key not found" };
    }
  } catch (error) {
    Logger.log(`Alpha Vantage API:  Error - ${error}`);
    results.testResults.alphaVantage = { success: false, error: error.toString() };
  }
  
  // Test Yahoo Finance API
  Logger.log("\n=== TESTING YAHOO FINANCE API ===");
  try {
    const yahooFinanceKey = scriptProperties.getProperty("YAHOO_FINANCE_API_KEY");
    if (yahooFinanceKey) {
      const testResult = testYahooFinanceAPI(yahooFinanceKey);
      results.testResults.yahooFinance = testResult;
      Logger.log(`Yahoo Finance API: ${testResult.success ? " Working" : " Failed"}`);
      if (!testResult.success) {
        Logger.log(`Error: ${testResult.error}`);
      }
    } else {
      Logger.log("Yahoo Finance API:  Key not found");
      results.testResults.yahooFinance = { success: false, error: "API key not found" };
    }
  } catch (error) {
    Logger.log(`Yahoo Finance API:  Error - ${error}`);
    results.testResults.yahooFinance = { success: false, error: error.toString() };
  }
  
  // Test BLS API
  Logger.log("\n=== TESTING BLS API ===");
  try {
    const blsKey = scriptProperties.getProperty("BLS_API_KEY");
    if (blsKey) {
      const testResult = testBLSAPI(blsKey);
      results.testResults.bls = testResult;
      Logger.log(`BLS API: ${testResult.success ? " Working" : " Failed"}`);
      if (!testResult.success) {
        Logger.log(`Error: ${testResult.error}`);
      }
    } else {
      Logger.log("BLS API:  Key not found");
      results.testResults.bls = { success: false, error: "API key not found" };
    }
  } catch (error) {
    Logger.log(`BLS API:  Error - ${error}`);
    results.testResults.bls = { success: false, error: error.toString() };
  }
  
  // Test BEA API
  Logger.log("\n=== TESTING BEA API ===");
  try {
    const beaKey = scriptProperties.getProperty("BEA_API_KEY");
    if (beaKey) {
      const testResult = testBEAAPI(beaKey);
      results.testResults.bea = testResult;
      Logger.log(`BEA API: ${testResult.success ? " Working" : " Failed"}`);
      if (!testResult.success) {
        Logger.log(`Error: ${testResult.error}`);
      }
    } else {
      Logger.log("BEA API:  Key not found");
      results.testResults.bea = { success: false, error: "API key not found" };
    }
  } catch (error) {
    Logger.log(`BEA API:  Error - ${error}`);
    results.testResults.bea = { success: false, error: error.toString() };
  }
  
  // Test FRED API
  Logger.log("\n=== TESTING FRED API ===");
  try {
    const fredKey = scriptProperties.getProperty("FRED_API_KEY");
    if (fredKey) {
      const testResult = testFREDAPI(fredKey);
      results.testResults.fred = testResult;
      Logger.log(`FRED API: ${testResult.success ? " Working" : " Failed"}`);
      if (!testResult.success) {
        Logger.log(`Error: ${testResult.error}`);
      }
    } else {
      Logger.log("FRED API:  Key not found");
      results.testResults.fred = { success: false, error: "API key not found" };
    }
  } catch (error) {
    Logger.log(`FRED API:  Error - ${error}`);
    results.testResults.fred = { success: false, error: error.toString() };
  }
  
  // Summary
  Logger.log("\n=== SUMMARY ===");
  let workingCount = 0;
  let totalTestedCount = 0;
  
  for (const key in results.testResults) {
    if (results.testResults[key].success) {
      workingCount++;
    }
    totalTestedCount++;
  }
  
  Logger.log(`${workingCount} out of ${totalTestedCount} APIs are working properly.`);
  
  return results;
}

/**
 * Tests the Perplexity API with a simple query
 * @param {string} apiKey - The Perplexity API key
 * @return {Object} Test result with success status and error message if applicable
 */
function testPerplexityAPI(apiKey) {
  try {
    const apiUrl = "https://api.perplexity.ai/chat/completions";
    
    const requestData = {
      model: "sonar-small-chat",
      messages: [
        {
          role: "system",
          content: "You are a helpful assistant."
        },
        {
          role: "user",
          content: "Hello, this is a test query. Please respond with 'API test successful'."
        }
      ],
      temperature: 0.1,
      max_tokens: 20
    };
    
    const options = {
      method: "post",
      contentType: "application/json",
      headers: {
        "Authorization": `Bearer ${apiKey}`
      },
      payload: JSON.stringify(requestData),
      muteHttpExceptions: true
    };
    
    const response = UrlFetchApp.fetch(apiUrl, options);
    const responseCode = response.getResponseCode();
    
    if (responseCode === 200) {
      return { success: true };
    } else {
      const responseText = response.getContentText();
      return { success: false, error: `API returned status code ${responseCode}: ${responseText}` };
    }
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

/**
 * Tests the OpenAI API with a simple query
 * @param {string} apiKey - The OpenAI API key
 * @return {Object} Test result with success status and error message if applicable
 */
function testOpenAIAPI(apiKey) {
  try {
    const apiUrl = "https://api.openai.com/v1/chat/completions";
    
    const requestData = {
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are a helpful assistant."
        },
        {
          role: "user",
          content: "Hello, this is a test query. Please respond with 'API test successful'."
        }
      ],
      temperature: 0.1,
      max_tokens: 20
    };
    
    const options = {
      method: "post",
      contentType: "application/json",
      headers: {
        "Authorization": `Bearer ${apiKey}`
      },
      payload: JSON.stringify(requestData),
      muteHttpExceptions: true
    };
    
    const response = UrlFetchApp.fetch(apiUrl, options);
    const responseCode = response.getResponseCode();
    
    if (responseCode === 200) {
      return { success: true };
    } else {
      const responseText = response.getContentText();
      return { success: false, error: `API returned status code ${responseCode}: ${responseText}` };
    }
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

/**
 * Tests the Alpha Vantage API with a simple query
 * @param {string} apiKey - The Alpha Vantage API key
 * @return {Object} Test result with success status and error message if applicable
 */
function testAlphaVantageAPI(apiKey) {
  try {
    // Alpha Vantage API endpoint for a simple query (company overview for AAPL)
    const apiUrl = `https://www.alphavantage.co/query?function=OVERVIEW&symbol=AAPL&apikey=${apiKey}`;
    
    const options = {
      method: "get",
      muteHttpExceptions: true
    };
    
    const response = UrlFetchApp.fetch(apiUrl, options);
    const responseCode = response.getResponseCode();
    
    if (responseCode === 200) {
      const responseData = JSON.parse(response.getContentText());
      
      // Check if the response contains an error message about API key
      if (responseData.hasOwnProperty("Error Message") && responseData["Error Message"].includes("apikey")) {
        return { success: false, error: responseData["Error Message"] };
      }
      
      // Check if the response contains the expected data
      if (responseData.hasOwnProperty("Symbol") && responseData["Symbol"] === "AAPL") {
        return { success: true };
      } else {
        return { success: false, error: "API response did not contain expected data" };
      }
    } else {
      const responseText = response.getContentText();
      return { success: false, error: `API returned status code ${responseCode}: ${responseText}` };
    }
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

/**
 * Tests the Yahoo Finance API with a simple query
 * @param {string} apiKey - Optional Yahoo Finance API key (if not provided, will use the stored key)
 * @return {Object} Test result with success status and error message if applicable
 */
function testYahooFinanceAPI(apiKey) {
  try {
    // Use the provided API key or get it from script properties
    const apiKeyToUse = apiKey || getYahooFinanceApiKey();
    
    if (!apiKeyToUse) {
      return { success: false, error: "No API key provided or found in script properties" };
    }
    
    // Yahoo Finance API endpoint for a simple query (quote for AAPL)
    const apiUrl = "https://apidojo-yahoo-finance-v1.p.rapidapi.com/market/v2/get-quotes?region=US&symbols=AAPL";
    
    const options = {
      method: "get",
      headers: {
        "X-RapidAPI-Key": apiKeyToUse,
        "X-RapidAPI-Host": "apidojo-yahoo-finance-v1.p.rapidapi.com"
      },
      muteHttpExceptions: true
    };
    
    const response = UrlFetchApp.fetch(apiUrl, options);
    const responseCode = response.getResponseCode();
    
    if (responseCode === 200) {
      const responseData = JSON.parse(response.getContentText());
      
      // Check if the response contains the expected data
      if (responseData.quoteResponse && 
          responseData.quoteResponse.result && 
          responseData.quoteResponse.result.length > 0 &&
          responseData.quoteResponse.result[0].symbol === "AAPL") {
        return { success: true };
      } else {
        return { success: false, error: "API response did not contain expected data" };
      }
    } else {
      const responseText = response.getContentText();
      return { success: false, error: `API returned status code ${responseCode}: ${responseText}` };
    }
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

/**
 * Tests the BLS API with a simple query
 * @param {string} apiKey - The BLS API key
 * @return {Object} Test result with success status and error message if applicable
 */
function testBLSAPI(apiKey) {
  try {
    // BLS API endpoint
    const apiUrl = "https://api.bls.gov/publicAPI/v2/timeseries/data/";
    
    // Request parameters for CPI data
    const requestData = {
      "seriesid": ["CUUR0000SA0"],
      "startyear": new Date().getFullYear() - 1,
      "endyear": new Date().getFullYear(),
      "registrationkey": apiKey
    };
    
    const options = {
      method: "post",
      contentType: "application/json",
      payload: JSON.stringify(requestData),
      muteHttpExceptions: true
    };
    
    const response = UrlFetchApp.fetch(apiUrl, options);
    const responseCode = response.getResponseCode();
    
    if (responseCode === 200) {
      const responseData = JSON.parse(response.getContentText());
      
      // Check if the response contains a success status
      if (responseData.status === "REQUEST_SUCCEEDED") {
        return { success: true };
      } else {
        return { success: false, error: responseData.message || "Unknown error" };
      }
    } else {
      const responseText = response.getContentText();
      return { success: false, error: `API returned status code ${responseCode}: ${responseText}` };
    }
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

/**
 * Tests the BEA API with a simple query
 * @param {string} apiKey - The BEA API key
 * @return {Object} Test result with success status and error message if applicable
 */
function testBEAAPI(apiKey) {
  try {
    // BEA API endpoint
    const apiUrl = "https://apps.bea.gov/api/data";
    
    // Request parameters for GDP data
    const params = {
      "UserID": apiKey,
      "method": "GetData",
      "datasetname": "NIPA",
      "TableName": "T20804",
      "Frequency": "Q",
      "Year": new Date().getFullYear() - 1,
      "Quarter": "Q1,Q2,Q3,Q4",
      "ResultFormat": "JSON"
    };
    
    // Construct the URL with query parameters
    const queryString = Object.keys(params)
      .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
      .join("&");
    
    const fullUrl = `${apiUrl}?${queryString}`;
    
    const options = {
      method: "get",
      muteHttpExceptions: true
    };
    
    const response = UrlFetchApp.fetch(fullUrl, options);
    const responseCode = response.getResponseCode();
    
    if (responseCode === 200) {
      const responseData = JSON.parse(response.getContentText());
      
      // Check if the response contains a success status
      if (responseData.BEAAPI.Results) {
        return { success: true };
      } else if (responseData.BEAAPI.Error) {
        return { success: false, error: responseData.BEAAPI.Error.ErrorDetail.Description };
      } else {
        return { success: false, error: "Unknown error in BEA API response" };
      }
    } else {
      const responseText = response.getContentText();
      return { success: false, error: `API returned status code ${responseCode}: ${responseText}` };
    }
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

/**
 * Tests the FRED API with a simple query
 * @param {string} apiKey - The FRED API key
 * @return {Object} Test result with success status and error message if applicable
 */
function testFREDAPI(apiKey) {
  try {
    // FRED API endpoint for GDP data
    const apiUrl = `https://api.stlouisfed.org/fred/series/observations?series_id=GDP&api_key=${apiKey}&file_type=json&limit=1`;
    
    const options = {
      method: "get",
      muteHttpExceptions: true
    };
    
    const response = UrlFetchApp.fetch(apiUrl, options);
    const responseCode = response.getResponseCode();
    
    if (responseCode === 200) {
      const responseData = JSON.parse(response.getContentText());
      
      // Check if the response contains the expected data
      if (responseData.observations && responseData.observations.length > 0) {
        return { success: true };
      } else {
        return { success: false, error: "API response did not contain expected data" };
      }
    } else {
      const responseText = response.getContentText();
      return { success: false, error: `API returned status code ${responseCode}: ${responseText}` };
    }
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}
