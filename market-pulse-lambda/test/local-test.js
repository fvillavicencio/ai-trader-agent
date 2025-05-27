/**
 * Market Pulse Daily - Local Test Script
 * 
 * This script simulates a Lambda invocation locally to test the function.
 */

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { handler } = require('../src/index');

// Read the complete test data from file
const testDataPath = path.join(__dirname, 'complete-test-data.json');
const testData = JSON.parse(fs.readFileSync(testDataPath, 'utf8'));

// Update the report date to current time
testData.reportDate = new Date().toISOString();

// Create a Lambda event object
const event = testData;

console.log('Running local test of Market Pulse Daily Lambda function...');
console.log('Received event:', JSON.stringify(event, null, 2));

// Simulate Lambda invocation
(async () => {
  try {
    const result = await handler(event);
    console.log('Test completed successfully!');
    
    // Write the HTML output to a file
    const outputPath = path.join(__dirname, 'output.html');
    fs.writeFileSync(outputPath, result.body);
    console.log(`HTML output written to: ${outputPath}`);
    
    // Use absolute path when opening the file
    const absolutePath = path.resolve(outputPath);
    exec(`open "${absolutePath}"`, (error) => {
      if (error) {
        console.error(`Error opening HTML file: ${error}`);
      }
    });
    
    console.log(`Status code: ${result.statusCode}`);
  } catch (error) {
    console.error('Error generating newsletter:', error);
    
    // Write an error HTML to file for debugging
    const errorHtml = `
      <html>
        <head><title>Market Pulse Daily - Error</title></head>
        <body>
          <h1>Error Generating Newsletter</h1>
          <pre>${error.stack || error}</pre>
        </body>
      </html>
    `;
    
    const outputPath = path.join(__dirname, 'output.html');
    fs.writeFileSync(outputPath, errorHtml);
    console.log(`HTML output written to: ${outputPath}`);
    
    console.log(`Status code: 500`);
  }
})();
