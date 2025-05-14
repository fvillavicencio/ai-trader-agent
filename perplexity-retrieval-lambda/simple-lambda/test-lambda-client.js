/**
 * Direct Lambda Invocation Client for Perplexity Retriever
 * 
 * This script demonstrates how to directly invoke the Lambda function
 * using the AWS SDK, bypassing API Gateway timeout limitations.
 */

const { LambdaClient, InvokeCommand } = require('@aws-sdk/client-lambda');
const fs = require('fs');
const path = require('path');

// AWS Lambda configuration
const REGION = 'us-east-2';
const FUNCTION_NAME = 'perplexity-retriever';

// Create output directory if it doesn't exist
const outputDir = path.join(__dirname, 'output');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir);
}

/**
 * Invoke the Lambda function directly
 * @param {string} requestType - Type of data to retrieve ('geopoliticalRisks' or 'marketSentiment')
 * @returns {Promise<Object>} - Lambda response data
 */
async function invokeLambdaFunction(requestType = 'geopoliticalRisks') {
  console.log(`Invoking Lambda function "${FUNCTION_NAME}" with requestType: ${requestType}`);
  
  // Create Lambda client
  const lambdaClient = new LambdaClient({ region: REGION });
  
  // Prepare payload
  const payload = JSON.stringify({
    requestType: requestType
  });
  
  // Create command
  const command = new InvokeCommand({
    FunctionName: FUNCTION_NAME,
    Payload: Buffer.from(payload),
    LogType: 'Tail' // Include execution logs
  });
  
  try {
    const startTime = Date.now();
    
    // Invoke Lambda function
    const response = await lambdaClient.send(command);
    
    const endTime = Date.now();
    const executionTime = (endTime - startTime) / 1000;
    
    console.log(`Lambda invocation completed in ${executionTime.toFixed(2)} seconds`);
    console.log(`Status code: ${response.StatusCode}`);
    
    // Get execution logs
    if (response.LogResult) {
      const logs = Buffer.from(response.LogResult, 'base64').toString();
      console.log('\nExecution Logs:');
      console.log(logs);
    }
    
    // Parse response payload
    let responseData;
    if (response.Payload) {
      const payloadString = Buffer.from(response.Payload).toString();
      try {
        responseData = JSON.parse(payloadString);
        console.log('Successfully parsed payload JSON');
        
        // If the response contains a body field, it needs to be parsed
        if (responseData.body && typeof responseData.body === 'string') {
          try {
            responseData.body = JSON.parse(responseData.body);
            console.log('Successfully parsed body JSON');
          } catch (error) {
            console.warn('Failed to parse body as JSON, keeping as string');
          }
        }
      } catch (error) {
        console.warn('Failed to parse payload as JSON:', error);
        responseData = payloadString;
      }
    }
    
    // Save the response to a file
    const timestamp = new Date().toISOString().replace(/:/g, '-').replace(/\..+/, '');
    const outputFile = path.join(outputDir, `lambda-response-${requestType}-${timestamp}.json`);
    fs.writeFileSync(outputFile, JSON.stringify(responseData, null, 2));
    console.log(`Response saved to: ${outputFile}`);
    
    // Print a summary of the results
    if (responseData.body && responseData.body.geopoliticalRiskIndex !== undefined) {
      console.log(`Geopolitical Risk Index: ${responseData.body.geopoliticalRiskIndex}`);
      console.log(`Number of risks identified: ${responseData.body.risks ? responseData.body.risks.length : 0}`);
      
      if (responseData.body.risks && responseData.body.risks.length > 0) {
        console.log('\nTop risks:');
        responseData.body.risks.slice(0, 3).forEach((risk, index) => {
          console.log(`${index + 1}. ${risk.name}`);
        });
      }
    } else {
      console.log('Response data:', responseData);
    }
    
    return responseData;
  } catch (error) {
    console.error('Error invoking Lambda function:', error);
    throw error;
  }
}

// Main function to run the test
async function main() {
  try {
    console.log('Starting Lambda invocation test...');
    const result = await invokeLambdaFunction();
    console.log('Lambda invocation test completed successfully');
    return result;
  } catch (error) {
    console.error('Lambda invocation test failed:', error.message);
    return null;
  }
}

// Run the test
main();
