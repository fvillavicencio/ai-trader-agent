// Test script to invoke the Lambda function with the corrected model name
const fs = require('fs');
const path = require('path');
const { handler } = require('./index');

// API Key
const apiKey = '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';

// Create a mock event object similar to what AWS Lambda would receive
const mockEvent = {
  requestType: 'geopoliticalRisks',
  PERPLEXITY_API_KEY: apiKey,
  useFallback: false
};

// Create output directory if it doesn't exist
const outputDir = path.join(__dirname, 'output');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir);
}

// Main function
async function testLambdaFunction() {
  try {
    console.log('Starting Lambda function test with corrected model name...');
    console.log('Request type:', mockEvent.requestType);
    console.log('API Key present:', !!mockEvent.PERPLEXITY_API_KEY);
    
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
    const outputFile = path.join(outputDir, `lambda-geopolitical-risks-${timestamp}.json`);
    
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
}

// Run the test
testLambdaFunction();
