# Geopolitical Risk Sensor

A comprehensive service for monitoring and analyzing geopolitical events to identify risks that may impact markets and investments. The service collects news from diverse sources, filters for geopolitical topics, uses OpenAI to analyze and group items into geopolitical risks, and maintains a curated list in a JSON file.

## Features

- Collects geopolitical news from diverse sources:
  - RSS feeds from major news outlets, financial sources, and regional publications
  - Peter Zeihan's geopolitical analysis (via Google Search)
  - InsightSentry news feed (via RapidAPI)
  - Gemini search for additional geopolitical insights
- Filters and ranks news items based on:
  - Freshness (prioritizing recent news)
  - Source reputation and accuracy
  - Relevance to geopolitical risks
  - Estimated impact on markets
- Uses OpenAI (with Peter Zeihan prompt style) to analyze and group items into 5-6 key geopolitical risks
- Maintains a stack-ranked list of geopolitical risks in JSON format
- Runs on an hourly cycle to continuously update the risk assessment
- Provides a geopolitical risk index based on the severity of identified risks

## Project Structure

```
geopolitical-risk-sensor/
├── data/                  # Data storage directory
├── logs/                  # Log files
├── src/
│   ├── services/          # Service modules
│   │   ├── perplexityService.js  # Perplexity API integration
│   │   ├── rssService.js         # RSS feed processing
│   │   ├── sensorService.js      # Core risk analysis logic
│   │   ├── storageService.js     # Data persistence
│   │   ├── zeihanService.js      # Peter Zeihan analysis via Google
│   │   └── insightSentryService.js # InsightSentry news feed via RapidAPI
│   ├── utils/
│   │   └── logger.js      # Logging utility
│   └── index.js           # Main entry point
├── .env                   # Environment variables (create from .env.sample)
├── .env.sample            # Sample environment variables
└── package.json           # Dependencies and scripts
```

## Getting Started

1. Install dependencies:
   ```
   npm install
   ```

2. Create a `.env` file from the `.env.sample` template:
   ```
   cp .env.sample .env
   ```

3. Update the `.env` file with your API keys:
   - `PERPLEXITY_API_KEY`: Required for enhanced analysis
   - `GOOGLE_API_KEY`: Optional for Peter Zeihan analysis
   - `GOOGLE_SEARCH_ENGINE_ID`: Required if using Google API
   - `RAPIDAPI_KEY`: Required for InsightSentry news feed

4. Run the service:
   ```
   npm start
   ```

5. Run in test mode:
   ```
   npm test
   ```

## API Keys

### Perplexity API
The service requires a Perplexity API key for enhanced analysis. You can obtain one from:
https://www.perplexity.ai/api

### Google API (Optional)
For Peter Zeihan analysis, you need a Google API key and a Custom Search Engine ID:
1. Create a Google API key: https://console.cloud.google.com/apis/credentials
2. Create a Custom Search Engine: https://programmablesearchengine.google.com/
3. Enable the Custom Search API in your Google Cloud project

### RapidAPI Key (InsightSentry)
For the InsightSentry news feed, you need a RapidAPI key:
1. Sign up at RapidAPI: https://rapidapi.com/
2. Subscribe to the InsightSentry API: https://rapidapi.com/insightsentry/api/insightsentry
3. Copy your RapidAPI key from your dashboard

## Usage

### Running the Service

Run the geopolitical risk sensor once:

```
node src/index.js
```

Run with hourly updates enabled (will continue running and update every hour):

```
ENABLE_CYCLE=true node src/index.js
```

Customize the update interval (e.g., every 30 minutes):

```
ENABLE_CYCLE=true CYCLE_INTERVAL_MS=1800000 node src/index.js
```

### Output Options

For test mode (which skips API calls and uses sample data):

```
TEST_MODE=true node src/index.js
```

To output the risk assessment as JSON to the console:

```
OUTPUT_JSON=true node src/index.js
```

### Accessing the Geopolitical Risks

The service stores the curated list of geopolitical risks in the following JSON file:

```
/data/geopolitical_risks_curated.json
```

This file is automatically updated during each cycle and can be accessed by client applications to retrieve the latest risk assessment.
  })
  .catch(error => {
    console.error('Error:', error.message);
  });
```

### Output Format

The service produces a risk assessment in the following format:

```json
{
  "geopoliticalRiskIndex": 65,
  "risks": [
    {
      "id": "risk-1",
      "name": "Middle East Conflict Escalation",
      "description": "Recent military exchanges between Israel and Hezbollah have intensified...",
      "region": "Middle East",
      "impactLevel": 7.5,
      "marketImpact": "Oil prices may rise by 5-10% if conflict continues to escalate",
      "sectorImpacts": [
        {
          "sector": "Energy",
          "impact": "High",
          "description": "Oil supply disruptions likely"
        },
        {
          "sector": "Defense",
          "impact": "Positive",
          "description": "Increased defense spending expected"
        }
      ],
      "expertOpinions": [
        "Analysts at Goldman Sachs predict a 15% risk premium in oil prices",
        "IMF warns of potential global economic slowdown if conflict spreads"
      ],
      "timestamp": "2025-05-15T12:34:56Z"
    }
  ],
  "timestamp": "2025-05-16T00:00:00Z"
}
```

## Logs

Logs are stored in the `logs/sensor.log` file and include detailed information about the service's operation, including:
- Event collection from various sources
- Risk analysis results
- Storage operations
- Errors and warnings

## Extending the Service

### Adding New Event Sources

To add a new event source:

1. Create a new service file in `src/services/`
2. Implement a `getRecentEvents()` function that returns events in the standard format
3. Update `index.js` to include your new service in the `runFullScan()` function

### Customizing Risk Analysis

The core risk analysis logic is in `perplexityService.js` and `sensorService.js`. You can modify these files to customize how risks are identified and assessed.
