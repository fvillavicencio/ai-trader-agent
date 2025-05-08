#!/bin/bash

# Set variables
LAMBDA_FUNCTION_NAME="GhostPublisherFunction"
LAMBDA_ROLE_NAME="lambda-ghost-publisher-role"
LAMBDA_ROLE_ARN="arn:aws:iam::339712966836:role/lambda-ghost-publisher-role"
REGION="us-east-2"  # Ensure the Lambda is in the same region as the API Gateway

# Create deployment package
echo "📦 Packaging Ghost Publisher Lambda function..."
mkdir -p dist
cp index.js dist/
cp -r node_modules dist/
cp -r src dist/
cd dist
zip -r function.zip index.js node_modules src
cd ..

# Check if Lambda role exists
echo "🔍 Checking if IAM role exists..."
ROLE_EXISTS=$(aws iam get-role --role-name $LAMBDA_ROLE_NAME 2>/dev/null)
if [ $? -ne 0 ]; then
    echo "Creating IAM role: $LAMBDA_ROLE_NAME..."
    # Create the IAM role (this should already exist from previous deployments)
else
    echo "✅ IAM role already exists: $LAMBDA_ROLE_ARN"
fi

# Check if Lambda function exists in the correct region
echo "🔍 Checking if Lambda function exists in $REGION..."
FUNCTION_EXISTS=$(aws lambda get-function --function-name $LAMBDA_FUNCTION_NAME --region $REGION 2>/dev/null)
if [ $? -ne 0 ]; then
    echo "🔄 Creating Lambda function in $REGION: $LAMBDA_FUNCTION_NAME..."
    # Create the Lambda function in the correct region
    aws lambda create-function \
        --function-name $LAMBDA_FUNCTION_NAME \
        --runtime nodejs22.x \
        --role $LAMBDA_ROLE_ARN \
        --handler index.handler \
        --zip-file fileb://dist/function.zip \
        --timeout 30 \
        --memory-size 256 \
        --region $REGION \
        --environment "Variables={GHOST_URL=https://market-pulse-daily.ghost.io,GHOST_API_KEY=67f457a5f41c9900013e1e47:44daf1e666349bde96fad6f9a65979ba1d0b11b161a5c765847218f5bd263b7c,GHOST_NEWSLETTER_ID=67f427c5744a72000854ee8f}"
else
    echo "🔄 Updating existing Lambda function in $REGION: $LAMBDA_FUNCTION_NAME..."
    # Update the Lambda function code in the correct region
    aws lambda update-function-code \
        --function-name $LAMBDA_FUNCTION_NAME \
        --zip-file fileb://dist/function.zip \
        --region $REGION
fi

# Clean up
echo "🧹 Cleaning up..."
rm -rf dist

echo "✅ Deployment to $REGION complete!"
echo "📝 You can invoke the Lambda function using:"
echo "   aws lambda invoke --function-name $LAMBDA_FUNCTION_NAME --payload file://test-input.json output.json --region $REGION"
