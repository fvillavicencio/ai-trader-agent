/**
 * Geopolitical Risk Lambda Function
 * 
 * This Lambda function provides two operations:
 * 1. Retrieve the latest geopolitical risk JSON, formatted for JsonExport.gs
 * 2. Force a refresh of the data and re-run the analysis
 * 
 * The function implements caching to speed up the retrieval operation.
 * It uses the balanced-retrieval.js and openai-analysis.js implementations for data retrieval and analysis.
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { OpenAI } = require('openai');

// Configuration
const CACHE_DURATION_MS = 15 * 60 * 1000; // 15 minutes
const TMP_DIR = '/tmp';
// In Lambda environment, always use /tmp for data files
const DATA_DIR = process.env.AWS_LAMBDA_FUNCTION_NAME ? TMP_DIR : (process.env.DATA_DIR || path.join(__dirname, 'data'));

// In-memory storage for data and status
let inMemoryRawData = null;
let inMemoryAnalyzedData = null;
let inMemoryStatus = { status: 'idle', message: 'No processing has been started', timestamp: new Date().toISOString() };

console.log('INFO', `Using data directory: ${DATA_DIR}`);

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

/**
 * List files in a directory
 * @param {string} dir - Directory to list
 * @returns {Object} - Object containing directory contents
 */
// Global variables for caching
let cachedData = null;
let lastCacheTime = null;
let isProcessing = false;

function listDirectoryContents(dir) {
  try {
    if (!fs.existsSync(dir)) {
      return { error: `Directory ${dir} does not exist` };
    }
    
    const files = fs.readdirSync(dir);
    const result = {
      directory: dir,
      files: []
    };
    
    for (const file of files) {
      const filePath = path.join(dir, file);
      const stats = fs.statSync(filePath);
      
      result.files.push({
        name: file,
        path: filePath,
        size: stats.size,
        isDirectory: stats.isDirectory(),
        modified: stats.mtime
      });
      
      // If it's a data file, include its contents
      if (file.endsWith('.json')) {
        try {
          const content = fs.readFileSync(filePath, 'utf8');
          result.files[result.files.length - 1].content = JSON.parse(content);
        } catch (error) {
          console.error(`Error reading file ${filePath}:`, error);
          result.files[result.files.length - 1].error = error.message;
        }
      }
    }
    
    return result;
  } catch (error) {
    console.error(`Error listing directory ${dir}:`, error);
    return { error: error.message };
  }
}

/**
 * Lambda handler function
 */
exports.handler = async (event, context) => {
  console.log('INFO', 'Received event:', JSON.stringify(event));
  
  try {
    // Set context.callbackWaitsForEmptyEventLoop to false to allow the Lambda function to return
    // before background processing is complete
    context.callbackWaitsForEmptyEventLoop = false;
    
    // Log available environment variables for debugging (excluding sensitive values)
    const safeEnvVars = Object.keys(process.env)
      .filter(key => !key.includes('KEY') && !key.includes('SECRET') && !key.includes('TOKEN'))
      .reduce((obj, key) => {
        obj[key] = process.env[key];
        return obj;
      }, {});
    console.log('INFO', 'Environment variables:', JSON.stringify(safeEnvVars));
    
    // Ensure the data directory exists
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    
    // Parse the request parameters
    const params = event.queryStringParameters || {};
    const operation = params.operation || 'get';
    
    // Handle different operations
    switch (operation.toLowerCase()) {
      case 'refresh':
        // Force a refresh of the data
        console.log('INFO', 'Handling refresh request');
        return await handleRefreshRequest();
      case 'status':
        // Get the current processing status
        console.log('INFO', 'Handling status request');
        return getStatusResponse();
      case 'get':
        // Get the latest data
        console.log('INFO', 'Handling get request');
        return await handleGetRequest();
      case 'debug':
        // Handle debug request
        console.log('INFO', 'Handling debug request');
        return await handleDebugRequest(params);
      default:
        // Return an error for unsupported operations
        console.log('INFO', `Unsupported operation: ${operation}`);
        return {
          statusCode: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          },
          body: JSON.stringify({
            error: 'Invalid operation',
            message: `Operation '${operation}' is not supported`,
            supportedOperations: ['get', 'refresh', 'status', 'debug'],
            timestamp: new Date().toISOString()
          })
        };
    }
  } catch (error) {
    console.error('ERROR', `Error handling request: ${error.message}`);
    console.error(error);
    
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        error: 'Internal server error',
        message: error.message,
        timestamp: new Date().toISOString()
      })
    };
  }
};

/**
 * Get the current processing status from memory
 */
function getStatusResponse() {
  try {
    // Return the in-memory status
    return createResponse(200, inMemoryStatus);
  } catch (error) {
    console.error('ERROR', `Error getting status: ${error.message}`);
    return createResponse(500, { error: 'Failed to get processing status' });
  }
}

/**
 * Update the processing status in memory
 */
function updateProcessingStatus(status, message) {
  try {
    inMemoryStatus = {
      status,
      message,
      timestamp: new Date().toISOString()
    };
    
    console.log('INFO', `Processing status updated: ${status} - ${message}`);
  } catch (error) {
    console.error('ERROR', `Failed to update processing status: ${error.message}`);
  }
}

/**
 * Handle a refresh request
 */
async function handleRefreshRequest() {
  try {
    // Start async processing with force refresh
    console.log('INFO', 'Starting forced refresh');
    startAsyncProcessing(true);
    
    return {
      statusCode: 202,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        message: 'Refresh started. Please check back later.',
        status: 'processing',
        timestamp: new Date().toISOString()
      })
    };
  } catch (error) {
    console.error('ERROR', `Error handling refresh request: ${error.message}`);
    
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        error: 'Internal server error',
        message: error.message,
        timestamp: new Date().toISOString()
      })
    };
  }
}

/**
 * Handle a get request
 */
async function handleGetRequest() {
  try {
    // Check if we have cached data
    if (inMemoryAnalyzedData) {
      console.log('INFO', 'Using cached data');
      return createResponse(200, inMemoryAnalyzedData);
    }
    
    // If no cached data is available, start async processing and return a message
    console.log('INFO', 'No cached data available, starting async processing');
    startAsyncProcessing();
    
    return {
      statusCode: 202,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        message: 'Processing started. Please check back later.',
        status: 'processing',
        timestamp: new Date().toISOString()
      })
    };
  } catch (error) {
    console.error('ERROR', `Error handling get request: ${error.message}`);
    
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        error: 'Internal server error',
        message: error.message,
        timestamp: new Date().toISOString()
      })
    };
  }
}

/**
 * Handle debug requests
 * @param {Object} params - Request parameters
 * @returns {Object} - Response object
 */
async function handleDebugRequest(params) {
  console.log('INFO', 'Debug command:', params.command);
  
  try {
    switch (params.command) {
      case 'list-files':
        // List files in the /tmp directory
        const tmpContents = listDirectoryContents('/tmp');
        return {
          statusCode: 200,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          },
          body: JSON.stringify(tmpContents)
        };
      default:
        return {
          statusCode: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          },
          body: JSON.stringify({ 
            error: 'Invalid debug command', 
            message: `Debug command '${params.command}' is not supported`,
            availableCommands: ['list-files']
          })
        };
    }
  } catch (error) {
    console.error('ERROR', `Error handling debug request: ${error.message}`);
    
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        error: 'Internal server error',
        message: error.message,
        timestamp: new Date().toISOString()
      })
    };
  }
}

/**
 * Start asynchronous processing of geopolitical risk data
 * @param {boolean} forceRefresh - Whether to force a refresh of the data
 */
async function startAsyncProcessing(forceRefresh = false) {
  // Create a unique ID for this processing job
  const jobId = `job-${Date.now()}`;
  console.log('INFO', `Starting async processing job ${jobId}`);
  
  // Update status to indicate processing has started
  updateProcessingStatus('processing', 'Fetching raw geopolitical risk data');
  
  // Start the processing in the background
  setTimeout(async () => {
    try {
      console.log('INFO', `Executing background job ${jobId}`);
      
      // Step 1: Retrieve geopolitical risks using balanced-retrieval.js
      updateProcessingStatus('processing', 'Retrieving geopolitical risks');
      console.log('INFO', 'Using balanced-retrieval module to fetch geopolitical risks');
      
      // Import the balanced-retrieval module dynamically to avoid circular dependencies
      const balancedRetrieval = require('./balanced-retrieval');
      
      // Call the retrieveGeopoliticalRisks function and store result in memory
      const rawData = await balancedRetrieval.retrieveGeopoliticalRisks();
      inMemoryRawData = rawData;
      
      console.log('INFO', `Retrieved ${rawData.length} raw geopolitical risk items`);
      
      // Step 2: Analyze the data using openai-analysis.js
      updateProcessingStatus('processing', 'Analyzing geopolitical risks with OpenAI');
      console.log('INFO', 'Using openai-analysis module to analyze geopolitical risks');
      
      // Import the openai-analysis module dynamically to avoid circular dependencies
      const openaiAnalysis = require('./openai-analysis');
      
      // Call the analyzeGeopoliticalRisks function with the raw data
      const analyzedData = await openaiAnalysis.analyzeGeopoliticalRisks(rawData);
      inMemoryAnalyzedData = analyzedData;
      
      // Update the cache
      updateProcessingStatus('complete', 'Geopolitical risk data refreshed successfully');
      console.log('INFO', `Background job ${jobId} completed successfully`);
    } catch (error) {
      console.error('ERROR', `Background job ${jobId} failed: ${error.message}`);
      console.error('ERROR', `Error stack: ${error.stack}`);
      updateProcessingStatus('error', `Refresh operation failed: ${error.message}`);
    } finally {
      // Reset the isProcessing flag
      isProcessing = false;
    }
  }, 10); // Start after 10ms to allow the Lambda handler to return
}
