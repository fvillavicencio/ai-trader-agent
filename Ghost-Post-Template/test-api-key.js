const axios = require('axios');
require('dotenv').config({ path: './api-gateway-test.env' });

// API Gateway endpoint and API key
const API_ENDPOINT = 'https://vrwz4xsvml.execute-api.us-east-2.amazonaws.com/prod/publish';
const API_KEY = process.env.GHOST_LAMBDA_API_KEY;

// Test with different API key scenarios
async function testApiKey() {
  console.log('Testing API Gateway with different API key scenarios...');
  
  // Minimal payload for testing
  const minimalPayload = {
    message: "API key test"
  };
  
  // Test 1: With the API key
  console.log('\nTest 1: With API key');
  console.log('API Key:', API_KEY);
  try {
    const response1 = await axios.post(API_ENDPOINT, minimalPayload, {
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY
      }
    });
    console.log('Status:', response1.status);
    console.log('Data:', JSON.stringify(response1.data, null, 2));
  } catch (error) {
    console.error('Error:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Headers:', JSON.stringify(error.response.headers, null, 2));
      console.error('Data:', error.response.data);
    }
  }
  
  // Test 2: Without any API key
  console.log('\nTest 2: Without API key');
  try {
    const response2 = await axios.post(API_ENDPOINT, minimalPayload, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    console.log('Status:', response2.status);
    console.log('Data:', JSON.stringify(response2.data, null, 2));
  } catch (error) {
    console.error('Error:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Headers:', JSON.stringify(error.response.headers, null, 2));
      console.error('Data:', error.response.data);
    }
  }
  
  // Test 3: With an incorrect API key
  console.log('\nTest 3: With incorrect API key');
  try {
    const response3 = await axios.post(API_ENDPOINT, minimalPayload, {
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': 'incorrect-api-key'
      }
    });
    console.log('Status:', response3.status);
    console.log('Data:', JSON.stringify(response3.data, null, 2));
  } catch (error) {
    console.error('Error:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Headers:', JSON.stringify(error.response.headers, null, 2));
      console.error('Data:', error.response.data);
    }
  }
}

// Run the test
testApiKey()
  .then(() => console.log('API key tests completed'))
  .catch(err => console.error('Test failed:', err.message));
