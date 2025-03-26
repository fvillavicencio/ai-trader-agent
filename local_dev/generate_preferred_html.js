/**
 * Script to generate HTML email in the preferred style using the latest JSON data
 */

const fs = require('fs');
const path = require('path');
const template = require('./preferred_template');
const sections = require('./preferred_sections');

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
  // Generate each section
  const styles = template.generateStyles();
  const headerHtml = template.generateHeader(analysisTime);
  const decisionHtml = template.generateDecisionSection(analysis);
  const marketSentimentHtml = sections.generateMarketSentimentSection(analysis);
  const marketIndicatorsHtml = sections.generateMarketIndicatorsSection(analysis);
  const fundamentalMetricsHtml = sections.generateFundamentalMetricsSection(analysis);
  const macroeconomicFactorsHtml = sections.generateMacroeconomicFactorsSection(analysis);
  const justificationHtml = sections.generateJustificationSection(analysis);
  const nextAnalysisHtml = template.generateNextAnalysisSection(nextAnalysisTime);
  const footerHtml = template.generateFooter();
  
  // Combine all sections into complete HTML
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Market Pulse Daily</title>
  <style>
    ${styles}
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
console.log('Generating HTML email in preferred style...');
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
const standardPath = path.join(__dirname, 'market_pulse_daily_preferred.html');
fs.writeFileSync(standardPath, htmlEmail);
console.log(`Also saved to: ${standardPath}`);

// Open the HTML file in the default browser (uncomment to enable)
// const { exec } = require('child_process');
// exec(`open ${outputPath}`);
