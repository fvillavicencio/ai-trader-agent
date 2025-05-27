/**
 * Test script to publish our updated geopolitical risk data to Ghost via Lambda
 * 
 * This script:
 * 1. Loads the market pulse data
 * 2. Correctly structures the geopolitical risk section
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

// Try to load the actual analyzed data from the geopolitical risk sensor first
let geopoliticalRisksData;
try {
  // Path to the analyzed data from the geopolitical risk sensor
  const analyzedDataPath = path.join(__dirname, 'perplexity-retrieval-lambda/geopolitical-risk-sensor/data/geopolitical_risks_analyzed.json');
  geopoliticalRisksData = JSON.parse(fs.readFileSync(analyzedDataPath, 'utf8'));
  console.log('Loaded actual analyzed data from the geopolitical risk sensor');
} catch (error) {
  // Fallback to test data if the actual analyzed data is not available
  console.log('Could not load actual analyzed data, falling back to test data:', error.message);
  geopoliticalRisksData = JSON.parse(fs.readFileSync(path.join(__dirname, 'test-geopolitical-output.json'), 'utf8'));
}

// Load the market pulse data template
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

// Ensure macroeconomicFactors exists
if (!marketPulseData.macroeconomicFactors) {
  marketPulseData.macroeconomicFactors = {};
  console.log('Created macroeconomicFactors object');
}

// Create the correctly structured geopolitical risks section
// Check if we're using the analyzed data (which has macroeconomicFactors structure) or test data
let risksToProcess = [];
let globalOverview = "";
let sourceInfo = { name: "", url: "" };

if (geopoliticalRisksData.macroeconomicFactors && geopoliticalRisksData.macroeconomicFactors.geopoliticalRisks) {
  // We're using the analyzed data with the correct structure
  console.log('Using data with macroeconomicFactors structure');
  const geoRisks = geopoliticalRisksData.macroeconomicFactors.geopoliticalRisks;
  risksToProcess = geoRisks.risks || [];
  
  // Extract the global overview from the correct location
  globalOverview = geoRisks.global || "";
  
  sourceInfo = {
    name: geoRisks.source || "Aggregated from multiple geopolitical risk assessments",
    url: geoRisks.sourceUrl || "https://www.eiu.com/n/global-outlook-rising-geopolitical-risks-in-2025-amid-tariff-shocks-and-policy-shifts/"
  };
} else if (geopoliticalRisksData.originalAnalysis && geopoliticalRisksData.originalAnalysis.global) {
  // We're using the analyzed data but in a different structure
  console.log('Using data with originalAnalysis structure');
  
  // Try to get risks from the main structure first
  risksToProcess = geopoliticalRisksData.risks || [];
  
  // Extract the global overview from the originalAnalysis
  globalOverview = geopoliticalRisksData.originalAnalysis.global || "";
  
  sourceInfo = {
    name: geopoliticalRisksData.source || "Aggregated from multiple geopolitical risk assessments",
    url: geopoliticalRisksData.sourceUrl || "https://www.eiu.com/n/global-outlook-rising-geopolitical-risks-in-2025-amid-tariff-shocks-and-policy-shifts/"
  };
} else {
  // We're using the original test data format
  console.log('Using original test data format');
  risksToProcess = geopoliticalRisksData.risks || [];
  globalOverview = geopoliticalRisksData.global || "";
  sourceInfo = {
    name: geopoliticalRisksData.source || "Aggregated from multiple geopolitical risk assessments",
    url: geopoliticalRisksData.sourceUrl || "https://www.eiu.com/n/global-outlook-rising-geopolitical-risks-in-2025-amid-tariff-shocks-and-policy-shifts/"
  };
}

// First, map the risks to the correct format, ensuring we preserve the original source URLs
const formattedRisks = risksToProcess.map(risk => {
  // Check if this risk has related sources
  let sourceUrl = risk.sourceUrl || risk.url || '#';
  
  // If there are related sources, use the first one's URL if the main sourceUrl is missing
  if (risk.relatedSources && risk.relatedSources.length > 0 && !risk.sourceUrl) {
    sourceUrl = risk.relatedSources[0].url || '#';
  }
  
  return {
    name: risk.name || 'Unknown Risk',
    description: risk.description || 'No description available',
    region: risk.region || 'Global',
    impactLevel: risk.impactLevel || 'Medium',
    source: risk.source || 'Unknown Source',
    sourceUrl: sourceUrl
  };
});

// Sort risks by impact level (descending)
const sortedRisks = formattedRisks.sort((a, b) => {
  // Convert string impact levels to numeric for sorting
  const impactOrder = {
    'Severe': 4,
    'High': 3,
    'Medium': 2,
    'Low': 1,
    'Unknown': 0
  };
  
  const aImpact = impactOrder[a.impactLevel] || 0;
  const bImpact = impactOrder[b.impactLevel] || 0;
  
  return bImpact - aImpact;
});

// Create the geopolitical risks object with the sorted risks
marketPulseData.macroeconomicFactors.geopoliticalRisks = {
  global: globalOverview,
  risks: sortedRisks,
  source: sourceInfo.name,
  sourceUrl: sourceInfo.url,
  lastUpdated: new Date().toISOString()
};

console.log('Created properly structured geopolitical risks data in macroeconomicFactors with risks sorted by impact level');

// Add test flag and update metadata
marketPulseData.isTest = true;
marketPulseData.metadata = marketPulseData.metadata || {};
marketPulseData.metadata.title = 'TEST - Market Pulse Daily with Updated Geopolitical Risks';
marketPulseData.reportDate = new Date().toISOString();
marketPulseData.reportDateFormatted = new Date().toLocaleString('en-US', {
  month: 'long',
  day: 'numeric',
  year: 'numeric',
  hour: 'numeric',
  minute: 'numeric',
  hour12: true,
  timeZone: 'America/New_York'
}) + ' EDT';
marketPulseData.reportDateDisplay = 'As of ' + marketPulseData.reportDateFormatted;

// Save the modified data for reference
const modifiedDataPath = path.join(__dirname, 'test-lambda-geopolitical-fixed-output.json');
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
