/**
 * Simple Geopolitical Risk Lambda Client
 * 
 * This script builds on the existing client.js to fetch geopolitical risk data
 * from the Lambda function and save it to a file.
 */

require('dotenv').config();
const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Configuration
const API_URL = 'https://jkoaa9d2yi.execute-api.us-east-2.amazonaws.com/prod/geopolitical-risks';
const API_KEY = 'oQ7Qz88oi940M4CaO3KqO69TZ5bBlF5T2P7hJDpN'; // API key from force-refresh.js
const OUTPUT_FILE = path.join(__dirname, 'geopolitical-risks-output.json');
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;
const POLL_INTERVAL_MS = 5000; // 5 seconds
const MAX_POLLING_ATTEMPTS = 60; // 5 minutes max polling time

/**
 * Fetch data with retry logic
 * @param {string} url - The URL to fetch data from
 * @param {number} retries - The current retry count
 * @returns {Promise<Object>} - The fetched data
 */
async function fetchWithRetry(url, retries = 0) {
  try {
    const response = await axios.get(url, {
      headers: {
        'x-api-key': API_KEY
      }
    });
    return response.data;
  } catch (error) {
    if (retries < MAX_RETRIES) {
      console.log(`Retry ${retries + 1}/${MAX_RETRIES} after error: ${error.message}`);
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS * Math.pow(2, retries)));
      return fetchWithRetry(url, retries + 1);
    } else {
      throw new Error(`Failed after ${MAX_RETRIES} retries: ${error.message}`);
    }
  }
}

/**
 * Trigger a refresh of the geopolitical risk data
 * @returns {Promise<Object>} - The refresh status
 */
async function triggerRefresh() {
  try {
    console.log('Triggering forced refresh of geopolitical risk data...');
    const response = await axios.post(`${API_URL}/refresh`, {}, {
      headers: {
        'x-api-key': API_KEY
      }
    });
    console.log(`Refresh response: ${JSON.stringify(response.data)}`);
    
    if (response.data.status === 'processing') {
      return await pollRefreshStatus();
    }
    
    return response.data;
  } catch (error) {
    console.error('Error triggering refresh:', error.message);
    throw error;
  }
}

/**
 * Poll the status endpoint until the refresh is complete
 * @returns {Promise<Object>} - The final status
 */
async function pollRefreshStatus() {
  console.log('Polling for refresh status...');
  let attempts = 0;
  
  while (attempts < MAX_POLLING_ATTEMPTS) {
    attempts++;
    
    try {
      // Use the correct status endpoint format from force-refresh.js
      const statusResponse = await axios.get(`${API_URL}?status=true`, {
        headers: {
          'x-api-key': API_KEY
        }
      });
      const status = statusResponse.data;
      
      console.log(`Status: ${status.status}, Message: ${status.message}`);
      
      if (status.status === 'completed') {
        console.log('Refresh operation completed successfully!');
        return status;
      } else if (status.status === 'failed') {
        throw new Error(`Refresh failed: ${status.message}`);
      }
      
      // Wait before polling again
      await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_MS));
    } catch (error) {
      console.error(`Error polling status (attempt ${attempts}):`, error.message);
      
      if (attempts >= MAX_POLLING_ATTEMPTS) {
        throw new Error('Maximum polling attempts reached');
      }
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_MS));
    }
  }
  
  throw new Error('Polling timed out');
}

/**
 * Fetch the latest geopolitical risk data
 * @param {boolean} forceRefresh - Whether to force a refresh
 * @returns {Promise<Object>} - The geopolitical risk data
 */
async function fetchGeopoliticalRiskData(forceRefresh = false) {
  try {
    if (forceRefresh) {
      await triggerRefresh();
    }
    
    console.log('Fetching latest geopolitical risk data...');
    const data = await fetchWithRetry(API_URL);
    
    // Check if the data is still being processed
    if (data.status === 'processing') {
      console.log('Data is still being processed. Polling for completion...');
      await pollRefreshStatus();
      return await fetchWithRetry(API_URL);
    }
    
    return data;
  } catch (error) {
    console.error('Error fetching geopolitical risk data:', error.message);
    throw error;
  }
}

/**
 * Save data to a file
 * @param {Object} data - The data to save
 * @param {string} filePath - The file path to save to
 */
function saveToFile(data, filePath) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    console.log(`Data saved to ${filePath}`);
  } catch (error) {
    console.error('Error saving data to file:', error.message);
    throw error;
  }
}

/**
 * Display a summary of the geopolitical risk data
 * @param {Object} data - The geopolitical risk data
 */
function displaySummary(data) {
  console.log('\nGeopolitical Risk Summary:');
  
  if (data.status === 'processing') {
    console.log(`Status: ${data.status}`);
    console.log(`Message: ${data.message || 'No message'}`);
    return;
  }
  
  // Extract data from the response structure
  const geopoliticalRisks = data.macroeconomicFactors?.geopoliticalRisks;
  const riskIndex = data.geopoliticalRiskIndex;
  const summary = data.summary;
  
  console.log(`Risk Index: ${riskIndex || 'N/A'}/100`);
  
  if (geopoliticalRisks) {
    console.log(`Global Overview: ${geopoliticalRisks.global || 'N/A'}`);
    console.log(`Last Updated: ${geopoliticalRisks.lastUpdated || 'N/A'}`);
    console.log(`Number of Risk Categories: ${geopoliticalRisks.risks?.length || 0}`);
    
    // Display risk categories
    if (geopoliticalRisks.risks && geopoliticalRisks.risks.length > 0) {
      console.log('\nRisk Categories:');
      geopoliticalRisks.risks.forEach((risk, index) => {
        console.log(`${index + 1}. ${risk.name} (${risk.impactLevel} impact, Region: ${risk.region})`);
        // Display a snippet of the description (first 100 characters)
        if (risk.description) {
          const snippet = risk.description.length > 100 ? 
            `${risk.description.substring(0, 100)}...` : risk.description;
          console.log(`   Description: ${snippet}`);
        }
        console.log(`   Source: ${risk.source} (${risk.sourceUrl})`);
        console.log('');
      });
    }
  } else if (data.risks) {
    // Handle the case where the data might be in a different format
    console.log(`Number of Risk Categories: ${data.risks.length || 0}`);
    
    if (data.risks && data.risks.length > 0) {
      console.log('\nRisk Categories:');
      data.risks.forEach((risk, index) => {
        console.log(`${index + 1}. ${risk.name} (${risk.impactLevel || 'Unknown'} impact, Region: ${risk.region || 'Unknown'})`);
        // Display a snippet of the description (first 100 characters)
        if (risk.description) {
          const snippet = risk.description.length > 100 ? 
            `${risk.description.substring(0, 100)}...` : risk.description;
          console.log(`   Description: ${snippet}`);
        }
        console.log(`   Source: ${risk.source || 'Unknown'} (${risk.sourceUrl || '#'})`);
        console.log('');
      });
    }
  }
  
  if (summary) {
    console.log('\nExecutive Summary:');
    console.log(summary);
  }
}

/**
 * Main function
 */
async function main() {
  try {
    // Parse command line arguments
    const args = process.argv.slice(2);
    const forceRefresh = args.includes('--refresh') || args.includes('-r');
    const outputFile = args.find(arg => arg.startsWith('--output='))?.split('=')[1] || OUTPUT_FILE;
    
    // Fetch the data
    const data = await fetchGeopoliticalRiskData(forceRefresh);
    
    // Save to file
    saveToFile(data, outputFile);
    
    // Display summary
    displaySummary(data);
    
    console.log('\nOperation completed successfully!');
  } catch (error) {
    console.error('Operation failed:', error.message);
    process.exit(1);
  }
}

// Run the main function if this script is executed directly
if (require.main === module) {
  main();
}

// Export functions for use in other scripts
module.exports = {
  fetchGeopoliticalRiskData,
  saveToFile,
  displaySummary
};
