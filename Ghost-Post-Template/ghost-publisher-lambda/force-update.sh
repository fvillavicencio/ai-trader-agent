#!/bin/bash

# Force update the Lambda function by creating a new deployment package and updating the function code

echo "🔄 Force updating Lambda function..."

# Set variables
FUNCTION_NAME="GhostPublisherFunction"
REGION="us-east-2"
ROLE_NAME="lambda-ghost-publisher-role"
DIST_DIR="./dist"
ZIP_FILE="lambda-deployment.zip"

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo "❌ AWS CLI is not installed. Please install it first."
    exit 1
fi

# Create dist directory if it doesn't exist
mkdir -p $DIST_DIR

# Install production dependencies
echo "📚 Installing production dependencies..."
npm install --production

# Copy files to dist directory
echo "📋 Copying files to dist directory..."
cp -r node_modules $DIST_DIR/
cp -r src $DIST_DIR/
cp index.js $DIST_DIR/
cp package.json $DIST_DIR/

# Create deployment package
echo "🗜️ Creating deployment package..."
cd $DIST_DIR
zip -r ../$ZIP_FILE .
cd ..

# Force update the Lambda function code
echo "🔄 Force updating Lambda function code..."
aws lambda update-function-code \
    --function-name $FUNCTION_NAME \
    --zip-file fileb://$ZIP_FILE \
    --region $REGION \
    --publish

# Wait for the function to be updated
echo "⏳ Waiting for function update to complete..."
aws lambda wait function-updated \
    --function-name $FUNCTION_NAME \
    --region $REGION

# Update function configuration with environment variables
echo "🔄 Updating Lambda function configuration..."
aws lambda update-function-configuration \
    --function-name $FUNCTION_NAME \
    --region $REGION \
    --timeout 300 \
    --memory-size 1024 \
    --environment "Variables={GHOST_URL=https://market-pulse-daily.ghost.io,GHOST_API_KEY=67f457a5f41c9900013e1e47:44daf1e666349bde96fad6f9a65979ba1d0b11b161a5c765847218f5bd263b7c,GHOST_NEWSLETTER_ID=67f427c5744a72000854ee8f}"

echo "✅ Force update complete!"
