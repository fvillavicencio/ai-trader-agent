/**
 * Test script to invoke the Lambda function directly
 * This will test if our image selection logic is working correctly
 */

const AWS = require('aws-sdk');
const fs = require('fs');
const path = require('path');

// Configure AWS SDK
AWS.config.update({ region: 'us-east-2' });
const lambda = new AWS.Lambda();

// Load test data
const testData = require('./test-input.json');

// Function to invoke Lambda
async function invokeLambda() {
  console.log('Invoking Lambda function with test data...');
  
  const params = {
    FunctionName: 'GhostPublisherFunction',
    InvocationType: 'RequestResponse', // Use 'Event' for async invocation
    LogType: 'Tail', // Include logs in the response
    Payload: JSON.stringify(testData)
  };
  
  try {
    const response = await lambda.invoke(params).promise();
    
    // Decode and display logs
    if (response.LogResult) {
      const logs = Buffer.from(response.LogResult, 'base64').toString('utf-8');
      console.log('\nLambda Logs:');
      console.log(logs);
    }
    
    // Display response
    console.log('\nLambda Response:');
    if (response.Payload) {
      const payload = JSON.parse(response.Payload);
      console.log(JSON.stringify(payload, null, 2));
    }
    
    return response;
  } catch (error) {
    console.error('Error invoking Lambda:', error);
    throw error;
  }
}

// Run the test
invokeLambda()
  .then(() => console.log('Test completed successfully'))
  .catch(err => console.error('Test failed:', err));
