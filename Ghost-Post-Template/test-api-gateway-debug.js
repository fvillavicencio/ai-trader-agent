const axios = require('axios');
require('dotenv').config({ path: './api-gateway-test.env' });

// API Gateway endpoint and API key
const API_ENDPOINT = 'https://vrwz4xsvml.execute-api.us-east-2.amazonaws.com/prod/publish';
const API_KEY = process.env.GHOST_LAMBDA_API_KEY;

// Create a simple payload for testing
const debugPayload = {
  // Include the Ghost credentials directly
  ghostUrl: process.env.GHOST_URL,
  ghostApiKey: process.env.GHOST_API_KEY,
  newsletterId: process.env.GHOST_NEWSLETTER_ID,
  
  // Include a minimal dataset that should work
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
    },
    marketIndicators: {
      technicalAnalysis: {
        macd: {
          signal: "neutral",
          value: 0.05,
          description: "MACD is near the signal line, indicating potential consolidation."
        },
        rsi: {
          signal: "neutral",
          value: 55,
          description: "RSI is in the neutral zone, neither overbought nor oversold."
        }
      }
    }
  }
};

// Make the API request
async function testApiGateway() {
  console.log('Testing API Gateway with debug payload...');
  console.log('API Key:', API_KEY);
  console.log('API Endpoint:', API_ENDPOINT);
  
  try {
    // Log the request payload size
    const payloadString = JSON.stringify(debugPayload);
    console.log(`Payload size: ${payloadString.length} bytes`);
    
    const response = await axios.post(API_ENDPOINT, debugPayload, {
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY
      },
      // Increase timeout for better debugging
      timeout: 30000
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
testApiGateway()
  .then(() => console.log('API Gateway test completed successfully'))
  .catch(err => console.error('API Gateway test failed:', err.message));
