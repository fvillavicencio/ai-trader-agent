# Geopolitical Risk Analysis System - Deployment Guide

## Overview

This guide provides instructions for deploying and using the Geopolitical Risk Analysis system with Market Pulse Daily. The system is designed to provide up-to-date geopolitical risk assessments with properly formatted URLs for inclusion in your reports.

## Deployment Options

### Option 1: AWS Lambda (Recommended)

The AWS Lambda implementation is already deployed and functioning correctly. This is the recommended approach since it doesn't require any additional setup.

**AWS Lambda Endpoint:**
```
https://jkoaa9d2yi.execute-api.us-east-2.amazonaws.com/prod/geopolitical-risks
```

### Option 2: Google Cloud Functions

If you prefer to use Google Cloud Functions, follow these steps:

1. Enable billing for your Google Cloud project:
   - Go to https://console.cloud.google.com/billing/projects
   - Select your project "geopolitical-risk-analysis"
   - Link a billing account

2. Enable required APIs:
   ```bash
   gcloud services enable cloudfunctions.googleapis.com cloudbuild.googleapis.com storage-api.googleapis.com cloudscheduler.googleapis.com
   ```

3. Deploy using the quick-deploy script:
   ```bash
   node quick-deploy.js
   ```

## Google Apps Script Integration

The enhanced Google Apps Script client (`google-apps-script-client.js`) is designed to work with both AWS Lambda and Google Cloud Function endpoints. It includes:

1. Automatic fallback between primary and backup endpoints
2. Proper URL formatting for all geopolitical risk sources
3. Comprehensive testing functions

### How to Use

1. Copy the entire contents of `google-apps-script-client.js` to your Google Apps Script project
2. Configure the endpoints in the CONFIG object if needed:
   ```javascript
   const CONFIG = {
     PRIMARY_ENDPOINT: "https://jkoaa9d2yi.execute-api.us-east-2.amazonaws.com/prod/geopolitical-risks",
     BACKUP_ENDPOINT: "https://us-central1-geopolitical-risk-analysis.cloudfunctions.net/geopoliticalRiskAPI",
     USE_BACKUP_FIRST: false,  // Set to true to use Google Cloud as primary
     ENABLE_LOGGING: true
   };
   ```

3. Use the `getGeopoliticalRisks()` function in your Market Pulse Daily script to retrieve formatted geopolitical risk data

### Testing Functions

The client includes two testing functions:

1. `testGeopoliticalRisks()`: Creates a Google Doc with the complete geopolitical risk data
2. `testUrlFormatting()`: Verifies that all URLs are properly formatted

Run these functions from the Google Apps Script editor to ensure everything is working correctly.

## Hardcoded Fallback Data

To ensure URLs always display correctly, the system includes hardcoded fallback data with proper URLs:

1. US-China Tensions: Reuters (https://www.reuters.com/world/china/china-says-it-will-take-necessary-measures-if-us-insists-confrontation-2023-11-10/)
2. Russia-Ukraine Conflict: Bloomberg (https://www.bloomberg.com/news/articles/2023-10-04/russia-s-war-in-ukraine-latest-news-and-updates-for-oct-4)
3. Middle East Tensions: Financial Times (https://www.ft.com/content/6e9a9b47-6bde-4f3e-98f4-0ad6f2f9a74b)

This ensures that even if the AI analysis fails, your report will still have properly formatted geopolitical risk data.

## Troubleshooting

If you encounter issues with the geopolitical risk analysis:

1. **URL Formatting Issues**: Run the `testUrlFormatting()` function to identify and fix any URL formatting problems
2. **API Unavailability**: The system will automatically fall back to the secondary endpoint or hardcoded data
3. **Data Refresh**: Use the `refreshGeopoliticalRisks()` function to force a data refresh

## Maintenance

The geopolitical risk data is automatically refreshed every 6 hours. To manually trigger a refresh:

1. **AWS Lambda**: Call the endpoint with a POST request and `{"operation":"refresh"}` in the body
2. **Google Cloud**: Use the Cloud Scheduler to trigger the generator function

## Support

For any issues or questions, please contact the development team.
