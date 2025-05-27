const axios = require('axios');
const fs = require('fs');

// Read the test API config
const configFile = fs.readFileSync('./ghost-publisher-lambda/test-api-config.env', 'utf8');
const config = {};
configFile.split('\n').forEach(line => {
  const [key, value] = line.split('=');
  if (key && value) {
    config[key] = value;
  }
});

const API_ENDPOINT = config.API_ENDPOINT;
const API_KEY = config.API_KEY;

// Test the new API Gateway
async function testNewApi() {
  console.log('Testing new API Gateway endpoint...');
  console.log('API Endpoint:', API_ENDPOINT);
  console.log('API Key:', API_KEY);
  
  // Simple test payload
  const testPayload = {
    test: "data",
    message: "Testing API Gateway integration"
  };
  
  try {
    const response = await axios.post(API_ENDPOINT, testPayload, {
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY
      }
    });
    
    console.log('API Gateway Response:');
    console.log('Status:', response.status);
    console.log('Data:', JSON.stringify(response.data, null, 2));
    return response.data;
  } catch (error) {
    console.error('Error calling API Gateway:', error.message);
    if (error.response) {
      console.error('Response Status:', error.response.status);
      console.error('Response Headers:', JSON.stringify(error.response.headers, null, 2));
      console.error('Response Data:', error.response.data);
    } else if (error.request) {
      console.error('No response received:', error.request);
    }
    throw error;
  }
}

// Run the test
testNewApi()
  .then(() => console.log('Test completed successfully'))
  .catch(err => console.error('Test failed:', err.message));
