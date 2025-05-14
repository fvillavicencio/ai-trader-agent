#!/bin/bash

# Script to update Lambda function environment variables

# Set variables - replace with your actual function name and region
FUNCTION_NAME="perplexity-geopolitical-risks-lambda"
REGION="us-east-1"  # Change to your AWS region

# Perplexity API key from the .env file
PERPLEXITY_API_KEY="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"

# Update the function configuration with environment variables
echo "Updating Lambda function environment variables..."
aws lambda update-function-configuration \
  --function-name $FUNCTION_NAME \
  --environment "Variables={PERPLEXITY_API_KEY=$PERPLEXITY_API_KEY,USE_FALLBACK=false}" \
  --region $REGION

echo "Setting USE_FALLBACK to false to ensure real data retrieval"

# Check if the update was successful
if [ $? -eq 0 ]; then
  echo "Successfully updated Lambda function environment variables."
  
  # Get the updated configuration to verify
  echo "Retrieving updated function configuration..."
  aws lambda get-function-configuration \
    --function-name $FUNCTION_NAME \
    --region $REGION \
    --query "Environment.Variables" \
    --output json
  
  echo "Lambda function environment variables update complete."
else
  echo "Failed to update Lambda function environment variables. Please check your AWS credentials and function name."
fi
