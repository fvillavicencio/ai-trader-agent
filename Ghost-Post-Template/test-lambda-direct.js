const fs = require('fs');
const path = require('path');
const { LambdaClient, InvokeCommand } = require('@aws-sdk/client-lambda');
require('dotenv').config({ path: path.join(__dirname, 'src', '.env') });

// AWS Lambda configuration
const REGION = 'us-east-2';
const FUNCTION_NAME = 'GhostPublisherFunction';

// Create a Lambda client
const lambdaClient = new LambdaClient({ region: REGION });

// Read the test data
const readTestInput = () => {
  const testInputPath = path.resolve(__dirname, 'api-test-input.json');
  console.log(`Reading test input from: ${testInputPath}`);
  try {
    const data = fs.readFileSync(testInputPath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error(`Error reading test input: ${error.message}`);
    throw error;
  }
};

// Invoke the Lambda function directly
async function invokeLambda() {
  const testData = readTestInput();
  console.log('Invoking Lambda function directly...');
  console.log('Payload:', JSON.stringify(testData, null, 2));
  
  try {
    // Create the Lambda invoke command
    const command = new InvokeCommand({
      FunctionName: FUNCTION_NAME,
      Payload: JSON.stringify(testData),
      LogType: 'Tail' // This will return the last 4KB of the execution log
    });
    
    // Invoke the Lambda function
    const response = await lambdaClient.send(command);
    
    // Decode the log result (it's base64 encoded)
    const logResult = Buffer.from(response.LogResult, 'base64').toString();
    
    // Parse the payload response (it's a Uint8Array)
    const payloadString = Buffer.from(response.Payload).toString();
    const payload = JSON.parse(payloadString);
    
    console.log('Lambda Response:');
    console.log('Status Code:', response.StatusCode);
    console.log('Function Error:', response.FunctionError || 'None');
    console.log('Payload:', JSON.stringify(payload, null, 2));
    console.log('\nLog Output:');
    console.log(logResult);
    
    return { response, payload, logResult };
  } catch (error) {
    console.error('Error invoking Lambda function:', error);
    throw error;
  }
}

// Run the test
invokeLambda()
  .then(() => console.log('Test completed successfully'))
  .catch(err => console.error('Test failed:', err.message));
