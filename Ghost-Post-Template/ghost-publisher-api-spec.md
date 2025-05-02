# Ghost Publisher API Specification

## API Overview

This API allows you to publish content to the Market Pulse Daily Ghost blog by invoking a Lambda function through API Gateway.

## Base URL
```
https://vrwz4xsvml.execute-api.us-east-2.amazonaws.com/prod
```

## Authentication
All requests require an API key to be included in the `x-api-key` header.

**API Key**: `M73vMuj3HM9XB2SZ8PAXk2coya7laaAe5a4GzIrP`

## Endpoints

### POST /publish

Publishes a new post to the Ghost blog using the provided market pulse data.

#### Headers
```
Content-Type: application/json
x-api-key: M73vMuj3HM9XB2SZ8PAXk2coya7laaAe5a4GzIrP
```

#### Request Body

The request body should be a JSON object with the following structure:

```json
{
  "ghostUrl": "https://market-pulse-daily.ghost.io",
  "ghostApiKey": "67f457a5f41c9900013e1e47:44daf1e666349bde96fad6f9a65979ba1d0b11b161a5c765847218f5bd263b7c",
  "newsletterId": "67f427c5744a72000854ee8f",
  "jsonData": {
    // Complete market pulse data object
    "reportDate": "2025-05-02T13:30:00.000Z",
    "reportDateFormatted": "May 2, 2025",
    "reportDateDisplay": "May 2, 2025 at 1:30 PM ET",
    "isTest": false,
    "metadata": { ... },
    "marketSentiment": { ... },
    "decision": { ... },
    "justification": { ... },
    "marketIndicators": { ... },
    "fundamentalMetrics": { ... },
    "macroeconomicFactors": { ... },
    "sp500": { ... }
  }
}
```

#### Response

**Success Response (200 OK)**

```json
{
  "message": "Post created successfully",
  "postUrl": "https://market-pulse-daily.ghost.io/market-pulse-may-2-2025-2-04-pm-et",
  "postId": "68150939544f240001f98a89",
  "members": {
    "all": ["email1@example.com", "email2@example.com", ...],
    "paid": ["email3@example.com", ...],
    "free": ["email4@example.com", ...],
    "comped": ["email5@example.com", ...]
  }
}
```

**Error Response (4xx/5xx)**

```json
{
  "error": "Error message",
  "details": "Detailed error information",
  "stack": "Error stack trace"
}
```

## Code Examples

### cURL

```bash
curl -X POST \
  https://vrwz4xsvml.execute-api.us-east-2.amazonaws.com/prod/publish \
  -H 'Content-Type: application/json' \
  -H 'x-api-key: M73vMuj3HM9XB2SZ8PAXk2coya7laaAe5a4GzIrP' \
  -d '{
    "ghostUrl": "https://market-pulse-daily.ghost.io",
    "ghostApiKey": "67f457a5f41c9900013e1e47:44daf1e666349bde96fad6f9a65979ba1d0b11b161a5c765847218f5bd263b7c",
    "newsletterId": "67f427c5744a72000854ee8f",
    "jsonData": {
      // Complete market pulse data
    }
  }'
```

### JavaScript (Node.js)

```javascript
const axios = require('axios');

async function publishToGhost(marketPulseData) {
  try {
    const response = await axios.post(
      'https://vrwz4xsvml.execute-api.us-east-2.amazonaws.com/prod/publish',
      {
        ghostUrl: 'https://market-pulse-daily.ghost.io',
        ghostApiKey: '67f457a5f41c9900013e1e47:44daf1e666349bde96fad6f9a65979ba1d0b11b161a5c765847218f5bd263b7c',
        newsletterId: '67f427c5744a72000854ee8f',
        jsonData: marketPulseData
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': 'M73vMuj3HM9XB2SZ8PAXk2coya7laaAe5a4GzIrP'
        }
      }
    );
    
    console.log('Post created successfully!');
    console.log('Post URL:', response.data.postUrl);
    console.log('Post ID:', response.data.postId);
    
    return response.data;
  } catch (error) {
    console.error('Error publishing to Ghost:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
    throw error;
  }
}
```

### Python

```python
import requests
import json

def publish_to_ghost(market_pulse_data):
    url = 'https://vrwz4xsvml.execute-api.us-east-2.amazonaws.com/prod/publish'
    
    headers = {
        'Content-Type': 'application/json',
        'x-api-key': 'M73vMuj3HM9XB2SZ8PAXk2coya7laaAe5a4GzIrP'
    }
    
    payload = {
        'ghostUrl': 'https://market-pulse-daily.ghost.io',
        'ghostApiKey': '67f457a5f41c9900013e1e47:44daf1e666349bde96fad6f9a65979ba1d0b11b161a5c765847218f5bd263b7c',
        'newsletterId': '67f427c5744a72000854ee8f',
        'jsonData': market_pulse_data
    }
    
    try:
        response = requests.post(url, headers=headers, json=payload)
        response.raise_for_status()
        
        result = response.json()
        print(f"Post created successfully!")
        print(f"Post URL: {result['postUrl']}")
        print(f"Post ID: {result['postId']}")
        
        return result
    except requests.exceptions.RequestException as e:
        print(f"Error publishing to Ghost: {str(e)}")
        if hasattr(e, 'response') and e.response is not None:
            print(f"Response data: {e.response.text}")
        raise
```

## Notes

1. The API has a timeout of 30 seconds, which should be sufficient for most requests.
2. The maximum payload size is 10MB, which is more than enough for the market pulse data.
3. The Lambda function handles all the formatting and publishing logic, so you only need to provide the raw market pulse data.
4. The post will be published immediately with the status "published".
5. The post visibility will be set to "paid" (premium content) if the current time is before 4:30 PM ET, otherwise it will be set to "members" (available to all members).

## Troubleshooting

If you encounter any issues, please check:

1. The API key is correct and included in the headers
2. The Ghost credentials are valid
3. The market pulse data is properly formatted
4. The request payload does not exceed 10MB

For any persistent issues, check the CloudWatch logs for the Lambda function (GhostPublisherFunction) in the AWS Console.
