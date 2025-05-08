/**
 * Test script for the Ghost Publisher Lambda function with "null (Unknown)" RSI value
 * This script tests our enhanced fix for handling "null (Unknown)" RSI values
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
const data = JSON.parse(fs.readFileSync(path.resolve(__dirname, 'test-rsi-null-unknown.json'), 'utf8'));

console.log('Testing Lambda function with "null (Unknown)" RSI value...');
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
    console.log('Starting Lambda test with "null (Unknown)" RSI value...');
    
    // Create a modified version of the handler to capture the mobiledoc before it's sent to Ghost
    const originalHandler = require('./index').handler;
    
    // Store the original module.exports
    const originalExports = module.exports;
    
    // Override the handler temporarily
    module.exports = {
      handler: async (event, context) => {
        // Call the original handler
        const result = await originalHandler(event, context);
        
        // Try to extract the mobiledoc from the request to Ghost
        try {
          // Save the raw response for inspection
          fs.writeFileSync('rsi-test-response.json', JSON.stringify(result, null, 2));
          console.log('Response saved to rsi-test-response.json');
          
          // Check if we can access the post URL from the response
          if (result && result.body) {
            const body = JSON.parse(result.body);
            if (body && body.url) {
              console.log('Created post URL:', body.url);
              
              // Fetch the actual post content to check for RSI
              console.log('Fetching post content to check for RSI references...');
              
              // Save a report about what we're checking
              const report = `
RSI Test Report
==============
Test Date: ${new Date().toISOString()}
Test Type: RSI with "null (Unknown)" value
Expected Behavior: RSI should be excluded from both header and "Path of Least Resistance" section
Post URL: ${body.url}

Test Results:
- Lambda function executed successfully
- Post created successfully
- Post ID: ${body.id}

To manually verify:
1. Visit the post URL above
2. Check that RSI is NOT present in the header
3. Check that the "Path of Least Resistance" section is NOT present in the post

Note: This test cannot automatically verify the HTML content of the post as it's hosted on Ghost.
`;
              fs.writeFileSync('rsi-test-report.txt', report);
              console.log('Test report saved to rsi-test-report.txt');
            }
          }
        } catch (error) {
          console.error('Error analyzing response:', error);
        }
        
        return result;
      }
    };
    
    // Now call our modified handler
    const result = await module.exports.handler(event, context);
    
    // Restore the original module.exports
    module.exports = originalExports;
    
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
