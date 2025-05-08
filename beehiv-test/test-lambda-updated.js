const { LambdaClient, InvokeCommand } = require('@aws-sdk/client-lambda');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, 'src', '.env') });

// AWS Lambda configuration
const REGION = 'us-east-2';
const FUNCTION_NAME = 'GhostPublisherFunction';

// Initialize the Lambda client
const lambdaClient = new LambdaClient({ region: REGION });

// Read the market pulse data
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
    newsletterId: process.env.GHOST_NEWSLETTER_ID || "67f427c5744a72000854ee8f",
    jsonData: marketPulseData,
    featureImageUrl: "https://example.com/feature-image.jpg"
  };
};

// Invoke the Lambda function
const invokeLambda = async () => {
  const payload = createLambdaPayload();
  console.log('Invoking Lambda function with full market_pulse_data.json...');
  
  try {
    const command = new InvokeCommand({
      FunctionName: FUNCTION_NAME,
      Payload: JSON.stringify(payload),
      LogType: 'Tail' // Include the execution log in the response
    });
    
    const response = await lambdaClient.send(command);
    
    // Decode the log output
    const logResult = Buffer.from(response.LogResult || '', 'base64').toString();
    
    // Parse the payload response
    const payloadResponse = Buffer.from(response.Payload || '').toString();
    
    console.log('Lambda Response:');
    console.log(`Status Code: ${response.StatusCode}`);
    console.log(`Function Error: ${response.FunctionError || 'None'}`);
    console.log(`Payload: ${payloadResponse}`);
    console.log('\nLog Output:');
    console.log(logResult);
    
    return { response, logResult, payloadResponse };
  } catch (error) {
    console.error('Error invoking Lambda function:', error);
    throw error;
  }
};

// Run the test
invokeLambda()
  .then(() => console.log('Test completed successfully'))
  .catch(err => console.error('Test failed:', err.message));
