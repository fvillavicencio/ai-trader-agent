/**
 * Simplified test script for testing null RSI value handling
 */

const fs = require('fs');
const path = require('path');
const Handlebars = require('handlebars');

// Path to our test data file with null RSI
const testDataPath = path.join(__dirname, 'market_pulse_data_null_rsi.json');

// Read the test data
const testData = JSON.parse(fs.readFileSync(testDataPath, 'utf8'));

// Simplified version of the processData function that only handles RSI
function processRSIData(data) {
  const sampleData = JSON.parse(JSON.stringify(data)); // Deep clone
  
  // Process RSI data with our fix
  if (sampleData.marketIndicators && sampleData.marketIndicators.rsi && sampleData.marketIndicators.rsi.value !== null) {
    sampleData.marketIndicators = sampleData.marketIndicators || {};
    sampleData.marketIndicators.rsi = {
      value: sampleData.marketIndicators.rsi.value,
      interpretation: sampleData.marketIndicators.rsi.interpretation,
      explanation: sampleData.marketIndicators.rsi.explanation,
      source: sampleData.marketIndicators.rsi.source,
      sourceUrl: sampleData.marketIndicators.rsi.sourceUrl,
      asOf: sampleData.marketIndicators.rsi.asOf
    };
  } else if (sampleData.marketIndicators && sampleData.marketIndicators.rsi && sampleData.marketIndicators.rsi.value === null) {
    // If RSI value is null, remove the RSI object completely so it won't be displayed
    delete sampleData.marketIndicators.rsi;
  }
  
  return sampleData;
}

// Process the data
const processedData = processRSIData(testData);

// Save the processed data to a file for inspection
const outputPath = path.join(__dirname, 'processed-null-rsi-data.json');
fs.writeFileSync(outputPath, JSON.stringify(processedData, null, 2));

// Create a simple template to test if RSI section would be rendered
const templateSource = `
<!DOCTYPE html>
<html>
<head>
  <title>RSI Test</title>
</head>
<body>
  <h1>RSI Test Template</h1>
  
  {{#if marketIndicators.rsi}}
    <div class="rsi-section">
      <h2>Path of Least Resistance (RSI Section)</h2>
      <p>RSI Value: {{marketIndicators.rsi.value}}</p>
      <p>This section should NOT appear if our fix works correctly.</p>
    </div>
  {{else}}
    <div class="no-rsi">
      <h2>No RSI Section</h2>
      <p>The RSI section is correctly not displayed when RSI value is null.</p>
    </div>
  {{/if}}
</body>
</html>
`;

// Compile the template
const template = Handlebars.compile(templateSource);

// Render the HTML
const html = template(processedData);

// Save the HTML to a file
const htmlPath = path.join(__dirname, 'rsi-test-output.html');
fs.writeFileSync(htmlPath, html);

// Check if RSI section is present in the HTML
const containsRSI = html.includes('Path of Least Resistance');

console.log('\nTest Results:');
console.log('Original RSI value:', testData.marketIndicators.rsi.value);
console.log('RSI object after processing:', processedData.marketIndicators.rsi ? 'Present' : 'Removed');
console.log('RSI section in HTML output:', containsRSI ? 'Present' : 'Not present');
console.log(`\nIf our fix works correctly, the RSI section should NOT be present in the HTML.`);
console.log(`\nProcessed data saved to: ${outputPath}`);
console.log(`HTML output saved to: ${htmlPath}`);

// Open the HTML file in the browser for visual inspection
console.log('\nTo view the HTML output, open this file in your browser:');
console.log(`file://${htmlPath}`);
