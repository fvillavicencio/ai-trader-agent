#!/bin/bash

# Ghost Publisher Lambda - Fixed Deployment Script

echo "📦 Packaging Ghost Publisher Lambda function..."

# Set variables
FUNCTION_NAME="GhostPublisherFunction"
RUNTIME="nodejs22.x"
HANDLER="index.handler"
TIMEOUT=120  # 2 minutes
MEMORY_SIZE=512
REGION=${AWS_REGION:-"us-east-2"}
ROLE_NAME="lambda-ghost-publisher-role"

# Create a clean temporary build directory
BUILD_DIR="lambda-build"
rm -rf "$BUILD_DIR"
mkdir -p "$BUILD_DIR"

echo "📋 Creating optimized deployment package..."

# Copy only the essential source files
echo "  - Copying essential source files..."
cp index.js "$BUILD_DIR/"
cp package.json "$BUILD_DIR/"
cp -r src "$BUILD_DIR/"

# Create a minimal package.json with only production dependencies
echo "  - Creating optimized package.json..."
node -e "
const pkg = require('./package.json');
const minPkg = {
  name: pkg.name,
  version: pkg.version,
  dependencies: pkg.dependencies
};
// We need to keep aws-sdk for direct imports like aws-sdk/clients/s3
require('fs').writeFileSync('$BUILD_DIR/package.json', JSON.stringify(minPkg, null, 2));
"

# Install only production dependencies in the build directory
echo "📚 Installing optimized production dependencies..."
cd "$BUILD_DIR"
npm install --omit=dev --no-package-lock

# Remove unnecessary files from node_modules
echo "🧹 Cleaning up node_modules..."
find node_modules -type d -name "test" -o -name "tests" -o -name ".github" -o -name "docs" | xargs rm -rf
find node_modules -type f -name "*.md" -o -name "LICENSE*" -o -name "*.ts" -o -name "*.map" | xargs rm -f

# Create the deployment package
echo "🗜️ Creating deployment package..."
zip -r ../function.zip . -x "*/\.*" "*/\.*/*"
cd ..

# Environment variables - Load from .env file for better security
ENV_FILE="../src/.env"

# Check if .env file exists
if [ -f "$ENV_FILE" ]; then
  echo "📁 Loading environment variables from $ENV_FILE..."
  # Source the .env file to load environment variables
  export $(grep -v '^#' "$ENV_FILE" | xargs)
else
  echo "⚠️ Warning: $ENV_FILE not found. Using default or existing environment variables."
fi

# Set default values only if environment variables are not set
GHOST_URL=${GHOST_URL:-""}
GHOST_API_KEY=${GHOST_API_KEY:-""}
GHOST_NEWSLETTER_ID=${GHOST_NEWSLETTER_ID:-""}

# Validate required environment variables
if [ -z "$GHOST_URL" ] || [ -z "$GHOST_API_KEY" ]; then
  echo "❌ Error: Required environment variables GHOST_URL and GHOST_API_KEY must be set."
  echo "   Please ensure these are defined in $ENV_FILE or as environment variables."
  exit 1
fi

echo "✅ Using Ghost URL: $GHOST_URL"
echo "✅ Ghost API Key is set"
if [ -n "$GHOST_NEWSLETTER_ID" ]; then
  echo "✅ Ghost Newsletter ID is set"
fi

# Check if IAM role exists, create if it doesn't
echo "🔍 Checking if IAM role exists..."
ROLE_ARN=$(aws iam get-role --role-name $ROLE_NAME --query 'Role.Arn' --output text 2>/dev/null || echo "")

if [ -z "$ROLE_ARN" ]; then
    echo "🆕 Creating new IAM role: $ROLE_NAME..."
    
    # Create trust policy document
    cat > trust-policy.json << EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "lambda.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
EOF

    # Create the role
    ROLE_ARN=$(aws iam create-role \
        --role-name $ROLE_NAME \
        --assume-role-policy-document file://trust-policy.json \
        --query 'Role.Arn' \
        --output text)
        
    # Attach basic Lambda execution policy
    aws iam attach-role-policy \
        --role-name $ROLE_NAME \
        --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole
        
    # Wait for role to propagate
    echo "⏳ Waiting for role to propagate..."
    sleep 10
    
    rm trust-policy.json
else
    echo "✅ IAM role already exists: $ROLE_ARN"
fi

# Environment variables
ENV_VARS="{\"Variables\":{\"GHOST_URL\":\"${GHOST_URL}\",\"GHOST_API_KEY\":\"${GHOST_API_KEY}\",\"GHOST_NEWSLETTER_ID\":\"${GHOST_NEWSLETTER_ID}\"}}"

# Check if function exists
echo "🔍 Checking if Lambda function exists..."
FUNCTION_EXISTS=$(aws lambda get-function --function-name $FUNCTION_NAME --region $REGION 2>/dev/null || echo "")

if [ -z "$FUNCTION_EXISTS" ]; then
    echo "🆕 Creating new Lambda function: $FUNCTION_NAME..."
    aws lambda create-function \
        --function-name $FUNCTION_NAME \
        --runtime $RUNTIME \
        --handler $HANDLER \
        --role $ROLE_ARN \
        --zip-file fileb://function.zip \
        --timeout $TIMEOUT \
        --memory-size $MEMORY_SIZE \
        --environment "$ENV_VARS" \
        --region $REGION
        
    # Add permission to invoke from API Gateway
    aws lambda add-permission \
        --function-name $FUNCTION_NAME \
        --statement-id apigateway-invoke \
        --action lambda:InvokeFunction \
        --principal apigateway.amazonaws.com \
        --region $REGION
else
    echo "🔄 Updating existing Lambda function: $FUNCTION_NAME..."
    aws lambda update-function-code \
        --function-name $FUNCTION_NAME \
        --zip-file fileb://function.zip \
        --region $REGION

    # Update environment variables
    aws lambda update-function-configuration \
        --function-name $FUNCTION_NAME \
        --environment "$ENV_VARS" \
        --timeout $TIMEOUT \
        --memory-size $MEMORY_SIZE \
        --region $REGION
fi

echo "✅ Deployment complete!"

# Clean up build directory
echo "🧹 Cleaning up build directory..."
rm -rf "$BUILD_DIR"
