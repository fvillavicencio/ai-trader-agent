#!/bin/bash

# Set the Perplexity API key from the .env file
export PERPLEXITY_API_KEY=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

# Run the test script
echo "Running Lambda function test with Perplexity API key..."
node test-fixed-lambda.js

# Check if the test was successful
if [ $? -eq 0 ]; then
  echo "Test completed successfully."
  
  # List the generated JSON files
  echo "Generated JSON files:"
  ls -la output/geopolitical-risks-*.json | tail -n 5
else
  echo "Test failed. Please check the error messages above."
fi
