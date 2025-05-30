# Geopolitical Risk Lambda Function

This AWS Lambda function provides geopolitical risk analysis for the Market Pulse Daily report. It offers two main operations:

1. **Retrieve Operation**: Returns the latest geopolitical risk data in the format required by JsonExport.gs
2. **Refresh Operation**: Forces a refresh of the data by re-running the analysis

The function implements a 15-minute cache to ensure fast responses for frequent requests.

## Features

- Fetches and analyzes geopolitical risk data using OpenAI
- Properly formats data to match JsonExport.gs requirements
- Sorts risks by impact level (High → Medium → Low)
- Preserves original source URLs from input data
- Implements in-memory caching for 15 minutes
- Scheduled automatic refresh every 6 hours

## Setup and Deployment

### Prerequisites

- AWS CLI installed and configured
- Node.js 22.x
- OpenAI API key

### Local Setup

1. Clone this repository
2. Create a `.env` file based on `.env.example` and add your OpenAI API key
3. Install dependencies:
   ```
   npm install
   ```
4. Test locally:
   ```
   node test-local.js
   ```

### AWS Deployment

#### Option 1: Using CloudFormation (Recommended)

1. Deploy the CloudFormation stack:
   ```
   aws cloudformation create-stack \
     --stack-name GeopoliticalRiskAnalyzer \
     --template-body file://cloudformation.yaml \
     --parameters ParameterKey=OpenAIApiKey,ParameterValue=your_openai_api_key \
     --capabilities CAPABILITY_NAMED_IAM \
     --region us-east-2
   ```

2. After the stack is created, deploy your code:
   ```
   ./deploy.sh
   ```

#### Option 2: Manual Deployment

1. Create an IAM role for your Lambda function with the AWSLambdaBasicExecutionRole policy
2. Run the deployment script:
   ```
   ./deploy.sh
   ```

## Usage

### API Endpoints

After deployment, you can access the function through the API Gateway:

- **GET /geopolitical-risks**: Retrieves the latest geopolitical risk data
- **POST /geopolitical-risks**: Forces a refresh of the data (body: `{"operation": "refresh"}`)

### Direct Lambda Invocation

You can also invoke the Lambda function directly:

```javascript
const AWS = require('aws-sdk');
const lambda = new AWS.Lambda({ region: 'us-east-2' });

// Retrieve operation
const retrieveParams = {
  FunctionName: 'geopolitical-risk-analyzer',
  Payload: JSON.stringify({ operation: 'retrieve' })
};

// Refresh operation
const refreshParams = {
  FunctionName: 'geopolitical-risk-analyzer',
  Payload: JSON.stringify({ operation: 'refresh' })
};

// Example invocation
lambda.invoke(retrieveParams, (err, data) => {
  if (err) console.error(err);
  else console.log(JSON.parse(data.Payload));
});
```

## Response Format

The Lambda function returns data in the following format:

```json
{
  "macroeconomicFactors": {
    "geopoliticalRisks": {
      "global": "Concise two-sentence overview of global geopolitical situation",
      "risks": [
        {
          "name": "Risk name",
          "description": "Risk description",
          "region": "Affected region",
          "impactLevel": "High/Medium/Low",
          "source": "Source name",
          "sourceUrl": "Source URL"
        }
      ],
      "source": "Aggregated source name",
      "sourceUrl": "Source URL",
      "lastUpdated": "ISO timestamp"
    }
  },
  "geopoliticalRiskIndex": 75,
  "summary": "Detailed executive summary"
}
```

## Scheduled Refresh

The Lambda function is automatically refreshed every 6 hours via CloudWatch Events. You can modify this schedule in the CloudFormation template.

## Troubleshooting

- **Lambda Timeout**: If the function times out, increase the timeout value in the CloudFormation template or via the AWS Console.
- **Memory Issues**: If you encounter memory issues, increase the memory allocation (currently set to 512MB).
- **API Key Issues**: Ensure your OpenAI API key is correctly set in the Lambda environment variables.

## License

This project is proprietary and confidential.
