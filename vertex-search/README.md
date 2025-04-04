# Vertex AI Search Test

This Node.js script demonstrates how to use Google Vertex AI Search API.

## Prerequisites

1. Google Cloud Project with Vertex AI Search enabled
2. Node.js 14+ installed
3. Google Cloud SDK installed

## Setup

1. Create a service account in Google Cloud Console:
   - Go to https://console.cloud.google.com/iam-admin/serviceaccounts
   - Create a new service account
   - Give it the necessary permissions for Vertex AI Search
   - Download the service account key as a JSON file

2. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

3. Edit `.env` with your credentials:
   ```
   # Google Cloud Project ID
   GCP_PROJECT_ID=your-project-id
   
   # Optional: Google Cloud Location
   GCP_LOCATION=us-central1
   
   # Path to your service account key file
   GOOGLE_APPLICATION_CREDENTIALS=/path/to/your/service-account-key.json
   ```

4. Install dependencies:
   ```bash
   npm install
   ```

## Usage

Run the script:
```bash
npm start
```

The script will:
1. Initialize Vertex AI client
2. Perform a search query
3. Print the search results

## Notes

- Make sure your Google Cloud project has Vertex AI Search enabled
- Ensure you have the necessary permissions to access Vertex AI Search
- The search results will vary based on your configured data sources

## Troubleshooting

If you encounter authentication errors, make sure:
1. Your service account has the necessary permissions
2. The service account key file path is correct
3. The project ID in your environment variables matches your Google Cloud project
4. You've enabled the Vertex AI Search API in your Google Cloud Console
