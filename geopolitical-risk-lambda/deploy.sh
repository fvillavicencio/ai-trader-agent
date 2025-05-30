#!/bin/bash

# Deployment script for the Geopolitical Risk Lambda function

# Load environment variables from .env file
if [ -f .env ]; then
  echo "Loading environment variables from .env file..."
  export $(grep -v '^#' .env | xargs)
else
  echo "Warning: .env file not found"
fi

# Set AWS region
AWS_REGION="us-east-2"
FUNCTION_NAME="geopolitical-risk-analyzer"

echo "Preparing deployment package for $FUNCTION_NAME..."

# Install dependencies
echo "Installing dependencies..."
npm install

# Create deployment package
echo "Creating deployment package..."
zip -r function.zip . -x "*.git*" "*.zip" "node_modules/aws-sdk/*" "test-*.js" "deploy.sh"

# Check if the Lambda function already exists
echo "Checking if Lambda function already exists..."
if aws lambda get-function --function-name $FUNCTION_NAME --region $AWS_REGION 2>&1 | grep -q "Function not found"; then
  # Function doesn't exist, create it
  echo "Creating new Lambda function: $FUNCTION_NAME"
  aws lambda create-function \
    --function-name $FUNCTION_NAME \
    --runtime nodejs22.x \
    --handler index.handler \
    --role "arn:aws:iam::YOUR_ACCOUNT_ID:role/lambda-geopolitical-risk-role" \
    --zip-file fileb://function.zip \
    --timeout 180 \
    --memory-size 1024 \
    --region $AWS_REGION \
    --environment "Variables={OPENAI_API_KEY=$OPENAI_API_KEY}"
else
  # Function exists, update it
  echo "Updating existing Lambda function: $FUNCTION_NAME"
  aws lambda update-function-code \
    --function-name $FUNCTION_NAME \
    --zip-file fileb://function.zip \
    --region $AWS_REGION
  
  # Create environment variables JSON file for Lambda
  echo "Creating environment variables JSON file..."
  cat > lambda-env.json << EOF
{
  "Variables": {
    "OPENAI_API_KEY": "$OPENAI_API_KEY",
    "PERPLEXITY_API_KEY": "$PERPLEXITY_API_KEY",
    "PERPLEXITY_MODEL": "$PERPLEXITY_MODEL",
    "PERPLEXITY_API_URL": "$PERPLEXITY_API_URL",
    "PERPLEXITY_LAMBDA_API_KEY": "$PERPLEXITY_LAMBDA_API_KEY",
    "RAPIDAPI_KEY": "$RAPIDAPI_KEY",
    "RAPIDAPI_HOST": "$RAPIDAPI_HOST",
    "RAPIDAPI_ENDPOINT": "$RAPIDAPI_ENDPOINT",
    "NEWS_API_KEY": "$NEWS_API_KEY",
    "GOOGLE_API_KEY": "$GOOGLE_API_KEY",
    "GCP_PROJECT_ID": "$GCP_PROJECT_ID",
    "LOCATION": "$LOCATION",
    "DATA_STORE_ID": "$DATA_STORE_ID",
    "CUSTOM_SEARCH_ENGINE_ID": "$CUSTOM_SEARCH_ENGINE_ID",
    "CUSTOM_SEARCH_API_KEY": "$CUSTOM_SEARCH_API_KEY",
    "GEMINI_API_KEY": "$GEMINI_API_KEY",
    "GHOST_LAMBDA_API_KEY": "$GHOST_LAMBDA_API_KEY",
    "TEST_MODE": "$TEST_MODE",
    "OUTPUT_JSON": "$OUTPUT_JSON",
    "LOG_LEVEL": "$LOG_LEVEL",
    "PORT": "$PORT",
    "ENABLE_CYCLE": "$ENABLE_CYCLE",
    "CYCLE_INTERVAL_MS": "$CYCLE_INTERVAL_MS",
    "DATA_DIR": "$DATA_DIR",
    "SCAN_INTERVAL_HOURS": "$SCAN_INTERVAL_HOURS",
    "MAX_EVENT_AGE_DAYS": "$MAX_EVENT_AGE_DAYS",
    "DEBUG": "$DEBUG"
  }
}
EOF

  # Update configuration
  echo "Updating Lambda function configuration..."
  aws lambda update-function-configuration \
    --function-name $FUNCTION_NAME \
    --timeout 180 \
    --memory-size 1024 \
    --environment file://lambda-env.json \
    --region $AWS_REGION
fi

echo "Deployment completed!"
