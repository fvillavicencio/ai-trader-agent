/**
 * Market Sentiment Module
 * Handles the retrieval of market sentiment data from analysts and sentiment indicators
 */

/**
 * Retrieves market sentiment data
 * @return {Object} Market sentiment data
 */
function retrieveMarketSentiment() {
  try {
    Logger.log("Retrieving market sentiment data...");
    
    // Initialize configuration with default values if needed
    initializeMarketSentimentConfig();
    
    // Check if we have cached data first (cache for 2 hours)
    try {
      const scriptCache = CacheService.getScriptCache();
      const cachedData = scriptCache.get('MARKET_SENTIMENT_DATA');
      
      if (cachedData) {
        const parsedData = JSON.parse(cachedData);
        const cacheTime = new Date(parsedData.timestamp);
        const currentTime = new Date();
        const cacheAgeHours = (currentTime - cacheTime) / (1000 * 60 * 60);
        
        if (cacheAgeHours < 2) {
          Logger.log("Using cached market sentiment data (less than 2 hours old)");
          parsedData.fromCache = true;
          return parsedData;
        } else {
          Logger.log("Cached market sentiment data is more than 2 hours old");
        }
      }
    } catch (cacheError) {
      Logger.log("Cache retrieval error: " + cacheError);
      // Continue execution - we'll get fresh data below
    }
    
    // Retrieve market sentiment data from OpenAI
    const marketSentimentData = retrieveOpenAIMarketSentiment();
    
    // Check if we have valid data
    if (marketSentimentData && marketSentimentData.success) {
      // Extract mentioned stocks from analyst comments
      const mentionedStocks = extractMentionedStocks(marketSentimentData);
      Logger.log(`Found ${mentionedStocks.length} mentioned stocks: ${mentionedStocks.join(', ')}`);
      
      // Prepare the result
      const result = {
        success: true,
        message: "Market sentiment data retrieved successfully.",
        data: marketSentimentData,
        mentionedStocks: mentionedStocks,
        timestamp: new Date(),
        fromCache: false
      };
      
      // Cache the result for 2 hours (7200 seconds)
      try {
        const scriptCache = CacheService.getScriptCache();
        scriptCache.put('MARKET_SENTIMENT_DATA', JSON.stringify(result), 7200);
        Logger.log("Market sentiment data cached successfully for 2 hours");
      } catch (cacheError) {
        Logger.log("Error caching market sentiment data: " + cacheError);
        // Continue execution - caching is optional
      }
      
      // Return the results
      return result;
    } else {
      return {
        success: false,
        message: "Failed to retrieve market sentiment data.",
        error: marketSentimentData.error || "Unknown error",
        timestamp: new Date(),
        fromCache: false
      };
    }
  } catch (error) {
    Logger.log(`Error retrieving market sentiment data: ${error}`);
    return {
      success: false,
      message: `Failed to retrieve market sentiment data: ${error}`,
      timestamp: new Date(),
      fromCache: false
    };
  }
}

/**
 * Extracts mentioned stocks from market sentiment data
 * @param {Object} marketSentimentData - Market sentiment data
 * @return {Array} Array of mentioned stock symbols
 */
function extractMentionedStocks(marketSentimentData) {
  const mentionedStocks = [];
  
  // Extract from analysts
  if (marketSentimentData.analysts && Array.isArray(marketSentimentData.analysts)) {
    marketSentimentData.analysts.forEach(analyst => {
      // Check both mentionedStocks and mentionedSymbols for backward compatibility
      if (analyst.mentionedStocks && Array.isArray(analyst.mentionedStocks)) {
        analyst.mentionedStocks.forEach(symbol => {
          if (symbol && !mentionedStocks.includes(symbol)) {
            mentionedStocks.push(symbol);
          }
        });
      } else if (analyst.mentionedSymbols && Array.isArray(analyst.mentionedSymbols)) {
        // For backward compatibility
        analyst.mentionedStocks = analyst.mentionedSymbols; // Add mentionedStocks property
        analyst.mentionedSymbols.forEach(symbol => {
          if (symbol && !mentionedStocks.includes(symbol)) {
            mentionedStocks.push(symbol);
          }
        });
      } else {
        // Try to extract stock symbols from the commentary
        const extractedSymbols = extractSymbolsFromText(analyst.commentary || "");
        if (extractedSymbols.length > 0) {
          analyst.mentionedStocks = extractedSymbols;
          extractedSymbols.forEach(symbol => {
            if (!mentionedStocks.includes(symbol)) {
              mentionedStocks.push(symbol);
            }
          });
        }
      }
    });
  }
  
  // Extract from sentiment indicators
  if (marketSentimentData.sentimentIndicators && Array.isArray(marketSentimentData.sentimentIndicators)) {
    marketSentimentData.sentimentIndicators.forEach(indicator => {
      if (indicator.mentionedStocks && Array.isArray(indicator.mentionedStocks)) {
        indicator.mentionedStocks.forEach(symbol => {
          if (symbol && !mentionedStocks.includes(symbol)) {
            mentionedStocks.push(symbol);
          }
        });
      }
    });
  }
  
  return mentionedStocks;
}

/**
 * Extracts stock symbols from text
 * @param {String} text - The text to extract symbols from
 * @return {Array} Array of extracted stock symbols
 */
function extractSymbolsFromText(text) {
  if (!text) return [];
  
  // Common stock symbols pattern (1-5 uppercase letters)
  const symbolPattern = /\b[A-Z]{1,5}\b/g;
  
  // Exclude common words that might be mistaken for stock symbols
  const excludeWords = [
    "I", "A", "AN", "THE", "AND", "OR", "BUT", "IF", "THEN", "ELSE", "FOR", "TO", "IN", "ON", "AT", "BY", 
    "WITH", "FROM", "OF", "IS", "ARE", "AM", "BE", "BEEN", "WAS", "WERE", "US", "CEO", "CFO", "CTO", "COO",
    "GDP", "CPI", "PCE", "FED", "FOMC", "IMF", "ECB", "USD", "EUR", "JPY", "GBP", "CNY", "BUY", "SELL"
  ];
  
  // Extract potential symbols
  const matches = text.match(symbolPattern) || [];
  
  // Filter out excluded words and duplicates
  const symbols = [...new Set(matches.filter(symbol => !excludeWords.includes(symbol)))];
  
  return symbols;
}

/**
 * Retrieves market sentiment data from OpenAI
 * @return {Object} Market sentiment data
 */
function retrieveOpenAIMarketSentiment() {
  try {
    Logger.log("Retrieving market sentiment data from OpenAI...");
    
    // Get the OpenAI API key
    const apiKey = getOpenAIApiKey();
    if (!apiKey) {
      throw new Error("OpenAI API key not found in script properties");
    }
    
    // Generate the prompt for OpenAI
    const prompt = getOpenAIMarketSentimentPrompt();
    
    // Call the OpenAI API
    const response = callOpenAIApi(prompt, apiKey);
    
    // Parse the response
    const marketSentimentData = parseOpenAIResponse(response);
    
    // Add success flag and timestamp
    marketSentimentData.success = true;
    marketSentimentData.lastUpdated = new Date().toISOString();
    
    // Log some information about the retrieved data
    if (marketSentimentData.analysts) {
      Logger.log(`Market sentiment data retrieved with ${marketSentimentData.analysts.length} analysts and ${marketSentimentData.sentimentIndicators.length} sentiment indicators.`);
    }
    
    return marketSentimentData;
  } catch (error) {
    Logger.log(`Error retrieving market sentiment data from OpenAI: ${error}`);
    return {
      success: false,
      error: error.toString(),
      analysts: [],
      sentimentIndicators: []
    };
  }
}

/**
 * Calls the OpenAI API to retrieve market sentiment data
 * @param {String} prompt - The prompt to send to OpenAI
 * @param {String} apiKey - The OpenAI API key
 * @return {Object} The response from OpenAI
 */
function callOpenAIApi(prompt, apiKey) {
  try {
    Logger.log("Calling OpenAI API...");
    
    const payload = {
      model: getOpenAIModelName(),
      messages: [
        {
          role: "system",
          content: "You are a financial analyst specializing in market sentiment analysis. You MUST ALWAYS provide accurate, up-to-date information about current market sentiment in the exact JSON format specified in the user's prompt. NEVER respond with explanations, apologies, or any text outside the JSON format. Always include specific details about analysts' comments and sentiment indicators."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: getOpenAITemperature(),
      max_tokens: getOpenAIMaxTokens()
    };
    
    const options = {
      method: 'post',
      contentType: 'application/json',
      headers: {
        'Authorization': 'Bearer ' + apiKey
      },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };
    
    // Log the payload for debugging (omit sensitive information)
    Logger.log(`OpenAI API Request - Model: ${payload.model}, Temperature: ${payload.temperature}, Max Tokens: ${payload.max_tokens}`);
    
    // Call the OpenAI API
    const response = UrlFetchApp.fetch("https://api.openai.com/v1/chat/completions", options);
    const responseCode = response.getResponseCode();
    
    if (responseCode !== 200) {
      throw new Error(`OpenAI API returned status code ${responseCode}: ${response.getContentText()}`);
    }
    
    const responseData = JSON.parse(response.getContentText());
    Logger.log(`OpenAI API Response - Status: Success, Tokens: ${responseData.usage ? responseData.usage.total_tokens : 'unknown'}`);
    
    return responseData;
  } catch (error) {
    Logger.log(`Error calling OpenAI API: ${error}`);
    throw new Error(`Failed to call OpenAI API: ${error}`);
  }
}

/**
 * Parses the response from OpenAI
 * @param {Object} response - The response from OpenAI
 * @return {Object} The parsed market sentiment data
 */
function parseOpenAIResponse(response) {
  try {
    // Extract the content from the response
    const content = response.choices[0].message.content;
    
    // Try to extract JSON using regex
    const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || content.match(/\{[\s\S]*\}/);
    
    let jsonData;
    if (jsonMatch) {
      // Parse the JSON
      jsonData = JSON.parse(jsonMatch[1] || jsonMatch[0]);
      Logger.log("Successfully extracted market sentiment JSON using regex pattern");
    } else {
      // If we can't extract JSON, return an error
      throw new Error("Could not extract JSON from OpenAI response");
    }
    
    // Ensure the data has the expected structure
    if (!jsonData.analysts || !Array.isArray(jsonData.analysts)) {
      throw new Error("Invalid market sentiment data structure: missing analysts array");
    }
    
    // Ensure each analyst has the required fields and mentionedStocks is an array
    jsonData.analysts.forEach(analyst => {
      analyst.mentionedStocks = analyst.mentionedStocks || analyst.mentionedSymbols || [];
      
      // If mentionedStocks is a string, convert it to an array
      if (typeof analyst.mentionedStocks === 'string') {
        analyst.mentionedStocks = analyst.mentionedStocks.split(',').map(s => s.trim());
      }
      
      // Ensure mentionedStocks is an array
      if (!Array.isArray(analyst.mentionedStocks)) {
        analyst.mentionedStocks = [];
      }
      
      // Remove mentionedSymbols to standardize on mentionedStocks
      delete analyst.mentionedSymbols;
    });
    
    // Ensure sentiment indicators have the required fields
    if (jsonData.sentimentIndicators && Array.isArray(jsonData.sentimentIndicators)) {
      jsonData.sentimentIndicators.forEach(indicator => {
        indicator.mentionedStocks = indicator.mentionedStocks || indicator.mentionedSymbols || [];
        
        // If mentionedStocks is a string, convert it to an array
        if (typeof indicator.mentionedStocks === 'string') {
          indicator.mentionedStocks = indicator.mentionedStocks.split(',').map(s => s.trim());
        }
        
        // Ensure mentionedStocks is an array
        if (!Array.isArray(indicator.mentionedStocks)) {
          indicator.mentionedStocks = [];
        }
        
        // Remove mentionedSymbols to standardize on mentionedStocks
        delete indicator.mentionedSymbols;
      });
    }
    
    return jsonData;
  } catch (error) {
    Logger.log(`Error parsing OpenAI response: ${error}`);
    return {
      analysts: [],
      sentimentIndicators: [],
      error: `Error parsing OpenAI response: ${error}`
    };
  }
}

/**
 * Generates a prompt for OpenAI to retrieve market sentiment data
 * @return {String} The prompt for OpenAI
 */
function getOpenAIMarketSentimentPrompt() {
  const currentDate = new Date();
  const formattedDate = Utilities.formatDate(currentDate, "America/New_York", "MMMM dd, yyyy");
  
  // Get configurable analyst names
  const analystNames = getAnalystNames();
  const prominentFigures = getProminentFinancialFigures();
  
  return `You are a financial analyst assistant. Analyze recent market sentiment from financial analysts and other financial experts.

Current Date: ${formattedDate}

Task: Generate a comprehensive market sentiment analysis based on recent commentary from financial analysts and other financial experts. Include the following:

1. Recent commentary from financial analysts (${analystNames.join(", ")})
2. Recent insights from ${prominentFigures.join(", ")}, and other prominent financial figures if available
3. Recent sentiment indicators from major financial institutions

Format your response as a valid JSON object with the following structure:

{
  "analysts": [
    {
      "name": "Analyst Name",
      "firm": "Firm Name",
      "commentary": "Direct quote or summary of their commentary",
      "sentiment": "Bullish/Neutral/Bearish",
      "mentionedStocks": ["AAPL", "MSFT"],
      "source": "Source Name",
      "url": "https://source-url.com",
      "lastUpdated": "YYYY-MM-DD"
    }
  ],
  "sentimentIndicators": [
    {
      "name": "Indicator Name",
      "value": "Current Value",
      "interpretation": "What this value suggests",
      "trend": "Increasing/Decreasing/Stable",
      "mentionedStocks": ["AAPL", "MSFT"],
      "source": "Source Name",
      "url": "https://source-url.com",
      "lastUpdated": "YYYY-MM-DD"
    }
  ],
  "overallSentiment": "Bullish/Neutral/Bearish",
  "summary": "Brief summary of the overall market sentiment"
}

Important guidelines:
1. For each analyst, include their most recent commentary (within the last week if possible)
2. For each analyst, identify any specific stocks they mentioned and include them in the mentionedStocks array
3. For each analyst and sentiment indicator, include the lastUpdated field with the date the commentary or data was published
4. For each sentiment indicator, include the most recent value and what it suggests
5. Provide a brief summary of the overall market sentiment
6. Ensure all data is accurate and from reputable sources
7. Include complete URLs (not just domain names) for all sources
8. Format the response as a valid JSON object

Your response should ONLY include the JSON object, without any additional text.`;
}

/**
 * Gets the OpenAI API key from script properties
 * @return {String} The OpenAI API key
 */
function getOpenAIApiKey() {
  const scriptProperties = PropertiesService.getScriptProperties();
  const apiKey = scriptProperties.getProperty('OPENAI_API_KEY');
  return apiKey;
}

/**
 * Gets the OpenAI model name from script properties
 * @return {String} The OpenAI model name
 */
function getOpenAIModelName() {
  const scriptProperties = PropertiesService.getScriptProperties();
  const modelName = scriptProperties.getProperty('OPENAI_MODEL_NAME') || 'gpt-4-turbo';
  return modelName;
}

/**
 * Gets the OpenAI temperature from script properties
 * @return {Number} The OpenAI temperature
 */
function getOpenAITemperature() {
  const scriptProperties = PropertiesService.getScriptProperties();
  const temperature = scriptProperties.getProperty('OPENAI_TEMPERATURE') || 0.3;
  return parseFloat(temperature);
}

/**
 * Gets the OpenAI max tokens from script properties
 * @return {Number} The OpenAI max tokens
 */
function getOpenAIMaxTokens() {
  const scriptProperties = PropertiesService.getScriptProperties();
  const maxTokens = scriptProperties.getProperty('OPENAI_MAX_TOKENS') || 2000;
  return parseInt(maxTokens);
}

/**
 * Gets the analyst names from script properties
 * @return {Array} The analyst names
 */
function getAnalystNames() {
  const scriptProperties = PropertiesService.getScriptProperties();
  const analystNames = scriptProperties.getProperty('ANALYST_NAMES');
  return analystNames ? analystNames.split(',').map(name => name.trim()) : 
    ["Dan Nathan", "Josh Brown", "Steve Weiss", "Joe Terranova"]; // Default values
}

/**
 * Gets the prominent financial figures from script properties
 * @return {Array} The prominent financial figures
 */
function getProminentFinancialFigures() {
  const scriptProperties = PropertiesService.getScriptProperties();
  const prominentFigures = scriptProperties.getProperty('PROMINENT_FINANCIAL_FIGURES');
  return prominentFigures ? prominentFigures.split(',').map(name => name.trim()) : 
    ["Dan Niles", "Mohamed El-Erian"]; // Default values
}

/**
 * Initializes default configuration values if they don't exist
 */
function initializeMarketSentimentConfig() {
  try {
    Logger.log("Initializing market sentiment configuration...");
    
    const scriptProperties = PropertiesService.getScriptProperties();
    const configDefaults = {
      'OPENAI_MODEL_NAME': 'gpt-4-turbo',
      'OPENAI_TEMPERATURE': '0.3',
      'OPENAI_MAX_TOKENS': '2000',
      'ANALYST_NAMES': 'Dan Nathan,Josh Brown,Steve Weiss,Joe Terranova',
      'PROMINENT_FINANCIAL_FIGURES': 'Dan Niles,Mohamed El-Erian'
    };
    
    // For each default config, check if it exists and set it if it doesn't
    Object.keys(configDefaults).forEach(key => {
      const existingValue = scriptProperties.getProperty(key);
      if (!existingValue) {
        scriptProperties.setProperty(key, configDefaults[key]);
        Logger.log(`Set default value for ${key}: ${configDefaults[key]}`);
      }
    });
    
    Logger.log("Market sentiment configuration initialized successfully");
    return {
      success: true,
      message: "Market sentiment configuration initialized successfully"
    };
  } catch (error) {
    Logger.log(`Error initializing market sentiment configuration: ${error}`);
    return {
      success: false,
      error: error.toString()
    };
  }
}

/**
 * Updates market sentiment configuration
 * @param {Object} config - Configuration object with keys and values to update
 * @return {Object} Result of the update operation
 */
function updateMarketSentimentConfig(config) {
  try {
    Logger.log("Updating market sentiment configuration...");
    
    if (!config || typeof config !== 'object') {
      throw new Error("Invalid configuration object");
    }
    
    const scriptProperties = PropertiesService.getScriptProperties();
    const updatedKeys = [];
    
    // Update each property in the config object
    Object.keys(config).forEach(key => {
      scriptProperties.setProperty(key, config[key]);
      updatedKeys.push(key);
      Logger.log(`Updated ${key} to ${config[key]}`);
    });
    
    Logger.log(`Market sentiment configuration updated successfully: ${updatedKeys.join(', ')}`);
    return {
      success: true,
      message: `Market sentiment configuration updated successfully: ${updatedKeys.join(', ')}`
    };
  } catch (error) {
    Logger.log(`Error updating market sentiment configuration: ${error}`);
    return {
      success: false,
      error: error.toString()
    };
  }
}

/**
 * Clears the market sentiment cache
 * @return {Object} Result of the operation
 */
function clearMarketSentimentCache() {
  try {
    Logger.log("Clearing market sentiment cache...");
    
    const scriptCache = CacheService.getScriptCache();
    scriptCache.remove('MARKET_SENTIMENT_DATA');
    
    Logger.log("Market sentiment cache cleared successfully");
    return {
      success: true,
      message: "Market sentiment cache cleared successfully",
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    Logger.log(`Error clearing market sentiment cache: ${error}`);
    return {
      success: false,
      message: `Failed to clear market sentiment cache: ${error}`,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Forces a refresh of market sentiment data by clearing the cache and retrieving new data
 * @return {Object} Fresh market sentiment data
 */
function refreshMarketSentiment() {
  try {
    Logger.log("Forcing refresh of market sentiment data...");
    
    // Clear the cache first
    clearMarketSentimentCache();
    
    // Retrieve fresh data
    const freshData = retrieveMarketSentiment();
    
    Logger.log("Market sentiment data refreshed successfully");
    return {
      success: true,
      message: "Market sentiment data refreshed successfully",
      data: freshData,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    Logger.log(`Error refreshing market sentiment data: ${error}`);
    return {
      success: false,
      message: `Failed to refresh market sentiment data: ${error}`,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Tests the market sentiment module
 */
function testMarketSentiment() {
  try {
    const marketSentiment = retrieveMarketSentiment();
    Logger.log(JSON.stringify(marketSentiment, null, 2));
    return marketSentiment;
  } catch (error) {
    Logger.log(`Error testing market sentiment: ${error}`);
    return {
      success: false,
      error: error.toString()
    };
  }
}

/**
 * Tests the extraction of mentioned stocks from market sentiment data
 */
function testMentionedStocksExtraction() {
  try {
    Logger.log("Testing extraction of mentioned stocks from market sentiment data...");
    
    // Get analyst names from configuration
    const analystNames = getAnalystNames();
    
    // Create a sample market sentiment data object with dynamic analyst names
    const sampleData = {
      analysts: [
        {
          name: analystNames[0] || "Test Analyst 1",
          firm: "Test Firm 1",
          commentary: "I'm cautious on tech stocks like AAPL and MSFT given current valuations.",
          sentiment: "Bearish",
          mentionedStocks: ["AAPL", "MSFT"]
        },
        {
          name: analystNames[1] || "Test Analyst 2",
          firm: "Test Firm 2",
          commentary: "NVDA continues to show strength in the AI space.",
          sentiment: "Bullish",
          mentionedSymbols: ["NVDA"] // Using old format to test backward compatibility
        },
        {
          name: analystNames[2] || "Test Analyst 3",
          firm: "Test Firm 3",
          commentary: "I think Amazon (AMZN) and Google (GOOGL) are well-positioned for the next quarter.",
          sentiment: "Bullish"
          // No mentioned stocks array, should extract from commentary
        }
      ],
      sentimentIndicators: [
        {
          name: "VIX",
          value: "15.2",
          interpretation: "Low volatility indicates market complacency",
          mentionedStocks: ["SPY"]
        }
      ]
    };
    
    // Extract mentioned stocks
    const mentionedStocks = extractMentionedStocks(sampleData);
    
    // Log the results
    Logger.log(`Extracted ${mentionedStocks.length} mentioned stocks: ${mentionedStocks.join(', ')}`);
    
    // Verify that stocks were extracted correctly
    const expectedStocks = ["AAPL", "MSFT", "NVDA", "AMZN", "GOOGL", "SPY"];
    const missingStocks = expectedStocks.filter(stock => !mentionedStocks.includes(stock));
    const unexpectedStocks = mentionedStocks.filter(stock => !expectedStocks.includes(stock));
    
    if (missingStocks.length > 0) {
      Logger.log(`WARNING: Failed to extract these expected stocks: ${missingStocks.join(', ')}`);
    } else {
      Logger.log("SUCCESS: All expected stocks were extracted correctly");
    }
    
    if (unexpectedStocks.length > 0) {
      Logger.log(`WARNING: Extracted these unexpected stocks: ${unexpectedStocks.join(', ')}`);
    }
    
    // Verify that the mentionedStocks property was added to all analysts
    let allAnalystsHaveMentionedStocks = true;
    sampleData.analysts.forEach((analyst, index) => {
      if (!analyst.mentionedStocks || !Array.isArray(analyst.mentionedStocks)) {
        Logger.log(`WARNING: Analyst at index ${index} does not have a mentionedStocks array`);
        allAnalystsHaveMentionedStocks = false;
      }
    });
    
    if (allAnalystsHaveMentionedStocks) {
      Logger.log("SUCCESS: All analysts have a mentionedStocks array");
    }
    
    return {
      success: true,
      extractedStocks: mentionedStocks,
      missingStocks: missingStocks,
      unexpectedStocks: unexpectedStocks,
      allAnalystsHaveMentionedStocks: allAnalystsHaveMentionedStocks
    };
  } catch (error) {
    Logger.log(`Error testing mentioned stocks extraction: ${error}`);
    return {
      success: false,
      error: error.toString()
    };
  }
}
