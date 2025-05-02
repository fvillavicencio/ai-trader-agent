#!/bin/bash

# Script to generate Ghost post and publish it via Lambda

# Set variables
REPO_DIR=$(dirname "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)")
LAMBDA_DIR="$REPO_DIR/ghost-publisher-lambda"
INPUT_FILE="$LAMBDA_DIR/lambda-input.json"
GHOST_POST_SCRIPT="$REPO_DIR/generate-ghost-post.js"
GHOST_POST_OUTPUT="$REPO_DIR/ghost-post.json"
DATA_FILE="$REPO_DIR/market_pulse_data.json"

echo "🔄 Generating Ghost post..."
cd "$REPO_DIR" && node "$GHOST_POST_SCRIPT"

if [ $? -ne 0 ]; then
    echo "❌ Failed to generate Ghost post"
    exit 1
fi

echo "✅ Ghost post generated successfully"

# Create input file for Lambda function
echo "📝 Creating Lambda input file..."
cat > "$INPUT_FILE" << EOF
{
  "ghostUrl": "${GHOST_URL}",
  "ghostApiKey": "${GHOST_API_KEY}",
  "newsletterId": "${GHOST_NEWSLETTER_ID}",
  "mobiledocPath": "$GHOST_POST_OUTPUT",
  "dataPath": "$DATA_FILE",
  "featureImageUrl": "${FEATURE_IMAGE_URL}"
}
EOF

echo "✅ Lambda input file created: $INPUT_FILE"

# Invoke Lambda function
echo "🚀 Invoking Lambda function..."
cd "$LAMBDA_DIR" && ./invoke-lambda-cli.sh "$INPUT_FILE"

# Check if we're running locally or deploying to AWS
if [ "$1" == "--deploy" ]; then
    echo "📦 Deploying to AWS..."
    cd "$LAMBDA_DIR" && ./deploy.sh
    
    # Invoke the deployed Lambda function
    echo "🚀 Invoking deployed Lambda function..."
    cd "$LAMBDA_DIR" && ./invoke-lambda-cli.sh "$INPUT_FILE"
fi

echo "✅ Process completed"
