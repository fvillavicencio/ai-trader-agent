#!/bin/bash

# Set variables
FUNCTION_NAME="GhostPublisherFunction"
REGION="us-east-2"
OUTPUT_FILE="lambda-response.json"

# Create a simple test payload
cat > test-payload.json << EOF
{
  "ghostUrl": "https://market-pulse-daily.ghost.io",
  "ghostApiKey": "67f457a5f41c9900013e1e47:44daf1e666349bde96fad6f9a65979ba1d0b11b161a5c765847218f5bd263b7c",
  "newsletterId": "67f427c5744a72000854ee8f",
  "jsonData": {
    "reportMetadata": {
      "title": "Market Insights - CLI Test",
      "date": "May 2, 2025",
      "time": "1:20 PM",
      "timezone": "EDT"
    },
    "marketSentiment": {
      "overall": {
        "value": 65,
        "change": 5,
        "interpretation": "Bullish"
      }
    }
  },
  "featureImageUrl": "https://example.com/feature-image.jpg"
}
EOF

echo "Invoking Lambda function directly with AWS CLI..."
aws lambda invoke \
  --function-name $FUNCTION_NAME \
  --region $REGION \
  --payload fileb://test-payload.json \
  --cli-binary-format raw-in-base64-out \
  --log-type Tail \
  $OUTPUT_FILE \
  --query 'LogResult' \
  --output text | base64 -d

echo "Lambda response saved to $OUTPUT_FILE"
cat $OUTPUT_FILE
