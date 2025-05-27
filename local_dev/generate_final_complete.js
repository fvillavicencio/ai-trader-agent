/**
 * Script to generate HTML email with the final complete template style using the latest JSON data
 */

const fs = require('fs');
const path = require('path');
const sections = require('./updated_sections');
const { generateMarketSentimentSection } = require('./updated_market_sentiment');
const { generateTreasuryYieldsSection } = require('./updated_treasury_yields');
const { generateInflationSection, generateNextAnalysisSection } = require('./updated_inflation_next_analysis');

/**
 * Calculate the next scheduled analysis time
 * @param {Date} currentTime - Current time
 * @returns {Date} Next scheduled analysis time
 */
function getNextScheduledTime(currentTime) {
  // Clone the current time to avoid modifying it
  const nextTime = new Date(currentTime);
  
  // Set to 8:50 AM for morning analysis
  nextTime.setHours(8);
  nextTime.setMinutes(50);
  nextTime.setSeconds(0);
  nextTime.setMilliseconds(0);
  
  // If current time is past 8:50 AM, schedule for tomorrow
  if (currentTime.getHours() >= 8 && currentTime.getMinutes() >= 50) {
    nextTime.setDate(nextTime.getDate() + 1);
  }
  
  return nextTime;
}

/**
 * Generate the complete HTML email
 * @param {Object} analysis - Analysis data
 * @param {Date} analysisTime - Analysis time
 * @param {Date} nextAnalysisTime - Next analysis time
 * @returns {String} Complete HTML email
 */
function generateCompleteHtml(analysis, analysisTime, nextAnalysisTime) {
  // Format dates
  const formattedAnalysisTime = new Date(analysisTime).toLocaleString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short'
  });
  
  // Generate header
  const headerHtml = `
    <div style="text-align: center; margin-bottom: 25px;">
      <h1 style="margin: 0; color: #2c3e50; font-size: 28px;">Market Pulse Daily</h1>
      <p style="color: #7f8c8d; margin: 5px 0 0;">Generated on ${formattedAnalysisTime}</p>
    </div>
  `;
  
  // Generate decision section
  const decisionHtml = `
    <div style="padding: 20px; margin: 25px 0; border-radius: 8px; text-align: center; background-color: #FFF8E1; border-left: 5px solid #FFA500; box-shadow: 0 3px 6px rgba(0,0,0,0.1);">
      <div style="font-size: 28px; font-weight: bold; color: #FF8C00; margin: 0 0 10px;">
        <span style="margin-right: 10px;">⚠️</span>${analysis.decision}
      </div>
      <p style="font-size: 16px; color: #555; margin: 0;">${analysis.summary}</p>
    </div>
  `;
  
  // Generate sections
  const marketSentimentHtml = generateMarketSentimentSection(analysis);
  const marketIndicatorsHtml = generateMarketIndicatorsSection(analysis);
  const fundamentalMetricsHtml = sections.generateFundamentalMetricsSection(analysis);
  const macroeconomicFactorsHtml = generateMacroeconomicFactorsSection(analysis);
  const justificationHtml = sections.generateJustificationSection(analysis);
  const geopoliticalRisksHtml = generateGeopoliticalRisksSection(analysis);
  const nextAnalysisHtml = generateNextAnalysisSection(nextAnalysisTime);
  
  // Generate footer
  const year = new Date().getFullYear();
  const footerHtml = `
    <div style="margin-top: 40px; padding: 15px; text-align: center; background-color: #1a365d; color: #fff; border-radius: 6px;">
      <p style="margin: 5px 0; font-size: 14px;">Market Pulse Daily - Professional Trading Insights</p>
      <p style="margin: 5px 0; font-size: 12px;">&copy; ${year} Market Pulse Daily. All rights reserved.</p>
      <p style="margin: 5px 0; font-size: 11px;">Delivering data-driven market analysis to help you make informed trading decisions.</p>
    </div>
  `;
  
  // Combine all sections into complete HTML
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Market Pulse Daily</title>
  <link rel="icon" href="favicon.ico" type="image/x-icon">
  <style>
    body {
      font-family: 'Segoe UI', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      margin: 0;
      padding: 0;
      background-color: #f5f5f5;
      display: flex;
      justify-content: center;
      align-items: flex-start;
      min-height: 100vh;
    }
    .container {
      width: 600px;
      max-width: 600px;
      margin: 20px auto;
      padding: 25px;
      background-color: #ffffff;
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.05);
      overflow: hidden;
      box-sizing: border-box;
    }
    .section {
      width: 100%;
      max-width: 100%;
      overflow: hidden;
      margin: 0 auto 20px auto;
      box-sizing: border-box;
    }
    h2 {
      text-align: center;
      margin-top: 0;
      margin-bottom: 15px;
    }
    .stock-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 15px;
      margin-bottom: 15px;
      max-width: 100%;
      overflow: hidden;
    }
    .stock-card {
      min-width: 0;
      max-width: 100%;
    }
  </style>
</head>
<body>
  <div class="container">
    ${headerHtml}
    ${decisionHtml}
    ${justificationHtml}
    ${marketSentimentHtml}
    ${marketIndicatorsHtml}
    ${fundamentalMetricsHtml}
    ${macroeconomicFactorsHtml}
    ${geopoliticalRisksHtml}
    ${nextAnalysisHtml}
    ${footerHtml}
  </div>
</body>
</html>
  `;
}

/**
 * Generate the macroeconomic factors section
 * @param {Object} analysis - Analysis data
 * @returns {String} Macroeconomic factors section HTML
 */
function generateMacroeconomicFactorsSection(analysis) {
  const macro = analysis.analysis.macroeconomicFactors || {};
  
  // Generate treasury yields HTML using the updated function
  const treasuryYieldsHtml = generateTreasuryYieldsSection(macro.treasuryYields || {});
  
  // Generate inflation HTML using the updated function
  const inflationHtml = generateInflationSection(macro.inflation || {});
  
  // Generate geopolitical risks HTML
  const geopoliticalHtml = generateGeopoliticalRisksSection(macro.geopoliticalRisks || {});
  
  // Generate source information
  const sourceInfo = macro.source 
    ? `<div style="font-size: 12px; color: #888; margin-top: 10px; text-align: right;">
         Source: ${macro.source} | Last Updated: ${macro.lastUpdated || 'N/A'}
       </div>`
    : '';
  
  return `
  <div class="section" style="background-color: white; border-radius: 8px; padding: 15px; margin-bottom: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
    <h2 style="color: #333; border-bottom: 1px solid #eee; padding-bottom: 10px; margin-top: 0; text-align: center;">Macroeconomic Factors</h2>
    ${treasuryYieldsHtml}
    ${inflationHtml}
    ${geopoliticalHtml}
    ${sourceInfo}
  </div>
  `;
}

/**
 * Generate the geopolitical risks section
 * @param {Object} geopoliticalRisks - Geopolitical risks data
 * @returns {String} Geopolitical risks section HTML
 */
function generateGeopoliticalRisksSection(geopoliticalRisks) {
  if (!geopoliticalRisks.global && (!geopoliticalRisks.regions || geopoliticalRisks.regions.length === 0)) {
    return '';
  }
  
  // Generate global overview
  const globalOverview = geopoliticalRisks.global 
    ? `<div style="margin-bottom: 15px; padding: 10px; background-color: #f8f9fa; border-radius: 6px; border-left: 4px solid #ff9800;">
        <div style="font-weight: bold; margin-bottom: 5px; color: #ff9800;">Global Overview</div>
        <div style="color: #333;">${geopoliticalRisks.global}</div>
      </div>`
    : '';
  
  // Generate regional risks
  let regionalRisksHtml = '';
  if (geopoliticalRisks.regions && geopoliticalRisks.regions.length > 0) {
    const risksItems = geopoliticalRisks.regions.map(region => {
      const regionName = region.region || 'Unknown Region';
      
      const regionRisks = region.risks && region.risks.length > 0
        ? region.risks.map(risk => {
            // Determine impact level color
            let impactColor = '#757575'; // Default gray
            if (risk.impactLevel) {
              if (risk.impactLevel.toLowerCase().includes('high') || risk.impactLevel.toLowerCase().includes('severe')) {
                impactColor = '#f44336'; // Red for high/severe
              } else if (risk.impactLevel.toLowerCase().includes('moderate')) {
                impactColor = '#ff9800'; // Orange for moderate
              } else if (risk.impactLevel.toLowerCase().includes('low')) {
                impactColor = '#4caf50'; // Green for low
              }
            }
            
            return `
              <div style="margin-bottom: 10px; padding: 10px; background-color: white; border-radius: 4px; border: 1px solid #eee;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                  <div style="font-weight: bold; color: #333;">${regionName}</div>
                  <div style="color: ${impactColor}; font-weight: bold; font-size: 13px;">
                    <span style="background-color: ${impactColor}; color: white; padding: 2px 6px; border-radius: 3px;">${risk.impactLevel || 'Unknown'}</span>
                  </div>
                </div>
                <div style="color: #555; margin-bottom: 5px;">${risk.description}</div>
                <div style="font-size: 11px; color: #888; text-align: right;">
                  Source: ${risk.source || 'N/A'} | Last updated: ${risk.lastUpdated || 'N/A'}
                </div>
              </div>
            `;
          }).join('')
        : `<div style="color: #757575; font-style: italic;">No specific risks identified for this region.</div>`;
      
      return `
        <div style="margin-bottom: 15px;">
          ${regionRisks}
        </div>
      `;
    }).join('');
    
    regionalRisksHtml = `
      <div style="margin-top: 15px;">
        <div style="font-weight: bold; margin-bottom: 10px; color: #333;">Regional Risks</div>
        ${risksItems}
      </div>
    `;
  }
  
  // Generate source information
  const sourceInfo = '';
  
  return `
  <div class="section" style="background-color: white; border-radius: 8px; padding: 15px; margin-bottom: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
    <h2 style="color: #333; border-bottom: 1px solid #eee; padding-bottom: 10px; margin-top: 0; text-align: center;">Geopolitical Risks</h2>
    ${globalOverview}
    ${regionalRisksHtml}
  </div>
  `;
}

/**
 * Generate the market indicators section
 * @param {Object} analysis - Analysis data
 * @returns {String} Market indicators section HTML
 */
function generateMarketIndicatorsSection(analysis) {
  const marketIndicators = analysis.analysis.marketIndicators || {};
  
  // Generate fear and greed index
  const fearGreedIndex = marketIndicators.fearGreedIndex || {};
  
  // Generate Fear & Greed Index HTML
  let fearGreedHtml = '';
  if (fearGreedIndex.value) {
    // Determine where to place the marker based on the value (0-100)
    const value = parseInt(fearGreedIndex.value) || 50;
    const markerPosition = Math.max(0, Math.min(100, value));
    
    // Determine color based on value
    let fearGreedColor = '#FFA500'; // Orange for neutral
    if (value >= 70) {
      fearGreedColor = '#4caf50'; // Green for extreme greed
    } else if (value >= 55) {
      fearGreedColor = '#8bc34a'; // Light green for greed
    } else if (value <= 30) {
      fearGreedColor = '#f44336'; // Red for extreme fear
    } else if (value <= 45) {
      fearGreedColor = '#ff9800'; // Orange for fear
    }
    
    // Generate the scale with the marker
    fearGreedHtml = `
      <div style="padding: 15px; background-color: #f8f9fa; border-radius: 6px; margin-bottom: 15px;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
          <div style="font-weight: bold;">Fear & Greed Index:</div>
          <div style="font-weight: bold; color: ${fearGreedColor}">${value}</div>
        </div>
        
        <div style="position: relative; height: 10px; background: linear-gradient(to right, #e53935 0%, #fb8c00 25%, #ffeb3b 50%, #7cb342 75%, #43a047 100%); border-radius: 5px; margin: 10px 0;">
          <div style="position: absolute; top: -5px; left: ${markerPosition}%; transform: translateX(-50%); width: 15px; height: 15px; background-color: #333; border-radius: 50%;"></div>
        </div>
        
        <div style="display: flex; justify-content: space-between; font-size: 12px; color: #757575; margin-top: 5px;">
          <div>Extreme Fear</div>
          <div>Fear</div>
          <div>Neutral</div>
          <div>Greed</div>
          <div>Extreme Greed</div>
        </div>
        
        <div style="font-size: 14px; color: #555; margin-top: 10px; padding: 8px; background-color: rgba(0,0,0,0.03); border-radius: 4px; border-left: 3px solid ${fearGreedColor};">
          <span style="font-weight: bold;">${fearGreedIndex.interpretation || fearGreedIndex.category || 'Neutral'}:</span> <span>${fearGreedIndex.comment || fearGreedIndex.description || 'Market sentiment is currently neutral.'}</span>
        </div>
        
        <div style="font-size: 12px; color: #888; margin-top: 10px; text-align: right;">
          Source: ${fearGreedIndex.source || 'CNN'} | Last updated: ${fearGreedIndex.lastUpdated || 'N/A'}
        </div>
      </div>
    `;
  }
  
  // Generate VIX HTML
  let vixHtml = '';
  if (marketIndicators.vix && marketIndicators.vix.value) {
    const vixData = marketIndicators.vix;
    
    // Determine if VIX is rising or falling
    let trendIcon = '';
    let trendColor = '#757575';
    let trendText = '';
    
    if (vixData.trend) {
      if (vixData.trend.toLowerCase().includes('fall')) {
        trendIcon = '↓';
        trendColor = '#4caf50';
        trendText = 'Falling';
      } else if (vixData.trend.toLowerCase().includes('ris')) {
        trendIcon = '↑';
        trendColor = '#f44336';
        trendText = 'Rising';
      } else if (vixData.trend.toLowerCase().includes('stable')) {
        trendIcon = '→';
        trendText = 'Stable';
      }
    }
    
    vixHtml = `
      <div style="padding: 15px; background-color: #f8f9fa; border-radius: 6px; margin-bottom: 15px;">
        <div style="display: flex; align-items: center; margin-bottom: 5px;">
          <div style="font-weight: bold; margin-right: 10px;">VIX: ${vixData.value}</div>
          <div style="color: ${trendColor}; font-weight: bold;">
            <span style="background-color: ${trendColor}; color: white; padding: 2px 6px; border-radius: 3px; font-size: 12px;">${trendIcon} ${trendText}</span>
          </div>
        </div>
        
        <div style="font-size: 14px; color: #555; padding: 8px; background-color: rgba(0,0,0,0.03); border-radius: 4px; border-left: 3px solid ${trendColor};">${vixData.analysis || 'Moderate volatility suggests normal market conditions.'}</div>
        
        <div style="font-size: 12px; color: #888; margin-top: 10px; text-align: right;">
          Source: ${vixData.source || 'CBOE'} | Last updated: ${vixData.lastUpdated || 'N/A'}
        </div>
      </div>
    `;
  }
  
  // Generate upcoming events HTML
  let eventsHtml = '';
  if (marketIndicators.upcomingEvents && marketIndicators.upcomingEvents.length > 0) {
    const eventItems = marketIndicators.upcomingEvents.map(event => {
      const date = event.date ? `<span style="color: #2196F3; font-weight: bold;">${event.date}</span>` : '';
      const description = event.description || event.name || event.event || '';
      return `
        <div style="display: flex; margin-bottom: 10px; align-items: flex-start;">
          <div style="min-width: 80px; margin-right: 10px;">${date}</div>
          <div>${description}</div>
        </div>
      `;
    }).join('');
    
    // Get the source and lastUpdated from the first event or use defaults
    const source = marketIndicators.upcomingEvents[0]?.source || marketIndicators.eventsSource || 'Federal Reserve';
    const currentDate = new Date().toISOString().split('T')[0];
    const currentTime = new Date().toTimeString().split(' ')[0];
    const formattedCurrentDateTime = `${currentDate} ${currentTime}`;
    const lastUpdated = marketIndicators.upcomingEvents[0]?.lastUpdated || marketIndicators.eventsLastUpdated || formattedCurrentDateTime;
    
    eventsHtml = `
      <div style="margin-bottom: 20px;">
        <h3 style="margin-bottom: 10px; text-align: center;">Upcoming Events</h3>
        ${eventItems}
        <div style="font-size: 11px; color: #888; text-align: right;">Source: ${source} | Last updated: ${lastUpdated}</div>
      </div>
    `;
  }
  
  // Generate indices HTML
  let indicesHtml = '';
  if (marketIndicators.indices && marketIndicators.indices.length > 0) {
    indicesHtml = `
      <div style="margin-bottom: 20px;">
        <h3 style="margin-bottom: 10px; text-align: center;">Major Indices</h3>
        <div style="display: flex; flex-wrap: wrap; gap: 10px;">
          ${marketIndicators.indices.map(index => {
            // Determine color based on price change
            const isPositive = index.change && index.change.includes('+');
            const changeColor = isPositive ? '#4caf50' : '#f44336';
            
            return `
              <div style="flex: 1 1 calc(50% - 10px); min-width: 200px; padding: 12px; background-color: #f8f9fa; border-radius: 6px;">
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
  
  // Generate source information
  const sourceInfo = marketIndicators.source 
    ? `<div style="font-size: 11px; color: #888; text-align: right;">Source: ${marketIndicators.source} | Last Updated: ${marketIndicators.lastUpdated || 'N/A'}</div>`
    : '';
  
  return `
  <div class="section" style="background-color: white; border-radius: 8px; padding: 15px; margin-bottom: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
    <h2 style="color: #333; border-bottom: 1px solid #eee; padding-bottom: 10px; margin-top: 0; text-align: center;">Key Market Indicators</h2>
    <div style='margin-top: 15px;'>
      ${fearGreedHtml}
      ${vixHtml}
      ${eventsHtml}
      ${indicesHtml}
      ${sourceInfo}
    </div>
  </div>
  `;
}

// Main execution
console.log('Reading JSON file...');
let analysisJson;
try {
  // Try reading the lowercase .json file first
  const jsonPath = path.join(__dirname, 'chatGPTOutput.json');
  const jsonContent = fs.readFileSync(jsonPath, 'utf8');
  analysisJson = JSON.parse(jsonContent);
  console.log('Successfully read and parsed chatGPTOutput.json');
  
  // Debug the number of stocks in the JSON
  if (analysisJson.analysis && analysisJson.analysis.fundamentalMetrics) {
    console.log(`Number of stocks in JSON: ${analysisJson.analysis.fundamentalMetrics.length}`);
    console.log(`Stock symbols: ${analysisJson.analysis.fundamentalMetrics.map(stock => stock.symbol).join(', ')}`);
  }
} catch (error) {
  try {
    // If that fails, try the uppercase .JSON file
    const jsonPath = path.join(__dirname, 'chatGPTOutput.JSON');
    const jsonContent = fs.readFileSync(jsonPath, 'utf8');
    analysisJson = JSON.parse(jsonContent);
    console.log('Successfully read and parsed chatGPTOutput.JSON');
    
    // Debug the number of stocks in the JSON
    if (analysisJson.analysis && analysisJson.analysis.fundamentalMetrics) {
      console.log(`Number of stocks in JSON: ${analysisJson.analysis.fundamentalMetrics.length}`);
      console.log(`Stock symbols: ${analysisJson.analysis.fundamentalMetrics.map(stock => stock.symbol).join(', ')}`);
    }
  } catch (error) {
    console.error('Error reading or parsing JSON file:', error);
    process.exit(1);
  }
}

// Get current time and calculate next scheduled analysis time
const currentTime = new Date();
const nextScheduledTime = getNextScheduledTime(currentTime);

// Generate the HTML email
console.log('Generating HTML email with complete final template style...');
const htmlEmail = generateCompleteHtml(
  analysisJson,
  analysisJson.timestamp || currentTime.toISOString(),
  nextScheduledTime
);

// Create filename with timestamp
const timestamp = new Date().toISOString().replace(/:/g, '-').replace(/\..+/, '');
const decision = analysisJson.decision.split(' ')[0]; // Get first word of decision
const filename = `Market_Pulse_Daily_${decision}_${timestamp}.html`;
const outputPath = path.join(__dirname, filename);

// Write the HTML to a file
fs.writeFileSync(outputPath, htmlEmail);

console.log(`HTML email generated successfully and saved to: ${outputPath}`);
console.log(`Current time: ${currentTime.toLocaleString()}`);
console.log(`Next scheduled analysis time: ${nextScheduledTime.toLocaleString()}`);

// Also save a copy with a standard name for easy access
const standardPath = path.join(__dirname, 'market_pulse_daily_complete.html');
fs.writeFileSync(standardPath, htmlEmail);
console.log(`Also saved to: ${standardPath}`);
