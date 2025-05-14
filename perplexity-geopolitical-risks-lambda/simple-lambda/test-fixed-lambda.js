// Test script to invoke the fixed Lambda function locally and save the output to a file
const fs = require('fs');
const path = require('path');
const { handler } = require('./fixed-index');

// Check if PERPLEXITY_API_KEY is available in environment variables
if (!process.env.PERPLEXITY_API_KEY) {
  console.error('Error: PERPLEXITY_API_KEY environment variable is not set.');
  console.error('Please set it before running this script:');
  console.error('export PERPLEXITY_API_KEY=your_api_key_here');
  process.exit(1);
}

// Create a mock event object similar to what AWS Lambda would receive
const mockEvent = {
  requestType: 'geopoliticalRisks',
  PERPLEXITY_API_KEY: process.env.PERPLEXITY_API_KEY
};

// Optional: Use fallback data for testing without making API calls
// mockEvent.useFallback = true;

console.log('Starting local Lambda function test...');
console.log('Request type:', mockEvent.requestType);
console.log('API Key present:', !!mockEvent.PERPLEXITY_API_KEY);

// Create output directory if it doesn't exist
const outputDir = path.join(__dirname, 'output');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir);
}

// Invoke the Lambda handler
(async () => {
  try {
    console.log('Invoking Lambda function...');
    const startTime = Date.now();
    
    // Call the handler function
    const result = await handler(mockEvent);
    
    const endTime = Date.now();
    const executionTime = (endTime - startTime) / 1000;
    
    console.log(`Lambda execution completed in ${executionTime.toFixed(2)} seconds`);
    
    // Format the JSON with indentation for better readability
    const formattedJson = JSON.stringify(result, null, 2);
    
    // Generate a timestamp for the filename
    const timestamp = new Date().toISOString().replace(/:/g, '-').replace(/\..+/, '');
    const outputFile = path.join(outputDir, `geopolitical-risks-${timestamp}.json`);
    
    // Write the result to a file
    fs.writeFileSync(outputFile, formattedJson);
    
    console.log(`Successfully saved output to: ${outputFile}`);
    
    // Print a summary of the results
    if (result.geopoliticalRiskIndex !== undefined) {
      console.log(`Geopolitical Risk Index: ${result.geopoliticalRiskIndex}`);
      console.log(`Number of risks identified: ${result.risks ? result.risks.length : 0}`);
      
      if (result.risks && result.risks.length > 0) {
        console.log('\nTop risks:');
        result.risks.slice(0, 3).forEach((risk, index) => {
          console.log(`${index + 1}. ${risk.name} (Impact: ${risk.impactLevel})`);
        });
      }
    } else {
      console.log('Unexpected result format or error:', result);
    }
  } catch (error) {
    console.error('Error during Lambda execution:', error);
  }
})();
