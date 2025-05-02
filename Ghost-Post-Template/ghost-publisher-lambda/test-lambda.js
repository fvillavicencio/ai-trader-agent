/**
 * Test script for the Ghost Publisher Lambda function
 * This script simulates the Lambda environment locally
 */

const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../src/.env') });

// Import the Lambda handler
const { handler } = require('./index');

// Load environment variables
process.env.GHOST_URL = process.env.GHOST_URL || 'https://market-pulse-daily.ghost.io';
process.env.GHOST_API_KEY = process.env.GHOST_API_KEY || '67f457a5f41c9900013e1e47:44daf1e666349bde96fad6f9a65979ba1d0b11b161a5c765847218f5bd263b7c';
process.env.GHOST_NEWSLETTER_ID = process.env.GHOST_NEWSLETTER_ID || '67f427c5744a72000854ee8f';

// Load the JSON data
const dataFile = process.argv[2] || '../market_pulse_data.json';
const data = JSON.parse(fs.readFileSync(path.resolve(__dirname, dataFile), 'utf8'));

console.log(`Using data file: ${dataFile}`);
console.log('Ghost URL:', process.env.GHOST_URL);
console.log('Newsletter ID:', process.env.GHOST_NEWSLETTER_ID);

// Create a mock event object
const event = {
  body: JSON.stringify(data)
};

// Create a mock context object
const context = {
  succeed: (result) => {
    console.log('Lambda execution succeeded');
    console.log(result);
  },
  fail: (error) => {
    console.error('Lambda execution failed');
    console.error(error);
  }
};

// Execute the Lambda handler
async function runTest() {
  try {
    console.log('Starting Lambda test...');
    const result = await handler(event, context);
    console.log('Lambda test completed successfully');
    console.log('Status code:', result.statusCode);
    
    // Parse the response body
    const responseBody = JSON.parse(result.body);
    console.log('Post URL:', responseBody.postUrl);
    console.log('Post ID:', responseBody.postId);
    
    // Log member stats
    if (responseBody.members) {
      console.log('\nMember statistics:');
      console.log(`Total members: ${responseBody.members.all.length}`);
      console.log(`Paid members: ${responseBody.members.paid.length}`);
      console.log(`Free members: ${responseBody.members.free.length}`);
      console.log(`Comped members: ${responseBody.members.comped.length}`);
    }
    
    return result;
  } catch (error) {
    console.error('Error running Lambda test:', error);
    throw error;
  }
}

// Run the test
runTest()
  .then(() => console.log('Test completed'))
  .catch(err => console.error('Test failed:', err));
