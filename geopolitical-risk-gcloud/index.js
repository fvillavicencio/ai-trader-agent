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
const { fetchAndProcessSourceData } = require('./data-retrieval');

// Inline data validator functions
/**
 * Validate geopolitical risk data structure
 * @param {Object} data - Geopolitical risk data to validate
 * @returns {Object} - Validation result with errors if any
 */
function validateGeopoliticalRiskData(data) {
  const errors = [];
  const warnings = [];
  
  // Check if data exists
  if (!data) {
    errors.push('Data is null or undefined');
    return { valid: false, errors, warnings };
  }
  
  // Check if data is an object
  if (typeof data !== 'object') {
    errors.push(`Data is not an object (got ${typeof data})`);
    return { valid: false, errors, warnings };
  }
  
  // Check for required top-level fields
  const requiredFields = ['overview', 'risks', 'lastUpdated'];
  for (const field of requiredFields) {
    if (!data[field]) {
      errors.push(`Missing required field: ${field}`);
    }
  }
  
  // Check overview
  if (data.overview) {
    if (typeof data.overview !== 'string') {
      errors.push(`Overview is not a string (got ${typeof data.overview})`);
    } else if (data.overview.length < 100) {
      warnings.push(`Overview is too short (${data.overview.length} characters)`);
    }
  }
  
  // Check risks array
  if (data.risks) {
    if (!Array.isArray(data.risks)) {
      errors.push(`Risks is not an array (got ${typeof data.risks})`);
    } else {
      // Check if risks array is empty
      if (data.risks.length === 0) {
        errors.push('Risks array is empty');
      } else {
        // Check each risk
        data.risks.forEach((risk, index) => {
          if (!risk.title) {
            errors.push(`Risk #${index + 1} is missing a title`);
          }
          
          if (!risk.analysis) {
            errors.push(`Risk #${index + 1} is missing analysis content`);
          } else if (typeof risk.analysis !== 'string') {
            errors.push(`Risk #${index + 1} analysis is not a string (got ${typeof risk.analysis})`);
          } else if (risk.analysis.length < 100) {
            warnings.push(`Risk #${index + 1} analysis is too short (${risk.analysis.length} characters)`);
          }
        });
      }
    }
  }
  
  // Check lastUpdated
  if (data.lastUpdated) {
    if (typeof data.lastUpdated !== 'string') {
      errors.push(`lastUpdated is not a string (got ${typeof data.lastUpdated})`);
    } else {
      // Check if it's a valid ISO date string
      try {
        const date = new Date(data.lastUpdated);
        if (isNaN(date.getTime())) {
          errors.push(`lastUpdated is not a valid date: ${data.lastUpdated}`);
        }
      } catch (error) {
        errors.push(`lastUpdated is not a valid date: ${data.lastUpdated}`);
      }
    }
  }
  
  // Check meta information if present
  if (data.meta) {
    if (typeof data.meta !== 'object') {
      warnings.push(`meta is not an object (got ${typeof data.meta})`);
    } else if (!data.meta.provider) {
      warnings.push('meta is missing provider information');
    }
  } else {
    warnings.push('Missing meta information');
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Log validation results
 * @param {Object} validationResult - Result from validateGeopoliticalRiskData
 */
function logValidationResults(validationResult) {
  const { valid, errors, warnings } = validationResult;
  
  if (valid) {
    console.log('✅ Data validation passed');
  } else {
    console.error(`❌ Data validation failed with ${errors.length} errors`);
  }
  
  if (errors.length > 0) {
    console.error('Errors:');
    errors.forEach((error, index) => {
      console.error(`  ${index + 1}. ${error}`);
    });
  }
  
  if (warnings.length > 0) {
    console.warn(`⚠️ ${warnings.length} warnings:`);
    warnings.forEach((warning, index) => {
      console.warn(`  ${index + 1}. ${warning}`);
    });
  }
}

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
    
    // Validate the results before saving
    console.log('Validating geopolitical risk analysis results...');
    
    // Use the data validator
    const validationResult = validateGeopoliticalRiskData(geopoliticalRisks);
    logValidationResults(validationResult);
    
    if (!validationResult.valid) {
      console.error('CRITICAL: Invalid geopolitical risk structure');
      console.error(`Received: ${JSON.stringify(geopoliticalRisks).substring(0, 200)}...`);
      throw new Error(`Invalid geopolitical risk structure: ${validationResult.errors.join(', ')}`);
    }
    
    console.log(`Analysis contains ${geopoliticalRisks.risks.length} risk categories`);
    
    // Save the results to storage
    console.log('Saving geopolitical risks to storage...');
    await saveToCloudStorage(geopoliticalRisks);
    console.log('Successfully saved geopolitical risks to storage');
    
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
  console.log('Starting geopolitical risk generation process...');

  let retrievedEventsData = '';
  try {
    console.log('Fetching and processing source data...');
    const events = await fetchAndProcessSourceData();
    console.log(`Retrieved ${events.length} processed events.`);
    retrievedEventsData = events.map(event => 
      `- Title: ${event.title}\n  Source: ${event.source} (${event.sourceType || 'general'})\n  Link: ${event.link}\n  Date: ${event.publishedDate}\n  Snippet: ${(event.content || '').substring(0, 200)}...`
    ).join('\n\n');
    if (events.length === 0) {
        retrievedEventsData = 'No specific recent events found or retrieved. Provide a general analysis.';
        console.warn('No events retrieved from data sources. AI will perform general analysis.');
    }
  } catch (error) {
    console.error(`Error fetching or processing source data: ${error.message}. Proceeding without external context.`);
    retrievedEventsData = 'Error retrieving recent events. Provide a general analysis based on your knowledge.';
  }
  console.log(`Formatted events data for prompt (first 300 chars): ${retrievedEventsData.substring(0,300)}`);
  
  const existingRisks = await checkForExistingRisks();
  if (existingRisks) {
    console.log('Using existing geopolitical risks from today');
    return existingRisks;
  }
  console.log('No existing risks found for today, generating new analysis...');

  if (!OPENAI_API_KEY && !PERPLEXITY_API_KEY) {
    console.error('CRITICAL: No API keys available for any provider.');
    throw new Error('No API keys available for any provider');
  }

  let provider = determineAIProvider();
  let primaryAttemptDone = false;
  let result;

  console.log(`Primary attempt with ${provider}.`);
  try {
    let prompt = provider === 'openai' ? 
      createOpenAIPrompt(provider, retrievedEventsData) : 
      createPerplexityPrompt(provider, retrievedEventsData);
    
    if (provider === 'openai') {
      result = await executeWithRetry(callOpenAI, [prompt], {
        maxRetries: 3,
        initialDelay: 2000,
        maxDelay: 10000,
        providerName: 'OpenAI'
      });
    } else { // provider is 'perplexity'
      result = await executeWithRetry(callPerplexityAPI, [prompt], {
        maxRetries: 3,
        initialDelay: 2000,
        maxDelay: 10000,
        providerName: 'Perplexity',
        retrievedEventsDataForFallback: retrievedEventsData // For executeWithRetry's internal fallback
      });
    }
    primaryAttemptDone = true;
    console.log(`Successfully received response from primary provider ${provider}.`);
    if (result && typeof result === 'object') {
      result.meta = result.meta || {};
      result.meta.provider = provider;
    }
    return result;

  } catch (primaryError) {
    console.error(`Primary provider ${provider} failed: ${primaryError.message}`);
    if (primaryError.response) {
      console.error(`Status: ${primaryError.response.status}, Data: ${JSON.stringify(primaryError.response.data)}`);
    }
    primaryAttemptDone = true;

    // Determine fallback provider
    const fallbackProvider = provider === 'openai' ? 'perplexity' : 'openai';
    const fallbackApiKey = fallbackProvider === 'openai' ? OPENAI_API_KEY : PERPLEXITY_API_KEY;

    if (!fallbackApiKey) {
      console.error(`CRITICAL: Primary provider ${provider} failed and no API key for fallback provider ${fallbackProvider}.`);
      throw new Error(`Primary provider ${provider} failed and fallback ${fallbackProvider} unavailable (no API key). Original error: ${primaryError.message}`);
    }

    console.log(`Attempting fallback to ${fallbackProvider}...`);
    try {
      let fallbackPrompt = fallbackProvider === 'openai' ? 
        createOpenAIPrompt(fallbackProvider + '-PrimaryFallback', retrievedEventsData) :
        createPerplexityPrompt(fallbackProvider + '-PrimaryFallback', retrievedEventsData);
      
      if (fallbackProvider === 'openai') {
        result = await callOpenAI(fallbackPrompt); // Direct call, no executeWithRetry for this primary fallback path
      } else { // fallbackProvider is 'perplexity'
        result = await callPerplexityAPI(fallbackPrompt); // Direct call
      }
      console.log(`Successfully received response from fallback provider ${fallbackProvider}.`);
      if (result && typeof result === 'object') {
        result.meta = result.meta || {};
        result.meta.provider = fallbackProvider;
        result.meta.usedPrimaryFallback = true;
      }
      return result;
    } catch (fallbackError_detailed) {
      console.error(`CRITICAL: Fallback provider ${fallbackProvider} also failed: ${fallbackError_detailed.message}`);
      if (fallbackError_detailed.response) {
        console.error(`Status: ${fallbackError_detailed.response.status}, Data: ${JSON.stringify(fallbackError_detailed.response.data)}`);
      }
      throw new Error(`Both primary provider ${provider} and fallback provider ${fallbackProvider} failed. Fallback error: ${fallbackError_detailed.message}. Primary error: ${primaryError.message}`);
    }
  }
}

/**
 * Determine which AI provider to use based on available API keys
 * @returns {string} - Provider name ('openai' or 'perplexity')
 */
function determineAIProvider() {
  // Check which API keys are available
  const openaiAvailable = !!OPENAI_API_KEY;
  const perplexityAvailable = !!PERPLEXITY_API_KEY;
  
  console.log(`Available providers: ${openaiAvailable ? 'OpenAI' : ''}${openaiAvailable && perplexityAvailable ? ' and ' : ''}${perplexityAvailable ? 'Perplexity' : ''}`);
  
  // If only one provider is available, use that one
  if (openaiAvailable && !perplexityAvailable) {
    return 'openai';
  }
  
  if (!openaiAvailable && perplexityAvailable) {
    return 'perplexity';
  }
  
  // If both are available, randomly select one
  return Math.random() < 0.5 ? 'openai' : 'perplexity';
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
    console.log(`Parsing AI response (length: ${response.length} chars)`);
    
    // First try direct parsing
    try {
      const data = JSON.parse(response);
      console.log('Successfully parsed JSON directly');
      
      // Validate the structure
      if (!data.risks || !Array.isArray(data.risks)) {
        console.warn('JSON parsed but missing expected structure (risks array)');
      } else {
        console.log(`Found ${data.risks.length} risks in the parsed JSON`);
      }
      
      return data;
    } catch (directParseError) {
      console.log(`Direct JSON parsing failed: ${directParseError.message}`);
      console.log('Trying to extract from response...');
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
function createOpenAIPrompt(providerName, retrievedEventsData) {
  const currentDate = new Date();
  const formattedDate = formatDate(currentDate);
  
  return `
Today's Date: ${formattedDate}

CONTEXT FROM RECENT NEWS AND ANALYSIS (Use this to inform your risk assessment and sourcing):
${retrievedEventsData}

Provide a comprehensive analysis of the current global geopolitical risks affecting financial markets. Format your response as a single, valid JSON object with no explanations or markdown formatting outside the JSON structure.

JSON STRUCTURE REQUIREMENTS:
{
  "lastUpdated": "${new Date().toISOString()}", // ISO 8601 format for the current timestamp
  "geopoliticalRiskIndex": <Number between 0-100 representing overall current geopolitical risk perception>,
  "global": "<Concise global summary of the geopolitical landscape and its market impact, approx. 50-75 words>",
  "executive": "<Executive summary detailing key geopolitical themes, market pressures, and outlook, approx. 100-150 words>",
  "risks": [
    // Provide 5 distinct geopolitical risk objects here
    {
      "name": "<Specific and descriptive name for Risk Category 1>",
      "description": "<Detailed description of Risk Category 1: its nature, background, recent developments, and current status. Approx. 150-200 words>",
      "region": "<Geographic Region primarily affected, e.g., Middle East, Europe, Global, Asia-Pacific, North America, etc.>",
      "impactLevel": <Numerical impact level on financial markets, 0-10, with 10 being highest impact>,
      "marketImplications": "<Specific impacts of Risk Category 1 on financial markets: relevant asset classes (equities, bonds, commodities), sectors, and regional markets. Discuss potential future scenarios and their market implications. Approx. 150-200 words>",
      "sources": [
        {
          "name": "<Name of Source 1.1, e.g., 'Reuters', 'Bloomberg', 'Foreign Affairs'>",
          "url": "<Full, verifiable, and publicly accessible URL for Source 1.1>"
        },
        {
          "name": "<Name of Source 1.2>",
          "url": "<Full, verifiable, and publicly accessible URL for Source 1.2>"
        }
        // Include 2-4 diverse and reputable sources per risk. Ensure URLs are valid.
      ]
    },
    // ... (repeat structure for Risk Category 2 through 5)
  ],
  "provider": "${providerName}"
}

IMPORTANT GUIDELINES:
- Adhere STRICTLY to the JSON structure provided above.
- All text content should be well-researched, factual, and data-driven.
- Source URLs MUST be real, verifiable, and lead directly to the cited information or a highly relevant page.
- Ensure a balanced perspective by citing diverse and reputable news outlets, academic journals, and think tank reports where possible.
- Focus on geopolitical risks with clear and demonstrable impacts on financial markets.
- Include specific details: names of individuals, organizations, key dates, relevant figures, and observed market movements.
- Do not fabricate information or sources.
`;
}

/**
 * Create the prompt for Perplexity
 * @returns {string} - Prompt for Perplexity
 */
function createPerplexityPrompt(providerName, retrievedEventsData) {
  // Use the same prompt as OpenAI for consistency
  return createOpenAIPrompt(providerName, retrievedEventsData);
}

/**
 * Format a date as YYYY-MM-DD
 * @param {Date} date - Date to format
 * @returns {string} - Formatted date
 */
function formatDate(date) {
  return date.toISOString().split('T')[0];
}

/**
 * Check if geopolitical risk data already exists for today
 * @returns {Promise<Object|null>} - Existing data or null if not found
 */
async function checkForExistingRisks() {
  try {
    const storage = new Storage();
    const bucket = storage.bucket(BUCKET_NAME);
    const today = formatDate(new Date());
    const filename = `geopolitical-risks-${today}.json`;
    
    console.log(`Checking for existing file: ${filename} in bucket: ${BUCKET_NAME}`);
    
    const [exists] = await bucket.file(filename).exists();
    
    if (exists) {
      console.log(`Found existing geopolitical risks for ${today}`);
      
      // Download the file
      const [content] = await bucket.file(filename).download();
      
      try {
        // Parse the content
        const data = JSON.parse(content.toString());
        return data;
      } catch (parseError) {
        console.error(`Error parsing existing file: ${parseError.message}`);
        return null;
      }
    } else {
      console.log(`No existing geopolitical risks found for ${today}`);
      return null;
    }
  } catch (error) {
    console.error(`Error checking for existing risks: ${error.message}`);
    return null;
  }
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

// HTTP function for geopolitical risk API
functions.http('geopoliticalRiskAPI', async (req, res) => {
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
