# Fear and Greed Index Integration for Market Pulse Daily

This project integrates the CNN Fear and Greed Index into the Market Pulse Daily newsletter. It includes components for data collection, storage, and visualization.

## Components

### 1. Google Cloud Function (GCF)

Located in the `gcf/` directory, this function runs daily to fetch the latest Fear and Greed Index data from CNN and store it in AWS DynamoDB.

- **Source**: `gcf/index.js`
- **Dependencies**: axios, aws-sdk, luxon

### 2. AWS Lambda Function

Located in the `lambda/` directory, this function retrieves historical Fear and Greed Index data from DynamoDB and generates an embeddable HTML chart.

- **Source**: `lambda/index.js`
- **Dependencies**: aws-sdk, luxon

### 3. Ghost Integration

The `ghost-integration.js` file provides functions to integrate the Fear and Greed Index chart into Ghost blog posts at publication time.

### 4. Data Fetching and Bootstrap Scripts

- `simple-fetch.js`: Fetches current Fear and Greed Index data from CNN
- `fetch-recent-data.js`: Fetches and processes recent Fear and Greed Index data
- `bootstrap-dynamodb.js`: Bootstraps the DynamoDB database with historical data

## Setup Instructions

### Prerequisites

- Node.js 18+
- AWS account with DynamoDB access
- Google Cloud Platform account
- Ghost blog with API access

### Installation

1. Install dependencies:
   ```
   npm install
   ```

2. Create a `.env` file based on `.env.example`:
   ```
   cp .env.example .env
   ```
   Then fill in your AWS credentials and other configuration values.

### Bootstrapping the Database

1. Run the bootstrap script to populate DynamoDB with historical data:
   ```
   npm run bootstrap-db
   ```

### Deploying the Google Cloud Function

1. Deploy the GCF to run daily:
   ```
   cd gcf
   gcloud functions deploy collectFearAndGreedData \
     --runtime nodejs18 \
     --trigger-topic daily-fear-greed-collection \
     --env-vars-file ../.env
   ```

2. Set up a Cloud Scheduler job to trigger the function daily:
   ```
   gcloud scheduler jobs create pubsub fear-greed-daily-collection \
     --schedule="0 0 * * *" \
     --topic=daily-fear-greed-collection \
     --message-body="Collect Fear and Greed data"
   ```

### Deploying the AWS Lambda Function

1. Package the Lambda function:
   ```
   cd lambda
   npm install
   zip -r ../fear-greed-chart-generator.zip .
   ```

2. Deploy the Lambda function:
   ```
   aws lambda create-function \
     --function-name fear-greed-chart-generator \
     --runtime nodejs18.x \
     --handler index.handler \
     --zip-file fileb://../fear-greed-chart-generator.zip \
     --role arn:aws:iam::YOUR_ACCOUNT_ID:role/lambda-fear-greed-role
   ```

### Integrating with Ghost

To include the Fear and Greed Index chart in a Ghost post, add the following tag where you want the chart to appear:

```html
<!-- fear-greed-chart -->
```

## Usage

### Fetching Current Data

To fetch the current Fear and Greed Index data:

```
npm run fetch-simple
```

### Generating a Chart

To generate a chart locally for testing:

```javascript
const { generateFearAndGreedChart } = require('./ghost-integration');

async function testChart() {
  const html = await generateFearAndGreedChart();
  console.log(html);
}

testChart();
```

## Data Structure

The Fear and Greed Index data is stored in DynamoDB with the following schema:

- `timestamp_ms` (Number): Unix timestamp in milliseconds (partition key)
- `date` (String): Date in YYYY-MM-DD format (GSI key)
- `score` (Number): Fear and Greed Index score (0-100)
- `rating` (String): Rating based on score (extreme fear, fear, neutral, greed, extreme greed)
- `year` (Number): Year component of date
- `month` (Number): Month component of date
- `day` (Number): Day component of date

## License

MIT
