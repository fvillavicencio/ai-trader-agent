#!/bin/bash
# Script to create a deployment package for AWS Lambda

# Set variables
LAMBDA_FUNCTION_NAME="sp500-analyzer"
REGION="us-east-2"  # Adjust to your AWS region
ZIP_FILE="lambda-deployment.zip"

# Create a temporary directory for the deployment package
echo "Creating deployment package..."
rm -f $ZIP_FILE
zip -r $ZIP_FILE . -x "*.git*" "*.xlsx" "*.zip" "node_modules/*" "*.sh" "*.md" "*.sample" "*.env"

# Install production dependencies
echo "Installing production dependencies..."
rm -rf node_modules
npm install --production

# Add node_modules to the zip file
echo "Adding node_modules to deployment package..."
zip -r $ZIP_FILE node_modules

echo "Deployment package created: $ZIP_FILE"
echo ""
echo "To deploy to AWS Lambda, use the following AWS CLI command:"
echo "aws lambda update-function-code --function-name $LAMBDA_FUNCTION_NAME --zip-file fileb://$ZIP_FILE --region $REGION"
echo ""
echo "Or upload the $ZIP_FILE file via the AWS Lambda console."
