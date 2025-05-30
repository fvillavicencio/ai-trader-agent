/**
 * Script to check if the data files are being generated correctly in the Lambda function
 */
const AWS = require('aws-sdk');
const fs = require('fs');
const path = require('path');

// Configure AWS
AWS.config.update({ region: 'us-east-2' });
const lambda = new AWS.Lambda();

// Lambda function name
const FUNCTION_NAME = 'geopolitical-risk-analyzer';

/**
 * Invoke the Lambda function with a custom command to list files in the /tmp directory
 */
async function listLambdaTmpFiles() {
  console.log(`Checking files in Lambda /tmp directory...`);
  
  const params = {
    FunctionName: FUNCTION_NAME,
    InvocationType: 'RequestResponse',
    Payload: JSON.stringify({
      queryStringParameters: {
        operation: 'debug',
        command: 'list-files'
      }
    })
  };
  
  try {
    const response = await lambda.invoke(params).promise();
    console.log('Lambda response status code:', response.StatusCode);
    
    if (response.FunctionError) {
      console.error('Lambda function error:', response.FunctionError);
      console.error('Error payload:', response.Payload.toString());
      return null;
    }
    
    const payload = JSON.parse(response.Payload);
    console.log('Response payload:', JSON.stringify(payload, null, 2));
    
    // Save the response to a file
    const outputDir = path.join(__dirname, 'lambda-output');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    const outputFile = path.join(outputDir, `lambda-files-list.json`);
    fs.writeFileSync(outputFile, JSON.stringify(payload, null, 2));
    console.log(`Response saved to ${outputFile}`);
    
    return payload;
  } catch (error) {
    console.error('Error invoking Lambda function:', error);
    return null;
  }
}

/**
 * Force a refresh of the data
 */
async function forceRefresh() {
  console.log('Forcing a refresh of the data...');
  
  const params = {
    FunctionName: FUNCTION_NAME,
    InvocationType: 'RequestResponse',
    Payload: JSON.stringify({
      queryStringParameters: {
        operation: 'refresh'
      }
    })
  };
  
  try {
    const response = await lambda.invoke(params).promise();
    console.log('Lambda response status code:', response.StatusCode);
    
    if (response.FunctionError) {
      console.error('Lambda function error:', response.FunctionError);
      console.error('Error payload:', response.Payload.toString());
      return null;
    }
    
    const payload = JSON.parse(response.Payload);
    console.log('Response payload:', JSON.stringify(payload, null, 2));
    
    return payload;
  } catch (error) {
    console.error('Error invoking Lambda function:', error);
    return null;
  }
}

/**
 * Main function
 */
async function main() {
  // Force a refresh
  await forceRefresh();
  
  // Wait for 60 seconds to give the Lambda function time to process
  console.log('\nWaiting for 60 seconds to allow processing...');
  await new Promise(resolve => setTimeout(resolve, 60000));
  
  // Check the files in the /tmp directory
  await listLambdaTmpFiles();
}

main().catch(console.error);
