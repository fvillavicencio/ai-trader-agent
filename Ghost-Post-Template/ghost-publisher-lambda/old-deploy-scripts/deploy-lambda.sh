#!/bin/bash

# Script to deploy the Lambda function to AWS

echo "📦 Preparing Lambda deployment package..."

# Create a temporary directory for the deployment package
TEMP_DIR=$(mktemp -d)
PACKAGE_FILE="lambda-package.zip"

# Copy all necessary files to the temporary directory
cp -r index.js package.json src $TEMP_DIR/

# Install production dependencies
echo "📚 Installing production dependencies..."
cd $TEMP_DIR
npm install --production

# Create the deployment package
echo "🗜️ Creating deployment package..."
zip -r $PACKAGE_FILE * -x "node_modules/aws-sdk/*"

# Move the deployment package back to the original directory
mv $PACKAGE_FILE ../

# Return to the original directory
cd ..

# Deploy the Lambda function
echo "🚀 Deploying Lambda function to AWS..."
aws lambda update-function-code \
  --function-name GhostPublisherFunction \
  --zip-file fileb://$PACKAGE_FILE \
  --region us-east-2

# Clean up
echo "🧹 Cleaning up temporary files..."
rm -rf $TEMP_DIR
rm $PACKAGE_FILE

echo "✅ Deployment completed!"
echo "You can now test the Lambda function with the enhanced HTML template."
