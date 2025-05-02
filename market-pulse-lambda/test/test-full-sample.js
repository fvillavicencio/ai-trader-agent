/**
 * Test script for the Market Pulse Lambda function with the full sample data
 * 
 * This script loads the full sample data from the handlebars directory and tests the Lambda function locally.
 */

const fs = require('fs');
const path = require('path');
const { handler } = require('../src/index');

// Load the full sample data from the handlebars directory
const sampleDataPath = path.join('/Users/frankvillavicencio/Documents/Development/Market Pulse Daily/market-pulse-handlebars/v2/sample-data.json');
const sampleData = JSON.parse(fs.readFileSync(sampleDataPath, 'utf8'));

async function runTest() {
  console.log('Testing Market Pulse Lambda function with full sample data from handlebars directory...');
  console.log(`Sample data loaded from: ${sampleDataPath}`);
  
  try {
    // Call the Lambda handler with the sample data
    const result = await handler(sampleData);
    
    // Log the result status
    console.log(`Status code: ${result.statusCode}`);
    
    // Parse the response body
    const responseBody = JSON.parse(result.body);
    
    // Save the HTML output to a file
    const outputPath = path.join(__dirname, 'full-sample-output.html');
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
