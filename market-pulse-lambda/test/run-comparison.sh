#!/bin/bash
# This script runs the Lambda client with the sample data and then compares the output
# with the original handlebars output.

# Define paths
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LAMBDA_DIR="$(dirname "$SCRIPT_DIR")"
PROJECT_ROOT="$(dirname "$LAMBDA_DIR")"
SAMPLE_DATA_PATH="$PROJECT_ROOT/market-pulse-handlebars/v2/sample-data.json"
HANDLEBARS_OUTPUT_PATH="$PROJECT_ROOT/market-pulse-handlebars/v2/output.html"
LAMBDA_OUTPUT_PATH="$SCRIPT_DIR/full-sample-output.html"

echo "=== Market Pulse Lambda Comparison Tool ==="
echo "Sample data: $SAMPLE_DATA_PATH"
echo "Handlebars output: $HANDLEBARS_OUTPUT_PATH"
echo "Lambda output: $LAMBDA_OUTPUT_PATH"
echo ""

# Step 1: Process the sample data with the Lambda function
echo "Step 1: Processing sample data with Lambda function..."
cd "$LAMBDA_DIR"
node "$SCRIPT_DIR/lambda-client.js" "$SAMPLE_DATA_PATH" "$LAMBDA_OUTPUT_PATH"

# Check if the Lambda processing was successful
if [ ! -f "$LAMBDA_OUTPUT_PATH" ]; then
  echo "Error: Lambda processing failed. Output file not created."
  exit 1
fi

# Step 2: Compare the outputs
echo ""
echo "Step 2: Comparing outputs..."
node "$SCRIPT_DIR/compare-outputs.js" "$HANDLEBARS_OUTPUT_PATH" "$LAMBDA_OUTPUT_PATH"

echo ""
echo "Process completed. Review the differences and update the Lambda function as needed."
echo "To view the outputs in your browser:"
echo "- Handlebars output: open \"$HANDLEBARS_OUTPUT_PATH\""
echo "- Lambda output: open \"$LAMBDA_OUTPUT_PATH\""
