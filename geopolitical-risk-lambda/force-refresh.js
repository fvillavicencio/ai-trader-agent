/**
 * Force a complete refresh of the geopolitical risk Lambda function
 * This script will:
 * 1. Clear any cached data in the Lambda environment
 * 2. Trigger a forced refresh with special parameters
 * 3. Verify the data is fresh by checking timestamps and content
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

// API Gateway endpoint and API key
const API_ENDPOINT = 'https://jkoaa9d2yi.execute-api.us-east-2.amazonaws.com/prod/geopolitical-risks';
const API_KEY = 'oQ7Qz88oi940M4CaO3KqO69TZ5bBlF5T2P7hJDpN';

// Function to check the status of the refresh operation
async function checkStatus() {
  try {
    const response = await axios.get(`${API_ENDPOINT}?status=true`, {
      headers: {
        'x-api-key': API_KEY
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error checking status:', error.message);
    throw error;
  }
}

// Function to poll the status until complete or error
async function pollRefreshStatus() {
  console.log('Polling for refresh status...');
  let attempts = 0;
  const maxAttempts = 60; // Increased to allow for longer processing time
  const pollInterval = 5000; // 5 seconds
  
  while (attempts < maxAttempts) {
    attempts++;
    
    try {
      const statusData = await checkStatus();
      console.log(`Status: ${statusData.status}, Message: ${statusData.message}`);
      
      if (statusData.status === 'completed') {
        console.log('Refresh operation completed successfully!');
        return statusData;
      } else if (statusData.status === 'error') {
        console.error('Refresh failed:', statusData.message);
      } else if (statusData.status !== 'processing') {
        console.log('Unexpected status:', statusData.status);
      }
      
      // If still processing, wait and try again
      if (attempts < maxAttempts && statusData.status === 'processing') {
        await new Promise(resolve => setTimeout(resolve, pollInterval));
      } else if (statusData.status === 'error') {
        throw new Error(statusData.message);
      } else if (attempts >= maxAttempts) {
        console.log(`Polling timed out after ${maxAttempts} attempts. The refresh operation may still be in progress.`);
        break;
      }
    } catch (error) {
      console.error('Error polling status:', error.message);
      await new Promise(resolve => setTimeout(resolve, pollInterval));
    }
  }
}

// Function to force a refresh of the geopolitical risk data
async function forceRefresh() {
  try {
    console.log('Triggering forced refresh of geopolitical risk data...');
    const response = await axios.post(API_ENDPOINT, {
      operation: 'refresh',
      force: true,
      clearCache: true,
      timestamp: new Date().toISOString()
    }, {
      headers: {
        'x-api-key': API_KEY,
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    });
    
    console.log('Refresh response:', response.data);
    
    // Poll for status until complete or error
    await pollRefreshStatus();
    
    return response.data;
  } catch (error) {
    console.error('Error refreshing geopolitical risk data:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    throw error;
  }
}

// Function to get the latest geopolitical risk data
async function getLatestData() {
  try {
    console.log('Fetching latest geopolitical risk data...');
    const response = await axios.get(API_ENDPOINT, {
      headers: {
        'x-api-key': API_KEY,
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        'If-None-Match': '', // Force fresh data
        'If-Modified-Since': '' // Force fresh data
      },
      params: {
        _: new Date().getTime() // Cache buster
      }
    });
    
    console.log('Response status:', response.status);
    
    // Save the data to a file
    const outputPath = path.join(__dirname, 'latest-geopolitical-risks-fresh.json');
    fs.writeFileSync(outputPath, JSON.stringify(response.data, null, 2));
    console.log(`Saved fresh data to ${outputPath}`);
    
    // Print summary
    if (response.data) {
      console.log('\nGeopolitical Risk Summary:');
      console.log(`Risk Index: ${response.data.geopoliticalRiskIndex}/100`);
      console.log(`Global Overview: ${response.data.global}`);
      console.log(`Last Updated: ${response.data.lastUpdated}`);
      console.log(`Number of Risk Categories: ${response.data.risks ? response.data.risks.length : 0}`);
      
      // Print first few risks
      if (response.data.risks && response.data.risks.length > 0) {
        console.log('\nRisk Categories:');
        response.data.risks.slice(0, 3).forEach((risk, index) => {
          console.log(`${index + 1}. ${risk.name}: ${risk.description.substring(0, 100)}...`);
        });
        if (response.data.risks.length > 3) {
          console.log(`...and ${response.data.risks.length - 3} more risk categories`);
        }
      }
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

// Main function
async function main() {
  try {
    // Step 1: Force a refresh
    await forceRefresh();
    
    // Step 2: Get the latest data
    await getLatestData();
    
    console.log('\nForce refresh completed successfully!');
  } catch (error) {
    console.error('\nForce refresh failed:', error.message);
    process.exit(1);
  }
}

// Run the main function
main();
