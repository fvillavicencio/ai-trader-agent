#!/bin/bash

# Test script for Ghost Publisher Lambda function

# Set variables
API_ENDPOINT="https://m944cizcua.execute-api.us-east-2.amazonaws.com/prod/"
FUNCTION_NAME="GhostPublisherFunction"
REGION="us-east-2"

# Check if jq is installed
if ! command -v jq &> /dev/null; then
    echo "❌ Error: jq is not installed. Please install jq to run this script."
    exit 1
fi

# Function to read JSON file
read_json() {
    local file=$1
    if [ -f "$file" ]; then
        cat "$file"
    else
        echo "{}"
    fi
}

# Function to invoke via API Gateway
invoke_via_api() {
    echo "🚀 Invoking Lambda function via API Gateway..."
    
    # Read input files
    MOBILEDOC=$(read_json "$1")
    DATA=$(read_json "$2")
    
    # Create payload
    PAYLOAD=$(jq -n \
        --arg mobiledoc "$MOBILEDOC" \
        --argjson data "$DATA" \
        '{
            "mobiledoc": $mobiledoc,
            "data": $data
        }')
    
    # Invoke API
    RESPONSE=$(curl -X POST \
        -H "Content-Type: application/json" \
        -d "$PAYLOAD" \
        "$API_ENDPOINT")
    
    echo "📊 Response:"
    echo "$RESPONSE" | jq '.'
    
    # Extract important information
    echo "📊 Summary:"
    echo "$RESPONSE" | jq -r '.body | fromjson | .postUrl as $url | 
        .title as $title | 
        .members.paid | length as $paid | 
        .members.free | length as $free | 
        .members.comped | length as $comped | 
        "Post URL: \($url)\nTitle: \($title)\nPaid members: \($paid)\nFree members: \($free)\nComped members: \($comped)"'
}

# Function to invoke via AWS CLI
invoke_via_cli() {
    echo "🚀 Invoking Lambda function via AWS CLI..."
    
    # Read input files
    MOBILEDOC=$(read_json "$1")
    DATA=$(read_json "$2")
    
    # Create payload
    PAYLOAD=$(jq -n \
        --arg mobiledoc "$MOBILEDOC" \
        --argjson data "$DATA" \
        '{
            "mobiledoc": $mobiledoc,
            "data": $data
        }')
    
    # Invoke Lambda
    RESPONSE=$(aws lambda invoke \
        --function-name "$FUNCTION_NAME" \
        --payload "$PAYLOAD" \
        --region "$REGION" \
        output.json)
    
    # Read response from file
    cat output.json
    
    # Clean up
    rm output.json
}

# Main script
if [ $# -lt 2 ]; then
    echo "Usage: $0 <mobiledoc-file> <data-file> [api|cli]"
    echo "Example: $0 ghost-post.json market_pulse_data.json api"
    exit 1
fi

MOBILEDOC_FILE=$1
DATA_FILE=$2
METHOD=${3:-"api"}

if [ "$METHOD" == "api" ]; then
    invoke_via_api "$MOBILEDOC_FILE" "$DATA_FILE"
elif [ "$METHOD" == "cli" ]; then
    invoke_via_cli "$MOBILEDOC_FILE" "$DATA_FILE"
else
    echo "❌ Invalid method. Use 'api' or 'cli'"
    exit 1
fi
