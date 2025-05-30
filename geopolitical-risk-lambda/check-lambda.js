/**
 * Script to check the Lambda function status, data, and logs
 */
const AWS = require('aws-sdk');
const fs = require('fs');
const path = require('path');

// Configure AWS
AWS.config.update({ region: 'us-east-2' });
const lambda = new AWS.Lambda();
const cloudwatchlogs = new AWS.CloudWatchLogs();

// Lambda function name
const FUNCTION_NAME = 'geopolitical-risk-analyzer';

async function invokeLambda(operation = 'get') {
  console.log(`Invoking Lambda function ${FUNCTION_NAME} with operation: ${operation}`);
  
  const params = {
    FunctionName: FUNCTION_NAME,
    InvocationType: 'RequestResponse',
    Payload: JSON.stringify({
      queryStringParameters: {
        operation: operation
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
    
    // If the response contains a body, parse it
    if (payload.body) {
      const body = JSON.parse(payload.body);
      console.log('Response body:', JSON.stringify(body, null, 2));
      
      // Save the response to a file
      const outputDir = path.join(__dirname, 'lambda-output');
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }
      
      const outputFile = path.join(outputDir, `lambda-${operation}-response.json`);
      fs.writeFileSync(outputFile, JSON.stringify(body, null, 2));
      console.log(`Response saved to ${outputFile}`);
      
      return body;
    }
    
    return payload;
  } catch (error) {
    console.error('Error invoking Lambda function:', error);
    return null;
  }
}

/**
 * Get CloudWatch logs for the Lambda function
 */
async function getLambdaLogs() {
  console.log('\nGetting CloudWatch logs...');
  
  try {
    // Get the log group name for the Lambda function
    const logGroupName = `/aws/lambda/${FUNCTION_NAME}`;
    
    // Get log streams, sorted by most recent first
    const logStreams = await cloudwatchlogs.describeLogStreams({
      logGroupName,
      orderBy: 'LastEventTime',
      descending: true,
      limit: 1
    }).promise();
    
    if (!logStreams.logStreams || logStreams.logStreams.length === 0) {
      console.log('No log streams found');
      return;
    }
    
    // Get the most recent log stream
    const logStreamName = logStreams.logStreams[0].logStreamName;
    console.log(`Most recent log stream: ${logStreamName}`);
    
    // Get log events from the stream
    const logEvents = await cloudwatchlogs.getLogEvents({
      logGroupName,
      logStreamName,
      limit: 100,
      startFromHead: false
    }).promise();
    
    if (!logEvents.events || logEvents.events.length === 0) {
      console.log('No log events found');
      return;
    }
    
    // Save logs to a file
    const outputDir = path.join(__dirname, 'lambda-output');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    const logFile = path.join(outputDir, 'lambda-logs.txt');
    const logContent = logEvents.events.map(event => {
      const timestamp = new Date(event.timestamp).toISOString();
      return `${timestamp}: ${event.message}`;
    }).join('\n');
    
    fs.writeFileSync(logFile, logContent);
    console.log(`Logs saved to ${logFile}`);
    
    // Print the last 10 log events
    console.log('\nLast 10 log events:');
    logEvents.events.slice(-10).forEach(event => {
      const timestamp = new Date(event.timestamp).toISOString();
      console.log(`${timestamp}: ${event.message.trim()}`);
    });
  } catch (error) {
    console.error('Error getting CloudWatch logs:', error);
  }
}

async function main() {
  // Force a refresh
  console.log('\nForcing a refresh...');
  await invokeLambda('refresh');
  
  // Wait for processing to complete
  console.log('\nWaiting for processing to complete...');
  let status = 'processing';
  let attempts = 0;
  const maxAttempts = 10;
  
  while (status === 'processing' && attempts < maxAttempts) {
    console.log(`Checking status (attempt ${attempts + 1}/${maxAttempts})...`);
    await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
    
    const response = await invokeLambda('status');
    if (response && response.status) {
      status = response.status;
      console.log(`Current status: ${status}`);
    }
    
    attempts++;
  }
  
  // Get latest data
  console.log('\nGetting latest data...');
  await invokeLambda('get');
  
  // Get CloudWatch logs
  await getLambdaLogs();
}

main().catch(console.error);
