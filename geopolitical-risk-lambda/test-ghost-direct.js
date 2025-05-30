/**
 * Direct test script for geopolitical risk Lambda integration with Ghost
 * This script bypasses the need for .env files by using credentials directly
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Import modules for Ghost post generation
const addMarketSentiment = require('../Ghost-Post-Template/src/modules/market-sentiment').addMarketSentiment;
const addMarketIndicators = require('../Ghost-Post-Template/src/modules/market-indicators').addMarketIndicators;
const addFundamentalMetrics = require('../Ghost-Post-Template/src/modules/fundamental-metrics').addFundamentalMetrics;
const addMacroeconomicFactors = require('../Ghost-Post-Template/src/modules/macroeconomic-factors').addMacroeconomicFactors;
const addGeopoliticalRisks = require('../Ghost-Post-Template/src/modules/geopolitical-risks').addGeopoliticalRisks;

// Import utility functions
const { 
  addHeading, 
  addParagraph, 
  addHTML, 
  addDivider 
} = require('../Ghost-Post-Template/src/utils/mobiledoc-helpers');

// Ghost credentials
const ghostUrl = 'https://market-pulse-daily.ghost.io';
const ghostApiKey = '67f457a5f41c9900013e1e47:44daf1e666349bde96fad6f9a65979ba1d0b11b161a5c765847218f5bd263b7c';

// Load our updated geopolitical risks data
console.log('Loading updated geopolitical risks data...');
const geopoliticalRisksData = JSON.parse(fs.readFileSync(path.join(__dirname, 'latest-geopolitical-risks-fresh.json'), 'utf8'));

// Load the market pulse data template
console.log('Loading market pulse data template...');
const marketPulseDataPath = path.join(__dirname, '../Ghost-Post-Template/market_pulse_data.json');
let marketPulseData;

try {
  marketPulseData = JSON.parse(fs.readFileSync(marketPulseDataPath, 'utf8'));
  console.log('Loaded market pulse data successfully');
} catch (error) {
  console.error('Error loading market pulse data:', error);
  process.exit(1);
}

// Replace the geopolitical risks section in the market pulse data
if (marketPulseData.macroeconomicFactors && marketPulseData.macroeconomicFactors.geopoliticalRisks) {
  marketPulseData.macroeconomicFactors.geopoliticalRisks = {
    global: geopoliticalRisksData.global,
    risks: geopoliticalRisksData.risks,
    source: "Aggregated from multiple geopolitical risk assessments",
    sourceUrl: geopoliticalRisksData.risks[0].sourceUrl || "https://www.cfr.org/global-conflict-tracker",
    lastUpdated: new Date().toISOString()
  };
  
  console.log('Updated geopolitical risks data in the market pulse data');
} else {
  console.error('Could not find geopoliticalRisks in the market pulse data structure');
  process.exit(1);
}

// Add test flag and update metadata
marketPulseData.isTest = true;
marketPulseData.metadata = marketPulseData.metadata || {};
marketPulseData.metadata.title = 'TEST - Market Pulse Daily with FRESH Geopolitical Risks';
marketPulseData.reportDateFormatted = new Date().toLocaleString('en-US', {
  month: 'long',
  day: 'numeric',
  year: 'numeric',
  hour: 'numeric',
  minute: 'numeric',
  hour12: true,
  timeZone: 'America/New_York'
}) + ' EDT';

// Save the modified data for reference
const modifiedDataPath = path.join(__dirname, 'test-geopolitical-output-full.json');
fs.writeFileSync(modifiedDataPath, JSON.stringify(marketPulseData, null, 2));
console.log(`Saved modified data to ${modifiedDataPath}`);

// Create a mobiledoc structure for the Ghost post
const createMobiledoc = () => {
  return {
    version: '0.3.1',
    atoms: [],
    cards: [],
    markups: [],
    sections: []
  };
};

// Add wrapper start to the mobiledoc
const addWrapperStart = (mobiledoc) => {
  addHTML(mobiledoc, '<div class="market-pulse-container">');
};

// Add wrapper end to the mobiledoc
const addWrapperEnd = (mobiledoc) => {
  addHTML(mobiledoc, '</div>');
};

// Add title to the mobiledoc
const addTitle = (mobiledoc, data) => {
  const title = data.metadata?.title || 'Market Pulse Daily';
  const timestamp = data.reportDateFormatted || new Date().toLocaleString();
  
  const titleHtml = `
    <div class="market-pulse-header">
      <h1>${title}</h1>
      <p class="timestamp">${timestamp}</p>
    </div>
  `;
  
  addHTML(mobiledoc, titleHtml);
};

// Generate the Ghost post
console.log('Generating Ghost post...');
const generateGhostPost = () => {
  // Create a new mobiledoc
  const mobiledoc = createMobiledoc();
  
  // Add content to the mobiledoc
  addWrapperStart(mobiledoc);
  addTitle(mobiledoc, marketPulseData);
  
  // Add sections
  if (marketPulseData.marketSentiment) {
    addMarketSentiment(mobiledoc, marketPulseData);
  }
  
  if (marketPulseData.marketIndicators) {
    addMarketIndicators(mobiledoc, marketPulseData);
  }
  
  if (marketPulseData.fundamentalMetrics) {
    addFundamentalMetrics(mobiledoc, marketPulseData);
  }
  
  if (marketPulseData.macroeconomicFactors) {
    addMacroeconomicFactors(mobiledoc, marketPulseData);
    addGeopoliticalRisks(mobiledoc, marketPulseData);
  }
  
  addWrapperEnd(mobiledoc);
  
  // Save the mobiledoc to a file
  const outputPath = path.join(__dirname, 'test-geopolitical-mobiledoc.json');
  fs.writeFileSync(outputPath, JSON.stringify(mobiledoc, null, 2));
  console.log(`Saved mobiledoc to ${outputPath}`);
  
  return mobiledoc;
};

// Generate the Ghost post
const mobiledoc = generateGhostPost();

// Create a temporary .env file for the publisher
const tempEnvPath = path.join(__dirname, 'temp.env');
fs.writeFileSync(tempEnvPath, `GHOST_URL="${ghostUrl}"\nGHOST_API_KEY="${ghostApiKey}"`);
console.log('Temporary .env file created successfully.');

// Use the publish-to-ghost-runner.js script to publish the post
console.log('Publishing to Ghost...');
try {
  // Save the market pulse data to a temporary file for the publisher to use
  fs.writeFileSync(path.join(__dirname, '../Ghost-Post-Template/market_pulse_data.json'), JSON.stringify(marketPulseData, null, 2));
  
  // Execute the publish-to-ghost script with credentials
  execSync(`node ../Ghost-Post-Template/publish-to-ghost-runner.js "${ghostUrl}" "${ghostApiKey}"`, { 
    cwd: __dirname,
    stdio: 'inherit'
  });
  
  console.log('Published successfully!');
} catch (error) {
  console.error('Error publishing to Ghost:', error.message);
} finally {
  // Clean up temporary .env file
  try {
    fs.unlinkSync(tempEnvPath);
    console.log('Temporary .env file cleaned up successfully.');
  } catch (err) {
    console.error('Error cleaning up temporary .env file:', err.message);
  }
}
