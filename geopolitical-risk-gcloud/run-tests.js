/**
 * Test Runner for Geopolitical Risk Analysis
 * 
 * This script helps run the test-multiple-runs.js script with proper environment variables.
 * It ensures all necessary API keys are configured for testing against the deployed Google Cloud Function.
 */
require('dotenv').config();
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Function to prompt for API key if not found in environment
async function getApiKey() {
  // Check if API_KEY exists in environment
  if (process.env.API_KEY) {
    return process.env.API_KEY;
  }
  
  // If not, prompt the user
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  console.log('\n⚠️  API_KEY not found in environment variables.');
  
  const apiKey = await new Promise(resolve => {
    rl.question('Enter your API key for authentication: ', resolve);
  });
  
  rl.close();
  
  return apiKey;
}

// Function to get API endpoint
async function getApiEndpoint() {
  // Check if API_ENDPOINT exists in environment
  if (process.env.API_ENDPOINT) {
    return process.env.API_ENDPOINT;
  }
  
  // If not, construct from project and region
  if (process.env.GOOGLE_CLOUD_PROJECT && process.env.REGION) {
    return `https://${process.env.REGION}-${process.env.GOOGLE_CLOUD_PROJECT}.cloudfunctions.net/geopolitical-risk-api`;
  }
  
  // If still not available, prompt the user
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  console.log('\n⚠️  API_ENDPOINT not found in environment variables.');
  
  const apiEndpoint = await new Promise(resolve => {
    rl.question('Enter the API endpoint URL: ', resolve);
  });
  
  rl.close();
  
  return apiEndpoint;
}

// Main function to run tests
async function runTests() {
  console.log('🔍 Setting up test environment for Geopolitical Risk Analysis...');
  
  try {
    // Get API key and endpoint
    const apiKey = await getApiKey();
    const apiEndpoint = await getApiEndpoint();
    
    if (!apiKey || !apiEndpoint) {
      console.error('❌ Missing required configuration. Cannot proceed with tests.');
      process.exit(1);
    }
    
    console.log(`\n✅ Using API endpoint: ${apiEndpoint}`);
    
    // Create temporary .env file for tests
    const testEnvPath = path.join(__dirname, '.env.test');
    const envContent = `API_KEY=${apiKey}\nAPI_ENDPOINT=${apiEndpoint}\n`;
    fs.writeFileSync(testEnvPath, envContent);
    
    console.log('✅ Test environment configured.');
    console.log('\n🚀 Running test-multiple-runs.js...');
    console.log('This will execute 5 test runs with 45-minute intervals between runs.');
    console.log('Results will be saved to the comparison-results directory.');
    
    // Run the test script with the temporary .env file
    execSync(`node -r dotenv/config test-multiple-runs.js dotenv_config_path=${testEnvPath}`, { 
      stdio: 'inherit',
      env: {
        ...process.env,
        API_KEY: apiKey,
        API_ENDPOINT: apiEndpoint
      }
    });
    
    // Clean up
    fs.unlinkSync(testEnvPath);
    
  } catch (error) {
    console.error('❌ Error running tests:', error.message);
    process.exit(1);
  }
}

// Run the tests
runTests();
