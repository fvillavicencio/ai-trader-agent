/**
 * Test script to publish a Ghost post with updated geopolitical risk data
 * 
 * This script:
 * 1. Loads the market pulse data from the provided JSON
 * 2. Replaces the geopolitical risk section with our updated data
 * 3. Generates a Ghost post using the existing tools
 * 4. Publishes the post to Ghost
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Import modules for Ghost post generation
const { addMarketSentiment } = require('./src/modules/market-sentiment');
const { addMarketIndicators } = require('./src/modules/market-indicators');
const { addFundamentalMetrics } = require('./src/modules/fundamental-metrics');
const { addMacroeconomicFactors } = require('./src/modules/macroeconomic-factors');
const { addGeopoliticalRisks } = require('./src/modules/geopolitical-risks');

// Import utility functions
const { 
  addHeading, 
  addParagraph, 
  addHTML, 
  addDivider 
} = require('./src/utils/mobiledoc-helpers');

// Load our updated geopolitical risks data
console.log('Loading updated geopolitical risks data...');
const geopoliticalRisksData = JSON.parse(fs.readFileSync(path.join(__dirname, '../test-geopolitical-output.json'), 'utf8'));

// Load the market pulse data template
console.log('Loading market pulse data template...');
const marketPulseDataPath = path.join(__dirname, 'market_pulse_data.json');
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
    sourceUrl: "https://www.cfr.org/global-conflict-tracker",
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
marketPulseData.metadata.title = 'TEST - Market Pulse Daily with Updated Geopolitical Risks';
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

// Use the publish-to-ghost-runner.js script to publish the post
console.log('Publishing to Ghost...');
try {
  // Save the market pulse data to a temporary file for the publisher to use
  fs.writeFileSync(path.join(__dirname, 'market_pulse_data.json'), JSON.stringify(marketPulseData, null, 2));
  
  // Read environment variables from the .env file
  const envPath = path.join(__dirname, 'src', '.env');
  let ghostUrl = '';
  let ghostApiKey = '';
  
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const urlMatch = envContent.match(/GHOST_URL="([^"]+)"/i);
    const apiKeyMatch = envContent.match(/GHOST_API_KEY="([^"]+)"/i);
    
    if (urlMatch && urlMatch[1]) ghostUrl = urlMatch[1];
    if (apiKeyMatch && apiKeyMatch[1]) ghostApiKey = apiKeyMatch[1];
    
    console.log(`Found Ghost URL: ${ghostUrl ? 'Yes' : 'No'}`);
    console.log(`Found Ghost API Key: ${ghostApiKey ? 'Yes' : 'No'}`);
  } else {
    console.error('No .env file found in src directory. Please create one with GHOST_URL and GHOST_API_KEY.');
    process.exit(1);
  }
  
  if (!ghostUrl || !ghostApiKey) {
    console.error('Missing Ghost URL or API Key in .env file');
    process.exit(1);
  }
  
  // Execute the publish-to-ghost-runner.js script with credentials
  execSync(`node publish-to-ghost-runner.js "${ghostUrl}" "${ghostApiKey}"`, { 
    cwd: __dirname,
    stdio: 'inherit'
  });
  
  console.log('Published successfully!');
} catch (error) {
  console.error('Error publishing to Ghost:', error.message);
}
