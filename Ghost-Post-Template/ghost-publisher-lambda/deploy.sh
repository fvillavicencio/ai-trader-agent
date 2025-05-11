#!/bin/bash

# Ghost Publisher Lambda Deployment Script

echo "📦 Packaging Ghost Publisher Lambda function..."

# Set variables
FUNCTION_NAME="GhostPublisherFunction"
RUNTIME="nodejs22.x"
HANDLER="index.handler"
TIMEOUT=120  # Increased to 2 minutes
MEMORY_SIZE=512  # Increased memory for better performance
REGION=${AWS_REGION:-"us-east-2"}
ROLE_NAME="lambda-ghost-publisher-role"

# Create a temporary directory for packaging
mkdir -p dist

# Install production dependencies
echo "📚 Installing production dependencies..."
npm install --production

# Copy files to dist directory
echo "📋 Copying files to dist directory..."
cp -r index.js package.json node_modules src dist/

# Create the deployment package
echo "🗜️  Creating deployment package..."
cd dist
zip -r ../function.zip .
cd ..

# Check if IAM role exists, create if it doesn't
echo "🔍 Checking if IAM role exists..."
ROLE_ARN=$(aws iam get-role --role-name $ROLE_NAME --query 'Role.Arn' --output text 2>/dev/null || echo "")

if [ -z "$ROLE_ARN" ]; then
    echo "🆕 Creating new IAM role: $ROLE_NAME..."
    
    # Create trust policy document
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

    # Create the role
    ROLE_ARN=$(aws iam create-role \
        --role-name $ROLE_NAME \
        --assume-role-policy-document file://trust-policy.json \
        --query 'Role.Arn' \
        --output text)
        
    # Attach basic Lambda execution policy
    aws iam attach-role-policy \
        --role-name $ROLE_NAME \
        --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole
        
    # Wait for role to propagate
    echo "⏳ Waiting for role to propagate..."
    sleep 10
    
    rm trust-policy.json
else
    echo "✅ IAM role already exists: $ROLE_ARN"
fi

# Check if function exists
echo "🔍 Checking if Lambda function exists..."
FUNCTION_EXISTS=$(aws lambda get-function --function-name $FUNCTION_NAME --region $REGION 2>/dev/null || echo "")

# Environment variables
ENV_VARS="{\"Variables\":{\"GHOST_URL\":\"${GHOST_URL}\",\"GHOST_API_KEY\":\"${GHOST_API_KEY}\",\"GHOST_NEWSLETTER_ID\":\"${GHOST_NEWSLETTER_ID}\"}}"

if [ -z "$FUNCTION_EXISTS" ]; then
    echo "🆕 Creating new Lambda function: $FUNCTION_NAME..."
    aws lambda create-function \
        --function-name $FUNCTION_NAME \
        --runtime $RUNTIME \
        --handler $HANDLER \
        --role $ROLE_ARN \
        --zip-file fileb://function.zip \
        --timeout $TIMEOUT \
        --memory-size $MEMORY_SIZE \
        --environment "$ENV_VARS" \
        --region $REGION
        
    # Add permission to invoke from API Gateway
    aws lambda add-permission \
        --function-name $FUNCTION_NAME \
        --statement-id apigateway-invoke \
        --action lambda:InvokeFunction \
        --principal apigateway.amazonaws.com \
        --region $REGION
else
    echo "🔄 Updating existing Lambda function: $FUNCTION_NAME..."
    aws lambda update-function-code \
        --function-name $FUNCTION_NAME \
        --zip-file fileb://function.zip \
        --region $REGION

    # Update environment variables
    aws lambda update-function-configuration \
        --function-name $FUNCTION_NAME \
        --environment "$ENV_VARS" \
        --timeout $TIMEOUT \
        --memory-size $MEMORY_SIZE \
        --region $REGION
fi

# Create API Gateway if it doesn't exist
echo "🔍 Setting up API Gateway..."
API_ID=$(aws apigateway get-rest-apis --query "items[?name=='GhostPublisherAPI'].id" --output text --region $REGION)

if [ -z "$API_ID" ]; then
    echo "🆕 Creating new API Gateway: GhostPublisherAPI..."
    
    # Create API
    API_ID=$(aws apigateway create-rest-api \
        --name GhostPublisherAPI \
        --description "API for Ghost Publisher Lambda function" \
        --endpoint-configuration "{ \"types\": [\"REGIONAL\"] }" \
        --region $REGION \
        --query 'id' \
        --output text)
        
    # Get root resource ID
    ROOT_ID=$(aws apigateway get-resources \
        --rest-api-id $API_ID \
        --region $REGION \
        --query 'items[0].id' \
        --output text)
        
    # Create resource
    RESOURCE_ID=$(aws apigateway create-resource \
        --rest-api-id $API_ID \
        --parent-id $ROOT_ID \
        --path-part "publish" \
        --region $REGION \
        --query 'id' \
        --output text)
        
    # Create POST method
    aws apigateway put-method \
        --rest-api-id $API_ID \
        --resource-id $RESOURCE_ID \
        --http-method POST \
        --authorization-type NONE \
        --region $REGION
        
    # Set Lambda integration
    LAMBDA_ARN=$(aws lambda get-function --function-name $FUNCTION_NAME --query 'Configuration.FunctionArn' --output text --region $REGION)
    
    aws apigateway put-integration \
        --rest-api-id $API_ID \
        --resource-id $RESOURCE_ID \
        --http-method POST \
        --type AWS_PROXY \
        --integration-http-method POST \
        --uri "arn:aws:apigateway:${REGION}:lambda:path/2015-03-31/functions/${LAMBDA_ARN}/invocations" \
        --region $REGION
        
    # Deploy API
    aws apigateway create-deployment \
        --rest-api-id $API_ID \
        --stage-name prod \
        --region $REGION
        
    # Output API endpoint
    API_ENDPOINT="https://${API_ID}.execute-api.${REGION}.amazonaws.com/prod/publish"
    echo "✅ API Gateway endpoint created: $API_ENDPOINT"
    
    # Save endpoint to a file
    echo $API_ENDPOINT > api-endpoint.txt
    echo "✅ API endpoint saved to api-endpoint.txt"
else
    echo "✅ API Gateway already exists with ID: $API_ID"
    API_ENDPOINT="https://${API_ID}.execute-api.${REGION}.amazonaws.com/prod/publish"
    echo "✅ API Gateway endpoint: $API_ENDPOINT"
    echo $API_ENDPOINT > api-endpoint.txt
fi

# Clean up
echo "🧹 Cleaning up..."
rm -rf dist
rm function.zip

echo "✅ Deployment complete!"
echo "📝 You can invoke the Lambda function using:"
echo "   aws lambda invoke --function-name $FUNCTION_NAME --payload file://test-input.json output.json"
echo "📝 Or via API Gateway using:"
echo "   curl -X POST -H \"Content-Type: application/json\" -d @test-input.json $API_ENDPOINT"
