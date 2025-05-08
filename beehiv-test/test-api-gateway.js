const fs = require('fs');
const path = require('path');
const axios = require('axios');
require('dotenv').config({ path: path.join(__dirname, 'src', '.env') });

// API Gateway endpoint and API key
const API_ENDPOINT = 'https://vrwz4xsvml.execute-api.us-east-2.amazonaws.com/prod/publish';
const API_KEY = process.env.GHOST_LAMBDA_API_KEY;

// Read the market pulse data
const readMarketPulseData = () => {
  const dataPath = path.resolve(__dirname, 'market_pulse_data.json');
  console.log(`Reading market pulse data from: ${dataPath}`);
  try {
    const data = fs.readFileSync(dataPath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error(`Error reading market pulse data: ${error.message}`);
    throw error;
  }
};

// Create the payload for the API Gateway
const createApiPayload = () => {
  const marketPulseData = readMarketPulseData();
  
  return {
    ghostUrl: process.env.GHOST_URL,
    ghostApiKey: process.env.GHOST_API_KEY,
    newsletterId: "67f427c5744a72000854ee8f",
    jsonData: marketPulseData,
    featureImageUrl: "https://example.com/feature-image.jpg"
  };
};

// Make the API request
async function testApiGateway() {
  const payload = createApiPayload();
  console.log('Testing API Gateway with API Key...');
  
  try {
    const response = await axios.post(API_ENDPOINT, payload, {
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
