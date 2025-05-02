const { LambdaClient, InvokeCommand } = require('@aws-sdk/client-lambda');
require('dotenv').config({ path: './api-gateway-test.env' });

// Configure AWS SDK
const lambda = new LambdaClient({ region: 'us-east-1' }); // Note: Using us-east-1 region

// Create a simple test payload
const testPayload = {
  ghostUrl: process.env.GHOST_URL,
  ghostApiKey: process.env.GHOST_API_KEY,
  newsletterId: process.env.GHOST_NEWSLETTER_ID,
  test: "data"
};

// Function to invoke Lambda directly
async function invokeLambda() {
  console.log('Invoking Lambda function directly...');
  
  const params = {
    FunctionName: 'GhostPublisherSimplified',
    InvocationType: 'RequestResponse',
    Payload: JSON.stringify(testPayload)
  };
  
  try {
    const command = new InvokeCommand(params);
    const response = await lambda.send(command);
    console.log('Lambda Response:');
    console.log('Status Code:', response.StatusCode);
    console.log('Function Error:', response.FunctionError || 'None');
    
    // Convert Uint8Array to string and then parse as JSON
    const responsePayload = Buffer.from(response.Payload).toString();
    const payload = JSON.parse(responsePayload);
    console.log('Payload:', JSON.stringify(payload, null, 2));
    
    return payload;
  } catch (error) {
    console.error('Error invoking Lambda:', error);
    throw error;
  }
}

// Run the test
invokeLambda()
  .then(() => console.log('Test completed successfully'))
  .catch(err => console.error('Test failed:', err.message));
