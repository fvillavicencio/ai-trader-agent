/**
 * Complete end-to-end test for geopolitical risk Lambda integration with Ghost
 * 
 * This script:
 * 1. Retrieves the latest geopolitical risk data directly from the Lambda function
 * 2. Saves the fresh data to the correct location for the Ghost post generator
 * 3. Runs the Ghost post generator and publisher with the correct credentials
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { execSync } = require('child_process');
const { LambdaClient, InvokeCommand } = require('@aws-sdk/client-lambda');

// Lambda function configuration
const REGION = 'us-east-2';
const FUNCTION_NAME = 'geopolitical-risk-analyzer';

// Initialize the Lambda client
const lambdaClient = new LambdaClient({ region: REGION });

// Ghost credentials
const GHOST_URL = 'https://market-pulse-daily.ghost.io';
const GHOST_API_KEY = '67f457a5f41c9900013e1e47:44daf1e666349bde96fad6f9a65979ba1d0b11b161a5c765847218f5bd263b7c';

// Path to the Ghost post template directory
const GHOST_TEMPLATE_DIR = path.join(__dirname, '..', 'Ghost-Post-Template');

/**
 * Invoke the Lambda function directly
 * @param {Object} payload - The payload to send to the Lambda function
 * @returns {Promise<Object>} - The Lambda function response
 */
async function invokeLambda(payload) {
  try {
    console.log(`Invoking Lambda function with payload: ${JSON.stringify(payload)}`);
    
    // Create the command
    const command = new InvokeCommand({
      FunctionName: FUNCTION_NAME,
      Payload: JSON.stringify(payload),
      InvocationType: 'RequestResponse' // Synchronous invocation
    });
    
    // Invoke the Lambda function
    const response = await lambdaClient.send(command);
    
    // Check for errors
    if (response.FunctionError) {
      throw new Error(`Lambda function error: ${response.FunctionError}`);
    }
    
    // Parse the response payload
    const responsePayload = Buffer.from(response.Payload).toString();
    const data = JSON.parse(responsePayload);
    
    console.log('Lambda function invoked successfully');
    return data;
  } catch (error) {
    console.error('Error invoking Lambda function:', error.message);
    throw error;
  }
}

// Function to check the status of the refresh operation
async function checkStatus() {
  try {
    const response = await invokeLambda({
      httpMethod: 'GET',
      path: '/geopolitical-risks',
      queryStringParameters: { status: 'true' }
    });
    
    // If the response has a body, parse it
    if (response.body) {
      return JSON.parse(response.body);
    }
    
    return response;
  } catch (error) {
    console.error('Error checking status:', error.message);
    throw error;
  }
}

// Function to poll the status until complete or error
async function pollRefreshStatus() {
  console.log('Polling for refresh status...');
  let attempts = 0;
  const maxAttempts = 60; // Increased to allow for longer processing time
  const pollInterval = 5000; // 5 seconds
  
  while (attempts < maxAttempts) {
    attempts++;
    
    try {
      const statusData = await checkStatus();
      console.log(`Status: ${statusData.status}, Message: ${statusData.message}`);
      
      if (statusData.status === 'completed') {
        console.log('Refresh operation completed successfully!');
        return statusData;
      } else if (statusData.status === 'error') {
        console.error('Refresh failed:', statusData.message);
      } else if (statusData.status !== 'processing') {
        console.log('Unexpected status:', statusData.status);
      }
      
      // If still processing, wait and try again
      if (attempts < maxAttempts && statusData.status === 'processing') {
        await new Promise(resolve => setTimeout(resolve, pollInterval));
      } else if (statusData.status === 'error') {
        throw new Error(statusData.message);
      } else if (attempts >= maxAttempts) {
        console.log(`Polling timed out after ${maxAttempts} attempts. The refresh operation may still be in progress.`);
        break;
      }
    } catch (error) {
      console.error('Error polling status:', error.message);
      await new Promise(resolve => setTimeout(resolve, pollInterval));
    }
  }
}

// Function to force a refresh of the geopolitical risk data
async function forceRefresh() {
  try {
    console.log('Forcing refresh of geopolitical risk data...');
    
    // Invoke the Lambda function with a refresh request
    const response = await invokeLambda({
      httpMethod: 'POST',
      path: '/geopolitical-risks/refresh',
      body: JSON.stringify({ operation: 'refresh' })
    });
    
    // Parse the response body if it exists
    const responseData = response.body ? JSON.parse(response.body) : response;
    
    if (response.statusCode !== 202) {
      throw new Error(`Unexpected status code: ${response.statusCode}`);
    }
    
    console.log('Refresh operation started successfully');
    console.log('Response:', JSON.stringify(responseData, null, 2));
    
    // Poll the status until the refresh is complete
    const finalStatus = await pollRefreshStatus();
    
    if (finalStatus.status === 'completed') {
      console.log('Refresh completed successfully!');
      return true;
    } else {
      throw new Error(`Refresh failed with status: ${finalStatus.status}, message: ${finalStatus.message}`);
    }
  } catch (error) {
    console.error('Error forcing refresh:', error.message);
    throw error;
  }
}

// Function to get the latest geopolitical risk data
async function getLatestData() {
  try {
    console.log('Fetching latest geopolitical risk data...');
    
    // Invoke the Lambda function with a GET request
    const response = await invokeLambda({
      httpMethod: 'GET',
      path: '/geopolitical-risks'
    });
    
    console.log('Response status:', response.statusCode);
    
    // Extract the data from the response body
    let data;
    if (response.body) {
      data = JSON.parse(response.body);
    } else {
      data = response;
    }
    
    // Save the data to a file
    const outputPath = path.join(__dirname, 'latest-geopolitical-risks-fresh.json');
    fs.writeFileSync(outputPath, JSON.stringify(data, null, 2));
    console.log(`Saved fresh data to: ${outputPath}`);
    
    // Save to the Ghost template directory
    const ghostOutputPath = path.join(GHOST_TEMPLATE_DIR, 'test-geopolitical-output.json');
    fs.writeFileSync(ghostOutputPath, JSON.stringify(data, null, 2));
    console.log(`Saved fresh data to Ghost template directory: ${ghostOutputPath}`);
    
    // Print summary
    if (data) {
      console.log('\nGeopolitical Risk Summary:');
      console.log(`Risk Index: ${data.geopoliticalRiskIndex}/100`);
      console.log(`Global Overview: ${data.global}`);
      console.log(`Last Updated: ${data.lastUpdated}`);
      console.log(`Number of Risk Categories: ${data.risks ? data.risks.length : 0}`);
      
      // If the data is in the macroeconomicFactors.geopoliticalRisks format, adjust the summary
      if (data.macroeconomicFactors && data.macroeconomicFactors.geopoliticalRisks) {
        const geopoliticalRisks = data.macroeconomicFactors.geopoliticalRisks;
        console.log('\nGeopolitical Risk Summary (from macroeconomicFactors format):');
        console.log(`Global Overview: ${geopoliticalRisks.global}`);
        console.log(`Last Updated: ${geopoliticalRisks.lastUpdated}`);
        console.log(`Number of Risk Categories: ${geopoliticalRisks.risks ? geopoliticalRisks.risks.length : 0}`);
      }
    }
    
    return data;
  } catch (error) {
    console.error('Error fetching geopolitical risk data:', error.message);
    throw error;
  }
}

// Function to create a temporary .env file for the Ghost publisher
function createTempEnvFile() {
  try {
    const envContent = `GHOST_URL="${GHOST_URL}"\nGHOST_API_KEY="${GHOST_API_KEY}"`;
    const envPath = path.join(GHOST_TEMPLATE_DIR, 'src', '.env');
    fs.writeFileSync(envPath, envContent, 'utf8');
    console.log('Temporary .env file created successfully.');
    return envPath;
  } catch (error) {
    console.error('Error creating temporary .env file:', error);
    throw error;
  }
}

// Function to run the Ghost post generator and publisher
async function runGhostPublisher() {
  try {
    console.log('\nRunning Ghost post generator and publisher...');
    
    // Create temporary .env file
    const envPath = createTempEnvFile();
    
    // Run the publisher script
    execSync(`node publish-to-ghost-runner.js "${GHOST_URL}" "${GHOST_API_KEY}"`, { 
      cwd: GHOST_TEMPLATE_DIR,
      stdio: 'inherit'
    });
    
    console.log('Ghost post published successfully!');
    
    // Clean up temporary .env file
    try {
      fs.unlinkSync(envPath);
      console.log('Temporary .env file cleaned up successfully.');
    } catch (err) {
      console.error('Error cleaning up temporary .env file:', err.message);
    }
  } catch (error) {
    console.error('Error running Ghost publisher:', error.message);
    throw error;
  }
}

// Main function to run the end-to-end test
async function main() {
  try {
    console.log('Starting end-to-end test for geopolitical risk Lambda integration with Ghost...');
    
    // Step 1: Get the latest data (skip refresh since we already have the latest data)
    console.log('\n===== STEP 1: FETCHING LATEST GEOPOLITICAL RISK DATA =====');
    await getLatestData();
    
    // Step 2: Run the Ghost post generator and publisher
    console.log('\n===== STEP 2: PUBLISHING TO GHOST =====');
    await runGhostPublisher();
    
    console.log('\nEnd-to-end test completed successfully!');
  } catch (error) {
    console.error('\nEnd-to-end test failed:', error.message);
    process.exit(1);
  }
}

// Run the main function
main();
