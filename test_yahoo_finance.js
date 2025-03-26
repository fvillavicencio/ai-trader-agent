/**
 * Local test script for the Yahoo Finance API
 * 
 * This script tests the Yahoo Finance API through RapidAPI
 * 
 * To run this script:
 * 1. Install Node.js if not already installed
 * 2. Run: npm install axios dotenv
 * 3. Create a .env file with your Yahoo Finance API key (YAHOO_FINANCE_API_KEY=your_key_here)
 * 4. Run: node test_yahoo_finance.js
 */

// Load environment variables from .env file
require('dotenv').config();
const axios = require('axios');

// Get the API key from environment variables
const YAHOO_FINANCE_API_KEY = process.env.YAHOO_FINANCE_API_KEY;

// Check if API key is available
if (!YAHOO_FINANCE_API_KEY) {
  console.error('Error: Yahoo Finance API key not found in environment variables.');
  console.log('Please create a .env file with YAHOO_FINANCE_API_KEY=your_key_here');
  process.exit(1);
}

console.log(`Using API key: ${YAHOO_FINANCE_API_KEY.substring(0, 5)}...`);

/**
 * Tests the Yahoo Finance API with a simple query
 */
async function testYahooFinanceAPI() {
  try {
    console.log("=== TESTING YAHOO FINANCE API ===");
    
    // Yahoo Finance API endpoint for fundamentals data
    const apiUrl = "https://apidojo-yahoo-finance-v1.p.rapidapi.com/stock/get-fundamentals";
    
    const options = {
      method: 'GET',
      url: apiUrl,
      params: {
        region: 'US',
        symbol: 'AAPL',
        lang: 'en-US',
        modules: 'assetProfile,summaryProfile,fundProfile'
      },
      headers: {
        'X-RapidAPI-Key': YAHOO_FINANCE_API_KEY,
        'X-RapidAPI-Host': 'apidojo-yahoo-finance-v1.p.rapidapi.com'
      }
    };
    
    console.log("Making API request...");
    
    // Make the API request
    const response = await axios.request(options);
    
    // Log the response status
    console.log(`Yahoo Finance API response status code: ${response.status}`);
    
    // Check if the request was successful
    if (response.status === 200) {
      const data = response.data;
      
      // Log the keys in the response for debugging
      console.log(`Yahoo Finance API response keys: ${Object.keys(data).join(', ')}`);
      
      // Check for specific data we expect from the fundamentals endpoint
      if (data && data.quoteSummary && data.quoteSummary.result) {
        console.log("Yahoo Finance API returned valid fundamentals data");
        console.log("Success: API request successful");
        
        // Display some sample data
        if (data.quoteSummary.result[0] && data.quoteSummary.result[0].assetProfile) {
          const profile = data.quoteSummary.result[0].assetProfile;
          console.log("\nCompany Profile Sample Data:");
          console.log(`Company: ${profile.companyName || 'N/A'}`);
          console.log(`Industry: ${profile.industry || 'N/A'}`);
          console.log(`Sector: ${profile.sector || 'N/A'}`);
          console.log(`Website: ${profile.website || 'N/A'}`);
          console.log(`Full-Time Employees: ${profile.fullTimeEmployees || 'N/A'}`);
        }
      } else {
        // Still consider it a success if we get valid JSON, just log what we received
        if (data && Object.keys(data).length > 0) {
          console.log(`Yahoo Finance API returned data but missing expected structure. Found keys: ${Object.keys(data).join(', ')}`);
          console.log("Partial Success: API returned data but not in the expected format");
        } else {
          console.log("Yahoo Finance API returned empty data object");
          console.log("Failed: Received a 200 status code but the response data was empty");
        }
      }
    } else {
      // Handle error response
      console.log(`Yahoo Finance API error response: ${JSON.stringify(response.data)}`);
      console.log(`Failed: API request failed with status code ${response.status}`);
    }
  } catch (error) {
    console.error("Error testing Yahoo Finance API:");
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      console.error(`Status: ${error.response.status}`);
      console.error(`Data: ${JSON.stringify(error.response.data)}`);
      console.error(`Headers: ${JSON.stringify(error.response.headers)}`);
    } else if (error.request) {
      // The request was made but no response was received
      console.error("No response received from server");
      console.error(error.request);
    } else {
      // Something happened in setting up the request that triggered an Error
      console.error("Error setting up request:", error.message);
    }
    console.error("Failed: API request error");
  }
}

// Run the test
testYahooFinanceAPI();
