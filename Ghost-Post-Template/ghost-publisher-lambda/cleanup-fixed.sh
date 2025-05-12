#!/bin/bash

# Improved cleanup script to remove test files and keep only essential files

echo "🧹 Cleaning up project directory..."

# Directory paths
PROJECT_ROOT="/Users/frankvillavicencio/Documents/Development/Market Pulse Daily/Ghost-Post-Template"
LAMBDA_DIR="${PROJECT_ROOT}/ghost-publisher-lambda"

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
cd "$LAMBDA_DIR"
for file in $(find . -name "*test*.js" -type f | grep -v "test-deployed-lambda.js"); do
  echo "  Removing $file"
  rm -f "$file"
done

for file in $(find . -name "*extract*.js" -type f); do
  echo "  Removing $file"
  rm -f "$file"
done

for file in $(find . -name "*analyze*.js" -type f); do
  echo "  Removing $file"
  rm -f "$file"
done

for file in $(find . -name "*capture*.js" -type f); do
  echo "  Removing $file"
  rm -f "$file"
done

for file in $(find . -name "*fix*.js" -type f); do
  echo "  Removing $file"
  rm -f "$file"
done

for file in $(find . -name "*save*.js" -type f); do
  echo "  Removing $file"
  rm -f "$file"
done

for file in $(find . -name "direct-html*.js" -type f); do
  echo "  Removing $file"
  rm -f "$file"
done

for file in $(find . -name "inspect-*.js" -type f); do
  echo "  Removing $file"
  rm -f "$file"
done

# Remove output files
echo "🗑️ Removing output files..."
for file in $(find . -name "lambda-output-*.json" -type f); do
  echo "  Removing $file"
  rm -f "$file"
done

for file in $(find . -name "api-gateway-response.json" -type f); do
  echo "  Removing $file"
  rm -f "$file"
done

for file in $(find . -name "parsed-body-*.json" -type f); do
  echo "  Removing $file"
  rm -f "$file"
done

for file in $(find . -name "full-response-*.json" -type f); do
  echo "  Removing $file"
  rm -f "$file"
done

for file in $(find . -name "direct-lambda-response.json" -type f); do
  echo "  Removing $file"
  rm -f "$file"
done

# Remove old HTML files except the latest one
echo "🗑️ Removing old HTML files..."
cd "$PROJECT_ROOT"
for file in $(find . -name "market-pulse-*.html" -type f | grep -v "$LATEST_HTML"); do
  echo "  Removing $file"
  rm -f "$file"
done

# Remove temporary files
echo "🗑️ Removing temporary files..."
cd "$LAMBDA_DIR"
for file in $(find . -name "tmp-*.json" -type f); do
  echo "  Removing $file"
  rm -f "$file"
done

for file in $(find . -name "*.zip" -type f); do
  echo "  Removing $file"
  rm -f "$file"
done

echo "✅ Cleanup completed!"
echo "📁 Kept essential files:"
for script in "${KEEP_SCRIPTS[@]}"; do
  if [ -f "$LAMBDA_DIR/$script" ]; then
    echo "  - $script"
  fi
done
echo "  - $LATEST_HTML"
