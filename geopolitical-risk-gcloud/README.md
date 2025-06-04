# Geopolitical Risk Analysis for Market Pulse Daily

This project provides a reliable, cost-effective solution for generating geopolitical risk analysis using Google Cloud Platform's free tier. It's designed to replace the AWS Lambda implementation that experienced persistent connectivity issues with the Perplexity API.

## Architecture

The solution consists of:

1. **Generator Function**: A Google Cloud Function that analyzes current geopolitical risks using Perplexity API (with OpenAI fallback) and stores results in Cloud Storage
2. **API Function**: A lightweight Cloud Function that serves the latest analysis from Cloud Storage
3. **Cloud Storage**: Stores the analysis results with version history
4. **Cloud Scheduler**: Automatically triggers analysis generation every 6 hours

## Setup Instructions

### Prerequisites

1. [Google Cloud SDK](https://cloud.google.com/sdk/docs/install) installed
2. Google Cloud account with billing enabled (free tier is sufficient)
3. Perplexity API key and/or OpenAI API key

### Initial Setup

1. Clone this repository
2. Create a `.env` file from the example:
   ```
   cp .env.example .env
   ```
3. Edit the `.env` file with your API keys and project settings
4. Install dependencies:
   ```
   npm install
   ```
5. Authenticate with Google Cloud:
   ```
   gcloud auth login
   ```

### Deployment

Deploy the entire solution with a single command:

```
npm run deploy
```

This script will:
- Create a Cloud Storage bucket
- Deploy the generator function
- Deploy the API function
- Set up Cloud Scheduler for automatic updates

### Manual Testing

To test the functions locally before deployment:

```
npm run test:local
```

To manually trigger a refresh after deployment:

```
curl https://[REGION]-[PROJECT_ID].cloudfunctions.net/geopoliticalRiskGenerator
```

## Google Apps Script Integration

Add this function to your Google Apps Script to retrieve the geopolitical risk data:

```javascript
function getGeopoliticalRisks() {
  const response = UrlFetchApp.fetch("https://[REGION]-[PROJECT_ID].cloudfunctions.net/geopoliticalRiskAPI");
  return JSON.parse(response.getContentText());
}
```

## Monitoring

Monitor the system using Google Cloud Console:
- Cloud Functions logs
- Cloud Storage metrics
- Cloud Scheduler job history

## Troubleshooting

If you encounter issues:

1. Check Cloud Function logs for errors
2. Verify API keys are correctly set in environment variables
3. Test API endpoints directly using curl or a browser
4. Check Cloud Storage permissions

## Cost Management

This solution is designed to run within Google Cloud's free tier:
- Cloud Functions: 2M invocations/month free
- Cloud Storage: 5GB storage free
- Cloud Scheduler: 3 jobs free

For most use cases, this will result in $0 monthly cost.
