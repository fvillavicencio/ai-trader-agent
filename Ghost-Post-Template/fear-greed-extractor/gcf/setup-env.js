const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const yaml = require('js-yaml');

// Load environment variables from .env file
const envPath = path.join(__dirname, '..', '.env');
const envConfig = dotenv.parse(fs.readFileSync(envPath));

// Create YAML configuration
const yamlConfig = {
  AWS_REGION: envConfig.AWS_REGION || 'us-east-2',
  AWS_ACCESS_KEY_ID: envConfig.AWS_ACCESS_KEY_ID,
  AWS_SECRET_ACCESS_KEY: envConfig.AWS_SECRET_ACCESS_KEY,
  DYNAMODB_TABLE_NAME: envConfig.DYNAMODB_TABLE_NAME || 'fear_greed_index'
};

// Write to env.yaml
fs.writeFileSync(
  path.join(__dirname, 'env.yaml'),
  yaml.dump(yamlConfig)
);

console.log('Environment variables copied to env.yaml');
