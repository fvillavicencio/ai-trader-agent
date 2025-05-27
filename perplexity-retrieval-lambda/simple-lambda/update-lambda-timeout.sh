#!/bin/bash

# Script to update Lambda function timeout to 5 minutes (300 seconds)

# Set variables - replace with your actual function name and region
FUNCTION_NAME="perplexity-geopolitical-risks-lambda"
REGION="us-east-1"  # Change to your AWS region

# Update the function configuration
echo "Updating Lambda function timeout to 5 minutes..."
aws lambda update-function-configuration \
  --function-name $FUNCTION_NAME \
  --timeout 300 \
  --region $REGION

# Check if the update was successful
if [ $? -eq 0 ]; then
  echo "Successfully updated Lambda function timeout to 5 minutes."
  
  # Get the updated configuration to verify
  echo "Retrieving updated function configuration..."
  aws lambda get-function-configuration \
    --function-name $FUNCTION_NAME \
    --region $REGION \
    --query "Timeout" \
    --output text
  
  echo "Lambda function timeout update complete."
else
  echo "Failed to update Lambda function timeout. Please check your AWS credentials and function name."
fi
