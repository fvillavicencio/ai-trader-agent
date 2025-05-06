#!/bin/bash

# Set variables
FUNCTION_NAME="MarketPulseDaily"
REGION=${AWS_REGION:-"us-east-2"}

# Create a temporary directory for packaging
mkdir -p dist

# Install production dependencies
echo "📦 Installing production dependencies..."
npm install --production

# Copy files to dist directory
echo "📋 Copying files to dist directory..."
cp -r index.js package.json node_modules src dist/

# Create the deployment package
echo "🗜️ Creating deployment package..."
cd dist
zip -r ../lambda-deployment.zip .
cd ..

# Deploy to AWS Lambda
echo "🚀 Deploying to AWS Lambda..."

# Check if function exists
if aws lambda get-function --function-name $FUNCTION_NAME --region $REGION >/dev/null 2>&1; then
    echo "🔄 Updating existing Lambda function..."
    aws lambda update-function-code \
        --function-name $FUNCTION_NAME \
        --zip-file fileb://lambda-deployment.zip \
        --region $REGION
else
    echo "🆕 Creating new Lambda function..."
    aws lambda create-function \
        --function-name $FUNCTION_NAME \
        --runtime nodejs22.x \
        --handler index.handler \
        --role arn:aws:iam::339712966836:role/lambda-ghost-publisher-role \
        --zip-file fileb://lambda-deployment.zip \
        --region $REGION
fi

# Clean up
echo "🧹 Cleaning up..."
# rm -rf dist
# rm lambda-deployment.zip

echo "✅ Deployment complete!"
