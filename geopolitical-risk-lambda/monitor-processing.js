/**
 * Script to monitor the Lambda function processing status until completion
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
 * Get the current processing status
 */
async function getStatus() {
  console.log('Checking processing status...');
  
  const params = {
    FunctionName: FUNCTION_NAME,
    InvocationType: 'RequestResponse',
    Payload: JSON.stringify({
      queryStringParameters: {
        operation: 'status'
      }
    })
  };
  
  try {
    const response = await lambda.invoke(params).promise();
    
    if (response.FunctionError) {
      console.error('Lambda function error:', response.FunctionError);
      console.error('Error payload:', response.Payload.toString());
      return null;
    }
    
    const payload = JSON.parse(response.Payload);
    
    if (payload.body) {
      const body = JSON.parse(payload.body);
      return body;
    }
    
    return payload;
  } catch (error) {
    console.error('Error invoking Lambda function:', error);
    return null;
  }
}

/**
 * List files in the Lambda /tmp directory
 */
async function listFiles() {
  console.log('Listing files in /tmp directory...');
  
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
    
    if (response.FunctionError) {
      console.error('Lambda function error:', response.FunctionError);
      console.error('Error payload:', response.Payload.toString());
      return null;
    }
    
    const payload = JSON.parse(response.Payload);
    
    if (payload.body) {
      const body = JSON.parse(payload.body);
      
      // Save the response to a file
      const outputDir = path.join(__dirname, 'lambda-output');
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }
      
      const outputFile = path.join(outputDir, `lambda-files-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
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
 * Get the latest data
 */
async function getData() {
  console.log('Getting latest data...');
  
  const params = {
    FunctionName: FUNCTION_NAME,
    InvocationType: 'RequestResponse',
    Payload: JSON.stringify({
      queryStringParameters: {
        operation: 'get'
      }
    })
  };
  
  try {
    const response = await lambda.invoke(params).promise();
    
    if (response.FunctionError) {
      console.error('Lambda function error:', response.FunctionError);
      console.error('Error payload:', response.Payload.toString());
      return null;
    }
    
    const payload = JSON.parse(response.Payload);
    
    if (payload.body) {
      const body = JSON.parse(payload.body);
      
      // Save the response to a file if it's not a processing message
      if (body.status !== 'processing') {
        const outputDir = path.join(__dirname, 'lambda-output');
        if (!fs.existsSync(outputDir)) {
          fs.mkdirSync(outputDir, { recursive: true });
        }
        
        const outputFile = path.join(outputDir, `lambda-data-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
        fs.writeFileSync(outputFile, JSON.stringify(body, null, 2));
        console.log(`Data saved to ${outputFile}`);
      }
      
      return body;
    }
    
    return payload;
  } catch (error) {
    console.error('Error invoking Lambda function:', error);
    return null;
  }
}

/**
 * Main function to monitor processing
 */
async function main() {
  const maxAttempts = 20;
  const delaySeconds = 15;
  let attempts = 0;
  let status = 'processing';
  
  console.log(`Starting monitoring of Lambda function ${FUNCTION_NAME}`);
  console.log(`Will check status every ${delaySeconds} seconds for up to ${maxAttempts} attempts`);
  
  while (status === 'processing' && attempts < maxAttempts) {
    attempts++;
    console.log(`\nAttempt ${attempts}/${maxAttempts}:`);
    
    // Get current status
    const statusResponse = await getStatus();
    if (statusResponse) {
      status = statusResponse.status;
      console.log(`Current status: ${status}`);
      console.log(`Message: ${statusResponse.message}`);
      console.log(`Timestamp: ${statusResponse.timestamp}`);
    } else {
      console.log('Failed to get status');
    }
    
    // List files in /tmp directory
    const filesResponse = await listFiles();
    if (filesResponse && filesResponse.files) {
      console.log(`Found ${filesResponse.files.length} files in ${filesResponse.directory}:`);
      filesResponse.files.forEach(file => {
        console.log(`- ${file.name} (${file.size} bytes, ${file.isDirectory ? 'directory' : 'file'})`);
      });
    }
    
    // If processing is complete, get the data
    if (status !== 'processing') {
      console.log('\nProcessing complete, getting data...');
      const data = await getData();
      if (data) {
        console.log('Successfully retrieved data');
      }
      break;
    }
    
    // Wait before next check
    if (attempts < maxAttempts) {
      console.log(`\nWaiting ${delaySeconds} seconds before next check...`);
      await new Promise(resolve => setTimeout(resolve, delaySeconds * 1000));
    }
  }
  
  if (status === 'processing') {
    console.log(`\nReached maximum number of attempts (${maxAttempts}). Processing is still ongoing.`);
  }
  
  console.log('\nMonitoring complete');
}

// Run the main function
main().catch(console.error);
