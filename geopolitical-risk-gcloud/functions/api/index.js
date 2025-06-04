/**
 * Geopolitical Risk API Cloud Function
 * 
 * This function serves the latest geopolitical risk analysis from Google Cloud Storage.
 * It supports three operations:
 * 1. GET /geopoliticalRiskAPI - Retrieves the latest geopolitical risk data
 * 2. GET /geopoliticalRiskAPI?status=true - Checks the processing status
 * 3. POST /geopoliticalRiskAPI (with {"operation":"refresh"}) - Forces a data refresh
 */
const functions = require('@google-cloud/functions-framework');
const { Storage } = require('@google-cloud/storage');
const { PubSub } = require('@google-cloud/pubsub');

// Configuration
const BUCKET_NAME = process.env.BUCKET_NAME || 'geopolitical-risk-data';
const GENERATOR_TOPIC = process.env.GENERATOR_TOPIC || 'geopolitical-risk-generator';
const STATUS_FILE = 'status.json';
const LATEST_FILE = 'latest.json';

// Initialize Cloud Storage client
const storage = new Storage();
const bucket = storage.bucket(BUCKET_NAME);

// Initialize PubSub client for triggering the generator function
const pubsub = new PubSub();
const topic = pubsub.topic(GENERATOR_TOPIC);

// API Key for authentication
const API_KEY = process.env.API_KEY;

/**
 * Middleware to validate API key
 * @param {Object} req - HTTP request object
 * @returns {boolean} - Whether the request has a valid API key
 */
function validateApiKey(req) {
  // Skip validation if API_KEY is not set (development mode)
  if (!API_KEY) {
    console.warn('API_KEY not set. Running in insecure mode.');
    return true;
  }
  
  // Check for API key in query string or headers
  const providedKey = req.query.key || req.headers['x-api-key'];
  
  return providedKey === API_KEY;
}

/**
 * Get the current processing status from Cloud Storage
 * @returns {Promise<Object>} - Status object
 */
async function getProcessingStatus() {
  try {
    const file = bucket.file(STATUS_FILE);
    const [exists] = await file.exists();
    
    if (!exists) {
      return {
        status: 'idle',
        message: 'No processing has been started',
        timestamp: new Date().toISOString()
      };
    }
    
    const [content] = await file.download();
    const status = JSON.parse(content.toString());
    return status;
  } catch (error) {
    console.error('Error retrieving processing status:', error);
    return {
      status: 'error',
      message: `Error retrieving status: ${error.message}`,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Trigger a refresh of the geopolitical risk data
 * @returns {Promise<Object>} - Status of the refresh operation
 */
async function triggerRefresh() {
  try {
    // Create a status file indicating processing has started
    const status = {
      status: 'processing',
      message: 'Refresh operation started',
      timestamp: new Date().toISOString()
    };
    
    await bucket.file(STATUS_FILE).save(JSON.stringify(status), {
      contentType: 'application/json'
    });
    
    // Publish a message to the topic to trigger the generator function
    const messageId = await topic.publishMessage({
      data: Buffer.from(JSON.stringify({ operation: 'refresh' }))
    });
    
    console.log(`Published message ${messageId} to trigger generator function`);
    
    return {
      status: 'processing',
      message: 'Refresh operation triggered successfully',
      messageId,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error triggering refresh:', error);
    
    // Update status to error
    const errorStatus = {
      status: 'error',
      message: `Error triggering refresh: ${error.message}`,
      timestamp: new Date().toISOString()
    };
    
    try {
      await bucket.file(STATUS_FILE).save(JSON.stringify(errorStatus), {
        contentType: 'application/json'
      });
    } catch (saveError) {
      console.error('Error saving error status:', saveError);
    }
    
    return errorStatus;
  }
}

/**
 * Cloud Function to serve the latest geopolitical risk analysis
 * @param {Object} req - HTTP request context
 * @param {Object} res - HTTP response context
 */
exports.geopoliticalRiskAPI = functions.http.onRequest(async (req, res) => {
  // Set CORS headers for all responses
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-Key');
  
  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }
  
  // Validate API key
  if (!validateApiKey(req)) {
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid or missing API key'
    });
    return;
  }
  
  console.log('Geopolitical Risk API function called', {
    method: req.method,
    query: req.query,
    path: req.path
  });
  
  try {
    // Handle status check request
    if (req.query.status === 'true') {
      console.log('Status check requested');
      const status = await getProcessingStatus();
      res.status(200).json(status);
      return;
    }
    
    // Handle refresh request
    if (req.method === 'POST') {
      console.log('POST request received');
      let body = {};
      
      // Parse the request body if it exists
      if (req.body) {
        if (typeof req.body === 'string') {
          try {
            body = JSON.parse(req.body);
          } catch (error) {
            console.error('Error parsing request body:', error);
          }
        } else if (typeof req.body === 'object') {
          body = req.body;
        }
      }
      
      // Check if this is a refresh operation
      if (body.operation === 'refresh') {
        console.log('Refresh operation requested');
        const refreshStatus = await triggerRefresh();
        res.status(202).json(refreshStatus);
        return;
      }
      
      // If not a recognized operation, return error
      res.status(400).json({
        error: 'Invalid operation',
        message: 'The only supported operation is "refresh"'
      });
      return;
    }
    
    // Handle GET request - serve the latest data
    if (req.method === 'GET') {
      // Check if a specific file was requested
      const filename = req.query.file || LATEST_FILE;
      
      // Get the file from Cloud Storage
      console.log(`Retrieving ${filename} from Cloud Storage`);
      const file = bucket.file(filename);
      
      // Check if the file exists
      const [exists] = await file.exists();
      if (!exists) {
        console.log(`File ${filename} not found`);
        res.status(404).json({
          error: 'No geopolitical risk analysis available',
          message: 'The analysis has not been generated yet'
        });
        return;
      }
      
      // Download the file
      const [content] = await file.download();
      
      // Parse the content to check if it's valid JSON
      let data;
      try {
        data = JSON.parse(content.toString());
      } catch (error) {
        console.error('Error parsing JSON content:', error);
        res.status(500).json({
          error: 'Invalid data format',
          message: 'The stored data is not valid JSON'
        });
        return;
      }
      
      // Format the response to match Ghost post generator's expected structure
      // Get file metadata for timestamp information
      const [metadata] = await file.getMetadata();
      
      const formattedResponse = {
        macroeconomicFactors: {
          geopoliticalRisks: data
        },
        meta: {
          lastUpdated: metadata.updated || metadata.timeCreated,
          source: 'Google Cloud Function',
          version: '1.0',
          filename: metadata.name
        }
      };
      
      // Return the formatted data
      res.set('Content-Type', 'application/json');
      res.status(200).json(formattedResponse);
      return;
    }
    
    // If we get here, the method is not supported
    res.status(405).json({
      error: 'Method not allowed',
      message: 'Only GET, POST, and OPTIONS methods are supported'
    });
  } catch (error) {
    console.error('Error in geopolitical risk API:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});
