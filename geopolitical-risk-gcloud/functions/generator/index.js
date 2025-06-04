/**
 * Geopolitical Risk Generator Cloud Function
 * 
 * This function generates geopolitical risk analysis data and stores it in Google Cloud Storage.
 * It supports multiple AI providers (OpenAI and Perplexity), implements retries with random delays,
 * and provides failover mechanisms between providers.
 */
const functions = require('@google-cloud/functions-framework');
const { Storage } = require('@google-cloud/storage');
const axios = require('axios');

// Configuration
const BUCKET_NAME = process.env.BUCKET_NAME || 'geopolitical-risk-data';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const PERPLEXITY_API_KEY = process.env.PERPLEXITY_API_KEY;
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o';
const PERPLEXITY_MODEL = process.env.PERPLEXITY_MODEL || 'sonar-pro';
const STATUS_FILE = 'status.json';
const LATEST_FILE = 'latest.json';

// Initialize Cloud Storage client
const storage = new Storage();
const bucket = storage.bucket(BUCKET_NAME);

/**
 * Cloud Function to generate geopolitical risk analysis
 * This function can be triggered by a PubSub message or directly via HTTP
 */
functions.cloudEvent('generateGeopoliticalRiskAnalysis', async (cloudEvent) => {
  console.log('Geopolitical Risk Generator function triggered', {
    type: cloudEvent.type,
    subject: cloudEvent.subject,
    time: cloudEvent.time
  });
  
  try {
    // Update status to processing
    await updateStatus({
      status: 'processing',
      message: 'Starting geopolitical risk analysis',
      timestamp: new Date().toISOString()
    });
    
    // Generate the geopolitical risk analysis
    const geopoliticalRisks = await generateGeopoliticalRisks();
    
    // Save the data to Cloud Storage
    await saveToCloudStorage(geopoliticalRisks);
    
    // Update status to completed
    await updateStatus({
      status: 'completed',
      message: 'Geopolitical risk analysis completed successfully',
      timestamp: new Date().toISOString()
    });
    
    console.log('Geopolitical risk analysis completed successfully');
    return { success: true };
  } catch (error) {
    console.error('Error generating geopolitical risk analysis:', error);
    
    // Update status to error
    await updateStatus({
      status: 'error',
      message: `Error generating geopolitical risk analysis: ${error.message}`,
      timestamp: new Date().toISOString()
    });
    
    throw error;
  }
});

/**
 * Update the processing status in Cloud Storage
 * @param {Object} status - Status object to save
 */
async function updateStatus(status) {
  try {
    await bucket.file(STATUS_FILE).save(JSON.stringify(status), {
      contentType: 'application/json'
    });
    console.log(`Status updated: ${status.status}`);
  } catch (error) {
    console.error('Error updating status:', error);
  }
}

/**
 * Save geopolitical risk data to Cloud Storage
 * @param {Object} data - Geopolitical risk data to save
 */
async function saveToCloudStorage(data) {
  try {
    // Save to latest.json
    await bucket.file(LATEST_FILE).save(JSON.stringify(data), {
      contentType: 'application/json'
    });
    
    // Also save a timestamped version
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const archiveFile = `archive/geopolitical-risks-${timestamp}.json`;
    await bucket.file(archiveFile).save(JSON.stringify(data), {
      contentType: 'application/json'
    });
    
    console.log(`Data saved to ${LATEST_FILE} and ${archiveFile}`);
  } catch (error) {
    console.error('Error saving data to Cloud Storage:', error);
    throw error;
  }
}

/**
 * Generate geopolitical risk analysis using AI providers
 * @returns {Promise<Object>} - Geopolitical risk data
 */
async function generateGeopoliticalRisks() {
  console.log('Generating geopolitical risk analysis...');
  
  // Check if we have valid API keys
  if (!OPENAI_API_KEY && !PERPLEXITY_API_KEY) {
    throw new Error('No API keys available for any provider');
  }
  
  // Randomly select a provider if both are available
  let primaryProvider, fallbackProvider;
  
  if (OPENAI_API_KEY && PERPLEXITY_API_KEY) {
    // Both providers available, randomly select one
    if (Math.random() < 0.5) {
      primaryProvider = {
        name: 'openai',
        function: callOpenAI,
        args: [createOpenAIPrompt()]
      };
      fallbackProvider = {
        name: 'perplexity',
        function: callPerplexityAPI,
        args: [createPerplexityPrompt()]
      };
    } else {
      primaryProvider = {
        name: 'perplexity',
        function: callPerplexityAPI,
        args: [createPerplexityPrompt()]
      };
      fallbackProvider = {
        name: 'openai',
        function: callOpenAI,
        args: [createOpenAIPrompt()]
      };
    }
  } else if (OPENAI_API_KEY) {
    // Only OpenAI available
    primaryProvider = {
      name: 'openai',
      function: callOpenAI,
      args: [createOpenAIPrompt()]
    };
    fallbackProvider = null;
  } else if (PERPLEXITY_API_KEY) {
    // Only Perplexity available
    primaryProvider = {
      name: 'perplexity',
      function: callPerplexityAPI,
      args: [createPerplexityPrompt()]
    };
    fallbackProvider = null;
  }
  
  console.log(`Using ${primaryProvider.name} as primary provider${fallbackProvider ? ` and ${fallbackProvider.name} as fallback` : ''}`);
  
  try {
    // Try the primary provider with retries
    const primaryResult = await executeWithRetry(
      primaryProvider.function,
      primaryProvider.args,
      {
        maxRetries: 2,
        minDelay: 300,
        maxDelay: 1000,
        useExponentialBackoff: true
      }
    );
    
    console.log(`Successfully retrieved data from ${primaryProvider.name}`);
    
    // Add provider information to the result
    if (primaryResult && typeof primaryResult === 'object') {
      primaryResult.meta = primaryResult.meta || {};
      primaryResult.meta.provider = primaryProvider.name;
    }
    
    return primaryResult;
  } catch (primaryError) {
    console.error(`Primary provider (${primaryProvider.name}) failed after multiple attempts: ${primaryError.message}`);
    
    // If no fallback provider is available, throw the error
    if (!fallbackProvider) {
      throw new Error(`${primaryProvider.name} failed and no fallback provider is available`);
    }
    
    // Try the fallback provider
    try {
      console.log(`Attempting fallback provider (${fallbackProvider.name})...`);
      
      const fallbackResult = await executeWithRetry(
        fallbackProvider.function,
        fallbackProvider.args,
        {
          maxRetries: 3,
          minDelay: 500,
          maxDelay: 1500,
          useExponentialBackoff: true
        }
      );
      
      console.log(`Successfully retrieved data from fallback provider (${fallbackProvider.name})`);
      
      // Add provider information to the result
      if (fallbackResult && typeof fallbackResult === 'object') {
        fallbackResult.meta = fallbackResult.meta || {};
        fallbackResult.meta.provider = fallbackProvider.name;
      }
      
      return fallbackResult;
    } catch (fallbackError) {
      console.error(`Both primary and fallback providers failed: ${fallbackError.message}`);
      throw new Error('All AI providers failed to generate geopolitical risk analysis');
    }
  }
}

/**
 * Execute a function with retry logic and random delays
 * @param {Function} func - Function to execute
 * @param {Array} args - Arguments to pass to the function
 * @param {Object} options - Retry options
 * @returns {Promise<any>} - Result from the function
 */
async function executeWithRetry(func, args, options = {}) {
  const {
    maxRetries = 3,
    minDelay = 1000,
    maxDelay = 5000,
    useExponentialBackoff = true
  } = options;
  
  let lastError = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Attempt ${attempt}/${maxRetries}`);
      return await func(...args);
    } catch (error) {
      lastError = error;
      console.error(`Attempt ${attempt} failed: ${error.message}`);
      
      // If this is the last attempt, don't wait
      if (attempt === maxRetries) {
        console.error(`All ${maxRetries} attempts failed`);
        break;
      }
      
      // Calculate delay time
      let delayTime;
      if (useExponentialBackoff) {
        // Exponential backoff with jitter
        const baseDelay = Math.min(maxDelay, minDelay * Math.pow(2, attempt - 1));
        delayTime = getRandomDelay(minDelay, baseDelay);
      } else {
        // Random delay between min and max
        delayTime = getRandomDelay(minDelay, maxDelay);
      }
      
      console.log(`Waiting ${delayTime}ms before retry...`);
      await new Promise(resolve => setTimeout(resolve, delayTime));
    }
  }
  
  // If we get here, all attempts failed
  throw lastError || new Error('All attempts failed');
}

/**
 * Generate a random delay between min and max
 * @param {number} min - Minimum delay in milliseconds
 * @param {number} max - Maximum delay in milliseconds
 * @returns {number} - Random delay in milliseconds
 */
function getRandomDelay(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Call the OpenAI API to generate geopolitical risk analysis
 * @param {string} prompt - Prompt to send to OpenAI
 * @returns {Promise<Object>} - Geopolitical risk data
 */
async function callOpenAI(prompt) {
  if (!OPENAI_API_KEY) {
    throw new Error('OpenAI API key not configured');
  }
  
  console.log('Calling OpenAI API...');
  
  try {
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: OPENAI_MODEL,
        messages: [
          {
            role: "system",
            content: "You are a geopolitical risk analyst for a major investment bank with expertise in how geopolitical events impact financial markets. Your analysis must be factual, data-driven, and based on verifiable information from reputable sources. Focus on quality over quantity. Provide specific details, including real names, figures, and dates. Format your response as valid JSON with no explanations or markdown formatting."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.2,
        max_tokens: 4000
      },
      {
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    const content = response.data.choices[0].message.content;
    console.log('OpenAI API response received (first 300 chars):');
    console.log(content.substring(0, 300) + '...');
    
    // Parse the JSON response
    return parseAIResponse(content);
  } catch (error) {
    console.error('OpenAI API error:', error);
    throw new Error(`OpenAI API error: ${error.message}`);
  }
}

/**
 * Call the Perplexity API to generate geopolitical risk analysis
 * @param {string} prompt - Prompt to send to Perplexity
 * @returns {Promise<Object>} - Geopolitical risk data
 */
async function callPerplexityAPI(prompt) {
  if (!PERPLEXITY_API_KEY) {
    throw new Error('Perplexity API key not configured');
  }
  
  console.log('Calling Perplexity API...');
  
  try {
    const response = await axios.post(
      'https://api.perplexity.ai/chat/completions',
      {
        model: PERPLEXITY_MODEL,
        messages: [
          {
            role: "system",
            content: "You are a geopolitical risk analyst for a major investment bank with expertise in how geopolitical events impact financial markets. Your analysis must be factual, data-driven, and based on verifiable information from reputable sources. Focus on quality over quantity. Provide specific details, including real names, figures, and dates. Format your response as valid JSON with no explanations or markdown formatting."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.2,
        max_tokens: 4000
      },
      {
        headers: {
          'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      }
    );
    
    const content = response.data.choices[0].message.content;
    console.log('Perplexity API response received (first 300 chars):');
    console.log(content.substring(0, 300) + '...');
    
    // Parse the JSON response
    return parseAIResponse(content);
  } catch (error) {
    console.error('Perplexity API error:', error);
    throw new Error(`Perplexity API error: ${error.message}`);
  }
}

/**
 * Parse the AI response and extract the JSON
 * @param {string} response - AI response text
 * @returns {Object} - Parsed JSON data
 */
function parseAIResponse(response) {
  try {
    // First try direct parsing
    try {
      const data = JSON.parse(response);
      console.log('Successfully parsed JSON directly');
      return data;
    } catch (directParseError) {
      console.log('Direct JSON parsing failed, trying to extract from response...');
    }
    
    // Try to extract JSON from markdown code blocks
    const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (jsonMatch && jsonMatch[1]) {
      try {
        console.log('Found JSON in code block, attempting to parse...');
        const data = JSON.parse(jsonMatch[1]);
        console.log('Successfully parsed JSON from code block');
        return data;
      } catch (codeBlockError) {
        console.error('Failed to parse JSON from code block:', codeBlockError);
      }
    }
    
    // If code block extraction failed, try to find any JSON-like structure
    const jsonObjectMatch = response.match(/\[\s*\{[\s\S]*\}\s*\]/);
    if (jsonObjectMatch) {
      try {
        console.log('Found JSON-like structure, attempting to parse...');
        const data = JSON.parse(jsonObjectMatch[0]);
        console.log('Successfully parsed JSON from structure match');
        return data;
      } catch (objectMatchError) {
        console.error('Failed to parse JSON from structure match:', objectMatchError);
      }
    }
    
    // If all parsing methods fail, throw an error
    throw new Error('Failed to parse JSON from AI response');
  } catch (error) {
    console.error('Error parsing AI response:', error);
    throw error;
  }
}

/**
 * Create the prompt for OpenAI
 * @returns {string} - Prompt for OpenAI
 */
function createOpenAIPrompt() {
  const currentDate = new Date();
  const formattedDate = formatDate(currentDate);
  
  return `
Today's Date: ${formattedDate}

Provide a comprehensive analysis of the current global geopolitical risks affecting financial markets.

REQUIREMENTS:
1. Begin with a concise global overview (200-300 words) summarizing the current geopolitical landscape and its overall impact on financial markets.
2. Then identify and analyze the 5 most significant geopolitical risk categories currently affecting financial markets.
3. For each risk category:
   - Provide a detailed title/name for the risk
   - Write a comprehensive analysis (300-400 words) explaining:
     * The nature and background of the risk
     * Recent developments and current status
     * Specific impacts on financial markets (asset classes, sectors, regions)
     * Potential future scenarios and their market implications
   - Include specific data points, expert opinions, and market reactions
   - Cite reputable sources where appropriate

FORMAT YOUR RESPONSE AS VALID JSON with this exact structure:
{
  "overview": "Comprehensive global overview text here",
  "risks": [
    {
      "title": "Risk Category 1 Title",
      "analysis": "Detailed analysis of risk category 1"
    },
    {
      "title": "Risk Category 2 Title",
      "analysis": "Detailed analysis of risk category 2"
    },
    ...and so on for all 5 risk categories
  ],
  "lastUpdated": "${new Date().toISOString()}"
}

IMPORTANT GUIDELINES:
- Focus ONLY on REAL, VERIFIABLE geopolitical risks with documented market impacts
- Include SPECIFIC details (names, figures, dates, market movements)
- Ensure analysis is data-driven and factual, not speculative
- Cover diverse regions and risk types (conflicts, elections, trade tensions, etc.)
- Do not fabricate information or sources
`;
}

/**
 * Create the prompt for Perplexity
 * @returns {string} - Prompt for Perplexity
 */
function createPerplexityPrompt() {
  // Use the same prompt as OpenAI for consistency
  return createOpenAIPrompt();
}

/**
 * Format a date as YYYY-MM-DD
 * @param {Date} date - Date to format
 * @returns {string} - Formatted date
 */
function formatDate(date) {
  return date.toISOString().split('T')[0];
}

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

// HTTP function for direct testing
functions.http('testGeopoliticalRiskGenerator', async (req, res) => {
  try {
    // Set CORS headers
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-Key');
    
    // Handle preflight requests
    if (req.method === 'OPTIONS') {
      res.set('Access-Control-Max-Age', '3600');
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
    
    console.log('Test endpoint called');
    
    // Generate the geopolitical risk analysis
    const geopoliticalRisks = await generateGeopoliticalRisks();
    
    // Return the data
    res.status(200).json({
      success: true,
      data: geopoliticalRisks
    });
  } catch (error) {
    console.error('Error in test endpoint:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});
