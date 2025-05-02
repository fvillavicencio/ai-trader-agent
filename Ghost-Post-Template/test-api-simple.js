const axios = require('axios');
require('dotenv').config({ path: require('path').join(__dirname, 'src', '.env') });

// API Gateway endpoint and API key
const API_ENDPOINT = 'https://vrwz4xsvml.execute-api.us-east-2.amazonaws.com/prod/publish';
const API_KEY = process.env.GHOST_LAMBDA_API_KEY;

// Create a simplified test payload
const simplifiedPayload = {
  ghostUrl: process.env.GHOST_URL,
  ghostApiKey: process.env.GHOST_API_KEY,
  newsletterId: "67f427c5744a72000854ee8f",
  jsonData: {
    reportMetadata: {
      title: "Market Insights - Simple API Test",
      date: "May 2, 2025",
      time: "1:15 PM",
      timezone: "EDT"
    },
    marketSentiment: {
      overall: {
        value: 65,
        change: 5,
        interpretation: "Bullish"
      }
    }
  },
  featureImageUrl: "https://example.com/feature-image.jpg"
};

// Make the API request
async function testApiGateway() {
  console.log('Testing API Gateway with simplified payload...');
  console.log('API Key:', API_KEY);
  
  try {
    const response = await axios.post(API_ENDPOINT, simplifiedPayload, {
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY
      }
    });
    
    console.log('API Response Status:', response.status);
    console.log('API Response Data:', JSON.stringify(response.data, null, 2));
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
