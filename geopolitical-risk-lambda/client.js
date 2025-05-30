/**
 * Geopolitical Risk Lambda Client
 * 
 * This script invokes the geopolitical-risk-analyzer Lambda function to retrieve
 * the latest geopolitical risk analysis and saves it to a file.
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Configuration
const API_URL = 'https://jkoaa9d2yi.execute-api.us-east-2.amazonaws.com/prod/geopolitical-risks';
const OUTPUT_FILE = path.join(__dirname, 'latest-geopolitical-risks.json');
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

/**
 * Main function to fetch and save geopolitical risk data
 */
async function fetchAndSaveGeopoliticalRiskData() {
  console.log('Fetching latest geopolitical risk data...');
  
  try {
    // Fetch the data from the Lambda function
    const data = await fetchWithRetry(API_URL);
    
    // Save the data to a file
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(data, null, 2));
    console.log(`Successfully saved geopolitical risk data to ${OUTPUT_FILE}`);
    
    // Print a summary of the data
    console.log('\nGeopolitical Risk Summary:');
    console.log(`Risk Index: ${data.geopoliticalRiskIndex}/100`);
    console.log(`Global Overview: ${data.global}`);
    console.log(`Last Updated: ${data.lastUpdated}`);
    console.log(`Number of Risk Categories: ${data.risks.length}`);
    
    return data;
  } catch (error) {
    console.error('Error fetching or saving geopolitical risk data:', error.message);
    process.exit(1);
  }
}

/**
 * Fetch data with retry logic
 */
async function fetchWithRetry(url, retries = 0) {
  try {
    const response = await axios.get(url);
    return response.data;
  } catch (error) {
    if (retries < MAX_RETRIES) {
      console.log(`Attempt ${retries + 1} failed. Retrying in ${RETRY_DELAY_MS}ms...`);
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
      return fetchWithRetry(url, retries + 1);
    } else {
      throw new Error(`Failed after ${MAX_RETRIES} attempts: ${error.message}`);
    }
  }
}

/**
 * Function to trigger a refresh of the geopolitical risk data
 */
async function triggerRefresh() {
  console.log('Triggering refresh of geopolitical risk data...');
  
  try {
    const response = await axios.post(API_URL, { operation: 'refresh' });
    console.log('Refresh operation started:', response.data);
    
    // Poll for status until the refresh is complete
    await pollRefreshStatus();
    
    return true;
  } catch (error) {
    console.error('Error triggering refresh:', error.message);
    return false;
  }
}

/**
 * Poll the status endpoint until the refresh is complete
 */
async function pollRefreshStatus() {
  console.log('Polling for refresh status...');
  let isComplete = false;
  let attempts = 0;
  const maxAttempts = 30; // Maximum number of polling attempts
  const pollInterval = 5000; // 5 seconds between polls
  
  while (!isComplete && attempts < maxAttempts) {
    try {
      const response = await axios.get(`${API_URL}?status=true`);
      const status = response.data;
      
      console.log(`Status: ${status.status}, Message: ${status.message}`);
      
      if (status.status === 'completed') {
        isComplete = true;
        console.log('Refresh operation completed successfully!');
      } else if (status.status === 'error') {
        throw new Error(`Refresh failed: ${status.message}`);
      } else {
        // Still processing, wait and try again
        await new Promise(resolve => setTimeout(resolve, pollInterval));
        attempts++;
      }
    } catch (error) {
      console.error('Error polling status:', error.message);
      await new Promise(resolve => setTimeout(resolve, pollInterval));
      attempts++;
    }
  }
  
  if (!isComplete) {
    console.warn(`Polling timed out after ${attempts} attempts. The refresh operation may still be in progress.`);
  }
  
  return isComplete;
}

/**
 * Command-line interface
 */
async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--refresh') || args.includes('-r')) {
    await triggerRefresh();
  }
  
  await fetchAndSaveGeopoliticalRiskData();
}

// Run the main function
if (require.main === module) {
  main().catch(error => {
    console.error('Error:', error.message);
    process.exit(1);
  });
}

// Export functions for use in other modules
module.exports = {
  fetchAndSaveGeopoliticalRiskData,
  triggerRefresh
};
