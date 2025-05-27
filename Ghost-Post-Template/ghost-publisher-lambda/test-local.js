/**
 * Test the Lambda function locally
 * This script will invoke the Lambda function directly without going through API Gateway
 * and save the HTML output to a file
 */

const fs = require('fs');
const path = require('path');

// Import the Lambda handler
const { handler } = require('./index');

// Read the market pulse data
const jsonData = require('../market_pulse_data.json');

// Create the request payload
const payload = {
  testMode: true,
  jsonData,
  ghostUrl: 'https://market-pulse-daily.ghost.io',
  ghostApiKey: '67f457a5f41c9900013e1e47:44daf1e666349bde96fad6f9a65979ba1d0b11b161a5c765847218f5bd263b7c',
  newsletterId: '67f427c5744a72000854ee8f'
};

// Format date for filename
const getFormattedDate = () => {
  const now = new Date();
  return now.toISOString().slice(0, 10);
};

// Main function to test the Lambda locally
async function testLocalLambda() {
  console.log('Testing Lambda function locally');
  
  try {
    // Create the Lambda event
    const event = {
      body: JSON.stringify(payload)
    };
    
    // Create a mock context
    const context = {
      succeed: (result) => {
        console.log('Lambda execution succeeded');
        return result;
      },
      fail: (error) => {
        console.error('Lambda execution failed:', error);
        throw error;
      }
    };
    
    // Invoke the Lambda handler
    console.log('Invoking Lambda handler...');
    const response = await handler(event, context);
    
    console.log('Received response from Lambda handler');
    console.log(`Status: ${response.statusCode}`);
    
    // Save the full response for debugging
    const responseFile = path.resolve(__dirname, 'local-lambda-response.json');
    fs.writeFileSync(responseFile, JSON.stringify(response, null, 2), 'utf8');
    console.log(`Full response saved to: ${responseFile}`);
    
    // Extract HTML content if present
    const responseBody = JSON.parse(response.body);
    
    if (responseBody && responseBody.html) {
      const date = getFormattedDate();
      const htmlFilename = path.resolve(__dirname, `../market-pulse-local-${date}.html`);
      
      // Save the HTML content
      fs.writeFileSync(htmlFilename, responseBody.html, 'utf8');
      
      console.log(`\nHTML content successfully extracted!`);
      console.log(`File: ${htmlFilename}`);
      console.log(`Size: ${(responseBody.html.length / 1024).toFixed(2)} KB`);
      console.log(`\nView in browser: file://${htmlFilename}`);
      
      // Check if sentiment-images.json was used
      console.log('\nChecking for sentiment image usage:');
      const sentimentConfigPath = path.resolve(__dirname, './config/sentiment-images.json');
      const sentimentPaths = JSON.parse(fs.readFileSync(sentimentConfigPath, 'utf8'));
      
      // Look for each sentiment image path in the HTML
      Object.entries(sentimentPaths).forEach(([sentiment, imagePath]) => {
        if (responseBody.html.includes(imagePath)) {
          console.log(`✅ Found ${sentiment} image: ${imagePath}`);
        } else {
          console.log(`❌ Did not find ${sentiment} image: ${imagePath}`);
        }
      });
      
      return true;
    } else {
      console.log('No HTML content found in the response');
      console.log('Response keys:', Object.keys(responseBody || {}));
      return false;
    }
  } catch (error) {
    console.error('Error testing local Lambda:', error);
    return false;
  }
}

// Run the test
testLocalLambda()
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
