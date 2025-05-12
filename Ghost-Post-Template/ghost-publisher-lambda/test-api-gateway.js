/**
 * Test the deployed Lambda function via API Gateway
 * This script focuses on properly structuring the payload for API Gateway
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');
require('dotenv').config({ path: path.resolve(__dirname, '../src/.env') });

// Get the API Gateway endpoint
const apiEndpoint = fs.readFileSync(
  path.resolve(__dirname, 'api-endpoint.txt'),
  'utf8'
).trim();

// Read the API key from the environment file
const apiKeyFile = path.resolve(__dirname, 'test-api-config.env');
let apiKey = '';

if (fs.existsSync(apiKeyFile)) {
  const envContent = fs.readFileSync(apiKeyFile, 'utf8');
  const apiKeyMatch = envContent.match(/LAMBDA_API_KEY=(.+)/);
  if (apiKeyMatch && apiKeyMatch[1]) {
    apiKey = apiKeyMatch[1].trim();
  }
}

// Read the market pulse data
const jsonData = require('../market_pulse_data.json');

// Format date for filename
const getFormattedDate = () => {
  const now = new Date();
  return now.toISOString().slice(0, 10);
};

// Main function to test the deployed Lambda
async function testApiGateway() {
  console.log(`Testing deployed Lambda function via API Gateway: ${apiEndpoint}`);
  
  // Get Ghost credentials from environment variables or use test values
  // Note: In production, these values should always come from environment variables
  // We're only using hardcoded values here for testing purposes
  const ghostUrl = process.env.GHOST_URL || 'https://market-pulse-daily.ghost.io';
  const ghostApiKey = process.env.GHOST_API_KEY || '67f457a5f41c9900013e1e47:44daf1e666349bde96fad6f9a65979ba1d0b11b161a5c765847218f5bd263b7c';
  const newsletterId = process.env.GHOST_NEWSLETTER_ID || '67f427c5744a72000854ee8f';
  
  console.log('Using Ghost URL:', ghostUrl);
  console.log('Using Newsletter ID:', newsletterId);
  console.log('Ghost API Key is provided:', !!ghostApiKey);
  
  // Create the request payload
  // Simplify the payload structure to match what the Lambda function expects
  const payload = {
    // Send the data directly as the Lambda function expects
    jsonData: jsonData,
    ghostUrl: ghostUrl,
    ghostApiKey: ghostApiKey,
    newsletterId: newsletterId
  };
  
  try {
    // Set up request headers
    const headers = {
      'Content-Type': 'application/json'
    };
    
    // Add API key if available
    if (apiKey) {
      headers['x-api-key'] = apiKey;
      console.log('Using API key for authentication');
    } else {
      console.log('No API key found, proceeding without authentication');
    }
    
    console.log('Sending request to API Gateway...');
    const response = await axios.post(apiEndpoint, payload, { headers });
    
    console.log('Received response from API Gateway');
    console.log(`Status: ${response.status}`);
    
    // Save the full response for debugging
    const responseFile = path.resolve(__dirname, 'api-gateway-response.json');
    fs.writeFileSync(responseFile, JSON.stringify(response.data, null, 2), 'utf8');
    console.log(`Full response saved to: ${responseFile}`);
    
    // Extract HTML content if present
    if (response.data && response.data.html) {
      const date = getFormattedDate();
      const htmlFilename = path.resolve(__dirname, `../market-pulse-deployed-${date}.html`);
      
      // Save the HTML content
      fs.writeFileSync(htmlFilename, response.data.html, 'utf8');
      
      console.log(`\nHTML content successfully extracted!`);
      console.log(`File: ${htmlFilename}`);
      console.log(`Size: ${(response.data.html.length / 1024).toFixed(2)} KB`);
      console.log(`\nView in browser: file://${htmlFilename}`);
      
      return true;
    } else {
      console.log('No HTML content found in the response');
      console.log('Response data:', JSON.stringify(response.data, null, 2));
      return false;
    }
  } catch (error) {
    console.error('Error testing deployed Lambda:', error.message);
    
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error('Response data:', error.response.data);
    }
    
    return false;
  }
}

// Run the test
testApiGateway()
  .then(success => {
    if (success) {
      console.log('\nTest completed successfully');
    } else {
      console.error('\nTest failed');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('\nUnexpected error:', error);
    process.exit(1);
  });
