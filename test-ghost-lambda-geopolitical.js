/**
 * Test script to publish our updated geopolitical risk data to Ghost via Lambda
 * 
 * This script:
 * 1. Loads the market pulse data
 * 2. Replaces the geopolitical risk section with our updated data
 * 3. Sends the data to the Ghost Lambda function
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');

// Lambda API configuration - using hardcoded values for direct testing
const LAMBDA_API_URL = 'https://vrwz4xsvml.execute-api.us-east-2.amazonaws.com/prod/publish';
const LAMBDA_API_KEY = 'oQ7Qz88oi940M4CaO3KqO69TZ5bBlF5T2P7hJDpN'; // Using the key directly
const GHOST_URL = 'https://market-pulse-daily.ghost.io';
const NEWSLETTER_ID = '67f427c5744a72000854ee8f';

// Log the configuration
console.log('Using Lambda API URL:', LAMBDA_API_URL);
console.log('Using Lambda API Key:', LAMBDA_API_KEY ? 'Yes (configured)' : 'No');
console.log('Using Ghost URL:', GHOST_URL);
console.log('Using Newsletter ID:', NEWSLETTER_ID);

// Load our updated geopolitical risks data
console.log('Loading updated geopolitical risks data...');
const geopoliticalRisksData = JSON.parse(fs.readFileSync(path.join(__dirname, 'test-geopolitical-output.json'), 'utf8'));

// Load the market pulse data template (using the one from the previous test)
console.log('Loading market pulse data template...');
const marketPulseDataPath = path.join(__dirname, 'sample.json');
let marketPulseData;

try {
  marketPulseData = JSON.parse(fs.readFileSync(marketPulseDataPath, 'utf8'));
  console.log('Loaded market pulse data successfully');
} catch (error) {
  console.error('Error loading market pulse data:', error);
  process.exit(1);
}

// Replace the geopolitical risks section in the market pulse data
// Check if the geopolitical risks are at the top level or in macroeconomicFactors
if (marketPulseData.geopoliticalRisks) {
  // Convert our new format to match the sample.json structure
  const convertedRisks = geopoliticalRisksData.risks.map(risk => ({
    title: risk.name,
    description: risk.description,
    region: risk.region,
    impact: risk.impactLevel,
    source: risk.source,
    sourceUrl: risk.sourceUrl
  }));
  
  // Add the global overview as the first risk item
  convertedRisks.unshift({
    title: "Global Geopolitical Overview",
    description: geopoliticalRisksData.global,
    region: "Global",
    impact: "High",
    source: "Aggregated from multiple geopolitical risk assessments",
    sourceUrl: "https://www.cfr.org/global-conflict-tracker"
  });
  
  // Replace the existing geopolitical risks
  marketPulseData.geopoliticalRisks = convertedRisks;
  console.log('Updated geopolitical risks data in the market pulse data');
} else if (marketPulseData.macroeconomicFactors && marketPulseData.macroeconomicFactors.geopoliticalRisks) {
  // Use the newer format if available
  marketPulseData.macroeconomicFactors.geopoliticalRisks = {
    global: geopoliticalRisksData.global,
    risks: geopoliticalRisksData.risks,
    source: "Aggregated from multiple geopolitical risk assessments",
    sourceUrl: "https://www.cfr.org/global-conflict-tracker",
    lastUpdated: new Date().toISOString()
  };
  console.log('Updated geopolitical risks data in macroeconomicFactors');
} else {
  // If no existing structure is found, create it at the top level
  console.log('No existing geopolitical risks structure found, creating at top level');
  const convertedRisks = geopoliticalRisksData.risks.map(risk => ({
    title: risk.name,
    description: risk.description,
    region: risk.region,
    impact: risk.impactLevel,
    source: risk.source,
    sourceUrl: risk.sourceUrl
  }));
  
  // Add the global overview as the first risk item
  convertedRisks.unshift({
    title: "Global Geopolitical Overview",
    description: geopoliticalRisksData.global,
    region: "Global",
    impact: "High",
    source: "Aggregated from multiple geopolitical risk assessments",
    sourceUrl: "https://www.cfr.org/global-conflict-tracker"
  });
  
  marketPulseData.geopoliticalRisks = convertedRisks;
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
const modifiedDataPath = path.join(__dirname, 'test-lambda-geopolitical-output.json');
fs.writeFileSync(modifiedDataPath, JSON.stringify(marketPulseData, null, 2));
console.log(`Saved modified data to ${modifiedDataPath}`);

// Prepare the payload for the Lambda function
const payload = {
  ghostUrl: GHOST_URL,
  // We don't need to provide the Ghost API Key as the Lambda function has it
  newsletterId: NEWSLETTER_ID,
  jsonData: marketPulseData,
  draftOnly: true,  // Create as draft only for testing
  returnHtml: false
};

// Log the payload structure (without sensitive data)
console.log('Preparing to publish to Ghost via Lambda with payload structure:');
console.log('ghostUrl:', GHOST_URL);
console.log('newsletterId:', NEWSLETTER_ID);
console.log('jsonData keys:', Object.keys(marketPulseData).join(', '));
console.log('draftOnly:', true);

// Send the request to the Lambda function
console.log('Sending request to Lambda function...');

const sendToLambda = async () => {
  try {
    const response = await axios.post(LAMBDA_API_URL, payload, {
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': LAMBDA_API_KEY
      }
    });
    
    console.log('Lambda function response:');
    console.log(JSON.stringify(response.data, null, 2));
    
    return response.data;
  } catch (error) {
    console.error('Error calling Lambda function:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    throw error;
  }
};

// Execute the function
sendToLambda()
  .then(result => {
    console.log('Successfully published to Ghost!');
    if (result.url) {
      console.log('Post URL:', result.url);
    }
  })
  .catch(error => {
    console.error('Failed to publish to Ghost:', error.message);
  });
