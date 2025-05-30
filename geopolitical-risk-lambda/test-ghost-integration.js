/**
 * End-to-end test script for geopolitical risk Lambda integration with Ghost
 * 
 * This script:
 * 1. Fetches the latest geopolitical risk data from the Lambda function
 * 2. Saves it to a file for the Ghost post generator
 * 3. Runs the Ghost post generator to create a post with the updated data
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { execSync } = require('child_process');

// API Gateway endpoint and API key
const API_ENDPOINT = 'https://jkoaa9d2yi.execute-api.us-east-2.amazonaws.com/prod/geopolitical-risks';
const API_KEY = 'oQ7Qz88oi940M4CaO3KqO69TZ5bBlF5T2P7hJDpN';

// Path to the Ghost post template directory
const GHOST_TEMPLATE_DIR = path.join(__dirname, '..', 'Ghost-Post-Template');

// Function to fetch the latest geopolitical risk data
async function fetchGeopoliticalRisks() {
  try {
    console.log('Fetching latest geopolitical risk data from Lambda...');
    const response = await axios.get(API_ENDPOINT, {
      headers: {
        'x-api-key': API_KEY
      }
    });
    
    console.log('Response status:', response.status);
    console.log('Response data preview:', JSON.stringify(response.data).substring(0, 300) + '...');
    
    // Print summary
    if (response.data) {
      console.log('\nGeopolitical Risk Summary:');
      console.log(`Risk Index: ${response.data.geopoliticalRiskIndex}/100`);
      console.log(`Global Overview: ${response.data.global}`);
      console.log(`Last Updated: ${response.data.lastUpdated}`);
      console.log(`Number of Risk Categories: ${response.data.risks ? response.data.risks.length : 0}`);
    }
    
    return response.data;
  } catch (error) {
    console.error('Error fetching geopolitical risk data:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    throw error;
  }
}

// Function to save the geopolitical risk data for the Ghost post generator
function saveGeopoliticalRiskData(data) {
  // Save to the file expected by the test-geopolitical-risks.js script
  const outputPath = path.join(GHOST_TEMPLATE_DIR, 'test-geopolitical-output.json');
  fs.writeFileSync(outputPath, JSON.stringify(data, null, 2));
  console.log(`Saved geopolitical risk data to ${outputPath}`);
  return outputPath;
}

// Function to run the Ghost post generator
function runGhostPostGenerator() {
  console.log('\nRunning Ghost post generator...');
  try {
    execSync(`node test-geopolitical-risks.js`, { 
      cwd: GHOST_TEMPLATE_DIR,
      stdio: 'inherit'
    });
    console.log('Ghost post generator completed successfully!');
  } catch (error) {
    console.error('Error running Ghost post generator:', error.message);
    throw error;
  }
}

// Main function to run the end-to-end test
async function main() {
  try {
    // Step 1: Fetch the latest geopolitical risk data
    const geopoliticalRiskData = await fetchGeopoliticalRisks();
    
    // Step 2: Save the data for the Ghost post generator
    saveGeopoliticalRiskData(geopoliticalRiskData);
    
    // Step 3: Run the Ghost post generator
    runGhostPostGenerator();
    
    console.log('\nEnd-to-end test completed successfully!');
  } catch (error) {
    console.error('\nEnd-to-end test failed:', error.message);
    process.exit(1);
  }
}

// Run the main function
main();
