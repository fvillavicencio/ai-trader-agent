/**
 * Script to generate HTML email with the original template style using the latest JSON data
 */

const fs = require('fs');
const path = require('path');
const template = require('./preferred_template');
const sections = require('./updated_sections');

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
      <div style="font-size: 28px; font-weight: bold; color: #FF8C00; margin: 0 0 10px;">${analysis.decision}</div>
      <p style="font-size: 16px; color: #555; margin: 0;">${analysis.summary}</p>
    </div>
  `;
  
  // Generate sections
  const marketSentimentHtml = sections.generateMarketSentimentSection(analysis);
  const marketIndicatorsHtml = generateMarketIndicatorsSection(analysis);
  const fundamentalMetricsHtml = sections.generateFundamentalMetricsSection(analysis);
  const macroeconomicFactorsHtml = sections.generateMacroeconomicFactorsSection(analysis);
  const justificationHtml = sections.generateJustificationSection(analysis);
  
  // Generate next analysis section
  const formattedNextAnalysisTime = nextAnalysisTime.toLocaleString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short'
  });
  
  const nextAnalysisHtml = `
    <div style="background-color: #e8f5e9; padding: 15px; border-radius: 6px; margin: 20px 0; text-align: center; color: #2e7d32;">
      <p style="margin: 5px 0;">Next analysis scheduled for: ${formattedNextAnalysisTime}</p>
    </div>
  `;
  
  // Generate footer
  const year = new Date().getFullYear();
  const footerHtml = `
    <div style="margin-top: 40px; padding: 15px; text-align: center; background-color: #1a365d; color: #fff; border-radius: 6px;">
      <p style="margin: 5px 0; font-size: 14px;">Market Pulse Daily - Professional Trading Insights</p>
      <p style="margin: 5px 0; font-size: 14px;">&copy; ${year} Market Pulse Daily</p>
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
  <style>
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
  </style>
</head>
<body>
  <div class="container">
    ${headerHtml}
    ${decisionHtml}
    ${marketSentimentHtml}
    ${marketIndicatorsHtml}
    ${fundamentalMetricsHtml}
    ${macroeconomicFactorsHtml}
    ${justificationHtml}
    ${nextAnalysisHtml}
    ${footerHtml}
  </div>
</body>
</html>
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
        <div style="font-weight: bold; margin-bottom: 10px;">Major Indices</div>
        <div style="display: flex; flex-wrap: wrap; gap: 10px;">
          ${indices.map(index => {
            // Determine color based on price change
            const isPositive = index.change && index.change.includes('+');
            const changeColor = isPositive ? '#4caf50' : '#f44336';
            
            return `
              <div style="flex: 1 1 calc(50% - 10px); min-width: 200px; padding: 12px; background-color: #f8f9fa; border-radius: 6px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
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
        <div style="font-weight: bold; margin-bottom: 10px;">Market Volatility</div>
        <div style="padding: 15px; background-color: #f8f9fa; border-radius: 6px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
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
    ? `<div style="font-size: 12px; color: #888; margin-top: 10px; text-align: right;">
         Source: ${indicators.source} | Last Updated: ${indicators.lastUpdated || 'N/A'}
       </div>`
    : '';
  
  return `
  <div class="section" style="background-color: white; border-radius: 8px; padding: 15px; margin-bottom: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
    <h2 style="color: #333; border-bottom: 1px solid #eee; padding-bottom: 10px; margin-top: 0;">Key Market Indicators</h2>
    <div style='margin-top: 10px;'>
      ${indicesHtml}
      ${volatilityHtml}
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
} catch (error) {
  try {
    // If that fails, try the uppercase .JSON file
    const jsonPath = path.join(__dirname, 'chatGPTOutput.JSON');
    const jsonContent = fs.readFileSync(jsonPath, 'utf8');
    analysisJson = JSON.parse(jsonContent);
    console.log('Successfully read and parsed chatGPTOutput.JSON');
  } catch (error) {
    console.error('Error reading or parsing JSON file:', error);
    process.exit(1);
  }
}

// Get current time and calculate next scheduled analysis time
const currentTime = new Date();
const nextScheduledTime = getNextScheduledTime(currentTime);

// Generate the HTML email
console.log('Generating HTML email with original template style...');
const htmlEmail = generateCompleteHtml(
  analysisJson,
  analysisJson.timestamp || currentTime.toISOString(),
  nextScheduledTime.toISOString()
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
const standardPath = path.join(__dirname, 'market_pulse_daily_original_style.html');
fs.writeFileSync(standardPath, htmlEmail);
console.log(`Also saved to: ${standardPath}`);
