/**
 * Set up Cloud Scheduler for regular geopolitical risk analysis
 */
require('dotenv').config();
const { google } = require('googleapis');
const { execSync } = require('child_process');

// Configuration
const PROJECT_ID = process.env.GOOGLE_CLOUD_PROJECT || 'ai-trader-agent';
const REGION = process.env.REGION || 'us-central1';
const SCHEDULE = process.env.SCHEDULE || '0 */6 * * *'; // Every 6 hours

async function setupScheduler() {
  console.log('Setting up Cloud Scheduler for automatic analysis...');
  
  // Enable the Cloud Scheduler API if not already enabled
  try {
    console.log('Ensuring Cloud Scheduler API is enabled...');
    execSync(`gcloud services enable cloudscheduler.googleapis.com`, { stdio: 'inherit' });
  } catch (error) {
    console.error(`Error enabling Cloud Scheduler API: ${error.message}`);
    return;
  }
  
  // Create the scheduler job using gcloud
  try {
    const functionUrl = `https://${REGION}-${PROJECT_ID}.cloudfunctions.net/geopoliticalRiskGenerator`;
    
    console.log(`Creating scheduler job to run every 6 hours: ${SCHEDULE}`);
    execSync(
      `gcloud scheduler jobs create http geopolitical-risk-analysis-job \
      --schedule="${SCHEDULE}" \
      --uri="${functionUrl}" \
      --http-method=GET \
      --attempt-deadline=10m \
      --time-zone="America/New_York" \
      --description="Triggers geopolitical risk analysis every 6 hours" || true`,
      { stdio: 'inherit' }
    );
    
    console.log('Cloud Scheduler job created successfully!');
  } catch (error) {
    console.log(`Note: Scheduler job may already exist: ${error.message}`);
  }
}

setupScheduler().catch(console.error);
