/**
 * Quick deployment script for Geopolitical Risk Analysis on Google Cloud
 * 
 * This script automates the entire deployment process:
 * 1. Checks for Google Cloud SDK installation
 * 2. Sets up environment variables
 * 3. Creates the Cloud Storage bucket
 * 4. Deploys both functions
 * 5. Sets up the scheduler
 * 6. Tests the deployment
 */
require('dotenv').config();
const { execSync, exec } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuration
const PROJECT_ID = process.env.GCP_PROJECT_ID || 'geopolitical-risk-analysis';
const BUCKET_NAME = 'geopolitical-risk-data';
const REGION = 'us-central1';
const GENERATOR_TOPIC = 'geopolitical-risk-generator';
const ENV_VARS = {
  PERPLEXITY_API_KEY: process.env.PERPLEXITY_API_KEY || 'YOUR_PERPLEXITY_API_KEY',
  OPENAI_API_KEY: process.env.OPENAI_API_KEY || 'YOUR_OPENAI_API_KEY',
  BUCKET_NAME: BUCKET_NAME,
  PERPLEXITY_MODEL: 'sonar-pro',
  GENERATOR_TOPIC: GENERATOR_TOPIC
};

console.log('🚀 Starting quick deployment of Geopolitical Risk Analysis to Google Cloud...');

// Check if Google Cloud SDK is installed
function checkGcloudInstallation() {
  console.log('\n🔍 Checking for Google Cloud SDK installation...');
  try {
    execSync('which gcloud', { stdio: 'ignore' });
    console.log('✅ Google Cloud SDK is installed');
    return true;
  } catch (error) {
    console.log('❌ Google Cloud SDK is not installed');
    console.log('\n📋 Please install Google Cloud SDK first:');
    console.log('1. Visit: https://cloud.google.com/sdk/docs/install');
    console.log('2. Follow the installation instructions for your operating system');
    console.log('3. Run "gcloud init" to initialize the SDK');
    console.log('4. Run "gcloud auth login" to authenticate');
    console.log('5. Then run this script again');
    return false;
  }
}

// Check if user is authenticated with Google Cloud
function checkGcloudAuth() {
  console.log('\n🔑 Checking Google Cloud authentication...');
  try {
    const authInfo = execSync('gcloud auth list --filter=status:ACTIVE --format="value(account)"', { encoding: 'utf8' }).trim();
    if (authInfo) {
      console.log(`✅ Authenticated as: ${authInfo}`);
      return true;
    } else {
      console.log('❌ Not authenticated with Google Cloud');
      console.log('\n📋 Please authenticate with Google Cloud:');
      console.log('1. Run "gcloud auth login"');
      console.log('2. Then run this script again');
      return false;
    }
  } catch (error) {
    console.log('❌ Error checking authentication');
    console.log('\n📋 Please authenticate with Google Cloud:');
    console.log('1. Run "gcloud auth login"');
    console.log('2. Then run this script again');
    return false;
  }
}

// Create .env file
async function setupEnv() {
  console.log('\n📝 Creating .env file...');
  
  // Check if .env file exists
  if (!fs.existsSync(path.join(__dirname, '.env'))) {
    console.log('Creating .env file...');
    
    // Check if lambda project .env exists to copy from
    const lambdaEnvPath = path.join(__dirname, '..', 'geopolitical-risk-lambda', '.env');
    if (fs.existsSync(lambdaEnvPath)) {
      console.log('Found existing .env file in lambda project. Copying API keys and configuration...');
      const lambdaEnv = fs.readFileSync(lambdaEnvPath, 'utf8');
      
      // Create a modified version for Google Cloud
      const cloudEnv = lambdaEnv
        .replace(/^BUCKET_NAME=.*$/m, `BUCKET_NAME=geopolitical-risk-data-${PROJECT_ID}`)
        .replace(/^GCP_PROJECT_ID=.*$/m, `GCP_PROJECT_ID=${PROJECT_ID}`);
      
      fs.writeFileSync(path.join(__dirname, '.env'), cloudEnv);
      console.log('✅ .env file copied from lambda project with Google Cloud adjustments');
    } else {
      // Prompt for API keys if lambda .env doesn't exist
      console.log('No existing .env file found in lambda project. Prompting for API keys...');
      const perplexityApiKey = await promptInput('Enter your Perplexity API key (or press Enter to skip): ');
      const openaiApiKey = await promptInput('Enter your OpenAI API key (or press Enter to skip): ');
      const newsApiKey = await promptInput('Enter your News API key (or press Enter to skip): ');
      const rapidApiKey = await promptInput('Enter your RapidAPI key (or press Enter to skip): ');
      const googleApiKey = await promptInput('Enter your Google API key (or press Enter to skip): ');
      
      // Create .env file
      const envContent = [
        '# Geopolitical Risk Sensor - Environment Variables',
        '',
        '# Perplexity API Configuration',
        `PERPLEXITY_API_KEY=${perplexityApiKey || ''}`,
        'PERPLEXITY_MODEL=sonar-pro',
        'PERPLEXITY_API_URL=https://api.perplexity.ai/chat/completions',
        '',
        '# OpenAI API Configuration',
        `OPENAI_API_KEY=${openaiApiKey || ''}`,
        '',
        '# RapidAPI Configuration',
        `RAPIDAPI_KEY=${rapidApiKey || ''}`,
        'RAPIDAPI_HOST=insightsentry.p.rapidapi.com',
        'RAPIDAPI_ENDPOINT=https://insightsentry.p.rapidapi.com/v2/newsfeed/latest',
        '',
        '# News API Configuration',
        `NEWS_API_KEY=${newsApiKey || ''}`,
        '',
        '# Google Cloud Configuration',
        `GOOGLE_API_KEY=${googleApiKey || ''}`,
        `GCP_PROJECT_ID=${PROJECT_ID}`,
        'LOCATION=us-central1',
        `BUCKET_NAME=geopolitical-risk-data-${PROJECT_ID}`,
        '',
        '# Service Configuration',
        'TEST_MODE=false',
        'OUTPUT_JSON=true',
        'LOG_LEVEL=info',
        '',
        '# Scan Configuration',
        'SCAN_INTERVAL_HOURS=6',
        'MAX_EVENT_AGE_DAYS=7',
        '',
        '# Debug Options',
        'DEBUG=false'
      ].join('\n');
      
      fs.writeFileSync(path.join(__dirname, '.env'), envContent);
      console.log('✅ .env file created');
    }
  } else {
    console.log('✅ .env file already exists');
  }
  
  // Load environment variables
  require('dotenv').config();
  
  // Check if required API keys are present
  if (!process.env.PERPLEXITY_API_KEY && !process.env.OPENAI_API_KEY) {
    console.warn('⚠️  Warning: No API keys found. The generator function may not work properly.');
    console.warn('   Please edit the .env file manually to add your API keys.');
  } else {
    console.log('✅ API keys found');
  }
}

// Set Google Cloud project
function setProject() {
  console.log('\n🔧 Setting Google Cloud project...');
  try {
    execSync(`gcloud config set project ${PROJECT_ID}`, { stdio: 'inherit' });
    console.log(`✅ Project set to: ${PROJECT_ID}`);
    return true;
  } catch (error) {
    console.error(`❌ Error setting project: ${error.message}`);
    return false;
  }
}

// Create storage bucket
function createBucket() {
  console.log('\n🪣 Creating Cloud Storage bucket...');
  try {
    execSync(`gsutil mb -p ${PROJECT_ID} -l ${REGION} gs://${BUCKET_NAME} || true`, { stdio: 'inherit' });
    execSync(`gsutil iam ch allUsers:objectViewer gs://${BUCKET_NAME}`, { stdio: 'inherit' });
    console.log(`✅ Bucket created: gs://${BUCKET_NAME}`);
    return true;
  } catch (error) {
    console.log(`⚠️ Note: ${error.message}`);
    return false;
  }
}

// Deploy generator function (PubSub triggered)
function deployGeneratorFunction() {
  console.log('\n🔄 Deploying generator function (PubSub triggered)...');
  try {
    const cmd = `gcloud functions deploy geopoliticalRiskGenerator \
      --gen2 \
      --runtime nodejs20 \
      --region=${REGION} \
      --source=./functions/generator \
      --entry-point=generateGeopoliticalRiskAnalysis \
      --trigger-topic=${GENERATOR_TOPIC} \
      --timeout=540s \
      --memory=512MB \
      --set-env-vars=BUCKET_NAME=${BUCKET_NAME},PERPLEXITY_API_KEY=${ENV_VARS.PERPLEXITY_API_KEY},OPENAI_API_KEY=${ENV_VARS.OPENAI_API_KEY},PERPLEXITY_MODEL=${ENV_VARS.PERPLEXITY_MODEL}`;
    
    execSync(cmd, { stdio: 'inherit' });
    console.log('✅ Generator function deployed');
    return true;
  } catch (error) {
    console.error(`❌ Error deploying generator function: ${error.message}`);
    return false;
  }
}

// Deploy HTTP test function for direct testing
function deployTestFunction() {
  console.log('\n🔄 Deploying HTTP test function...');
  try {
    const cmd = `gcloud functions deploy testGeopoliticalRiskGenerator \
      --gen2 \
      --runtime nodejs20 \
      --region=${REGION} \
      --source=./functions/generator \
      --entry-point=testGeopoliticalRiskGenerator \
      --trigger-http \
      --allow-unauthenticated \
      --timeout=540s \
      --memory=512MB \
      --set-env-vars=BUCKET_NAME=${BUCKET_NAME},PERPLEXITY_API_KEY=${ENV_VARS.PERPLEXITY_API_KEY},OPENAI_API_KEY=${ENV_VARS.OPENAI_API_KEY},PERPLEXITY_MODEL=${ENV_VARS.PERPLEXITY_MODEL}`;
    
    execSync(cmd, { stdio: 'inherit' });
    console.log('✅ HTTP test function deployed');
    return true;
  } catch (error) {
    console.error(`❌ Error deploying HTTP test function: ${error.message}`);
    return false;
  }
}

// Deploy API function
function deployApiFunction() {
  console.log('\n🔄 Deploying API function...');
  try {
    const cmd = `gcloud functions deploy geopoliticalRiskAPI \
      --gen2 \
      --runtime nodejs20 \
      --region=${REGION} \
      --source=./functions/api \
      --entry-point=geopoliticalRiskAPI \
      --trigger-http \
      --allow-unauthenticated \
      --timeout=60s \
      --memory=256MB \
      --set-env-vars=BUCKET_NAME=${BUCKET_NAME},GENERATOR_TOPIC=${GENERATOR_TOPIC}`;
    
    execSync(cmd, { stdio: 'inherit' });
    console.log('✅ API function deployed');
    return true;
  } catch (error) {
    console.error(`❌ Error deploying API function: ${error.message}`);
    return false;
  }
}

// Delete existing functions to allow changing trigger types
function deleteExistingFunctions() {
  console.log('\n🗑️ Deleting existing functions...');
  try {
    // Delete generator function
    console.log('Deleting generator function...');
    try {
      execSync(`gcloud functions delete geopoliticalRiskGenerator --region=${REGION} --quiet`, { stdio: 'inherit' });
      console.log('✅ Generator function deleted');
    } catch (error) {
      console.log('Generator function does not exist or could not be deleted');
    }
    
    // Delete test function
    console.log('Deleting test function...');
    try {
      execSync(`gcloud functions delete testGeopoliticalRiskGenerator --region=${REGION} --quiet`, { stdio: 'inherit' });
      console.log('✅ Test function deleted');
    } catch (error) {
      console.log('Test function does not exist or could not be deleted');
    }
    
    return true;
  } catch (error) {
    console.error(`❌ Error deleting functions: ${error.message}`);
    return false;
  }
}

// Create PubSub topic for generator function
function createPubSubTopic() {
  console.log('\n🔄 Creating PubSub topic for generator function...');
  try {
    // Check if topic exists first
    try {
      execSync(`gcloud pubsub topics describe ${GENERATOR_TOPIC}`, { stdio: 'ignore' });
      console.log(`✅ PubSub topic ${GENERATOR_TOPIC} already exists`);
      return true;
    } catch (error) {
      // Topic doesn't exist, create it
      console.log(`Creating PubSub topic ${GENERATOR_TOPIC}...`);
      execSync(`gcloud pubsub topics create ${GENERATOR_TOPIC}`, { stdio: 'inherit' });
      console.log(`✅ PubSub topic ${GENERATOR_TOPIC} created`);
      
      // Create a subscription for the topic
      const subscriptionName = `${GENERATOR_TOPIC}-subscription`;
      execSync(`gcloud pubsub subscriptions create ${subscriptionName} --topic=${GENERATOR_TOPIC}`, { stdio: 'inherit' });
      console.log(`✅ Subscription ${subscriptionName} created`);
      
      return true;
    }
  } catch (error) {
    console.error(`❌ Error creating PubSub topic: ${error.message}`);
    return false;
  }
}

// Set up scheduler
function setupScheduler() {
  console.log('\n⏰ Setting up Cloud Scheduler...');
  try {
    execSync('gcloud services enable cloudscheduler.googleapis.com', { stdio: 'inherit' });
    
    const functionUrl = `https://${REGION}-${PROJECT_ID}.cloudfunctions.net/geopoliticalRiskGenerator`;
    const cmd = `gcloud scheduler jobs create http geopolitical-risk-analysis-job \
      --schedule="0 */6 * * *" \
      --uri="${functionUrl}" \
      --http-method=GET \
      --attempt-deadline=10m \
      --time-zone="America/New_York" \
      --description="Triggers geopolitical risk analysis every 6 hours" || true`;
    
    execSync(cmd, { stdio: 'inherit' });
    console.log('✅ Scheduler job created');
    return true;
  } catch (error) {
    console.log(`⚠️ Note: ${error.message}`);
    return false;
  }
}

// Test the deployment
function testDeployment() {
  console.log('\n🧪 Testing deployment...');
  
  // Trigger the generator function
  console.log('Triggering generator function...');
  try {
    execSync(`curl -s https://${REGION}-${PROJECT_ID}.cloudfunctions.net/geopoliticalRiskGenerator`, { stdio: 'inherit' });
    console.log('✅ Generator function triggered');
  } catch (error) {
    console.log(`⚠️ Note: ${error.message}`);
    console.log('Generator function may not be accessible yet. This is normal, as it can take a few minutes for the function to become available.');
  }
  
  console.log('\n⏳ Waiting 10 seconds for processing...');
  execSync('sleep 10');
  
  // Test the API function
  console.log('Testing API function...');
  try {
    execSync(`curl -s https://${REGION}-${PROJECT_ID}.cloudfunctions.net/geopoliticalRiskAPI`, { stdio: 'inherit' });
    console.log('✅ API function tested');
  } catch (error) {
    console.log(`⚠️ Note: ${error.message}`);
    console.log('API function may not be accessible yet. This is normal, as it can take a few minutes for the function to become available.');
  }
}

// Generate Google Apps Script code
function generateGASCode() {
  return `/**
 * Fetches geopolitical risk data from Google Cloud Function API
 * @return {Object} Geopolitical risk analysis with global overview and risks
 */
function getGeopoliticalRisks() {
  try {
    const response = UrlFetchApp.fetch("https://${REGION}-${PROJECT_ID}.cloudfunctions.net/geopoliticalRiskAPI");
    return JSON.parse(response.getContentText());
  } catch (error) {
    console.error("Error fetching geopolitical risks: " + error);
    // Return fallback data
    return getFallbackGeopoliticalRisks();
  }
}

/**
 * Manually triggers a refresh of the geopolitical risk data
 * @return {Object} Status of the refresh operation
 */
function refreshGeopoliticalRisks() {
  try {
    const response = UrlFetchApp.fetch("https://${REGION}-${PROJECT_ID}.cloudfunctions.net/geopoliticalRiskGenerator");
    return JSON.parse(response.getContentText());
  } catch (error) {
    console.error("Error refreshing geopolitical risks: " + error);
    return { success: false, error: error.toString() };
  }
}

/**
 * Provides fallback geopolitical risk data in case the API is unavailable
 * @return {Object} Hardcoded geopolitical risk data
 */
function getFallbackGeopoliticalRisks() {
  return {
    "globalOverview": "The global geopolitical landscape continues to be dominated by major power competition and regional conflicts.",
    "risks": [
      {
        "name": "US-China Tensions",
        "description": "Strategic competition between the US and China across multiple domains.",
        "regions": ["North America", "Asia Pacific"],
        "impact": "High",
        "source": {
          "name": "Reuters",
          "url": "https://www.reuters.com/world/china/"
        }
      },
      // Add more fallback risks as needed
    ],
    "meta": {
      "lastUpdated": new Date().toISOString(),
      "source": "Fallback Data"
    }
  };
}`;
}

// Run the deployment steps
async function runDeployment() {
  try {
    // Check prerequisites
    if (!checkGcloudInstallation() || !checkGcloudAuth()) {
      return false;
    }

    // Set up environment and project
    await setupEnv();
    if (!setProject()) {
      return false;
    }

    // Create resources and deploy functions
    if (!createBucket()) {
      return false;
    }
    
    if (!createPubSubTopic()) {
      return false;
    }

    // Delete existing functions to allow changing trigger types
    if (!deleteExistingFunctions()) {
      return false;
    }

    if (!deployGeneratorFunction()) {
      return false;
    }
    
    if (!deployTestFunction()) {
      return false;
    }

    if (!deployApiFunction()) {
      return false;
    }

    // Setup scheduler
    if (!setupScheduler()) {
      return false;
    }
    
    // Test deployment
    testDeployment();
    
    console.log('\n✅ Deployment process completed!');
    console.log('\n📊 Your Geopolitical Risk Analysis system should be available shortly at:');
    console.log(`https://${REGION}-${PROJECT_ID}.cloudfunctions.net/geopoliticalRiskAPI`);
    
    console.log('\n📝 To use in Google Apps Script, copy this code:');
    console.log('\n' + generateGASCode());
    
    console.log('\n⏱️ Note: It may take a few minutes for the functions to become fully available.');
    console.log('If you get errors when accessing the functions, please wait a few minutes and try again.');
  } catch (error) {
    console.error('\n❌ Deployment failed:', error.message);
    console.error('Please fix the errors and try again.');
  }
}

// Start the deployment
(async () => {
  try {
    await runDeployment();
  } catch (error) {
    console.error('Deployment failed:', error);
    process.exit(1);
  }
})();
