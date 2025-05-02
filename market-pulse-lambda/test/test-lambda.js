/**
 * Test script for the Market Pulse Lambda function
 * 
 * This script loads sample data and tests the Lambda function locally.
 */

const fs = require('fs');
const path = require('path');
const { handler } = require('../src/index');

// Load sample data
const sampleDataPath = path.join(__dirname, '..', '..', 'market-pulse-handlebars', 'v2', 'full-sample-data.json');
const sampleData = JSON.parse(fs.readFileSync(sampleDataPath, 'utf8'));

async function runTest() {
  console.log('Testing Market Pulse Lambda function with full sample data...');
  
  try {
    // Add isTest flag to get detailed response
    sampleData.isTest = true;
    
    // Call the Lambda handler with the sample data
    const result = await handler(sampleData);
    
    // Log the result status
    console.log(`Status code: ${result.statusCode}`);
    
    // Parse the response body
    const responseBody = JSON.parse(result.body);
    
    // Save the HTML output to a file
    const outputPath = path.join(__dirname, 'lambda-output.html');
    fs.writeFileSync(outputPath, responseBody.html);
    
    // Also save to full-sample-output.html for comparison
    const fullSampleOutputPath = path.join(__dirname, 'full-sample-output.html');
    fs.writeFileSync(fullSampleOutputPath, responseBody.html);
    
    console.log(`HTML output saved to: ${outputPath}`);
    
    // Log any comments
    if (responseBody.comments && responseBody.comments.length > 0) {
      console.log('\nComments:');
      responseBody.comments.forEach(comment => console.log(`- ${comment}`));
    } else {
      console.log('\nNo comments returned.');
    }
    
    console.log('\nTest completed successfully!');
  } catch (error) {
    console.error('Test failed:', error);
    console.error(error.stack);
  }
}

// Run the test
runTest();
