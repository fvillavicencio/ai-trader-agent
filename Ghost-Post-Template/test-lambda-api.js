const fs = require('fs');
const path = require('path');
const axios = require('axios');
require('dotenv').config({ path: path.join(__dirname, 'src', '.env') });

// API Gateway endpoint and API key
const API_ENDPOINT = 'https://vrwz4xsvml.execute-api.us-east-2.amazonaws.com/prod/publish';
const API_KEY = process.env.GHOST_LAMBDA_API_KEY;

// Read the test data from the API test input file
const readTestInput = () => {
  const testInputPath = path.resolve(__dirname, 'api-test-input.json');
  console.log(`Reading test input from: ${testInputPath}`);
  try {
    const data = fs.readFileSync(testInputPath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error(`Error reading test input: ${error.message}`);
    throw error;
  }
};

// Get the test input data
const testData = readTestInput();

// Make the API request
async function testLambdaApi() {
  console.log('Testing Lambda API with API Key...');
  console.log('Sending payload:', JSON.stringify(testData, null, 2));
  
  try {
    const response = await axios.post(API_ENDPOINT, testData, {
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY
      }
    });
    
    console.log('API Response Status:', response.status);
    console.log('API Response Data:', JSON.stringify(response.data, null, 2));
    return response.data;
  } catch (error) {
    console.error('Error calling Lambda API:', error.message);
    if (error.response) {
      console.error('Response Status:', error.response.status);
      console.error('Response Data:', error.response.data);
    }
    throw error;
  }
}

// Run the test
testLambdaApi()
  .then(() => console.log('Test completed successfully'))
  .catch(err => console.error('Test failed:', err.message));
