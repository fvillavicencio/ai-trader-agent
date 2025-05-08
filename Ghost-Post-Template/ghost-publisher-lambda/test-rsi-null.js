/**
 * Test script for the Ghost Publisher Lambda function with null RSI value
 * This script tests our fix for handling null RSI values
 */

const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Import the Lambda handler
const { handler } = require('./index');

// Set environment variables for Ghost credentials
process.env.GHOST_URL = process.env.GHOST_URL || 'https://market-pulse-daily.ghost.io';
process.env.GHOST_API_KEY = process.env.GHOST_API_KEY || '67f457a5f41c9900013e1e47:44daf1e666349bde96fad6f9a65979ba1d0b11b161a5c765847218f5bd263b7c';
process.env.GHOST_NEWSLETTER_ID = process.env.GHOST_NEWSLETTER_ID || '67f427c5744a72000854ee8f';

// Load the JSON data
const data = JSON.parse(fs.readFileSync(path.resolve(__dirname, 'test-rsi-null-payload.json'), 'utf8'));

console.log('Testing Lambda function with null RSI value...');
console.log('Ghost URL:', process.env.GHOST_URL);
console.log('Ghost Newsletter ID:', process.env.GHOST_NEWSLETTER_ID);

// Create a mock event object
const event = {
  body: JSON.stringify(data)
};

// Create a mock context object
const context = {
  succeed: (result) => {
    console.log('Lambda execution succeeded');
  },
  fail: (error) => {
    console.error('Lambda execution failed');
    console.error(error);
  }
};

// Execute the Lambda handler
async function runTest() {
  try {
    console.log('Starting Lambda test with null RSI value...');
    const result = await handler(event, context);
    console.log('Lambda test completed successfully');
    console.log('Status code:', result.statusCode);
    
    // Parse the response body
    let responseBody;
    try {
      responseBody = JSON.parse(result.body);
      console.log('Response body parsed successfully');
      console.log('Response type:', responseBody.type || 'unknown');
    } catch (error) {
      console.log('Response is not JSON, treating as HTML');
      responseBody = result.body;
      
      // Check if the response contains RSI
      const containsRSI = responseBody.includes('RSI:') || 
                         responseBody.includes('Relative Strength Index') ||
                         responseBody.includes('Path of Least Resistance');
      
      if (containsRSI) {
        console.error('❌ TEST FAILED: RSI is still being displayed despite null value');
        console.log('Found RSI references in the HTML output when it should be excluded');
      } else {
        console.log('✅ TEST PASSED: RSI is correctly excluded from the output');
        console.log('No RSI references found in the HTML output as expected');
      }
      
      // Save the HTML output to a file for inspection
      fs.writeFileSync('rsi-null-test-output.html', responseBody);
      console.log('HTML output saved to rsi-null-test-output.html for inspection');
    }
    
    return result;
  } catch (error) {
    console.error('Test failed with error:', error);
    throw error;
  }
}

// Run the test
runTest()
  .then(() => console.log('Test completed'))
  .catch(err => console.error('Test failed:', err));
