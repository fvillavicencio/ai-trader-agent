#!/bin/bash

# Script to invoke the Ghost Publisher Lambda function using AWS CLI

# Set variables
FUNCTION_NAME="GhostPublisherFunction"
INPUT_FILE=${1:-"test-input.json"}
OUTPUT_FILE="lambda-output-$(date +%Y%m%d-%H%M%S).json"
REGION=${AWS_REGION:-"us-east-2"}

echo "📤 Invoking Lambda function: $FUNCTION_NAME"
echo "📄 Using input file: $INPUT_FILE"
echo "📥 Output will be saved to: $OUTPUT_FILE"

# Check if input file exists
if [ ! -f "$INPUT_FILE" ]; then
    echo "❌ Error: Input file $INPUT_FILE not found"
    exit 1
fi

# Process input file if it contains paths to other files
TMP_INPUT_FILE="tmp-input.json"

# Check if input contains mobiledocPath or dataPath
if grep -q "mobiledocPath\|dataPath" "$INPUT_FILE"; then
    echo "🔄 Processing input file to resolve file paths..."
    
    # Extract mobiledoc if path is specified
    MOBILEDOC_PATH=$(jq -r '.mobiledocPath // empty' "$INPUT_FILE")
    if [ ! -z "$MOBILEDOC_PATH" ]; then
        if [ -f "$MOBILEDOC_PATH" ]; then
            echo "📄 Reading mobiledoc from $MOBILEDOC_PATH"
            # Read mobiledoc file and escape it properly for JSON
            MOBILEDOC=$(cat "$MOBILEDOC_PATH" | jq -Rs .)
            # Create a temporary input file with the mobiledoc content
            jq --arg mobiledoc "$MOBILEDOC" '.mobiledoc = $mobiledoc | del(.mobiledocPath)' "$INPUT_FILE" > "$TMP_INPUT_FILE"
        else
            echo "⚠️ Warning: Mobiledoc file $MOBILEDOC_PATH not found"
            cp "$INPUT_FILE" "$TMP_INPUT_FILE"
        fi
    else
        cp "$INPUT_FILE" "$TMP_INPUT_FILE"
    fi
    
    # Extract data if path is specified
    DATA_PATH=$(jq -r '.dataPath // empty' "$TMP_INPUT_FILE")
    if [ ! -z "$DATA_PATH" ]; then
        if [ -f "$DATA_PATH" ]; then
            echo "📄 Reading data from $DATA_PATH"
            # Read data file
            DATA=$(cat "$DATA_PATH")
            # Update the temporary input file with the data content
            jq --argjson data "$DATA" '.data = $data | del(.dataPath)' "$TMP_INPUT_FILE" > "$TMP_INPUT_FILE.2"
            mv "$TMP_INPUT_FILE.2" "$TMP_INPUT_FILE"
        else
            echo "⚠️ Warning: Data file $DATA_PATH not found"
        fi
    fi
    
    INPUT_FILE="$TMP_INPUT_FILE"
fi

# Invoke Lambda function
echo "🚀 Invoking Lambda function..."
aws lambda invoke \
    --function-name "$FUNCTION_NAME" \
    --payload fileb://"$INPUT_FILE" \
    --cli-binary-format raw-in-base64-out \
    --region "$REGION" \
    "$OUTPUT_FILE"

# Check if API Gateway endpoint exists
if [ -f "api-endpoint.txt" ]; then
    API_ENDPOINT=$(cat api-endpoint.txt)
    echo "🌐 API Gateway endpoint: $API_ENDPOINT"
    
    echo "🚀 You can also invoke via API Gateway using:"
    echo "curl -X POST -H \"Content-Type: application/json\" -d @$INPUT_FILE $API_ENDPOINT"
fi

# Clean up temporary file
if [ -f "$TMP_INPUT_FILE" ]; then
    rm "$TMP_INPUT_FILE"
fi

# Check if output file was created
if [ -f "$OUTPUT_FILE" ]; then
    echo "✅ Lambda function invoked successfully"
    echo "📄 Output saved to $OUTPUT_FILE"
    
    # Display a summary of the output
    STATUS_CODE=$(jq -r '.statusCode' "$OUTPUT_FILE" 2>/dev/null || echo "Unknown")
    
    if [ "$STATUS_CODE" == "200" ]; then
        POST_URL=$(jq -r '.body.postUrl' "$OUTPUT_FILE" 2>/dev/null || echo "Unknown")
        TITLE=$(jq -r '.body.title' "$OUTPUT_FILE" 2>/dev/null || echo "Unknown")
        PAID_MEMBERS=$(jq -r '.body.members.paid | length' "$OUTPUT_FILE" 2>/dev/null || echo "Unknown")
        FREE_MEMBERS=$(jq -r '.body.members.free | length' "$OUTPUT_FILE" 2>/dev/null || echo "Unknown")
        COMPED_MEMBERS=$(jq -r '.body.members.comped | length' "$OUTPUT_FILE" 2>/dev/null || echo "Unknown")
        
        echo "📊 Summary:"
        echo "  - Status: Success"
        echo "  - Post URL: $POST_URL"
        echo "  - Title: $TITLE"
        echo "  - Paid members: $PAID_MEMBERS"
        echo "  - Free members: $FREE_MEMBERS"
        echo "  - Comped members: $COMPED_MEMBERS"
    else
        ERROR=$(jq -r '.body.error' "$OUTPUT_FILE" 2>/dev/null || echo "Unknown error")
        echo "❌ Error: $ERROR"
    fi
else
    echo "❌ Error: Failed to invoke Lambda function"
fi
