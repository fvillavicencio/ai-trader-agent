#!/bin/bash

# Set variables
FUNCTION_NAME="MarketPulseDaily"
REGION=${AWS_REGION:-"us-east-2"}

# Clean up any existing dist directory
echo "🧹 Cleaning up existing dist directory..."
rm -rf dist
rm -f lambda-deployment.zip

# Create a fresh temporary directory for packaging
mkdir -p dist

# Install production dependencies
echo "📦 Installing production dependencies..."
npm install --production

# Copy files to dist directory
echo "📋 Copying files to dist directory..."
cp -r index.js package.json node_modules dist/
mkdir -p dist/src/utils dist/src/modules

# Copy utility files
cp -r src/utils/* dist/src/utils/

# Copy module files, ensuring our updated market-indicators.js is used
cp src/modules/fundamental-metrics.js dist/src/modules/
cp src/modules/geopolitical-risks.js dist/src/modules/
cp src/modules/macroeconomic-factors.js dist/src/modules/
cp src/modules/market-sentiment.js dist/src/modules/

# Copy our updated market-indicators.js file
cp src/modules/market-indicators.js dist/src/modules/

# Verify the files were copied correctly
echo "✅ Verifying files in dist/src/modules:"
ls -la dist/src/modules/

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

echo "✅ Deployment complete!"
