/**
 * Direct AWS Lambda Client for Geopolitical Risk Analysis
 * 
 * This client directly calls the AWS Lambda function using the AWS SDK
 * and saves the returned JSON file with the geopolitical risks.
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
const lambdaClient = new LambdaClient({ 
  region: REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});

/**
 * Invoke the Lambda function and get the geopolitical risk data
 * @param {boolean} forceRefresh - Whether to force a refresh of the data
 * @returns {Promise<Object>} - The geopolitical risk data
 */
async function invokeGeopoliticalRiskLambda(forceRefresh = false) {
  try {
    console.log(`Invoking Lambda function (forceRefresh: ${forceRefresh})...`);
    
    // Prepare the payload
    const payload = {
      action: forceRefresh ? 'refresh' : 'get',
      source: 'lambda-client'
    };
    
    // Create the command
    const command = new InvokeCommand({
      FunctionName: FUNCTION_NAME,
      Payload: JSON.stringify(payload),
      // Use RequestResponse invocation type to get the response synchronously
      InvocationType: 'RequestResponse'
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
 * Save the geopolitical risk data to a file
 * @param {Object} data - The geopolitical risk data
 * @param {string} filePath - The path to save the file to
 */
function saveToFile(data, filePath) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
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
  console.log('\nGeopolitical Risk Summary:');
  
  if (data.status === 'processing') {
    console.log(`Status: ${data.status}`);
    console.log(`Message: ${data.message || 'No message'}`);
    return;
  }
  
  // Extract data from the response structure
  const geopoliticalRisks = data.macroeconomicFactors?.geopoliticalRisks;
  const riskIndex = data.geopoliticalRiskIndex;
  const summary = data.summary;
  
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
      });
    }
  }
  
  if (summary) {
    console.log('\nExecutive Summary:');
    console.log(summary);
  }
}

/**
 * Main function
 */
async function main() {
  try {
    // Parse command line arguments
    const args = process.argv.slice(2);
    const forceRefresh = args.includes('--refresh') || args.includes('-r');
    const outputFile = args.find(arg => arg.startsWith('--output='))?.split('=')[1] || OUTPUT_FILE;
    
    // Invoke the Lambda function
    const data = await invokeGeopoliticalRiskLambda(forceRefresh);
    
    // Save to file
    saveToFile(data, outputFile);
    
    // Display summary
    displaySummary(data);
    
    console.log('\nOperation completed successfully!');
  } catch (error) {
    console.error('Operation failed:', error.message);
    process.exit(1);
  }
}

// Run the main function if this script is executed directly
if (require.main === module) {
  main();
}

// Export functions for use in other scripts
module.exports = {
  invokeGeopoliticalRiskLambda,
  saveToFile,
  displaySummary
};
