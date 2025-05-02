const axios = require('axios');
require('dotenv').config({ path: './api-gateway-test.env' });

// API Gateway endpoint and API key
const API_ENDPOINT = 'https://vrwz4xsvml.execute-api.us-east-2.amazonaws.com/prod/publish';
const API_KEY = process.env.GHOST_LAMBDA_API_KEY;

// Create a simple payload for testing
const simplePayload = {
  ghostUrl: process.env.GHOST_URL,
  ghostApiKey: process.env.GHOST_API_KEY,
  newsletterId: process.env.GHOST_NEWSLETTER_ID,
  jsonData: {
    decision: {
      action: "HOLD",
      summary: "Market conditions suggest holding current positions.",
      confidence: 75
    },
    marketSentiment: {
      overall: "neutral",
      value: 0.2,
      description: "Market sentiment is neutral with slight bullish bias."
    }
  }
};

// Make the API request
async function testApiGateway() {
  console.log('Testing API Gateway with simple payload...');
  console.log('API Key:', API_KEY);
  
  try {
    const response = await axios.post(API_ENDPOINT, simplePayload, {
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
      console.error('Response Data:', error.response.data);
    }
    throw error;
  }
}

// Run the test
testApiGateway()
  .then(() => console.log('API Gateway test completed successfully'))
  .catch(err => console.error('API Gateway test failed:', err.message));
