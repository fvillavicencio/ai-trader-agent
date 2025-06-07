/**
 * Environment setup script for Geopolitical Risk Analysis
 * 
 * This script will create a .env file with the necessary API keys
 * extracted from the previous Lambda deployment.
 */
const fs = require('fs');
const path = require('path');

console.log('Setting up environment variables for Google Cloud deployment...');

// API keys from the Lambda deployment output
const envVars = {
  // Google Cloud Project Configuration
  GOOGLE_CLOUD_PROJECT: 'ai-trader-agent',
  REGION: 'us-central1',
  BUCKET_NAME: 'geopolitical-risk-data',
  SCHEDULE: '0 */6 * * *',
  
  // API Keys (to be set during deployment)
  PERPLEXITY_API_KEY: process.env.PERPLEXITY_API_KEY || 'your_perplexity_api_key_here',
  PERPLEXITY_LAMBDA_API_KEY: process.env.PERPLEXITY_LAMBDA_API_KEY || 'your_perplexity_lambda_api_key_here',
  OPENAI_API_KEY: process.env.OPENAI_API_KEY || 'your_openai_api_key_here',
  
  // Model Configuration
  PERPLEXITY_MODEL: 'sonar-pro',
  PERPLEXITY_API_URL: 'https://api.perplexity.ai/chat/completions'
};

// Create the .env file content
const envContent = Object.entries(envVars)
  .map(([key, value]) => `${key}=${value}`)
  .join('\n');

// Write the .env file
const envPath = path.join(__dirname, '.env');
fs.writeFileSync(envPath, envContent);

console.log(`Environment file created at: ${envPath}`);
console.log('You can now deploy the solution with: npm run deploy');
