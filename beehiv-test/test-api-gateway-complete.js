const fs = require('fs');
const path = require('path');
const axios = require('axios');
require('dotenv').config({ path: './api-gateway-test.env' });

// API Gateway endpoint and API key
const API_ENDPOINT = 'https://vrwz4xsvml.execute-api.us-east-2.amazonaws.com/prod/publish';
const API_KEY = process.env.GHOST_LAMBDA_API_KEY;

// Read the complete market pulse data file
const readMarketPulseData = () => {
  const dataPath = path.resolve(__dirname, 'market_pulse_data.json');
  console.log(`Reading complete market pulse data from: ${dataPath}`);
  try {
    const data = fs.readFileSync(dataPath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error(`Error reading market pulse data: ${error.message}`);
    throw error;
  }
};

// Test the API Gateway with the complete payload
async function testApiGatewayWithCompletePayload() {
  // Read the complete market pulse data
  const marketPulseData = readMarketPulseData();
  
  // Create the payload with Ghost credentials and the complete market pulse data
  const payload = {
    ghostUrl: process.env.GHOST_URL,
    ghostApiKey: process.env.GHOST_API_KEY,
    newsletterId: process.env.GHOST_NEWSLETTER_ID,
    jsonData: marketPulseData
  };
  
  console.log('Testing API Gateway with complete market_pulse_data.json...');
  console.log('API Key:', API_KEY);
  console.log('Payload size:', JSON.stringify(payload).length, 'bytes');
  console.log('Payload keys:', Object.keys(payload.jsonData));
  
  try {
    const response = await axios.post(API_ENDPOINT, payload, {
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY
      },
      // Increase timeout for large payload
      timeout: 60000
    });
    
    console.log('API Gateway Response:');
    console.log('Status:', response.status);
    console.log('Data:', JSON.stringify(response.data, null, 2));
    
    // Extract the post URL from the response
    const postUrl = response.data.postUrl || JSON.parse(response.data.body).postUrl;
    console.log('\nPost created successfully!');
    console.log('Post URL:', postUrl);
    
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
testApiGatewayWithCompletePayload()
  .then(() => console.log('Complete payload test completed successfully'))
  .catch(err => console.error('Complete payload test failed:', err.message));
