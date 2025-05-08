/**
 * Local script to render the latest JSON output from OpenAI into a beautiful HTML email
 */

const fs = require('fs');
const path = require('path');
const { generateCompleteHtmlEmail, getNextScheduledAnalysisTime } = require('./emailTemplate');

// Function to calculate the next scheduled analysis time
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

// Read the JSON file
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

// Handle the difference in structure between old and new JSON formats
// The new format from OpenAI has marketSentiment instead of sentiment
if (analysisJson.analysis && analysisJson.analysis.marketSentiment && !analysisJson.analysis.sentiment) {
  console.log('Converting marketSentiment to sentiment for compatibility');
  analysisJson.analysis.sentiment = analysisJson.analysis.marketSentiment;
}

// Get current time and calculate next scheduled analysis time
const currentTime = new Date();
const nextScheduledTime = getNextScheduledTime(currentTime);

// Generate the HTML email
console.log('Generating HTML email...');
const htmlEmail = generateCompleteHtmlEmail(
  analysisJson,
  analysisJson.timestamp || currentTime.toISOString(),
  nextScheduledTime.toISOString()
);

// Write the HTML to a file
const outputPath = path.join(__dirname, 'market_pulse_daily_latest.html');
fs.writeFileSync(outputPath, htmlEmail);

console.log(`HTML email generated successfully and saved to: ${outputPath}`);
console.log(`Current time: ${currentTime.toLocaleString()}`);
console.log(`Next scheduled analysis time: ${nextScheduledTime.toLocaleString()}`);

// Open the HTML file in the default browser (uncomment to enable)
// const { exec } = require('child_process');
// exec(`open ${outputPath}`);
