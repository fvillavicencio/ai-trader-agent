# Market Pulse Daily - AWS Lambda Function

This AWS Lambda function generates the Market Pulse Daily newsletter HTML from JSON input data. It uses Handlebars templates to create a responsive, professionally styled email newsletter.

## Overview

The Lambda function:
1. Takes JSON input containing market data
2. Processes the data using Handlebars templates
3. Returns HTML output and informational comments

## Project Structure

```
market-pulse-lambda/
├── src/
│   ├── index.js                  # Lambda function code
│   ├── assembled-template.html   # Main Handlebars template
│   ├── styles.css                # CSS styles
│   └── templates/                # Partial templates
├── test/
│   └── test-lambda.js            # Test script
├── package.json                  # Dependencies and scripts
└── README.md                     # This file
```

## Input Format

The Lambda function expects JSON input with the following structure:

```json
{
  "reportDate": "April 22, 2024 16:30 EST",
  "metadata": {
    "title": "Market Pulse Daily",
    "timestamp": "April 22, 2024 16:30 EST",
    "nextScheduledTime": "April 23, 2024 08:50 EST"
  },
  "decision": {
    "text": "HOLD",
    "color": "#f59e0b"
  },
  "marketSentiment": { ... },
  "marketIndicators": { ... },
  "fundamentalMetrics": { ... },
  "macroeconomicFactors": { ... },
  "economicEvents": [ ... ]
}
```

See the sample data file in the market-pulse-handlebars/v2/sample-data.json for a complete example.

## Output Format

The Lambda function returns a JSON response with:

1. `html`: The generated HTML newsletter
2. `comments`: Array of informational messages about sections that weren't generated due to missing data

## Testing Locally

To test the Lambda function locally:

```bash
npm install
npm test
```

This will run the test script that uses sample data and saves the output to `test/lambda-output.html`.

## Deployment

To deploy the Lambda function to AWS:

```bash
npm run build
npm run deploy
```

This will create a deployment.zip file that you can upload to AWS Lambda.

## AWS Lambda Configuration

When creating the Lambda function in AWS:

1. Runtime: Node.js 18.x or later
2. Handler: index.handler
3. Memory: 256 MB (recommended minimum)
4. Timeout: 30 seconds (recommended minimum)

## API Gateway Integration

To call the Lambda function via API Gateway:

1. Create a new API in API Gateway
2. Create a POST method and integrate it with your Lambda function
3. Deploy the API to a stage
4. Use the API endpoint URL to send JSON data to the Lambda function

## Notes

- The function will return informational comments about any sections that couldn't be generated due to missing data
- No modifications to the templates or styles are needed - they're used as-is from the market-pulse-handlebars project
