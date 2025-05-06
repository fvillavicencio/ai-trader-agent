#!/bin/bash

# Set variables
LAMBDA_FUNCTION_NAME="GhostPublisherFunction"
DEPLOYMENT_PACKAGE="deployment-package.zip"
DIST_DIR="dist"
AWS_REGION="us-east-2"  # Specify the AWS region explicitly

# Display what we're doing
echo "Starting improved deployment process for $LAMBDA_FUNCTION_NAME in region $AWS_REGION..."

# Clean up any existing dist directory and deployment package
echo "Cleaning up previous deployment artifacts..."
rm -rf $DIST_DIR
rm -f $DEPLOYMENT_PACKAGE

# Create fresh directory structure
echo "Creating fresh distribution directory..."
mkdir -p $DIST_DIR

# Install production dependencies
echo "Installing production dependencies..."
npm install --production

# Copy all necessary files to dist directory
echo "Copying files to distribution directory..."
cp -r node_modules $DIST_DIR/
cp index.js $DIST_DIR/
cp package.json $DIST_DIR/

# Copy all module files and utils directory explicitly to ensure correct versions
echo "Copying module files and utils directory..."
mkdir -p $DIST_DIR/src/modules
mkdir -p $DIST_DIR/src/utils
cp src/modules/*.js $DIST_DIR/src/modules/
cp -r src/utils/* $DIST_DIR/src/utils/

# Verify the files were copied correctly
echo "Verifying files in distribution directory..."
ls -la $DIST_DIR
ls -la $DIST_DIR/src/modules
ls -la $DIST_DIR/src/utils

# Create deployment package
echo "Creating deployment package..."
cd $DIST_DIR && zip -r ../$DEPLOYMENT_PACKAGE . && cd ..

# Check if the deployment package was created successfully
if [ ! -f "$DEPLOYMENT_PACKAGE" ]; then
  echo "Error: Failed to create deployment package."
  exit 1
fi

# Display package size
echo "Deployment package created: $(du -h $DEPLOYMENT_PACKAGE | cut -f1)"

# Deploy to AWS Lambda
echo "Deploying to AWS Lambda function: $LAMBDA_FUNCTION_NAME..."
aws lambda update-function-code \
  --function-name $LAMBDA_FUNCTION_NAME \
  --zip-file fileb://$DEPLOYMENT_PACKAGE \
  --region $AWS_REGION

echo "Deployment completed successfully!"
