/**
 * Minimal setup script for Geopolitical Risk Analysis on Google Cloud
 * This script creates the necessary .env file with API keys
 */
const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Default configuration
const config = {
  PERPLEXITY_API_KEY: process.env.PERPLEXITY_API_KEY || '',
  OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
  NEWS_API_KEY: process.env.NEWS_API_KEY || '',
  RAPID_API_KEY: process.env.RAPID_API_KEY || '',
  GOOGLE_API_KEY: process.env.GOOGLE_API_KEY || '',
  BUCKET_NAME: 'geopolitical-risk-data',
  PERPLEXITY_MODEL: 'sonar-pro',
  GOOGLE_CLOUD_PROJECT: 'ai-trader-agent',
  REGION: 'us-central1'
};

console.log('🚀 Minimal Setup for Geopolitical Risk Analysis');
console.log('==============================================');

// Prompt for API keys
function promptForKeys() {
  console.log('\n📝 Please enter your API keys:');
  
  rl.question('Perplexity API Key (press Enter to skip): ', (perplexityKey) => {
    if (perplexityKey) config.PERPLEXITY_API_KEY = perplexityKey;
    
    rl.question('OpenAI API Key (press Enter to skip): ', (openaiKey) => {
      if (openaiKey) config.OPENAI_API_KEY = openaiKey;
      
      rl.question('NewsAPI Key (press Enter to skip): ', (newsApiKey) => {
        if (newsApiKey) config.NEWS_API_KEY = newsApiKey;
        
        rl.question('RapidAPI Key (press Enter to skip): ', (rapidApiKey) => {
          if (rapidApiKey) config.RAPID_API_KEY = rapidApiKey;
          
          rl.question('Google API Key (press Enter to skip): ', (googleApiKey) => {
            if (googleApiKey) config.GOOGLE_API_KEY = googleApiKey;
            
            rl.question('Google Cloud Project ID (default: ai-trader-agent): ', (projectId) => {
              if (projectId) config.GOOGLE_CLOUD_PROJECT = projectId;
              config.BUCKET_NAME = `geopolitical-risk-data-${config.GOOGLE_CLOUD_PROJECT}`;
              
              createEnvFile();
              rl.close();
            });
          });
        });
      });
    });
  });
}

// Create the .env file
function createEnvFile() {
  console.log('\n📄 Creating .env file...');
  
  const envContent = Object.entries(config)
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');
  
  fs.writeFileSync(path.join(__dirname, '.env'), envContent);
  console.log('✅ Environment file created: .env');
  
  console.log('\n🎉 Setup complete!');
  console.log('\nNext steps:');
  console.log('1. Install Google Cloud SDK if not already installed:');
  console.log('   https://cloud.google.com/sdk/docs/install');
  console.log('2. Authenticate with Google Cloud:');
  console.log('   gcloud auth login');
  console.log('3. Set your project:');
  console.log(`   gcloud config set project ${config.GOOGLE_CLOUD_PROJECT}`);
  console.log('4. Deploy the functions:');
  console.log('   npm run quick-deploy');
}

// Start the setup
promptForKeys();
