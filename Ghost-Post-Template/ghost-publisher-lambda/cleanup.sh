#!/bin/bash

# Cleanup script to remove test files and keep only essential files

echo "🧹 Cleaning up project directory..."

# Directory paths
PROJECT_ROOT="/Users/frankvillavicencio/Documents/Development/Market Pulse Daily/Ghost-Post-Template"
LAMBDA_DIR="$PROJECT_ROOT/ghost-publisher-lambda"

# Files to keep (essential working files)
KEEP_SCRIPTS=(
  "generate-market-pulse-html.js"  # Main script to generate HTML
  "deploy-lambda.sh"               # Script to deploy Lambda
  "test-deployed-lambda.js"        # Script to test deployed Lambda
  "invoke-lambda-cli.sh"           # Script to invoke Lambda via CLI
)

# Latest HTML file to keep
LATEST_HTML="market-pulse-deployed-2025-05-12.html"

echo "📋 Identifying files to remove..."

# Remove test scripts
echo "🗑️ Removing test scripts..."
find "$LAMBDA_DIR" -name "*test*.js" -type f | grep -v "test-deployed-lambda.js" | xargs rm -f
find "$LAMBDA_DIR" -name "*extract*.js" -type f | xargs rm -f
find "$LAMBDA_DIR" -name "*analyze*.js" -type f | xargs rm -f
find "$LAMBDA_DIR" -name "*capture*.js" -type f | xargs rm -f
find "$LAMBDA_DIR" -name "*fix*.js" -type f | xargs rm -f
find "$LAMBDA_DIR" -name "*save*.js" -type f | xargs rm -f
find "$LAMBDA_DIR" -name "*direct-html*.js" -type f | xargs rm -f
find "$LAMBDA_DIR" -name "inspect-*.js" -type f | xargs rm -f

# Remove output files
echo "🗑️ Removing output files..."
find "$LAMBDA_DIR" -name "lambda-output-*.json" -type f | xargs rm -f
find "$LAMBDA_DIR" -name "api-gateway-response.json" -type f | xargs rm -f
find "$LAMBDA_DIR" -name "parsed-body-*.json" -type f | xargs rm -f
find "$LAMBDA_DIR" -name "full-response-*.json" -type f | xargs rm -f
find "$LAMBDA_DIR" -name "direct-lambda-response.json" -type f | xargs rm -f

# Remove old HTML files except the latest one
echo "🗑️ Removing old HTML files..."
find "$PROJECT_ROOT" -name "market-pulse-*.html" -type f | grep -v "$LATEST_HTML" | xargs rm -f

# Remove temporary files
echo "🗑️ Removing temporary files..."
find "$LAMBDA_DIR" -name "tmp-*.json" -type f | xargs rm -f
find "$LAMBDA_DIR" -name "*.zip" -type f | xargs rm -f

echo "✅ Cleanup completed!"
echo "📁 Kept essential files:"
for script in "${KEEP_SCRIPTS[@]}"; do
  if [ -f "$LAMBDA_DIR/$script" ]; then
    echo "  - $script"
  fi
done
echo "  - $LATEST_HTML"
