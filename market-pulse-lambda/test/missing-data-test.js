/**
 * Market Pulse Daily - Missing Data Test Script
 * 
 * This script tests the Lambda function with incomplete data to ensure it handles missing sections gracefully.
 */

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { handler } = require('../src/index');

// Read the missing data test file
const testDataPath = path.join(__dirname, 'missing-data-test.json');
const testData = JSON.parse(fs.readFileSync(testDataPath, 'utf8'));

// Update the report date to current time
testData.reportDate = new Date().toISOString();

// Create a Lambda event object
const event = testData;

console.log('Running test with missing data...');
console.log('Received event:', JSON.stringify(event, null, 2));

// Simulate Lambda invocation
(async () => {
  try {
    const result = await handler(event);
    console.log('Test completed successfully!');
    
    // Write the HTML output to a file
    const outputPath = path.join(__dirname, 'missing-data-output.html');
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
    
    const outputPath = path.join(__dirname, 'missing-data-output.html');
    fs.writeFileSync(outputPath, errorHtml);
    console.log(`HTML output written to: ${outputPath}`);
    
    console.log(`Status code: 500`);
  }
})();
