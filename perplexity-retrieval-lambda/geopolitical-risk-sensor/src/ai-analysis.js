/**
 * AI Geopolitical Risk Analysis
 * 
 * This script takes the curated list of geopolitical risk items from the balanced retrieval process,
 * sends them to an AI provider (Perplexity or OpenAI) for analysis, fact-checking, and categorization,
 * and then saves the enhanced output to a JSON file.
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { createLogger } = require('./utils/logger');
const { executeWithRetry, executeWithFallback } = require('./utils/ai-provider-manager');
const { isValidUrlFormat, validateUrlBatch } = require('./utils/url-validator');

// Initialize logger
const logger = createLogger('ai-analysis');

// Configure console logging for better visibility
console.log('Starting AI Geopolitical Risk Analysis...');

// In Lambda environment, always use /tmp for data files
const DATA_DIR = process.env.AWS_LAMBDA_FUNCTION_NAME ? '/tmp' : (process.env.DATA_DIR || path.join(__dirname, '..', 'data'));
const INPUT_FILE = path.join(DATA_DIR, 'geopolitical_risks.json');
const OUTPUT_FILE = path.join(DATA_DIR, 'geopolitical_risks_analyzed.json');

// API endpoints
const PERPLEXITY_API_URL = 'https://api.perplexity.ai/chat/completions';
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

console.log('INFO', `AI analysis using data directory: ${DATA_DIR}`);

/**
 * Create a prompt for AI to analyze the geopolitical risks
 * @param {Array} inputData - Array of geopolitical risk items
 * @param {string} provider - AI provider to use ('perplexity' or 'openai')
 * @returns {string} - Prompt for the AI provider
 */
function createAIPrompt(inputData, provider) {
  // Add timestamp and unique ID to force fresh analysis
  const currentTimestamp = new Date().toISOString();
  const uniqueId = Math.random().toString(36).substring(2, 15);
  
  // Create provider-specific prompt
  if (provider === 'perplexity') {
    return `
  You are a professional geopolitical analyst specializing in market impact analysis for investors.
  
  CRITICAL INSTRUCTION: This analysis is being generated on ${currentTimestamp} with unique ID ${uniqueId}. You MUST provide a COMPLETELY FRESH and UNIQUE analysis that differs substantially from any previous analyses you have generated.
  
  I will provide you with a list of current geopolitical risks. Your task is to:

  1. Analyze the list of geopolitical risks and identify EXACTLY 6 most significant thematic groupings or categories (e.g., Russia-Ukraine Conflict, US-China Tensions, Trade Wars)
  2. Stack rank these 6 groupings by impact level (highest to lowest)
  3. For each thematic grouping, synthesize insights from all relevant items in the original list
  4. Provide a concise analysis of each grouping's potential market impact
  5. Calculate a geopolitical risk index (0-100) based on the severity of these themes
  6. Create a highly concise global overview (EXACTLY 2 SHORT SENTENCES, maximum 25 words each) that is SPECIFIC about the current geopolitical landscape
  
  IMPORTANT: Your output MUST have EXACTLY 6 thematic groupings, not individual risk items. Each grouping should synthesize multiple related risks from the input list.
  
  CRITICAL: For each thematic grouping, you MUST preserve and include the original source URLs from the relevant input items. Do not fabricate any sources or URLs.
  
  Here is the list of geopolitical risks to analyze:
  ${JSON.stringify(inputData, null, 2)}
  
  ===== RESPONSE FORMAT REQUIREMENTS =====
  YOUR RESPONSE MUST BE VALID JSON ONLY. This is absolutely critical. The response will be directly parsed with JSON.parse() and must not fail.
  
  DO NOT include any of the following in your response:
  - Explanatory text or preamble
  - Markdown formatting or code blocks (like \`\`\`json or \`\`\`)
  - HTML tags of any kind
  - Single quotes for JSON properties or values
  - Comments
  - Trailing commas
  - Newlines within string values
  
  Respond with a JSON object with EXACTLY this structure:
  {
    "lastUpdated": "${currentTimestamp}",
    "geopoliticalRiskIndex": 75,
    "global": "Major powers face escalating tensions in Eastern Europe and South China Sea. Economic uncertainty grows amid inflation concerns and supply chain disruptions.",
    "executive": "The current geopolitical landscape is characterized by increasing tensions between major powers, with several flashpoints emerging across different regions. The Russia-Ukraine conflict continues to destabilize Eastern Europe, while US-China relations remain strained over Taiwan and trade issues. Middle East volatility persists with ongoing conflicts in multiple countries. These developments are occurring against a backdrop of economic challenges including inflation and supply chain disruptions, creating a complex environment for investors. Markets are particularly sensitive to developments in energy security and trade relations, with commodities experiencing heightened volatility. Investors should monitor these situations closely as they evolve, with particular attention to potential sanctions, trade restrictions, and military escalations that could impact global markets.",
    "risks": [
      {
        "name": "Russia-Ukraine Conflict",
        "description": "The ongoing military conflict between Russia and Ukraine continues to destabilize Eastern Europe, with implications for energy markets, food security, and NATO relations. Recent developments indicate potential escalation with increased military activities along the border regions.",
        "region": "Eastern Europe",
        "impactLevel": 8.5,
        "marketImplications": "Energy markets remain volatile with natural gas and oil prices sensitive to developments. European equities face headwinds while defense sector stocks show strength. Currency markets see pressure on the Euro and regional currencies.",
        "sources": [
          {
            "name": "Reuters",
            "url": "https://www.reuters.com/world/europe/ukraine-russia-conflict-update"
          },
          {
            "name": "Financial Times",
            "url": "https://www.ft.com/content/russia-ukraine-crisis"
          }
        ]
      },
      {
        "name": "US-China Tensions",
        "description": "Strategic competition between the United States and China continues across multiple domains including technology, trade, and geopolitical influence. Recent diplomatic exchanges have failed to resolve core issues, with Taiwan remaining a critical flashpoint.",
        "region": "Global",
        "impactLevel": 8.2,
        "marketImplications": "Technology and semiconductor stocks face regulatory risks. Supply chains continue restructuring away from concentrated dependencies. Chinese equities trade at discounted valuations reflecting geopolitical risk premiums.",
        "sources": [
          {
            "name": "Bloomberg",
            "url": "https://www.bloomberg.com/news/articles/us-china-relations"
          }
        ]
      }
    ]
  }
  
  IMPORTANT: The above is just an EXAMPLE with only 2 risks shown. Your actual response MUST include EXACTLY 6 risks, and you must use real data from the provided input, not the example data.
  - Create meaningful thematic groupings that investors would find actionable
  - For each grouping, include at least 2-3 related risk items from the original list
  - Stack rank the 6 groupings from highest to lowest impact
  
  CRITICAL: For each thematic grouping, you MUST include at least two valid source URLs from the original input items. Do not fabricate any sources or URLs.
  `;
  } else {
    // Default to OpenAI prompt - ensure it matches the structure of the Perplexity prompt
    return `
  You are a professional geopolitical analyst specializing in market impact analysis for investors. You excel at synthesizing complex geopolitical events into clear, actionable insights.
  
  I will provide you with a list of current geopolitical risks. Your task is to:

  1. Analyze the list of geopolitical risks and identify EXACTLY 6 most significant thematic groupings or categories (e.g., Russia-Ukraine Conflict, US-China Tensions, Trade Wars)
  2. Stack rank these 6 groupings by impact level (highest to lowest)
  3. For each thematic grouping, synthesize insights from all relevant items in the original list
  4. Provide a concise analysis of each grouping's potential market impact
  5. Calculate a geopolitical risk index (0-100) based on the severity of these themes
  6. Create a highly concise global overview (EXACTLY 2 SHORT SENTENCES, maximum 25 words each) that is SPECIFIC about the current geopolitical landscape
  
  IMPORTANT: Your output MUST have EXACTLY 6 thematic groupings, not individual risk items. Each grouping should synthesize multiple related risks from the input list.
  
  CRITICAL: For each thematic grouping, you MUST preserve and include the original source URLs from the relevant input items. Do not fabricate any sources or URLs.
  
  Here is the list of geopolitical risks to analyze:
  ${JSON.stringify(inputData, null, 2)}
  
  ===== RESPONSE FORMAT REQUIREMENTS =====
  YOUR RESPONSE MUST BE VALID JSON ONLY. This is absolutely critical. The response will be directly parsed with JSON.parse() and must not fail.
  
  DO NOT include any of the following in your response:
  - Explanatory text or preamble
  - Markdown formatting or code blocks (like \`\`\`json or \`\`\`)
  - HTML tags of any kind
  - Single quotes for JSON properties or values
  - Comments
  - Trailing commas
  - Newlines within string values
  
  Respond with a JSON object with EXACTLY this structure:
  {
    "lastUpdated": "${currentTimestamp}",
    "geopoliticalRiskIndex": 75,
    "global": "Major powers face escalating tensions in Eastern Europe and South China Sea. Economic uncertainty grows amid inflation concerns and supply chain disruptions.",
    "executive": "The current geopolitical landscape is characterized by increasing tensions between major powers, with several flashpoints emerging across different regions. The Russia-Ukraine conflict continues to destabilize Eastern Europe, while US-China relations remain strained over Taiwan and trade issues. Middle East volatility persists with ongoing conflicts in multiple countries. These developments are occurring against a backdrop of economic challenges including inflation and supply chain disruptions, creating a complex environment for investors. Markets are particularly sensitive to developments in energy security and trade relations, with commodities experiencing heightened volatility. Investors should monitor these situations closely as they evolve, with particular attention to potential sanctions, trade restrictions, and military escalations that could impact global markets.",
    "risks": [
      {
        "name": "Russia-Ukraine Conflict",
        "description": "The ongoing military conflict between Russia and Ukraine continues to destabilize Eastern Europe, with implications for energy markets, food security, and NATO relations. Recent developments indicate potential escalation with increased military activities along the border regions.",
        "region": "Eastern Europe",
        "impactLevel": 8.5,
        "marketImplications": "Energy markets remain volatile with natural gas and oil prices sensitive to developments. European equities face headwinds while defense sector stocks show strength. Currency markets see pressure on the Euro and regional currencies.",
        "sources": [
          {
            "name": "Reuters",
            "url": "https://www.reuters.com/world/europe/ukraine-russia-conflict-update"
          },
          {
            "name": "Financial Times",
            "url": "https://www.ft.com/content/russia-ukraine-crisis"
          }
        ]
      },
      {
        "name": "US-China Tensions",
        "description": "Strategic competition between the United States and China continues across multiple domains including technology, trade, and geopolitical influence. Recent diplomatic exchanges have failed to resolve core issues, with Taiwan remaining a critical flashpoint.",
        "region": "Global",
        "impactLevel": 8.2,
        "marketImplications": "Technology and semiconductor stocks face regulatory risks. Supply chains continue restructuring away from concentrated dependencies. Chinese equities trade at discounted valuations reflecting geopolitical risk premiums.",
        "sources": [
          {
            "name": "Bloomberg",
            "url": "https://www.bloomberg.com/news/articles/us-china-relations"
          }
        ]
      }
    ]
  }
  
  IMPORTANT: The above is just an EXAMPLE with only 2 risks shown. Your actual response MUST include EXACTLY 6 risks, and you must use real data from the provided input, not the example data.
  - Create meaningful thematic groupings that investors would find actionable
  - For each grouping, include at least 2-3 related risk items from the original list
  - Stack rank the 6 groupings from highest to lowest impact
  
  CRITICAL: For each thematic grouping, you MUST include at least two valid source URLs from the original input items. Do not fabricate any sources or URLs.
  
  This analysis is being generated with unique ID: ${uniqueId}
  `;
  }
}

/**
 * Send data to Perplexity for analysis
 * @param {string} prompt - The prompt to send to Perplexity
 * @returns {Promise<Object>} - The analyzed data from Perplexity
 */
async function sendToPerplexity(prompt) {
  // Get the API key from environment variables (try both environment variable names)
  const apiKey = process.env.PERPLEXITY_API_KEY || process.env.PERPLEXITY_LAMBDA_API_KEY;
  
  // Check if the API key is missing or has placeholder text
  if (!apiKey || apiKey === 'your_perplexity_api_key_here') {
    logger.error('Valid Perplexity API key not found in environment variables');
    throw new Error('Perplexity API key is missing or invalid. Please set a valid API key in the .env file.');
  }
  
  // Log that we found a valid API key (without showing the actual key)
  logger.info('Found valid Perplexity API key');
  
  logger.info('Sending data to Perplexity for analysis...');
  
  // Force a unique request by adding multiple cache-busting parameters
  const timestamp = new Date().getTime();
  const uniqueId = Math.random().toString(36).substring(2, 15);
  const randomSeed = Math.floor(Math.random() * 1000000);
  const cacheBuster = `Analysis timestamp: ${timestamp} | Unique ID: ${uniqueId} | Random seed: ${randomSeed}`;
  
  const payload = {
    model: 'sonar-reasoning-pro', // Using the reasoning model for better analysis
    messages: [
      {
        role: 'system',
        content: `You are a professional geopolitical analyst specializing in market impact analysis for investors. You excel at synthesizing complex geopolitical events into clear, actionable insights. CRITICAL INSTRUCTION: You MUST generate COMPLETELY UNIQUE analysis that differs from any previous analyses you have generated. Your response MUST be in valid JSON format only, with no markdown formatting, no explanations, and no additional text. Do not wrap the JSON in code blocks or any other formatting. Follow these strict JSON formatting rules: 1) Use ONLY double quotes for all keys and string values; 2) Do not include any newlines within string values; 3) Do not include any trailing commas in arrays or objects; 4) Ensure all JSON syntax is valid and can be parsed by JSON.parse(); 5) Ensure impactLevel is a number between 1-10, not a string. ${cacheBuster}`
      },
      {
        role: 'user',
        content: prompt
      }
    ],
    temperature: 0.1, // Even lower temperature for more consistent, factual responses and better JSON formatting
    max_tokens: 4000
  };
  
  try {
    const response = await axios.post(
      PERPLEXITY_API_URL,
      payload,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'Accept': 'application/json'
        }
      }
    );
    
    if (response.status !== 200) {
      throw new Error(`Perplexity API returned error ${response.status}: ${response.statusText}`);
    }
    
    // Process the successful response
    const content = response.data.choices[0].message.content;
    logger.info('Received response from Perplexity API');
    logger.info(`Raw response content length: ${content.length} characters`);
    
    return parseAIResponse(content);
  } catch (error) {
    logger.error(`Perplexity API error: ${error.message}`);
    throw error;
  }
}

/**
 * Send data to OpenAI for analysis
 * @param {string} prompt - The prompt to send to OpenAI
 * @returns {Promise<Object>} - The analyzed data from OpenAI
 */
async function sendToOpenAI(prompt) {
  // Get the API key from environment variables
  const apiKey = process.env.OPENAI_API_KEY;
  
  // Check if the API key is missing or has placeholder text
  if (!apiKey || apiKey === 'your_openai_api_key_here' || apiKey === 'sk-your-openai-api-key-here') {
    logger.error('Valid OpenAI API key not found in environment variables');
    throw new Error('OpenAI API key is missing or invalid. Please set a valid API key in the .env file.');
  }
  
  logger.info('Sending data to OpenAI for analysis...');
  
  // Force a unique request by adding multiple cache-busting parameters
  const timestamp = new Date().getTime();
  const uniqueId = Math.random().toString(36).substring(2, 15);
  const randomSeed = Math.floor(Math.random() * 1000000);
  const cacheBuster = `Analysis timestamp: ${timestamp} | Unique ID: ${uniqueId} | Random seed: ${randomSeed}`;
  
  const payload = {
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: `You are a professional geopolitical analyst specializing in market impact analysis for investors. You excel at synthesizing complex geopolitical events into clear, actionable insights.

CRITICAL INSTRUCTION: You MUST generate COMPLETELY UNIQUE analysis that differs from any previous analyses you have generated.

===== RESPONSE FORMAT REQUIREMENTS =====
YOUR RESPONSE MUST BE VALID JSON ONLY. This is absolutely critical. The response will be directly parsed with JSON.parse() and must not fail.

DO NOT include any of the following in your response:
- Explanatory text or preamble
- Markdown formatting or code blocks (like \`\`\`json or \`\`\`)
- HTML tags of any kind
- Single quotes for JSON properties or values
- Comments
- Trailing commas
- Newlines within string values

Your JSON response must follow this exact structure:
{
  "lastUpdated": "[current timestamp]",
  "geopoliticalRiskIndex": [number between 0-100],
  "global": "[2-sentence summary, max 25 words each]",
  "executive": "[200-300 word analysis]",
  "risks": [
    {
      "name": "[risk category name]",
      "description": "[100-150 word description]",
      "region": "[affected regions]",
      "impactLevel": [number between 1-10],
      "marketImplications": "[50-75 word analysis]",
      "sources": [
        {
          "name": "[source name]",
          "url": "[source URL]"
        }
      ]
    },
    ... [EXACTLY 6 risk categories total]
  ]
}

IMPORTANT: You MUST include EXACTLY 6 risk categories, each with sources that include valid URLs.

This analysis is being generated with unique ID: ${cacheBuster}`
      },
      {
        role: 'user',
        content: prompt
      }
    ],
    temperature: 0.7, // Higher temperature for more varied and creative responses
    top_p: 0.9, // Slightly lower top_p to encourage more diversity
    frequency_penalty: 0.2, // Add frequency penalty to discourage repetition
    presence_penalty: 0.2, // Add presence penalty to encourage new topics
    max_tokens: 4000
  };
  
  try {
    const response = await axios.post(
      OPENAI_API_URL,
      payload,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'Accept': 'application/json'
        }
      }
    );
    
    if (response.status !== 200) {
      throw new Error(`OpenAI API returned error ${response.status}: ${response.statusText}`);
    }
    
    // Process the successful response
    const content = response.data.choices[0].message.content;
    logger.info('Received response from OpenAI API');
    logger.info(`Raw response content length: ${content.length} characters`);
    
    return parseAIResponse(content);
  } catch (error) {
    logger.error(`OpenAI API error: ${error.message}`);
    throw error;
  }
}

/**
 * Parse the AI response and extract the JSON data
 * @param {string} content - The raw content from the AI response
 * @returns {Object} - The parsed JSON data
 */
function parseAIResponse(content) {
  logger.info('Parsing AI response...');
  
  // Log a sample of the content for debugging
  const contentSample = content.length > 200 ? 
    content.substring(0, 100) + '...' + content.substring(content.length - 100) : 
    content;
  logger.info(`Content sample: ${contentSample}`);
  
  // Clean up the content
  let cleanedContent = content;
  
  // Remove any HTML tags that might be in the response
  cleanedContent = cleanedContent.replace(/<[^>]*>/g, '');
  
  // Remove any markdown code block formatting
  cleanedContent = cleanedContent.replace(/```json\s*/g, '');
  cleanedContent = cleanedContent.replace(/```\s*$/g, '');
  
  // Try to parse the JSON
  let jsonData = null;
  
  // Method 1: Direct JSON parsing
  try {
    jsonData = JSON.parse(cleanedContent);
    logger.info('Successfully parsed JSON directly');
    
    // Validate the risk names to ensure they're not source names
    if (jsonData && jsonData.risks && Array.isArray(jsonData.risks)) {
      jsonData.risks = jsonData.risks.map(risk => {
        // If the risk name is a likely news source, replace it with a generic name
        if (risk.name && isLikelyNewsSource(risk.name)) {
          logger.warn(`Found risk with news source name: ${risk.name}. Replacing with generic name.`);
          // Use the region or a default name if region is not available
          risk.name = risk.region ? 
            `Geopolitical Tensions in ${risk.region}` : 
            'Geopolitical Risk';
        }
        return risk;
      });
    }
    
    return jsonData;
  } catch (directParseError) {
    logger.warn(`Direct JSON parsing failed: ${directParseError.message}`);
  }
  
  // Method 2: Extract from markdown code blocks with json tag
  if (!jsonData) {
    const jsonCodeBlockMatch = cleanedContent.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonCodeBlockMatch && jsonCodeBlockMatch[1]) {
      try {
        jsonData = JSON.parse(jsonCodeBlockMatch[1]);
        logger.info('Successfully parsed JSON from code block with json tag');
        
        // Validate the risk names to ensure they're not source names
        if (jsonData && jsonData.risks && Array.isArray(jsonData.risks)) {
          jsonData.risks = jsonData.risks.map(risk => {
            // If the risk name is a likely news source, replace it with a generic name
            if (risk.name && isLikelyNewsSource(risk.name)) {
              logger.warn(`Found risk with news source name: ${risk.name}. Replacing with generic name.`);
              // Use the region or a default name if region is not available
              risk.name = risk.region ? 
                `Geopolitical Tensions in ${risk.region}` : 
                'Geopolitical Risk';
            }
            return risk;
          });
        }
        
        return jsonData;
      } catch (jsonBlockParseError) {
        logger.warn(`JSON code block parsing failed: ${jsonBlockParseError.message}`);
      }
    }
  }
  
  // Method 3: Extract from markdown code blocks without language tag
  if (!jsonData) {
    const codeBlockMatch = cleanedContent.match(/```\s*\n([\s\S]*?)\n```/);
    if (codeBlockMatch && codeBlockMatch[1]) {
      try {
        jsonData = JSON.parse(codeBlockMatch[1]);
        logger.info('Successfully parsed JSON from code block without language tag');
        
        // Validate the risk names to ensure they're not source names
        if (jsonData && jsonData.risks && Array.isArray(jsonData.risks)) {
          jsonData.risks = jsonData.risks.map(risk => {
            // If the risk name is a likely news source, replace it with a generic name
            if (risk.name && isLikelyNewsSource(risk.name)) {
              logger.warn(`Found risk with news source name: ${risk.name}. Replacing with generic name.`);
              // Use the region or a default name if region is not available
              risk.name = risk.region ? 
                `Geopolitical Tensions in ${risk.region}` : 
                'Geopolitical Risk';
            }
            return risk;
          });
        }
        
        return jsonData;
      } catch (blockParseError) {
        logger.warn(`Code block parsing failed: ${blockParseError.message}`);
      }
    }
  }
  
  // Method 4: Find JSON-like structure with curly braces
  if (!jsonData) {
    // More robust regex to find the complete JSON object
    const jsonRegex = /\{[\s\S]*?"lastUpdated"[\s\S]*?"geopoliticalRiskIndex"[\s\S]*?"risks"[\s\S]*?\}(?:\s*\n|$)/;
    const jsonMatch = cleanedContent.match(jsonRegex);
    if (jsonMatch) {
      try {
        // Clean the matched JSON string to fix common issues
        let jsonString = jsonMatch[0];
        // Fix trailing commas in arrays/objects
        jsonString = jsonString.replace(/,\s*([\]\}])/g, '$1');
        
        jsonData = JSON.parse(jsonString);
        logger.info('Successfully parsed JSON from advanced regex matching');
        
        // Validate the risk names to ensure they're not source names
        if (jsonData && jsonData.risks && Array.isArray(jsonData.risks)) {
          jsonData.risks = jsonData.risks.map(risk => {
            // If the risk name is a likely news source, replace it with a generic name
            if (risk.name && isLikelyNewsSource(risk.name)) {
              logger.warn(`Found risk with news source name: ${risk.name}. Replacing with generic name.`);
              // Use the region or a default name if region is not available
              risk.name = risk.region ? 
                `Geopolitical Tensions in ${risk.region}` : 
                'Geopolitical Risk';
            }
            return risk;
          });
        }
        
        return jsonData;
      } catch (jsonMatchError) {
        logger.warn(`Advanced regex JSON parsing failed: ${jsonMatchError.message}`);
      }
    }
  }
  
  // Method 5: Extract individual risks and construct a JSON object
  if (!jsonData) {
    try {
      // Extract key components
      const riskIndex = cleanedContent.match(/"geopoliticalRiskIndex"\s*:\s*(\d+)/) || 
                        cleanedContent.match(/geopolitical[\s-]*risk[\s-]*index[\s:]*([\d\.]+)/i);
      
      const globalOverview = cleanedContent.match(/"global"\s*:\s*"([^"]*)"/i) || 
                             cleanedContent.match(/global[\s:]*["']?([^"'\n]{10,})["']?/i);
      
      const executiveSummary = cleanedContent.match(/"executive"\s*:\s*"([^"]*)"/i) || 
                               cleanedContent.match(/executive[\s-]*summary[\s:]*["']?([^"'\n]{20,})["']?/i);
      
      // Extract risks using pattern matching
      const riskPatterns = [
        // Pattern for risks in JSON format - most reliable method
        /\{\s*"name"\s*:\s*"([^"]+)"[\s\S]*?"description"\s*:\s*"([^"]+)"[\s\S]*?"region"\s*:\s*"([^"]+)"[\s\S]*?"impactLevel"\s*:\s*([\d\.]+)[\s\S]*?"marketImplications"\s*:\s*"([^"]+)"[\s\S]*?\}/g,
        
        // Pattern for numbered risks (e.g., "1. Risk Name (Impact: X/10)")
        /(\d+)\s*\.\s*([^\(\n]+)\s*\(?(?:Impact|Level)\s*:?\s*([\d\.]+)(?:\/10)?\)?\s*([^\d\n][^\n]{10,})/g,
        
        // Pattern for risks with region markers
        /([A-Za-z\s-]+)\s*(?:Crisis|Conflict|Tension|Risk)\s*\(([A-Za-z\s-]+)\)\s*:?\s*([^\n]{10,})/g
      ];
      
      // Extract sources using multiple patterns
      const sources = [];
      
      // Pattern 1: Source: Name URL: http://...
      const sourcePattern1 = /Source\s*:?\s*([^\n]+)\s*(?:URL|Link)\s*:?\s*(https?:\/\/[^\s"'\)\]]+)/g;
      let sourceMatch1;
      while ((sourceMatch1 = sourcePattern1.exec(cleanedContent)) !== null) {
        sources.push({
          name: sourceMatch1[1].trim(),
          url: sourceMatch1[2].trim()
        });
      }
      
      // Pattern 2: "name": "Source Name", "url": "http://..."
      const sourcePattern2 = /"name"\s*:\s*"([^"]+)"[\s\S]{1,50}?"url"\s*:\s*"(https?:\/\/[^"]+)"/g;
      let sourceMatch2;
      while ((sourceMatch2 = sourcePattern2.exec(cleanedContent)) !== null) {
        sources.push({
          name: sourceMatch2[1].trim(),
          url: sourceMatch2[2].trim()
        });
      }
      
      // Pattern 3: Find any URLs in the content and try to associate them with nearby text
      const urlPattern = /(https?:\/\/[^\s"'\)\]]+)/g;
      
      // Improved pattern to identify source names before URLs
      // Look specifically for patterns like "Source: Name" or "Name:" before a URL
      // Include all common news sources in the pattern to ensure they're recognized
      const namePattern = /(?:Source\s*:?\s*|From\s*:?\s*|By\s*:?\s*|\b(?:Reuters|Bloomberg|CNN|BBC|Fox News|CNBC|Financial Times|Wall Street Journal|New York Times|Washington Post|Associated Press|AFP|Al Jazeera|The Guardian|The Economist|Foreign Policy|Foreign Affairs|Politico|The Hill|NPR|CBS News|ABC News|NBC News|USA Today|Time|Newsweek|The Atlantic|Vox|Axios|S&P Global|KPMG)\b|([A-Za-z][A-Za-z\s\-&]+)(?:\s*[-–:]\s*))(?=https?:\/\/|\s+https?:\/\/)/gi;
      
      // List of common news sources to check against
      const commonNewsSources = [
        "Reuters", "Bloomberg", "CNN", "BBC", "Fox News", "CNBC", "Financial Times", 
        "Wall Street Journal", "New York Times", "Washington Post", "Associated Press", 
        "AFP", "Al Jazeera", "The Guardian", "The Economist", "Foreign Policy", 
        "Foreign Affairs", "Politico", "The Hill", "NPR", "CBS News", "ABC News", 
        "NBC News", "USA Today", "Time", "Newsweek", "The Atlantic", "Vox", "Axios"
      ];
      
      // Function to check if a string is likely a news source
      function isLikelyNewsSource(text) {
        if (!text) return false;
        
        // Check against common news sources list
        const normalizedText = text.trim().toLowerCase();
        
        // Additional financial/business sources that might appear in the data
        const financialSources = [
          "blackrock", "s&p global", "kpmg", "fxempire", "bloomberg", "reuters", 
          "financial times", "wall street journal", "cnbc", "marketwatch", "barron's",
          "morningstar", "seeking alpha", "the economist", "business insider", "fortune",
          "forbes", "yahoo finance", "google news", "peter zeihan", "foreign policy"
        ];
        
        // Check if it's a known financial source
        if (financialSources.some(source => normalizedText.includes(source))) {
          return true;
        }
        
        return commonNewsSources.some(source => 
          normalizedText === source.toLowerCase() || 
          normalizedText.includes(source.toLowerCase()) ||
          // Check for patterns like "X News", "X Times", etc.
          /\b(news|times|post|journal|daily|herald|tribune|guardian|observer|report|press|media|global|intelligence|institute|research|analytics|capital|partners|advisors)\b/i.test(normalizedText)
        );
      }
      
      // Function to check if a string is likely a risk name rather than a news source
      function isLikelyRiskName(name) {
        if (!name) return false;
        
        // If it's a known news source, it's definitely not a risk name
        if (isLikelyNewsSource(name)) {
          return false;
        }
        
        // Common risk name patterns
        const riskPatterns = [
          /\b(?:tension|conflict|crisis|war|dispute|instability|unrest|uprising|protest|sanctions|tariff|election|referendum|coup|terrorism|attack)s?\b/i,
          /\b(?:US|China|Russia|Ukraine|Iran|Israel|North Korea|Middle East|Europe|Asia|Africa|Latin America)\b/,
          /\b(?:trade|military|diplomatic|political|economic|financial|security|cyber|climate|energy|supply chain)\b/i,
          /\b(?:geopolitical|territorial|border|nuclear|missile|weapons|sovereignty|alliance)\b/i
        ];
        
        // Common risk name formats
        const riskNameFormats = [
          /^[A-Z][a-z]+-[A-Z][a-z]+ (?:Conflict|Tensions|Crisis|War|Dispute)$/,  // e.g., "Russia-Ukraine Conflict"
          /^[A-Z][a-z]+ (?:Conflict|Tensions|Crisis|War|Dispute) in [A-Z][a-z]+$/,  // e.g., "Civil Conflict in Syria"
          /^(?:Rising|Escalating|Ongoing) [A-Z][a-z]+ (?:Tensions|Conflict|Crisis)$/,  // e.g., "Rising Regional Tensions"
          /^(?:Global|Regional) (?:Trade|Security|Political|Economic) (?:Tensions|Concerns|Risks|Threats)$/  // e.g., "Global Trade Tensions"
        ];
        
        // Check if the name matches any risk pattern or format
        return riskPatterns.some(pattern => pattern.test(name)) || 
               riskNameFormats.some(format => format.test(name));
      }
      
      let urlMatch;
      while ((urlMatch = urlPattern.exec(cleanedContent)) !== null) {
        // Check if this URL is already in sources
        const url = urlMatch[1].trim();
        const isDuplicate = sources.some(source => source.url === url);
        
        if (!isDuplicate) {
          // Look for a name before this URL
          const urlPos = urlMatch.index;
          const prevText = cleanedContent.substring(Math.max(0, urlPos - 150), urlPos);
          
          // Try to find a name in the previous text
          namePattern.lastIndex = 0;
          const nameMatches = [];
          let nameMatch;
          while ((nameMatch = namePattern.exec(prevText)) !== null) {
            // If we have a direct match from the regex groups, use it
            const sourceName = nameMatch[1] ? nameMatch[1].trim() : nameMatch[0].trim();
            if (sourceName && sourceName.length > 2) {
              nameMatches.push(sourceName);
            }
          }
          
          // Filter out names that are likely not news sources
          const filteredMatches = nameMatches.filter(name => isLikelyNewsSource(name));
          
          const sourceName = filteredMatches.length > 0 ? 
            filteredMatches[filteredMatches.length - 1] : // Use the last valid source name found
            nameMatches.length > 0 ? 
              nameMatches[nameMatches.length - 1] : // Fall back to any name found
              "Source " + (sources.length + 1); // Generic name if none found
          
          sources.push({
            name: sourceName,
            url: url
          });
        }
      }
      
      // Log the extracted sources
      logger.info(`Extracted ${sources.length} sources from content`);
      if (sources.length > 0) {
        logger.info(`Sample source: ${JSON.stringify(sources[0])}`);
      }
      
      // Extract risks
      const extractedRisks = [];
      for (const pattern of riskPatterns) {
        let riskMatch;
        while ((riskMatch = pattern.exec(cleanedContent)) !== null) {
          // Different patterns have different group structures
          let risk;
          if (riskMatch.length === 6) { // JSON-like pattern - most reliable
            const riskName = riskMatch[1].trim();
            // For JSON pattern, we trust the structure more since it's explicit
            risk = {
              name: riskName,
              description: riskMatch[2].trim(),
              region: riskMatch[3].trim(),
              impactLevel: parseFloat(riskMatch[4]),
              marketImplications: riskMatch[5].trim()
            };
          } else if (riskMatch.length === 5) { // Numbered risk pattern
            const riskName = riskMatch[2].trim();
            // Only use this name if it looks like a risk and not a news source
            if (isLikelyRiskName(riskName)) {
              risk = {
                name: riskName,
                description: riskMatch[4].trim(),
                region: "Unknown",
                impactLevel: parseFloat(riskMatch[3]),
                marketImplications: "Market implications not specified."
              };
            }
          } else if (riskMatch.length === 4) { // Region marker pattern
            const riskName = riskMatch[1].trim();
            // Only use this name if it looks like a risk and not a news source
            if (isLikelyRiskName(riskName)) {
              risk = {
                name: riskName,
                description: riskMatch[3].trim(),
                region: riskMatch[2].trim(),
                impactLevel: 5, // Default mid-level impact
                marketImplications: "Market implications not specified."
              };
            }
          }
          
          // Add sources if we have them and they seem related to this risk
          if (risk && sources.length > 0) {
            // Simple approach: distribute sources among risks
            const riskIndex = extractedRisks.length;
            const sourcesPerRisk = Math.max(1, Math.floor(sources.length / Math.max(1, riskPatterns.length)));
            const startIdx = riskIndex * sourcesPerRisk % sources.length;
            const endIdx = Math.min(startIdx + sourcesPerRisk, sources.length);
            
            if (startIdx < endIdx) {
              risk.sources = sources.slice(startIdx, endIdx);
            }
          }
          
          if (risk) {
            extractedRisks.push(risk);
          }
        }
        
        // If we found risks with this pattern, stop trying other patterns
        if (extractedRisks.length > 0) {
          break;
        }
      }
      
      // If we found risks, construct a complete JSON object
      if (extractedRisks.length > 0 || (riskIndex && globalOverview)) {
        const indexValue = riskIndex ? parseInt(riskIndex[1]) : 75; // Default value if not found
        const globalText = globalOverview ? globalOverview[1].trim() : "Global geopolitical tensions remain elevated.";
        const executiveText = executiveSummary ? executiveSummary[1].trim() : "AI analysis completed with partial data extraction.";
        
        // If we didn't extract any risks but have global overview, create at least one risk
        if (extractedRisks.length === 0) {
          extractedRisks.push({
            name: "Global Geopolitical Tensions",
            description: globalText,
            region: "Global",
            impactLevel: indexValue / 10,
            marketImplications: "Markets may experience volatility due to geopolitical uncertainties."
          });
          
          // Add sources if available
          if (sources.length > 0) {
            extractedRisks[0].sources = sources;
          }
        }
        
        // Validate risk names before creating the final JSON
        const validatedRisks = extractedRisks.map(risk => {
          // If the risk name is a likely news source, replace it with a generic name
          if (risk.name && isLikelyNewsSource(risk.name)) {
            logger.warn(`Found risk with news source name in fallback: ${risk.name}. Replacing with generic name.`);
            // Use the region or a default name if region is not available
            risk.name = risk.region ? 
              `Geopolitical Tensions in ${risk.region}` : 
              'Geopolitical Risk';
          }
          return risk;
        });
        
        jsonData = {
          lastUpdated: new Date().toISOString(),
          geopoliticalRiskIndex: indexValue,
          global: globalText,
          executive: executiveText,
          risks: validatedRisks
        };
        
        // Sort risks by impact level in descending order
        if (jsonData.risks && Array.isArray(jsonData.risks)) {
          jsonData.risks.sort((a, b) => {
            const impactA = typeof a.impactLevel === 'number' ? a.impactLevel : 0;
            const impactB = typeof b.impactLevel === 'number' ? b.impactLevel : 0;
            return impactB - impactA; // Descending order
          });
          logger.info('Sorted risks by impact level in descending order');
        }
        
        logger.info(`Created enhanced fallback JSON with ${validatedRisks.length} risks and ${sources.length} sources`);
        return jsonData;
      }
    } catch (enhancedFallbackError) {
      logger.warn(`Enhanced fallback JSON creation failed: ${enhancedFallbackError.message}`);
      
      // Last resort: Create a minimal fallback JSON
      try {
        // Create a minimal fallback JSON with the data we can extract
        const riskIndex = cleanedContent.match(/"geopoliticalRiskIndex"\s*:\s*(\d+)/) || 
                          cleanedContent.match(/geopolitical[\s-]*risk[\s-]*index[\s:]*([\d\.]+)/i) || 
                          [null, "75"];
        
        const globalOverview = cleanedContent.match(/"global"\s*:\s*"([^"]*)"/i) || 
                               cleanedContent.match(/global[\s:]*["']?([^"'\n]{10,})["']?/i) || 
                               [null, "Global geopolitical tensions remain elevated."];
        
        jsonData = {
          lastUpdated: new Date().toISOString(),
          geopoliticalRiskIndex: parseInt(riskIndex[1]),
          global: globalOverview[1].trim(),
          executive: "AI analysis completed with minimal data extraction.",
          risks: [
            {
              name: "Global Geopolitical Tensions",
              description: globalOverview[1].trim(),
              region: "Global",
              impactLevel: parseInt(riskIndex[1]) / 10,
              marketImplications: "Markets may experience volatility due to geopolitical uncertainties."
            }
          ]
        };
        logger.info('Created minimal fallback JSON');
        return jsonData;
      } catch (minimalFallbackError) {
        logger.warn(`Minimal fallback JSON creation failed: ${minimalFallbackError.message}`);
      }
    }
  }
  
  // If all parsing methods fail, throw an error
  throw new Error('Failed to parse JSON from AI response');
}

/**
 * Analyze geopolitical risks using AI with sequential approach
 * @param {Array} inputData - Array of geopolitical risk items
 * @param {string} provider - AI provider to use ('perplexity', 'openai', or 'random')
 * @returns {Promise<Object>} - The analyzed data
 */
async function analyzeGeopoliticalRisks(inputData, provider = 'perplexity') {
  logger.info(`Analyzing geopolitical risks using ${provider}...`);
  
  // Determine which provider to use if 'random' is specified
  let actualProvider = provider;
  if (provider === 'random') {
    const providers = ['perplexity', 'openai'];
    const randomIndex = Math.floor(Math.random() * providers.length);
    actualProvider = providers[randomIndex];
    logger.info(`Randomly selected provider: ${actualProvider}`);
  } else if (provider === 'both') {
    // If 'both' is specified, default to random selection for sequential processing
    const providers = ['perplexity', 'openai'];
    const randomIndex = Math.floor(Math.random() * providers.length);
    actualProvider = providers[randomIndex];
    logger.info(`'both' provider mode requested, but using sequential approach with randomly selected provider: ${actualProvider}`);
  }
  
  // Create the prompt for the AI provider
  const prompt = createAIPrompt(inputData, actualProvider);
  
  try {
    let result;
    let usedFallback = false;
    let resultProvider = actualProvider; // Track which provider was actually used
    
    // First provider attempt (primary provider)
    try {
      // Try the primary provider twice with random delay
      const primaryProvider = { 
        function: actualProvider === 'perplexity' ? sendToPerplexity : sendToOpenAI, 
        args: [prompt] 
      };
      
      // Execute with retry logic for primary provider
      const primaryResult = await executeWithRetry(
        primaryProvider.function,
        primaryProvider.args,
        2, // Try twice
        1000, // Min delay
        3000  // Max delay
      );
      
      result = primaryResult;
      logger.info(`Successfully used primary provider (${actualProvider})`);
    } catch (primaryError) {
      logger.warn(`Primary provider (${actualProvider}) failed after multiple attempts: ${primaryError.message}`);
      
      // If primary provider fails, try the fallback provider
      try {
        // Determine fallback provider
        const fallbackProviderName = actualProvider === 'perplexity' ? 'openai' : 'perplexity';
        logger.info(`Attempting fallback provider (${fallbackProviderName})...`);
        
        const fallbackProvider = { 
          function: fallbackProviderName === 'perplexity' ? sendToPerplexity : sendToOpenAI, 
          args: [prompt] 
        };
        
        // Execute with retry logic for fallback provider
        const fallbackResult = await executeWithRetry(
          fallbackProvider.function,
          fallbackProvider.args,
          2, // Try twice
          1000, // Min delay
          3000  // Max delay
        );
        
        result = fallbackResult;
        usedFallback = true;
        resultProvider = fallbackProviderName;
        logger.info(`Successfully used fallback provider (${fallbackProviderName})`);
      } catch (fallbackError) {
        logger.error(`Both primary and fallback providers failed: ${fallbackError.message}`);
        
        // Create a graceful failure response that doesn't expose internal details
        result = createGracefulFailureResponse();
        logger.info('Using graceful failure response');
      }
    }
    
    // Process result and validate URLs
    await validateResultUrls(result);
    
    // Save the result to a file
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(result, null, 2));
    logger.info(`Analysis saved to ${OUTPUT_FILE}`);
    
    // Add the provider information to the result
    result.provider = resultProvider || actualProvider || 'unknown';
    
    return result;
  } catch (error) {
    logger.error(`Error analyzing geopolitical risks: ${error.message}`);
    
    // Create a graceful failure response that doesn't expose internal details
    const gracefulResponse = createGracefulFailureResponse();
    return gracefulResponse;
  }
}

// Note: executeWithRetry is imported from './utils/ai-provider-manager'

/**
 * Create a graceful failure response that doesn't expose internal details
 * @returns {Object} - A valid JSON response with a user-friendly error message
 */
function createGracefulFailureResponse() {
  return {
    lastUpdated: new Date().toISOString(),
    status: "unavailable",
    message: "Geopolitical risk analysis is temporarily unavailable. The required data could not be processed at this time.",
    executive: "We apologize, but the geopolitical risk analysis service is currently unavailable. Please try again later.",
    global: "Analysis unavailable at this time.",
    geopoliticalRiskIndex: null,
    risks: [],
    provider: "unavailable"
  };
}

/**
 * Validate URLs in the analysis result and clean up the data
 * @param {Object} result - The analysis result
 * @returns {Promise<void>}
 */
async function validateResultUrls(result) {
  try {
    if (!result || !result.risks || !Array.isArray(result.risks)) {
      logger.warn('No risks found in result for URL validation');
      return;
    }
    
    // Create a map of URLs to validation results for quick lookup later
    const urlValidationMap = new Map();
    
    // Collect all URLs from the result
    const urlsToValidate = [];
    let sourcesWithoutUrls = 0;
    
    // Create a structured collection of sources with their parent risk for later reference
    const sourceMap = new Map(); // Maps URL to {source, riskName} object
    
    result.risks.forEach(risk => {
      if (risk.sources && Array.isArray(risk.sources)) {
        risk.sources.forEach(source => {
          if (source.url && typeof source.url === 'string') {
            urlsToValidate.push(source.url);
            // Store reference to the source and its parent risk
            sourceMap.set(source.url, {
              source: source,
              riskName: risk.name
            });
          } else {
            sourcesWithoutUrls++;
            logger.warn(`Source without URL found in risk "${risk.name}": ${source.name || 'Unnamed source'}`);
          }
        });
      }
    });
    
    logger.info(`Validating ${urlsToValidate.length} URLs from analysis result (${sourcesWithoutUrls} sources without URLs)`);
    
    // First do a quick format validation
    const invalidFormatUrls = urlsToValidate.filter(url => !isValidUrlFormat(url));
    if (invalidFormatUrls.length > 0) {
      logger.warn(`Found ${invalidFormatUrls.length} URLs with invalid format`);
      invalidFormatUrls.forEach(url => {
        logger.warn(`Invalid URL format: ${url}`);
        urlValidationMap.set(url, { isValidFormat: false, isAccessible: false });
      });
    }
    
    // Only validate accessibility for URLs with valid format (to save time and resources)
    const validFormatUrls = urlsToValidate.filter(url => isValidUrlFormat(url));
    
    // Skip accessibility check in test environments or if there are too many URLs
    const skipAccessibilityCheck = process.env.SKIP_URL_ACCESSIBILITY_CHECK === 'true' || validFormatUrls.length > 50;
    
    if (!skipAccessibilityCheck) {
      // Validate URL accessibility with increased concurrency for better performance
      logger.info(`Checking accessibility for ${validFormatUrls.length} URLs with valid format`);
      const validationResults = await validateUrlBatch(validFormatUrls, {
        concurrency: 10, // Increased from 3 to 10 for better parallelization
        timeout: 5000,
        checkAccessibility: true
      });
      
      // Store validation results in the map
      validationResults.forEach(result => {
        urlValidationMap.set(result.url, {
          isValidFormat: true,
          isAccessible: result.isAccessible,
          error: result.error
        });
      });
      
      // Log validation results
      const inaccessibleUrls = validationResults.filter(r => !r.isAccessible);
      
      if (inaccessibleUrls.length > 0) {
        logger.warn(`Found ${inaccessibleUrls.length} inaccessible URLs`);
        inaccessibleUrls.forEach(result => {
          // Get the source and risk info for better logging
          const sourceInfo = sourceMap.get(result.url);
          const riskName = sourceInfo ? sourceInfo.riskName : 'Unknown risk';
          const sourceName = sourceInfo && sourceInfo.source.name ? sourceInfo.source.name : 'Unnamed source';
          
          logger.warn(`Inaccessible URL: ${result.url} - Source: ${sourceName} - Risk: ${riskName} - Error: ${result.error || 'Unknown error'}`);
        });
      } else {
        logger.info('All URLs with valid format are accessible');
      }
    } else {
      logger.info('Skipping URL accessibility check');
      // Mark all valid format URLs as accessible when skipping the check
      validFormatUrls.forEach(url => {
        urlValidationMap.set(url, { isValidFormat: true, isAccessible: true });
      });
    }
    
    // Clean up the result by removing inaccessible sources
    result.risks.forEach(risk => {
      if (risk.sources && Array.isArray(risk.sources)) {
        // Filter out sources with inaccessible URLs, but keep at least one source
        const accessibleSources = risk.sources.filter(source => {
          if (!source.url) return true; // Keep sources without URLs
          const validation = urlValidationMap.get(source.url);
          return !validation || validation.isAccessible; // Keep if accessible or not validated
        });
        
        // Only update if we have at least one source left
        if (accessibleSources.length > 0) {
          risk.sources = accessibleSources;
        }
      }
    });
    
    // Sort risks by impact level in descending order
    if (result.risks && Array.isArray(result.risks)) {
      result.risks.sort((a, b) => {
        const impactA = typeof a.impactLevel === 'number' ? a.impactLevel : 0;
        const impactB = typeof b.impactLevel === 'number' ? b.impactLevel : 0;
        return impactB - impactA; // Descending order
      });
      logger.info('Sorted risks by impact level in descending order');
    }
  } catch (error) {
    // Don't fail the entire process if URL validation fails
    logger.error(`Error validating URLs: ${error.message}`);
  }
}

module.exports = {
  analyzeGeopoliticalRisks
};
