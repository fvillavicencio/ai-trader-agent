# Fear and Greed Index Collector

This Google Cloud Function collects the CNN Fear and Greed Index data daily and stores it in AWS DynamoDB. The function includes robust retry logic with randomized delays for both CNN API calls and AWS DynamoDB operations.

## Features

- Fetches Fear and Greed Index data from CNN API with fallback to HTML scraping
- Stores data in AWS DynamoDB with timestamp and date information
- Implements retry logic with exponential backoff and random jitter for all operations
- Scheduled to run daily at 12:15 AM and 12:30 AM ET for redundancy
- Checks for existing data to avoid duplicates and fill in missing dates

## Prerequisites

- Google Cloud Platform account with Cloud Functions and Cloud Scheduler enabled
- AWS account with DynamoDB table created
- AWS credentials with permissions to access DynamoDB
- Node.js 18+

## Environment Variables

The function requires the following environment variables:

- `AWS_REGION`: AWS region where your DynamoDB table is located (default: us-east-2)
- `AWS_ACCESS_KEY_ID`: Your AWS access key ID
- `AWS_SECRET_ACCESS_KEY`: Your AWS secret access key
- `DYNAMODB_TABLE_NAME`: Name of your DynamoDB table (default: fear_greed_index)

## Deployment

1. Update the `env.yaml` file with your AWS credentials:

```yaml
AWS_REGION: "us-east-2"
AWS_ACCESS_KEY_ID: "your-access-key-id"
AWS_SECRET_ACCESS_KEY: "your-secret-access-key"
DYNAMODB_TABLE_NAME: "fear_greed_index"
```

2. Update the `deploy.sh` script with your Google Cloud project ID and preferred region.

3. Run the deployment script:

```bash
./deploy.sh
```

This will:
- Deploy the Cloud Function
- Create two Cloud Scheduler jobs to trigger the function at 12:15 AM and 12:30 AM ET daily

## Manual Testing

You can manually test the function by:

1. Going to the Google Cloud Console
2. Navigating to Cloud Functions
3. Finding the `collectFearAndGreedData` function
4. Clicking "Test" to execute the function

## Monitoring

Monitor the function's execution through:
- Google Cloud Logging
- Google Cloud Monitoring
- AWS CloudWatch (for DynamoDB operations)

## Troubleshooting

If the function fails:
1. Check the Cloud Function logs for error messages
2. Verify AWS credentials are correct
3. Ensure DynamoDB table exists and is accessible
4. Check if CNN API is available or if there are any rate limiting issues
