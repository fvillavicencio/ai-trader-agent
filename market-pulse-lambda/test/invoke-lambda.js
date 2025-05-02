/**
 * Test script to invoke the deployed Market Pulse Lambda function
 */

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const AWS = require('aws-sdk');

// Function name
const FUNCTION_NAME = 'MarketPulseDaily';

// Load sample data
const sampleDataPath = path.join(__dirname, '..', '..', 'market-pulse-handlebars', 'v2', 'sample-data.json');
const sampleData = JSON.parse(fs.readFileSync(sampleDataPath, 'utf8'));

// Create Lambda client
const lambda = new AWS.Lambda({
  region: 'us-east-1' // Make sure this matches your deployed region
});

async function invokeLambda() {
  console.log('Invoking Market Pulse Lambda function with sample data...');
  
  try {
    // Invoke the Lambda function
    const params = {
      FunctionName: FUNCTION_NAME,
      Payload: JSON.stringify(sampleData),
      InvocationType: 'RequestResponse'
    };
    
    const response = await lambda.invoke(params).promise();
    
    // Check for errors
    if (response.FunctionError) {
      console.error('Lambda function returned an error:', response.Payload);
      return;
    }
    
    // Parse the response payload
    const payload = JSON.parse(response.Payload);
    
    // Check if the response has the expected format
    if (payload.statusCode === 200) {
      const responseBody = JSON.parse(payload.body);
      
      // Save the HTML output to a file
      const outputPath = path.join(__dirname, 'aws-lambda-output.html');
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
      console.log('\nOpening the HTML output in your default browser...');
      
      // Determine the platform and open the browser accordingly
      if (process.platform === 'darwin') {  // macOS
        exec(`open "${outputPath}"`);
      } else if (process.platform === 'win32') {  // Windows
        exec(`start "" "${outputPath}"`);
      } else {  // Linux
        exec(`xdg-open "${outputPath}"`);
      }
      
      console.log('\nTest completed successfully!');
    } else {
      console.error('Lambda function returned an unexpected response:', payload);
    }
  } catch (error) {
    console.error('Error invoking Lambda function:', error);
  }
}

// Run the test
invokeLambda();
