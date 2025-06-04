# Geopolitical Risk Analysis - Deployment Options

## Option 1: Google Cloud Deployment (Full Cloud)

This option requires a Google Cloud account with billing enabled and appropriate APIs activated.

### Prerequisites:
- Google Cloud account with billing enabled
- Google Cloud SDK installed and configured
- Required APIs enabled:
  - Cloud Functions
  - Cloud Build
  - Cloud Storage
  - Cloud Scheduler

### Deployment Steps:
1. Run the quick-deploy script:
   ```
   node quick-deploy.js
   ```

2. If prompted to enable APIs, type 'y' to confirm.

3. After deployment, the API will be available at:
   ```
   https://[REGION]-[PROJECT_ID].cloudfunctions.net/geopoliticalRiskAPI
   ```

## Option 2: Local Development with Cloud Integration

This option allows you to run the system locally while still leveraging cloud services for specific components.

### Prerequisites:
- Node.js installed locally
- API keys for Perplexity and/or OpenAI

### Setup Steps:
1. Install dependencies:
   ```
   npm install
   ```

2. Create a local server:
   ```javascript
   // local-server.js
   const express = require('express');
   const generatorFunction = require('./functions/generator');
   const apiFunction = require('./functions/api');
   const app = express();
   const PORT = process.env.PORT || 3000;

   // Mount functions as routes
   app.get('/generate', (req, res) => {
     generatorFunction.handler(req, res);
   });

   app.get('/api', (req, res) => {
     apiFunction.handler(req, res);
   });

   app.listen(PORT, () => {
     console.log(`Server running on port ${PORT}`);
   });
   ```

3. Run the local server:
   ```
   node local-server.js
   ```

4. Access the API at:
   ```
   http://localhost:3000/api
   ```

## Option 3: Serverless Deployment with Netlify or Vercel

This option uses alternative serverless platforms that offer generous free tiers.

### Prerequisites:
- Netlify or Vercel account
- GitHub repository with your code

### Deployment Steps:
1. Create serverless functions:
   ```javascript
   // netlify/functions/geopoliticalRiskAPI.js
   const { handler } = require('../../functions/api');
   exports.handler = async (event, context) => {
     // Adapt the handler for Netlify's event format
     // ...
   };
   ```

2. Deploy to Netlify:
   ```
   netlify deploy
   ```

3. Access the API at:
   ```
   https://[your-site-name].netlify.app/.netlify/functions/geopoliticalRiskAPI
   ```

## Option 4: Continue Using AWS Lambda

Since you already have a working AWS Lambda implementation, you might consider continuing to use it.

### Benefits:
- Already set up and working
- Familiar infrastructure
- No need to migrate

### Steps to Enhance:
1. Update the Lambda function with the latest code improvements
2. Ensure proper URL formatting in the response
3. Update the Google Apps Script client to use the AWS Lambda endpoint

## Recommended Approach

Based on your current situation, **Option 4 (Continue Using AWS Lambda)** might be the most pragmatic choice. You already have a working implementation, and the main issue was with URL formatting, which we've addressed in the code updates.

To proceed with this option:
1. Apply the code improvements we've made to your AWS Lambda function
2. Update your Google Apps Script client to use the AWS Lambda endpoint
3. Test the integration with your Market Pulse Daily report

This approach avoids the billing and API enablement issues with Google Cloud while still solving your immediate problem of proper URL formatting in the geopolitical risk analysis.
