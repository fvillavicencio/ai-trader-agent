#!/bin/bash

# Market Pulse Daily Lambda Deployment Script

# Set variables
FUNCTION_NAME="MarketPulseDaily"
RUNTIME="nodejs18.x"
HANDLER="index.handler"
TIMEOUT=30
MEMORY_SIZE=256
ROLE_ARN="arn:aws:iam::339712966836:role/service-role/htmlReportGenerator-role-dp0pvblk"

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo "AWS CLI is not installed. Please install it first."
    exit 1
fi

# Build the deployment package
echo "Building deployment package..."
npm run deploy

if [ ! -f "deployment.zip" ]; then
    echo "Failed to create deployment.zip"
    exit 1
fi

# Check if function exists
echo "Checking if Lambda function exists..."
aws lambda get-function --function-name $FUNCTION_NAME &> /dev/null

if [ $? -eq 0 ]; then
    # Function exists, update code
    echo "Updating existing Lambda function code..."
    aws lambda update-function-code \
        --function-name $FUNCTION_NAME \
        --zip-file fileb://deployment.zip
else
    # Function doesn't exist, create new one
    echo "Lambda function does not exist. Creating new function with role: $ROLE_ARN"
    
    # Create the function
    aws lambda create-function \
        --function-name $FUNCTION_NAME \
        --runtime $RUNTIME \
        --handler $HANDLER \
        --role $ROLE_ARN \
        --timeout $TIMEOUT \
        --memory-size $MEMORY_SIZE \
        --zip-file fileb://deployment.zip
fi

# Check if the deployment was successful
if [ $? -eq 0 ]; then
    echo "Lambda function deployed successfully!"
    
    # Get the function URL
    FUNCTION_URL=$(aws lambda get-function --function-name $FUNCTION_NAME --query 'Configuration.FunctionArn' --output text)
    echo "Function ARN: $FUNCTION_URL"
    
    echo "To invoke the function, use:"
    echo "aws lambda invoke --function-name $FUNCTION_NAME --payload file://input.json output.json"
else
    echo "Lambda function deployment failed."
fi
