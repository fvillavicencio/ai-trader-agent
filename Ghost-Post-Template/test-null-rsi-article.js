/**
 * Test script for generating HTML with null RSI value
 * This script tests our fix for the RSI null value issue in the actual article generation
 */

const fs = require('fs');
const path = require('path');
const { handler } = require('./src/index');

// Path to our test data file with null RSI
const testDataPath = path.join(__dirname, 'market_pulse_data_null_rsi.json');

// Read the test data
const testData = JSON.parse(fs.readFileSync(testDataPath, 'utf8'));

// Create a mock event for the Lambda handler
const mockEvent = {
  body: JSON.stringify({
    jsonData: testData
  })
};

// Run the test
async function runTest() {
  try {
    console.log('Testing article generation with null RSI value...');
    
    // Call the Lambda handler
    const result = await handler(mockEvent);
    
    // Parse the response
    const response = JSON.parse(result.body);
    
    // Save the HTML output to a file for inspection
    const htmlOutputPath = path.join(__dirname, 'null-rsi-article-output.html');
    fs.writeFileSync(htmlOutputPath, response.html);
    
    console.log(`HTML output saved to: ${htmlOutputPath}`);
    console.log('Test completed successfully');
    
    // Check if RSI section is present in the HTML
    const htmlContent = response.html;
    const containsRSI = htmlContent.includes('Path of Least Resistance');
    
    console.log(`\nRSI section present in HTML: ${containsRSI}`);
    console.log(`If our fix works correctly, this should be: false`);
    
    return response;
  } catch (error) {
    console.error('Test failed:', error);
    throw error;
  }
}

// Run the test
runTest()
  .then(response => {
    console.log('\nTest summary:');
    console.log('- HTML generation successful:', !!response.html);
    console.log('- HTML length:', response.html ? response.html.length : 0);
  })
  .catch(err => console.error('Test execution failed:', err));
