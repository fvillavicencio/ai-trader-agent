/**
 * Enhanced Deployment Script for Geopolitical Risk Analysis
 * 
 * This script handles the deployment of Google Cloud Functions with proper environment variables
 * from local .env files without hardcoding any sensitive values.
 */
require('dotenv').config();
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Required environment variables for the generator function
const REQUIRED_ENV_VARS = [
  'GOOGLE_CLOUD_PROJECT',
  'REGION',
  'BUCKET_NAME',
  'OPENAI_API_KEY',
  'PERPLEXITY_API_KEY',
  'API_KEY',
  'NEWS_API_KEY',
  'RAPIDAPI_KEY',
  'RAPIDAPI_HOST'
];

// Optional environment variables with default values
const OPTIONAL_ENV_VARS = {
  'PERPLEXITY_MODEL': 'sonar-pro',
  'PERPLEXITY_API_URL': 'https://api.perplexity.ai/chat/completions',
  'SCHEDULE': '0 */6 * * *',
  'RAPIDAPI_ENDPOINT': 'https://insightsentry.p.rapidapi.com/v2/newsfeed'
};

// Function to create a temporary deployment .env file
async function createDeploymentEnvFile() {
  console.log('Creating deployment environment file...');
  
  // Check for missing required environment variables
  const missingVars = [];
  for (const envVar of REQUIRED_ENV_VARS) {
    if (!process.env[envVar]) {
      missingVars.push(envVar);
    }
  }
  
  // If there are missing variables, prompt the user
  if (missingVars.length > 0) {
    console.log('\n⚠️  Missing required environment variables:');
    for (const envVar of missingVars) {
      console.log(`   - ${envVar}`);
    }
    
    // Ask if user wants to continue with manual input
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    const answer = await new Promise(resolve => {
      rl.question('\nDo you want to enter these values now? (y/n): ', resolve);
    });
    
    if (answer.toLowerCase() !== 'y') {
      rl.close();
      console.log('Deployment cancelled.');
      process.exit(1);
    }
    
    // Prompt for each missing variable
    const userInputVars = {};
    for (const envVar of missingVars) {
      const value = await new Promise(resolve => {
        rl.question(`Enter value for ${envVar}: `, resolve);
      });
      userInputVars[envVar] = value;
    }
    
    rl.close();
    
    // Merge with process.env
    for (const [key, value] of Object.entries(userInputVars)) {
      process.env[key] = value;
    }
  }
  
  // Create the deployment .env content
  let envContent = '';
  
  // Add required variables
  for (const envVar of REQUIRED_ENV_VARS) {
    envContent += `${envVar}=${process.env[envVar]}\n`;
  }
  
  // Add optional variables (use defaults if not provided)
  for (const [envVar, defaultValue] of Object.entries(OPTIONAL_ENV_VARS)) {
    const value = process.env[envVar] || defaultValue;
    envContent += `${envVar}=${value}\n`;
  }
  
  // Write to .env.deploy file
  const deployEnvPath = path.join(__dirname, '.env.deploy');
  fs.writeFileSync(deployEnvPath, envContent);
  
  console.log(`Deployment environment file created at: ${deployEnvPath}`);
  return deployEnvPath;
}

// Function to deploy the generator function
async function deployGeneratorFunction(envFilePath) {
  console.log('\nDeploying generator function...');
  
  try {
    // Build the deployment command
    const project = process.env.GOOGLE_CLOUD_PROJECT;
    const region = process.env.REGION;
    const envVarsString = fs.readFileSync(envFilePath, 'utf8')
      .split('\n')
      .filter(line => line.trim() !== '')
      .map(line => `--set-env-vars=${line}`)
      .join(' ');
    
    // Execute the deployment command
    const deployCommand = `gcloud functions deploy geopolitical-risk-generator \\
      --gen2 \\
      --runtime=nodejs18 \\
      --region=${region} \\
      --source=./functions/generator \\
      --entry-point=generateGeopoliticalRisks \\
      --trigger-topic=${process.env.GENERATOR_TOPIC || 'geopolitical-risk-generator'} \\
      --memory=512MB \\
      --timeout=540s \\
      ${envVarsString}`;
    
    console.log('Executing deployment command...');
    execSync(deployCommand, { stdio: 'inherit' });
    
    console.log('Generator function deployed successfully!');
  } catch (error) {
    console.error('Error deploying generator function:', error.message);
    process.exit(1);
  }
}

// Function to deploy the API function
async function deployApiFunction(envFilePath) {
  console.log('\nDeploying API function...');
  
  try {
    // Build the deployment command
    const project = process.env.GOOGLE_CLOUD_PROJECT;
    const region = process.env.REGION;
    const envVarsString = fs.readFileSync(envFilePath, 'utf8')
      .split('\n')
      .filter(line => line.trim() !== '')
      .map(line => `--set-env-vars=${line}`)
      .join(' ');
    
    // Execute the deployment command
    const deployCommand = `gcloud functions deploy geopolitical-risk-api \\
      --gen2 \\
      --runtime=nodejs18 \\
      --region=${region} \\
      --source=./functions/api \\
      --entry-point=getGeopoliticalRisks \\
      --trigger-http \\
      --allow-unauthenticated \\
      --memory=256MB \\
      --timeout=60s \\
      ${envVarsString}`;
    
    console.log('Executing deployment command...');
    execSync(deployCommand, { stdio: 'inherit' });
    
    console.log('API function deployed successfully!');
  } catch (error) {
    console.error('Error deploying API function:', error.message);
    process.exit(1);
  }
}

// Function to set up the Cloud Scheduler
async function setupCloudScheduler() {
  console.log('\nSetting up Cloud Scheduler...');
  
  try {
    const project = process.env.GOOGLE_CLOUD_PROJECT;
    const region = process.env.REGION;
    const schedule = process.env.SCHEDULE || '0 */6 * * *';
    const topic = process.env.GENERATOR_TOPIC || 'geopolitical-risk-generator';
    
    // Check if scheduler job already exists
    try {
      execSync(`gcloud scheduler jobs describe geopolitical-risk-scheduler --project=${project}`);
      console.log('Scheduler job already exists. Updating...');
      
      // Delete existing job
      execSync(`gcloud scheduler jobs delete geopolitical-risk-scheduler --project=${project} --quiet`);
    } catch (error) {
      // Job doesn't exist, will create a new one
      console.log('Creating new scheduler job...');
    }
    
    // Create scheduler job
    const createCommand = `gcloud scheduler jobs create pubsub geopolitical-risk-scheduler \\
      --schedule="${schedule}" \\
      --topic=${topic} \\
      --message-body="Scheduled execution" \\
      --time-zone="America/New_York" \\
      --project=${project} \\
      --location=${region}`;
    
    execSync(createCommand, { stdio: 'inherit' });
    
    console.log('Cloud Scheduler set up successfully!');
  } catch (error) {
    console.error('Error setting up Cloud Scheduler:', error.message);
    process.exit(1);
  }
}

// Function to clean up after deployment
function cleanup(envFilePath) {
  console.log('\nCleaning up...');
  
  // Optionally remove the temporary deployment env file
  // Uncomment the following line if you want to remove the file after deployment
  // fs.unlinkSync(envFilePath);
  
  console.log('Cleanup complete.');
}

// Main deployment function
async function deploy() {
  console.log('Starting enhanced deployment process...');
  
  try {
    // Create deployment environment file
    const envFilePath = await createDeploymentEnvFile();
    
    // Deploy the functions
    await deployGeneratorFunction(envFilePath);
    await deployApiFunction(envFilePath);
    
    // Set up Cloud Scheduler
    await setupCloudScheduler();
    
    // Clean up
    cleanup(envFilePath);
    
    console.log('\n✅ Deployment completed successfully!');
    console.log('\nAPI Endpoint: https://' + process.env.REGION + '-' + process.env.GOOGLE_CLOUD_PROJECT + '.cloudfunctions.net/geopolitical-risk-api');
    console.log('Remember to include the API key in your requests using the X-API-Key header or as a query parameter.');
  } catch (error) {
    console.error('Deployment failed:', error.message);
    process.exit(1);
  }
}

// Execute the deployment
deploy();
