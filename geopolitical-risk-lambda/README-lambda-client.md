# Geopolitical Risk Lambda Client

A simple client that directly calls the AWS Lambda function to retrieve geopolitical risk data.

## Prerequisites

- Node.js (v18+)
- AWS credentials with Lambda invoke permissions

## Installation

```bash
npm install @aws-sdk/client-lambda
```

## Configuration

Before using the client, ensure you have AWS credentials set up. You can either:

1. Set environment variables:
   ```
   AWS_ACCESS_KEY_ID=your_access_key
   AWS_SECRET_ACCESS_KEY=your_secret_key
   ```

2. Or use AWS credentials file (`~/.aws/credentials`)

## Usage

### Basic Usage

```bash
node lambda-client.js
```

This will invoke the Lambda function and save the results to `geopolitical-risks-output.json`.

### Force Refresh

To force a refresh of the geopolitical risk data:

```bash
node lambda-client.js --refresh
```

or

```bash
node lambda-client.js -r
```

### Custom Output File

To specify a custom output file:

```bash
node lambda-client.js --output=custom-filename.json
```

## Output Format

The output JSON file will contain the geopolitical risk data in the following format:

```json
{
  "macroeconomicFactors": {
    "geopoliticalRisks": {
      "global": "Global overview statement...",
      "risks": [
        {
          "name": "Risk Category 1",
          "description": "Detailed analysis...",
          "region": "Affected region",
          "impactLevel": "High/Medium/Low",
          "source": "Source name",
          "sourceUrl": "Source URL"
        },
        // Additional risk categories...
      ],
      "source": "Aggregated source",
      "sourceUrl": "Source URL",
      "lastUpdated": "ISO date string"
    }
  },
  "geopoliticalRiskIndex": 75,
  "summary": "Executive summary text..."
}
```

## Troubleshooting

If you encounter any issues:

1. Ensure your AWS credentials have permission to invoke the Lambda function
2. Check that the Lambda function name and region are correct in the client code
3. Verify that the Lambda function is deployed and active

## License

MIT
