const axios = require('axios');

// API Gateway endpoint from your memory
const API_ENDPOINT = 'https://jkoaa9d2yi.execute-api.us-east-2.amazonaws.com/prod/geopolitical-risks';

// API Key for authentication
const API_KEY = 'oQ7Qz88oi940M4CaO3KqO69TZ5bBlF5T2P7hJDpN';

// Function to get the latest geopolitical risks
async function getGeopoliticalRisks() {
  try {
    console.log('Fetching latest geopolitical risk data...');
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

// Function to refresh the geopolitical risks
async function refreshGeopoliticalRisks() {
  try {
    console.log('Triggering refresh of geopolitical risk data...');
    const response = await axios.post(API_ENDPOINT, {
      operation: 'refresh'
    }, {
      headers: {
        'x-api-key': API_KEY
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
  const maxAttempts = 30;
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

// Main function to run the tests
async function main() {
  const command = process.argv[2];
  
  if (command === '--refresh') {
    await refreshGeopoliticalRisks();
    // Get the latest data after refresh
    await getGeopoliticalRisks();
  } else {
    await getGeopoliticalRisks();
  }
}

// Run the main function
main().catch(error => {
  console.error('Error in main function:', error.message);
  process.exit(1);
});
