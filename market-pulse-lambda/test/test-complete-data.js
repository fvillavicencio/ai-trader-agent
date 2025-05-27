/**
 * Test script for the Market Pulse Lambda function with complete test data
 * 
 * This script loads complete test data and tests the Lambda function locally.
 */

const fs = require('fs');
const path = require('path');
const { handler } = require('../src/index');

// Load complete test data
const completeDataPath = path.join(__dirname, 'complete-test-data.json');
const completeData = JSON.parse(fs.readFileSync(completeDataPath, 'utf8'));

async function runTest() {
  console.log('Testing Market Pulse Lambda function with complete test data...');
  
  try {
    // Call the Lambda handler with the complete test data
    const result = await handler(completeData);
    
    // Log the result status
    console.log(`Status code: ${result.statusCode}`);
    
    // Parse the response body
    const responseBody = JSON.parse(result.body);
    
    // Save the HTML output to a file
    const outputPath = path.join(__dirname, 'complete-output.html');
    fs.writeFileSync(outputPath, responseBody.html);
    console.log(`HTML output saved to: ${outputPath}`);
    
    // Log any comments
    if (responseBody.comments && responseBody.comments.length > 0) {
      console.log('\nComments:');
      responseBody.comments.forEach(comment => console.log(`- ${comment}`));
    } else {
      console.log('\nNo comments returned.');
    }
    
    // Open the HTML file in the default browser
    const { exec } = require('child_process');
    if (process.platform === 'darwin') {  // macOS
      exec(`open "${outputPath}"`);
    } else if (process.platform === 'win32') {  // Windows
      exec(`start "" "${outputPath}"`);
    } else {  // Linux
      exec(`xdg-open "${outputPath}"`);
    }
    
    console.log('\nTest completed successfully!');
  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Run the test
runTest();
