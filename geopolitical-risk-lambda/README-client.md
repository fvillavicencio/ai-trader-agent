# Geopolitical Risk Lambda Client

This Node.js client connects to the geopolitical-risk-analyzer Lambda function to retrieve the latest geopolitical risk analysis and save it to a local file.

## Features

- Fetches the latest geopolitical risk data from the Lambda API
- Saves the data to a local JSON file
- Provides a summary of the retrieved data
- Includes retry logic for reliable data retrieval
- Optional refresh operation to force the Lambda to update its data

## Prerequisites

- Node.js 14.x or later
- npm or yarn

## Installation

1. Make sure you have Node.js installed
2. Install the required dependencies:

```bash
npm install
```

## Usage

### Basic Usage

To fetch the latest geopolitical risk data and save it to a file:

```bash
node client.js
```

This will:
1. Fetch the latest data from the Lambda function
2. Save it to `latest-geopolitical-risks.json` in the current directory
3. Display a summary of the data

### Refresh Operation

To force a refresh of the geopolitical risk data before fetching:

```bash
node client.js --refresh
```

or

```bash
node client.js -r
```

This will:
1. Trigger a refresh operation on the Lambda function
2. Poll the status endpoint until the refresh is complete
3. Fetch the updated data and save it to the file

## Output

The client saves the geopolitical risk data to `latest-geopolitical-risks.json` in the following format:

```json
{
  "lastUpdated": "2023-10-07T00:00:00Z",
  "geopoliticalRiskIndex": 75,
  "global": "Concise global overview of geopolitical risks",
  "summary": "Detailed executive summary of the current geopolitical landscape",
  "risks": [
    {
      "name": "Risk Category Name",
      "description": "Description of the risk",
      "region": "Affected regions",
      "impactLevel": "High/Medium/Low",
      "source": "Primary source name",
      "sourceUrl": "URL to the source",
      "relatedSources": []
    }
  ]
}
```

## Integration

You can also use this client in your own Node.js applications:

```javascript
const { fetchAndSaveGeopoliticalRiskData, triggerRefresh } = require('./client');

async function myApp() {
  // Optionally trigger a refresh
  await triggerRefresh();
  
  // Fetch and save the data
  const data = await fetchAndSaveGeopoliticalRiskData();
  
  // Use the data in your application
  console.log(`Current geopolitical risk index: ${data.geopoliticalRiskIndex}`);
}
```

## API Endpoint

The client connects to the following API endpoint:
`https://jkoaa9d2yi.execute-api.us-east-2.amazonaws.com/prod/geopolitical-risks`

## Troubleshooting

If you encounter issues:

1. Check your internet connection
2. Verify that the Lambda function and API Gateway are deployed and running
3. Check the CloudWatch logs for the Lambda function for any errors
4. Ensure you have the correct permissions to access the API

## License

This project is licensed under the MIT License.
