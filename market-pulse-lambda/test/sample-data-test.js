/**
 * Market Pulse Daily - Sample Data Test Script
 * 
 * This script tests the Lambda function with the sample data from the handlebars project.
 */

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { handler } = require('../src/index');

// Read the sample data from the handlebars project
const sampleDataPath = path.join(__dirname, '../../market-pulse-handlebars/v2/sample-data.json');
const sampleData = JSON.parse(fs.readFileSync(sampleDataPath, 'utf8'));

// Update the report date to current time
sampleData.reportDate = new Date().toISOString();

// Create a Lambda event object
const event = sampleData;

console.log('Running test with sample data from handlebars project...');

// Simulate Lambda invocation
(async () => {
  try {
    const result = await handler(event);
    console.log('Test completed successfully!');
    
    // Write the HTML output to a file
    const outputPath = path.join(__dirname, 'sample-output.html');
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
    
    const outputPath = path.join(__dirname, 'sample-output.html');
    fs.writeFileSync(outputPath, errorHtml);
    console.log(`HTML output written to: ${outputPath}`);
    
    console.log(`Status code: 500`);
  }
})();
