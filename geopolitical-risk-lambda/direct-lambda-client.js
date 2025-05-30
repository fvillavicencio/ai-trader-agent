/**
 * Direct Lambda Client for Geopolitical Risk Analysis
 * 
 * This client directly invokes the Lambda function using the AWS SDK,
 * which is the preferred method for testing and debugging.
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { LambdaClient, InvokeCommand } = require('@aws-sdk/client-lambda');

// Configuration
const REGION = 'us-east-2'; // AWS region where the Lambda function is deployed
const FUNCTION_NAME = 'geopolitical-risk-analyzer'; // Name of the Lambda function
const OUTPUT_FILE = path.join(__dirname, 'geopolitical-risks-output.json');

// Initialize the Lambda client
// Use default credentials from AWS CLI configuration
const lambdaClient = new LambdaClient({ 
  region: REGION
  // AWS SDK will automatically load credentials from the shared credentials file (~/.aws/credentials)
  // or from the environment variables
});

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

/**
 * Get the latest geopolitical risk data
 * @returns {Promise<Object>} - The geopolitical risk data
 */
async function getGeopoliticalRisks() {
  try {
    console.log('Getting latest geopolitical risk data...');
    
    // Invoke the Lambda function with a regular request
    const response = await invokeLambda({
      httpMethod: 'GET',
      path: '/geopolitical-risks'
    });
    
    return response;
  } catch (error) {
    console.error('Error getting geopolitical risk data:', error.message);
    throw error;
  }
}

/**
 * Trigger a refresh of the geopolitical risk data
 * @returns {Promise<Object>} - The refresh status
 */
async function triggerRefresh() {
  try {
    console.log('Triggering refresh of geopolitical risk data...');
    
    // Invoke the Lambda function with a refresh request
    const response = await invokeLambda({
      httpMethod: 'POST',
      path: '/geopolitical-risks/refresh',
      body: JSON.stringify({ operation: 'refresh' })
    });
    
    return response;
  } catch (error) {
    console.error('Error triggering refresh:', error.message);
    throw error;
  }
}

/**
 * Check the status of a refresh operation
 * @returns {Promise<Object>} - The refresh status
 */
async function checkStatus() {
  try {
    console.log('Checking refresh status...');
    
    // Invoke the Lambda function with a status check request
    const response = await invokeLambda({
      httpMethod: 'GET',
      path: '/geopolitical-risks',
      queryStringParameters: { status: 'true' }
    });
    
    return response;
  } catch (error) {
    console.error('Error checking status:', error.message);
    throw error;
  }
}

/**
 * Poll the status until the refresh is complete
 * @returns {Promise<Object>} - The final status
 */
async function pollUntilComplete() {
  console.log('Polling until refresh is complete...');
  
  const maxAttempts = 60; // 5 minutes max polling time (5 seconds per attempt)
  let attempts = 0;
  
  while (attempts < maxAttempts) {
    attempts++;
    console.log(`Polling attempt ${attempts}/${maxAttempts}...`);
    
    try {
      // Check the status
      const status = await checkStatus();
      
      // If the status is in the response body, parse it
      const statusData = status.body ? JSON.parse(status.body) : status;
      
      console.log(`Status: ${statusData.status}, Message: ${statusData.message || 'No message'}`);
      
      // If the refresh is complete, return the status
      if (statusData.status === 'completed') {
        console.log('Refresh is complete!');
        return await getGeopoliticalRisks();
      }
      
      // If the refresh failed, throw an error
      if (statusData.status === 'failed') {
        throw new Error(`Refresh failed: ${statusData.message}`);
      }
      
      // Wait before polling again
      await new Promise(resolve => setTimeout(resolve, 5000));
    } catch (error) {
      console.error(`Error polling (attempt ${attempts}):`, error.message);
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
  
  throw new Error(`Polling timed out after ${maxAttempts} attempts`);
}

/**
 * Save data to a file
 * @param {Object} data - The data to save
 * @param {string} filePath - The file path to save to
 */
function saveToFile(data, filePath) {
  try {
    // If the data is a response object with a body, extract the body
    const dataToSave = data.body ? JSON.parse(data.body) : data;
    
    fs.writeFileSync(filePath, JSON.stringify(dataToSave, null, 2));
    console.log(`Data saved to ${filePath}`);
  } catch (error) {
    console.error('Error saving data to file:', error.message);
    throw error;
  }
}

/**
 * Display a summary of the geopolitical risk data
 * @param {Object} data - The geopolitical risk data
 */
function displaySummary(data) {
  try {
    // If the data is a response object with a body, extract the body
    const dataToDisplay = data.body ? JSON.parse(data.body) : data;
    
    console.log('\nGeopolitical Risk Summary:');
    
    if (dataToDisplay.status === 'processing') {
      console.log(`Status: ${dataToDisplay.status}`);
      console.log(`Message: ${dataToDisplay.message || 'No message'}`);
      return;
    }
    
    // Extract data from the response structure
    const geopoliticalRisks = dataToDisplay.macroeconomicFactors?.geopoliticalRisks;
    const riskIndex = dataToDisplay.geopoliticalRiskIndex;
    const summary = dataToDisplay.summary;
    
    console.log(`Risk Index: ${riskIndex || 'N/A'}/100`);
    
    if (geopoliticalRisks) {
      console.log(`Global Overview: ${geopoliticalRisks.global || 'N/A'}`);
      console.log(`Last Updated: ${geopoliticalRisks.lastUpdated || 'N/A'}`);
      console.log(`Number of Risk Categories: ${geopoliticalRisks.risks?.length || 0}`);
      
      // Display risk categories
      if (geopoliticalRisks.risks && geopoliticalRisks.risks.length > 0) {
        console.log('\nRisk Categories:');
        geopoliticalRisks.risks.forEach((risk, index) => {
          console.log(`${index + 1}. ${risk.name} (${risk.impactLevel} impact, Region: ${risk.region})`);
          // Display a snippet of the description (first 100 characters)
          if (risk.description) {
            const snippet = risk.description.length > 100 ? 
              `${risk.description.substring(0, 100)}...` : risk.description;
            console.log(`   Description: ${snippet}`);
          }
          console.log(`   Source: ${risk.source} (${risk.sourceUrl})`);
          console.log('');
        });
      }
    }
    
    if (summary) {
      console.log('\nExecutive Summary:');
      console.log(summary);
    }
  } catch (error) {
    console.error('Error displaying summary:', error.message);
  }
}

/**
 * Main function
 */
async function main() {
  try {
    // Parse command line arguments
    const args = process.argv.slice(2);
    const shouldRefresh = args.includes('--refresh') || args.includes('-r');
    const shouldPoll = args.includes('--poll') || args.includes('-p');
    const shouldCheckStatus = args.includes('--status') || args.includes('-s');
    const outputFile = args.find(arg => arg.startsWith('--output='))?.split('=')[1] || OUTPUT_FILE;
    
    let data;
    
    if (shouldCheckStatus) {
      // Check the status
      data = await checkStatus();
    } else if (shouldRefresh) {
      // Trigger a refresh
      data = await triggerRefresh();
      
      if (shouldPoll) {
        // Poll until the refresh is complete
        data = await pollUntilComplete();
      }
    } else {
      // Get the latest data
      data = await getGeopoliticalRisks();
    }
    
    // Save the data to a file
    saveToFile(data, outputFile);
    
    // Display a summary
    displaySummary(data);
    
    console.log('\nOperation completed successfully!');
  } catch (error) {
    console.error('Operation failed:', error.message);
    process.exit(1);
  }
}

// Run the main function
main();
