# Perplexity Geopolitical Risks Lambda

This AWS Lambda function retrieves and analyzes current geopolitical risks using Perplexity's API and returns a structured risk analysis for financial markets.

## Deployment Steps (AWS CLI)

1. **Zip the Lambda code:**
   ```bash
   cd perplexity-geopolitical-risks-lambda
   zip -r function.zip index.js package.json node_modules
   ```

2. **Create IAM Role for Lambda:**
   ```bash
   aws iam create-role --role-name PerplexityGeoRiskLambdaRole \
     --assume-role-policy-document file://<(echo '{
       "Version": "2012-10-17",
       "Statement": [
         {
           "Effect": "Allow",
           "Principal": {"Service": "lambda.amazonaws.com"},
           "Action": "sts:AssumeRole"
         }
       ]
     }')
   aws iam attach-role-policy --role-name PerplexityGeoRiskLambdaRole \
     --policy-arn arn:aws:policy/service-role/AWSLambdaBasicExecutionRole
   ```

3. **Create the Lambda function (Node.js 22):**
   ```bash
   aws lambda create-function \
     --function-name perplexity-geopolitical-risks \
     --runtime nodejs22.x \
     --role arn:aws:iam::<YOUR_ACCOUNT_ID>:role/PerplexityGeoRiskLambdaRole \
     --handler index.handler \
     --zip-file fileb://function.zip \
     --timeout 60
   ```

4. **Set environment variables (from your .env):**
   ```bash
   aws lambda update-function-configuration \
     --function-name perplexity-geopolitical-risks \
     --environment "Variables={PERPLEXITY_API_KEY=YOUR_KEY,USE_FALLBACK=false}"
   ```

5. **Create API Gateway (HTTP API):**
   ```bash
   aws apigatewayv2 create-api \
     --name "PerplexityGeoRiskAPI" \
     --protocol-type HTTP
   # Note the API ID from the output
   aws apigatewayv2 create-integration \
     --api-id <API_ID> \
     --integration-type AWS_PROXY \
     --integration-uri arn:aws:lambda:<REGION>:<ACCOUNT_ID>:function:perplexity-geopolitical-risks
   aws apigatewayv2 create-route \
     --api-id <API_ID> \
     --route-key "POST /geopolitical-risks"
   aws apigatewayv2 create-stage \
     --api-id <API_ID> \
     --stage-name prod
   aws lambda add-permission \
     --function-name perplexity-geopolitical-risks \
     --statement-id apigateway-permission \
     --action lambda:InvokeFunction \
     --principal apigateway.amazonaws.com \
     --source-arn arn:aws:execute-api:<REGION>:<ACCOUNT_ID>:<API_ID>/*/*/geopolitical-risks
   ```

6. **Test the endpoint:**
   ```bash
   curl -X POST https://<API_ID>.execute-api.<REGION>.amazonaws.com/prod/geopolitical-risks
   ```

---

**Note:** Replace placeholders with your actual AWS account, region, and API key values. You can copy environment variables from your `.env` file.

---

For any issues or automation scripts, see the AWS CLI documentation or ask Cascade for a full bash script.
