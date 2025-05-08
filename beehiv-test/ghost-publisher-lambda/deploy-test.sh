#!/bin/bash

# Set variables
LAMBDA_FUNCTION_NAME="GhostPublisherTestFunction"
LAMBDA_ROLE_NAME="lambda-ghost-publisher-role"
LAMBDA_ROLE_ARN="arn:aws:iam::339712966836:role/lambda-ghost-publisher-role"
API_GATEWAY_NAME="GhostPublisherTestAPI"
API_STAGE_NAME="test"
API_KEY_NAME="GhostPublisherTestAPIKey"

# Create deployment package
echo "📦 Creating test Lambda deployment package..."
mkdir -p dist
cp test-handler.js dist/index.js
cd dist
zip -r function.zip index.js
cd ..

# Check if Lambda role exists
echo "🔍 Checking if IAM role exists..."
ROLE_EXISTS=$(aws iam get-role --role-name $LAMBDA_ROLE_NAME 2>/dev/null)
if [ $? -ne 0 ]; then
    echo "🔄 Creating IAM role: $LAMBDA_ROLE_NAME..."
    # Create a trust policy document
    cat > trust-policy.json << EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "lambda.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
EOF

    # Create the IAM role
    aws iam create-role --role-name $LAMBDA_ROLE_NAME --assume-role-policy-document file://trust-policy.json
    
    # Attach the Lambda basic execution policy
    aws iam attach-role-policy --role-name $LAMBDA_ROLE_NAME --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole
    
    # Wait for the role to be available
    echo "⏳ Waiting for IAM role to be available..."
    sleep 10
    
    # Get the role ARN
    LAMBDA_ROLE_ARN=$(aws iam get-role --role-name $LAMBDA_ROLE_NAME --query 'Role.Arn' --output text)
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
        --zip-file fileb://dist/function.zip \
        --timeout 30 \
        --memory-size 256
else
    echo "🔄 Updating existing Lambda function: $LAMBDA_FUNCTION_NAME..."
    # Update the Lambda function code
    aws lambda update-function-code \
        --function-name $LAMBDA_FUNCTION_NAME \
        --zip-file fileb://dist/function.zip
fi

# Create a new API Gateway
echo "🔍 Setting up API Gateway for testing..."
API_ID=$(aws apigateway get-rest-apis --query "items[?name=='$API_GATEWAY_NAME'].id" --output text)
if [ -z "$API_ID" ]; then
    echo "🔄 Creating new API Gateway: $API_GATEWAY_NAME..."
    API_ID=$(aws apigateway create-rest-api --name $API_GATEWAY_NAME --query 'id' --output text)
    
    # Get the root resource ID
    ROOT_RESOURCE_ID=$(aws apigateway get-resources --rest-api-id $API_ID --query 'items[?path==`/`].id' --output text)
    
    # Create a resource for the /test endpoint
    RESOURCE_ID=$(aws apigateway create-resource --rest-api-id $API_ID --parent-id $ROOT_RESOURCE_ID --path-part "test" --query 'id' --output text)
    
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
    
    # Create a deployment
    aws apigateway create-deployment \
        --rest-api-id $API_ID \
        --stage-name $API_STAGE_NAME
    
    # Create an API key
    API_KEY=$(aws apigateway create-api-key \
        --name $API_KEY_NAME \
        --enabled \
        --query 'value' \
        --output text)
    
    # Create a usage plan
    USAGE_PLAN_ID=$(aws apigateway create-usage-plan \
        --name "$API_GATEWAY_NAME-UsagePlan" \
        --api-stages "apiId=$API_ID,stage=$API_STAGE_NAME" \
        --query 'id' \
        --output text)
    
    # Add the API key to the usage plan
    aws apigateway create-usage-plan-key \
        --usage-plan-id $USAGE_PLAN_ID \
        --key-id $(aws apigateway get-api-keys --name-query $API_KEY_NAME --query 'items[0].id' --output text) \
        --key-type API_KEY
    
    # Grant Lambda permission to be invoked by API Gateway
    aws lambda add-permission \
        --function-name $LAMBDA_FUNCTION_NAME \
        --statement-id apigateway-test \
        --action lambda:InvokeFunction \
        --principal apigateway.amazonaws.com \
        --source-arn "arn:aws:execute-api:us-east-2:339712966836:$API_ID/*/$API_STAGE_NAME/test"
    
    # Get the API endpoint
    API_ENDPOINT="https://$API_ID.execute-api.us-east-2.amazonaws.com/$API_STAGE_NAME/test"
    echo "✅ API Gateway endpoint created: $API_ENDPOINT"
    echo "✅ API Key: $API_KEY"
    
    # Save endpoint and key to a file
    echo "API_ENDPOINT=$API_ENDPOINT" > test-api-config.env
    echo "API_KEY=$API_KEY" >> test-api-config.env
    echo "✅ API endpoint and key saved to test-api-config.env"
else
    echo "✅ API Gateway already exists with ID: $API_ID"
    
    # Get the API endpoint
    API_ENDPOINT="https://$API_ID.execute-api.us-east-2.amazonaws.com/$API_STAGE_NAME/test"
    echo "✅ API Gateway endpoint: $API_ENDPOINT"
    
    # Get the API key
    API_KEY=$(aws apigateway get-api-keys --name-query $API_KEY_NAME --include-values --query 'items[0].value' --output text)
    echo "✅ API Key: $API_KEY"
    
    # Save endpoint and key to a file
    echo "API_ENDPOINT=$API_ENDPOINT" > test-api-config.env
    echo "API_KEY=$API_KEY" >> test-api-config.env
fi

echo "✅ Test deployment complete!"
echo "📝 You can test the API Gateway using:"
echo "   curl -X POST -H \"Content-Type: application/json\" -H \"x-api-key: $API_KEY\" -d '{\"test\":\"data\"}' $API_ENDPOINT"
