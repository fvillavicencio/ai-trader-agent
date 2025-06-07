/**
 * Automated deployment script for Geopolitical Risk Analysis on Google Cloud
 */
require('dotenv').config();
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuration
const PROJECT_ID = process.env.GOOGLE_CLOUD_PROJECT || 'ai-trader-agent'; // Default to existing project
const BUCKET_NAME = process.env.BUCKET_NAME || 'geopolitical-risk-data';
const REGION = process.env.REGION || 'us-central1';

console.log('Starting deployment of Geopolitical Risk Analysis to Google Cloud...');

// Ensure the user is logged in to gcloud
try {
  console.log('Checking gcloud authentication...');
  execSync('gcloud auth list', { stdio: 'inherit' });
} catch (error) {
  console.error('Error: You need to authenticate with Google Cloud first.');
  console.log('Run: gcloud auth login');
  process.exit(1);
}

// Set the project
try {
  console.log(`Setting Google Cloud project to: ${PROJECT_ID}`);
  execSync(`gcloud config set project ${PROJECT_ID}`, { stdio: 'inherit' });
} catch (error) {
  console.error(`Error setting project: ${error.message}`);
  process.exit(1);
}

// Create the storage bucket if it doesn't exist
try {
  console.log(`Creating Cloud Storage bucket: ${BUCKET_NAME}`);
  execSync(`gsutil mb -p ${PROJECT_ID} -l ${REGION} gs://${BUCKET_NAME} || true`, { stdio: 'inherit' });
  
  // Set public access if needed
  console.log('Setting bucket permissions for public access...');
  execSync(`gsutil iam ch allUsers:objectViewer gs://${BUCKET_NAME}`, { stdio: 'inherit' });
} catch (error) {
  console.log(`Note: Bucket may already exist or you may not have permission: ${error.message}`);
}

// Deploy the generator function
try {
  console.log('Deploying the generator function...');
  execSync('npm run deploy:generator', { stdio: 'inherit' });
} catch (error) {
  console.error(`Error deploying generator function: ${error.message}`);
  process.exit(1);
}

// Deploy the API function
try {
  console.log('Deploying the API function...');
  execSync('npm run deploy:api', { stdio: 'inherit' });
} catch (error) {
  console.error(`Error deploying API function: ${error.message}`);
  process.exit(1);
}

// Set up the scheduler
try {
  console.log('Setting up Cloud Scheduler...');
  execSync('npm run setup:scheduler', { stdio: 'inherit' });
} catch (error) {
  console.error(`Error setting up scheduler: ${error.message}`);
  console.log('You may need to set up the scheduler manually.');
}

console.log('\n✅ Deployment completed successfully!');
console.log('\nYour Geopolitical Risk Analysis system is now available at:');
console.log(`https://${REGION}-${PROJECT_ID}.cloudfunctions.net/geopoliticalRiskAPI`);
console.log('\nTo manually trigger a refresh, call:');
console.log(`https://${REGION}-${PROJECT_ID}.cloudfunctions.net/geopoliticalRiskGenerator`);
