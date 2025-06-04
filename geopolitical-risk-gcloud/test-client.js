/**
 * Test client for the Geopolitical Risk API
 * 
 * This script tests the Google Cloud Function API for geopolitical risk analysis
 */
const axios = require('axios');
const readline = require('readline');

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Configuration - replace with your actual deployed function URL
let API_URL = '';

// Helper function to prompt for input
function prompt(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

// Get the latest geopolitical risk data
async function getLatestData() {
  try {
    console.log(`\nFetching latest data from: ${API_URL}`);
    const response = await axios.get(API_URL);
    console.log('\n✅ Successfully retrieved data:');
    console.log(JSON.stringify(response.data, null, 2));
    return response.data;
  } catch (error) {
    console.error('\n❌ Error fetching data:');
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error(error.response.data);
    } else {
      console.error(error.message);
    }
    return null;
  }
}

// Check the processing status
async function checkStatus() {
  try {
    console.log(`\nChecking status from: ${API_URL}?status=true`);
    const response = await axios.get(`${API_URL}?status=true`);
    console.log('\n✅ Status check successful:');
    console.log(JSON.stringify(response.data, null, 2));
    return response.data;
  } catch (error) {
    console.error('\n❌ Error checking status:');
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error(error.response.data);
    } else {
      console.error(error.message);
    }
    return null;
  }
}

// Trigger a refresh operation
async function triggerRefresh() {
  try {
    console.log(`\nTriggering refresh at: ${API_URL}`);
    const response = await axios.post(API_URL, {
      operation: 'refresh'
    });
    console.log('\n✅ Refresh triggered successfully:');
    console.log(JSON.stringify(response.data, null, 2));
    return response.data;
  } catch (error) {
    console.error('\n❌ Error triggering refresh:');
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error(error.response.data);
    } else {
      console.error(error.message);
    }
    return null;
  }
}

// Main function to run the tests
async function runTests() {
  try {
    console.log('🧪 Geopolitical Risk API Test Client');
    
    // Get the API URL from the user
    API_URL = await prompt('\nEnter the deployed function URL: ');
    
    while (true) {
      console.log('\n📋 Available actions:');
      console.log('1. Get latest data');
      console.log('2. Check status');
      console.log('3. Trigger refresh');
      console.log('4. Exit');
      
      const choice = await prompt('\nEnter your choice (1-4): ');
      
      switch (choice) {
        case '1':
          await getLatestData();
          break;
        case '2':
          await checkStatus();
          break;
        case '3':
          await triggerRefresh();
          break;
        case '4':
          console.log('\n👋 Exiting test client');
          rl.close();
          return;
        default:
          console.log('\n❌ Invalid choice. Please try again.');
      }
    }
  } catch (error) {
    console.error(`\n❌ Error: ${error.message}`);
  }
}

// Run the tests
runTests();
