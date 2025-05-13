#!/bin/bash

# Test script to invoke the Lambda function directly using AWS CLI
# This will test if our image selection logic is working correctly

echo "Invoking Lambda function with test data..."

# Invoke the Lambda function
aws lambda invoke \
  --function-name GhostPublisherFunction \
  --region us-east-2 \
  --payload file://test-input.json \
  --cli-binary-format raw-in-base64-out \
  --log-type Tail \
  output.json

# Decode the base64 encoded logs
echo -e "\nLambda Logs:"
aws lambda invoke \
  --function-name GhostPublisherFunction \
  --region us-east-2 \
  --payload file://test-input.json \
  --cli-binary-format raw-in-base64-out \
  --log-type Tail \
  /dev/null | grep "LogResult" | awk -F'"' '{print $4}' | base64 --decode

# Display the response
echo -e "\nLambda Response:"
cat output.json

echo -e "\nTest completed"
