#!/bin/bash

# Set variables
LAMBDA_FUNCTION_NAME="GhostPublisherSimplified"
LAMBDA_ROLE_NAME="lambda-ghost-publisher-role"
LAMBDA_ROLE_ARN="arn:aws:iam::339712966836:role/lambda-ghost-publisher-role"

# Create deployment package
echo "📦 Packaging Simplified Ghost Publisher Lambda function..."
mkdir -p dist-simple
cp simplified-handler.js dist-simple/index.js
cp -r node_modules dist-simple/
cd dist-simple
zip -r function.zip index.js node_modules
cd ..

# Check if Lambda role exists
echo "🔍 Checking if IAM role exists..."
ROLE_EXISTS=$(aws iam get-role --role-name $LAMBDA_ROLE_NAME 2>/dev/null)
if [ $? -ne 0 ]; then
    echo "Creating IAM role: $LAMBDA_ROLE_NAME..."
    # Create the IAM role (this should already exist from previous deployments)
else
    echo "✅ IAM role already exists: $LAMBDA_ROLE_ARN"
fi

# Check if Lambda function exists
echo "🔍 Checking if Lambda function exists..."
FUNCTION_EXISTS=$(aws lambda get-function --function-name $LAMBDA_FUNCTION_NAME 2>/dev/null)
if [ $? -ne 0 ]; then
    echo "🔄 Creating Lambda function: $LAMBDA_FUNCTION_NAME..."
    # Create the Lambda function
    aws lambda create-function \
        --function-name $LAMBDA_FUNCTION_NAME \
        --runtime nodejs22.x \
        --role $LAMBDA_ROLE_ARN \
        --handler index.handler \
        --zip-file fileb://dist-simple/function.zip \
        --timeout 30 \
        --memory-size 256 \
        --environment "Variables={GHOST_URL=https://market-pulse-daily.ghost.io,GHOST_API_KEY=67f457a5f41c9900013e1e47:44daf1e666349bde96fad6f9a65979ba1d0b11b161a5c765847218f5bd263b7c,GHOST_NEWSLETTER_ID=67f427c5744a72000854ee8f}"
else
    echo "🔄 Updating existing Lambda function: $LAMBDA_FUNCTION_NAME..."
    # Update the Lambda function code
    aws lambda update-function-code \
        --function-name $LAMBDA_FUNCTION_NAME \
        --zip-file fileb://dist-simple/function.zip
fi

# Create a new API Gateway resource for the simplified function
echo "🔍 Setting up API Gateway integration for simplified function..."
API_ID="vrwz4xsvml"  # Use the existing API Gateway ID
RESOURCE_ID=$(aws apigateway get-resources --rest-api-id $API_ID --query "items[?path=='/simple'].id" --output text)

if [ -z "$RESOURCE_ID" ]; then
    echo "🔄 Creating new API Gateway resource for simplified function..."
    # Get the root resource ID
    ROOT_RESOURCE_ID=$(aws apigateway get-resources --rest-api-id $API_ID --query "items[?path=='/'].id" --output text)
    
    # Create a resource for the /simple endpoint
    RESOURCE_ID=$(aws apigateway create-resource --rest-api-id $API_ID --parent-id $ROOT_RESOURCE_ID --path-part "simple" --query "id" --output text)
    
    # Create a POST method
    aws apigateway put-method \
        --rest-api-id $API_ID \
        --resource-id $RESOURCE_ID \
        --http-method POST \
        --authorization-type NONE \
        --api-key-required true
    
    # Set up the Lambda integration
    aws apigateway put-integration \
        --rest-api-id $API_ID \
        --resource-id $RESOURCE_ID \
        --http-method POST \
        --type AWS_PROXY \
        --integration-http-method POST \
        --uri arn:aws:apigateway:us-east-2:lambda:path/2015-03-31/functions/arn:aws:lambda:us-east-2:339712966836:function:$LAMBDA_FUNCTION_NAME/invocations
    
    # Grant Lambda permission to be invoked by API Gateway
    aws lambda add-permission \
        --function-name $LAMBDA_FUNCTION_NAME \
        --statement-id apigateway-simple \
        --action lambda:InvokeFunction \
        --principal apigateway.amazonaws.com \
        --source-arn "arn:aws:execute-api:us-east-2:339712966836:$API_ID/*/POST/simple"
    
    # Create a deployment
    aws apigateway create-deployment \
        --rest-api-id $API_ID \
        --stage-name prod
    
    # Get the API endpoint
    API_ENDPOINT="https://$API_ID.execute-api.us-east-2.amazonaws.com/prod/simple"
    echo "✅ API Gateway endpoint created: $API_ENDPOINT"
else
    echo "✅ API Gateway resource already exists with ID: $RESOURCE_ID"
    API_ENDPOINT="https://$API_ID.execute-api.us-east-2.amazonaws.com/prod/simple"
    echo "✅ API Gateway endpoint: $API_ENDPOINT"
fi

# Clean up
echo "🧹 Cleaning up..."
rm -rf dist-simple

echo "✅ Simplified deployment complete!"
echo "📝 You can test the simplified API Gateway using:"
echo "   curl -X POST -H \"Content-Type: application/json\" -H \"x-api-key: M73vMuj3HM9XB2SZ8PAXk2coya7laaAe5a4GzIrP\" -d '{\"test\":\"data\"}' $API_ENDPOINT"
