const fs = require('fs');
const path = require('path');
const { LambdaClient, InvokeCommand } = require('@aws-sdk/client-lambda');
require('dotenv').config({ path: path.join(__dirname, 'src', '.env') });

// AWS Lambda configuration
const REGION = 'us-east-2';
const FUNCTION_NAME = 'GhostPublisherFunction';

// Create a Lambda client
const lambdaClient = new LambdaClient({ region: REGION });

// Read the full market_pulse_data.json file
const readMarketPulseData = () => {
  const dataPath = path.resolve(__dirname, 'market_pulse_data.json');
  console.log(`Reading market pulse data from: ${dataPath}`);
  try {
    const data = fs.readFileSync(dataPath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error(`Error reading market pulse data: ${error.message}`);
    throw error;
  }
};

// Create the payload for the Lambda function
const createLambdaPayload = () => {
  const marketPulseData = readMarketPulseData();
  
  return {
    ghostUrl: process.env.GHOST_URL,
    ghostApiKey: process.env.GHOST_API_KEY,
    newsletterId: "67f427c5744a72000854ee8f",
    jsonData: marketPulseData,
    featureImageUrl: "https://example.com/feature-image.jpg"
  };
};

// Invoke the Lambda function directly
async function invokeLambda() {
  const payload = createLambdaPayload();
  console.log('Invoking Lambda function with full market_pulse_data.json...');
  
  try {
    // Create the Lambda invoke command
    const command = new InvokeCommand({
      FunctionName: FUNCTION_NAME,
      Payload: JSON.stringify(payload),
      LogType: 'Tail' // This will return the last 4KB of the execution log
    });
    
    // Invoke the Lambda function
    const response = await lambdaClient.send(command);
    
    // Decode the log result (it's base64 encoded)
    const logResult = Buffer.from(response.LogResult, 'base64').toString();
    
    // Parse the payload response (it's a Uint8Array)
    const payloadString = Buffer.from(response.Payload).toString();
    const responsePayload = JSON.parse(payloadString);
    
    console.log('Lambda Response:');
    console.log('Status Code:', response.StatusCode);
    console.log('Function Error:', response.FunctionError || 'None');
    console.log('Payload:', JSON.stringify(responsePayload, null, 2));
    console.log('\nLog Output:');
    console.log(logResult);
    
    return { response, responsePayload, logResult };
  } catch (error) {
    console.error('Error invoking Lambda function:', error);
    throw error;
  }
}

// Run the test
invokeLambda()
  .then(() => console.log('Test completed successfully'))
  .catch(err => console.error('Test failed:', err.message));
