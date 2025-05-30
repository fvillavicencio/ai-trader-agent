/**
 * Geopolitical Risk Lambda Function
 * 
 * This Lambda function provides two operations:
 * 1. Retrieve the latest geopolitical risk JSON, formatted for JsonExport.gs
 * 2. Force a refresh of the data and re-run the analysis
 * 
 * The function implements caching to speed up the retrieval operation.
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { OpenAI } = require('openai');

// Configuration
const CACHE_DURATION_MS = 15 * 60 * 1000; // 15 minutes
const TMP_DIR = '/tmp';
const RAW_DATA_FILE = path.join(TMP_DIR, 'geopolitical_risks.json');
const ANALYZED_DATA_FILE = path.join(TMP_DIR, 'geopolitical_risks_analyzed.json');
const STATUS_FILE = path.join(TMP_DIR, 'analysis_status.json');

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Global variables for caching
let cachedData = null;
let lastCacheTime = null;
let isProcessing = false;

/**
 * Lambda handler function
 */
exports.handler = async (event, context) => {
  console.log('INFO', 'Received event:', JSON.stringify(event));
  
  try {
    // Determine operation based on HTTP method and body
    const httpMethod = event.httpMethod;
    const body = event.body ? JSON.parse(event.body) : {};
    const operation = body.operation || 'retrieve';
    
    if (httpMethod === 'POST' && operation === 'refresh') {
      // Start refresh operation asynchronously
      startRefreshOperation();
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          message: 'Refresh operation started',
          status: 'processing'
        })
      };
    } else if (httpMethod === 'GET' && event.queryStringParameters && event.queryStringParameters.status === 'true') {
      // Return current status
      const status = getProcessingStatus();
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify(status)
      };
    } else {
      // Default: retrieve latest data
      const data = await getGeopoliticalRiskData();
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify(data)
      };
    }
  } catch (error) {
    console.error('ERROR', 'Error processing request:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        message: 'Error processing request',
        error: error.message
      })
    };
  }
};

/**
 * Get the current processing status
 */
function getProcessingStatus() {
  try {
    if (fs.existsSync(STATUS_FILE)) {
      const statusData = JSON.parse(fs.readFileSync(STATUS_FILE, 'utf8'));
      return statusData;
    }
    return {
      status: 'unknown',
      lastUpdated: null,
      message: 'Status information not available'
    };
  } catch (error) {
    console.error('ERROR', 'Error reading status file:', error);
    return {
      status: 'error',
      message: 'Error reading status information'
    };
  }
}

/**
 * Update the processing status
 */
function updateProcessingStatus(status, message) {
  try {
    const statusData = {
      status: status,
      lastUpdated: new Date().toISOString(),
      message: message
    };
    fs.writeFileSync(STATUS_FILE, JSON.stringify(statusData));
    return statusData;
  } catch (error) {
    console.error('ERROR', 'Error updating status file:', error);
  }
}

/**
 * Start the refresh operation asynchronously
 */
function startRefreshOperation() {
  if (isProcessing) {
    console.log('INFO', 'Refresh operation already in progress');
    return;
  }
  
  isProcessing = true;
  updateProcessingStatus('processing', 'Refresh operation started');
  
  // Run the refresh operation in the background
  refreshGeopoliticalRiskData()
    .then(() => {
      updateProcessingStatus('completed', 'Refresh operation completed successfully');
      isProcessing = false;
    })
    .catch(error => {
      console.error('ERROR', 'Error in refresh operation:', error);
      updateProcessingStatus('error', `Refresh operation failed: ${error.message}`);
      isProcessing = false;
    });
}

/**
 * Get the latest geopolitical risk data
 */
async function getGeopoliticalRiskData() {
  const now = Date.now();
  
  // Check if we have valid cached data
  if (cachedData && lastCacheTime && (now - lastCacheTime < CACHE_DURATION_MS)) {
    console.log('INFO', 'Returning cached data');
    return cachedData;
  }
  
  // Check if we have data on disk
  if (fs.existsSync(ANALYZED_DATA_FILE)) {
    try {
      console.log('INFO', 'Reading data from disk');
      const data = JSON.parse(fs.readFileSync(ANALYZED_DATA_FILE, 'utf8'));
      cachedData = data;
      lastCacheTime = now;
      return data;
    } catch (error) {
      console.error('ERROR', 'Error reading data from disk:', error);
    }
  }
  
  // If we get here, we need to fetch fresh data
  console.log('INFO', 'Cache expired or not available, fetching fresh data...');
  await refreshGeopoliticalRiskData();
  
  // Read the fresh data from disk
  try {
    const data = JSON.parse(fs.readFileSync(ANALYZED_DATA_FILE, 'utf8'));
    cachedData = data;
    lastCacheTime = now;
    return data;
  } catch (error) {
    throw new Error(`Failed to read analyzed data: ${error.message}`);
  }
}

/**
 * Refresh the geopolitical risk data
 */
async function refreshGeopoliticalRiskData() {
  console.log('INFO', 'Refreshing geopolitical risk data...');
  updateProcessingStatus('processing', 'Fetching raw geopolitical risk data');
  
  // Fetch raw geopolitical risk data
  const rawData = await fetchRawGeopoliticalRiskData();
  
  // Write raw data to disk
  fs.writeFileSync(RAW_DATA_FILE, JSON.stringify(rawData, null, 2));
  console.log('INFO', `Wrote raw risk data to ${RAW_DATA_FILE}`);
  
  // Analyze the data using OpenAI
  updateProcessingStatus('processing', 'Analyzing geopolitical risk data with OpenAI');
  console.log('INFO', 'Sending data to OpenAI for analysis...');
  const analyzedData = await analyzeGeopoliticalRisks(rawData);
  
  // Write analyzed data to disk
  fs.writeFileSync(ANALYZED_DATA_FILE, JSON.stringify(analyzedData, null, 2));
  console.log('INFO', `Wrote analyzed data to ${ANALYZED_DATA_FILE}`);
  
  // Update cache
  cachedData = analyzedData;
  lastCacheTime = Date.now();
  
  updateProcessingStatus('completed', 'Geopolitical risk data refreshed successfully');
  return analyzedData;
}

/**
 * Fetch raw geopolitical risk data
 */
async function fetchRawGeopoliticalRiskData() {
  // For demo purposes, we're using a sample dataset
  // In a real implementation, this would fetch data from an API or database
  return [
    {
      "name": "US-China Tensions",
      "description": "Escalating trade disputes and military posturing in the South China Sea",
      "region": "East Asia, Global",
      "source": "Council on Foreign Relations",
      "sourceUrl": "https://www.cfr.org/global-conflict-tracker/conflict/tensions-south-china-sea"
    },
    {
      "name": "Russia-Ukraine Conflict",
      "description": "Ongoing military conflict with global economic implications",
      "region": "Eastern Europe",
      "source": "BBC News",
      "sourceUrl": "https://www.bbc.com/news/world-europe-60506682"
    },
    {
      "name": "Middle East Instability",
      "description": "Tensions between Israel and Hamas with regional implications",
      "region": "Middle East",
      "source": "Al Jazeera",
      "sourceUrl": "https://www.aljazeera.com/news/2023/10/7/israel-palestine-war"
    }
  ];
}

/**
 * Analyze geopolitical risks using OpenAI
 */
async function analyzeGeopoliticalRisks(rawData) {
  // Prepare the prompt for OpenAI
  const prompt = `
Analyze the following geopolitical risks and create a structured JSON output with:
1. A geopolitical risk index (0-100, where 100 is highest risk)
2. A concise global overview (max 150 characters)
3. A detailed executive summary (max 500 words)
4. Categorized risks with impact levels

Raw data:
${JSON.stringify(rawData, null, 2)}

Format the response as valid JSON with this structure:
{
  "lastUpdated": "<current date in ISO format>",
  "geopoliticalRiskIndex": <number 0-100>,
  "global": "<highly concise global overview>",
  "summary": "<detailed executive summary>",
  "risks": [
    {
      "name": "<thematic grouping name>",
      "description": "<synthesized description>",
      "region": "<affected regions>",
      "impactLevel": "<High/Medium/Low>",
      "source": "<primary source>",
      "sourceUrl": "<source URL>",
      "relatedSources": [
        {
          "name": "<source name>",
          "url": "<source URL>",
          "timestamp": "<publication timestamp>"
        }
      ]
    }
  ]
}
`;

  // Call OpenAI API with retry logic
  const maxRetries = 3;
  let attempt = 0;
  let response;
  
  while (attempt < maxRetries) {
    attempt++;
    console.log('INFO', `API call attempt ${attempt} of ${maxRetries}`);
    
    try {
      response = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          { role: 'system', content: 'You are a geopolitical risk analyst providing JSON-formatted analysis.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.2,
        max_tokens: 2000
      });
      
      console.log('INFO', 'API call successful');
      break;
    } catch (error) {
      if (attempt === maxRetries) {
        throw new Error(`Failed to call OpenAI API after ${maxRetries} attempts: ${error.message}`);
      }
      console.error('ERROR', `API call failed (attempt ${attempt}): ${error.message}`);
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
    }
  }
  
  // Process the response
  const responseContent = response.choices[0].message.content;
  console.log('INFO', `Received response from OpenAI with length: ${responseContent.length} characters`);
  console.log('INFO', `Response starts with: ${responseContent.substring(0, 100)}...`);
  
  // Parse the JSON response
  try {
    // Try to parse the response directly
    const parsedData = JSON.parse(responseContent);
    console.log('INFO', 'Successfully parsed JSON directly');
    return parsedData;
  } catch (error) {
    console.error('ERROR', 'Failed to parse response as JSON:', error);
    
    // Try to extract JSON from the response
    const jsonMatch = responseContent.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const extractedJson = jsonMatch[0];
        console.log('INFO', 'Extracted JSON from response');
        return JSON.parse(extractedJson);
      } catch (extractError) {
        console.error('ERROR', 'Failed to extract and parse JSON:', extractError);
      }
    }
    
    throw new Error('Failed to parse OpenAI response as JSON');
  }
}
