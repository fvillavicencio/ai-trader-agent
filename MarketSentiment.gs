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
    initializeMarketSentimentConfig(); // Ensure config is initialized

    // 1. Check cache
    try {
      const scriptCache = CacheService.getScriptCache();
      const cachedData = scriptCache.get('MARKET_SENTIMENT_DATA');
      if (cachedData) {
        const parsedData = JSON.parse(cachedData);
        const cacheTime = new Date(parsedData.timestamp); // Assumes timestamp is ISO string or parsable
        const currentTime = new Date();
        const cacheAgeHours = (currentTime.getTime() - cacheTime.getTime()) / (1000 * 60 * 60);
        
        if (cacheAgeHours < 2) { 
          Logger.log(`Using cached market sentiment data (source: ${parsedData.source || 'N/A'}, age: ${cacheAgeHours.toFixed(2)} hours)`);
          parsedData.fromCache = true;
          return parsedData;
        } else {
          Logger.log(`Cached market sentiment data is stale (age: ${cacheAgeHours.toFixed(2)} hours).`);
        }
      } else {
        Logger.log("No market sentiment data in cache.");
      }
    } catch (cacheError) {
      Logger.log("Cache retrieval error: " + cacheError + ". Proceeding to fetch fresh data.");
    }

    let marketSentimentDataPayload; 
    let dataSource = '';
    let success = false;
    let errorMessage = 'Failed to retrieve data from all sources.'; // Default error

    // 2. Try GCF first
    Logger.log("Attempting to retrieve sentiment from GCF...");
    const gcfResult = invokeMarketSentimentGCFInternal();

    if (gcfResult.success && gcfResult.data) {
      Logger.log("Successfully retrieved data from GCF.");
      marketSentimentDataPayload = gcfResult.data;
      dataSource = 'GCF';
      success = true;
    } else {
      Logger.log(`GCF call failed: ${gcfResult.error || 'Unknown GCF error'}. Falling back to Perplexity.`);
      errorMessage = `GCF Error: ${gcfResult.error || 'Unknown GCF error'}. `;
      
      // 3. Fallback to Perplexity
      Logger.log("Attempting to retrieve sentiment from Perplexity...");
      const perplexityResult = retrievePerplexityMarketSentiment(); 
      if (perplexityResult && perplexityResult.success) {
        Logger.log("Successfully retrieved data from Perplexity.");
        marketSentimentDataPayload = perplexityResult; // This is the whole object from Perplexity
        dataSource = 'Perplexity';
        success = true;
      } else {
        const perplexityErrorMsg = perplexityResult && perplexityResult.error ? perplexityResult.error : (perplexityResult && perplexityResult.message ? perplexityResult.message : 'Unknown Perplexity error');
        Logger.log(`Perplexity call also failed: ${perplexityErrorMsg}`);
        errorMessage += `Perplexity Error: ${perplexityErrorMsg}`;
        success = false;
      }
    }

    // 4. Process and return result if successful
    if (success && marketSentimentDataPayload) {
      const mentionedStocks = extractMentionedStocks(marketSentimentDataPayload);
      Logger.log(`Found ${mentionedStocks.length} mentioned stocks from ${dataSource}: ${mentionedStocks.join(', ')}`);
      
      const finalResult = {
        success: true,
        message: `Market sentiment data retrieved successfully from ${dataSource}.`,
        data: marketSentimentDataPayload,
        mentionedStocks: mentionedStocks,
        timestamp: new Date().toISOString(),
        fromCache: false,
        source: dataSource
      };
      
      try {
        const scriptCache = CacheService.getScriptCache();
        scriptCache.put('MARKET_SENTIMENT_DATA', JSON.stringify(finalResult), 7200); // Cache for 2 hours
        Logger.log(`Market sentiment data from ${dataSource} cached successfully.`);
      } catch (cacheError) {
        Logger.log(`Error caching market sentiment data from ${dataSource}: ${cacheError}`);
      }
      return finalResult;
    } else {
      Logger.log(`Ultimate failure to retrieve market sentiment: ${errorMessage}`);
      return {
        success: false,
        message: errorMessage,
        error: errorMessage,
        timestamp: new Date().toISOString(),
        fromCache: false,
        source: 'None'
      };
    }
  } catch (error) { 
    Logger.log(`Critical error in retrieveMarketSentiment: ${error.toString()}\nStack: ${error.stack}`);
    return {
      success: false,
      message: `Critical error in retrieveMarketSentiment: ${error.toString()}`,
      error: error.toString(),
      timestamp: new Date().toISOString(),
      fromCache: false,
      source: 'None'
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
  
  // Get deprecated symbols from config
  const deprecatedSymbols = DEPRECATED_SYMBOLS;
  
  // Extract from analysts
  if (marketSentimentData.analysts && Array.isArray(marketSentimentData.analysts)) {
    marketSentimentData.analysts.forEach(analyst => {
      // Check both mentionedStocks and mentionedSymbols for backward compatibility
      if (analyst.mentionedStocks && Array.isArray(analyst.mentionedStocks)) {
        analyst.mentionedStocks.forEach(symbol => {
          if (symbol && !mentionedStocks.includes(symbol) && !deprecatedSymbols.includes(symbol)) {
            mentionedStocks.push(symbol);
          }
        });
      } else if (analyst.mentionedSymbols && Array.isArray(analyst.mentionedSymbols)) {
        // For backward compatibility
        analyst.mentionedStocks = analyst.mentionedSymbols; // Add mentionedStocks property
        analyst.mentionedSymbols.forEach(symbol => {
          if (symbol && !mentionedStocks.includes(symbol) && !deprecatedSymbols.includes(symbol)) {
            mentionedStocks.push(symbol);
          }
        });
      } else {
        // Try to extract stock symbols from the commentary
        const extractedSymbols = extractSymbolsFromText(analyst.commentary || "");
        if (extractedSymbols.length > 0) {
          analyst.mentionedStocks = extractedSymbols;
          extractedSymbols.forEach(symbol => {
            if (!mentionedStocks.includes(symbol) && !deprecatedSymbols.includes(symbol)) {
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
          if (symbol && !mentionedStocks.includes(symbol) && !deprecatedSymbols.includes(symbol)) {
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
 * Retrieves market sentiment data from Perplexity
 * @return {Object} Market sentiment data
 */
function retrievePerplexityMarketSentiment() {
  try {
    Logger.log("Retrieving market sentiment data from Perplexity API...");
    
    // Get the Perplexity API key
    const apiKey = getPerplexityApiKey();
    if (!apiKey) {
      throw new Error("Perplexity API key not found in script properties");
    }
    
    // Generate the prompt for Perplexity
    const prompt = getOpenAIMarketSentimentPrompt();
    
    // Call the Perplexity API
    const url = "https://api.perplexity.ai/chat/completions";
    const payload = {
      model: "sonar-pro",  // Valid Perplexity model with web search capability
      messages: [
        {
          role: "system",
          content: "You are a financial market analyst with access to real-time market data. ONLY include analysts for whom you can find ACTUAL recent commentary from the past 48 hours. DO NOT include any 'no recent commentary found' messages. If you can't find commentary for an analyst, simply omit them from the results. Return ONLY valid JSON with no explanations or markdown formatting."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.0,  // Zero temperature for maximum factuality
      max_tokens: 4000,  // Increased token limit for comprehensive results
      top_p: 1.0  // Maximum sampling for complete coverage
    };
    const options = {
      method: 'post',
      contentType: 'application/json',
      headers: {
        'Authorization': 'Bearer ' + apiKey,
        'Accept': 'application/json'
      },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };
    
    // Log the payload for debugging (omit sensitive information)
    Logger.log(`Perplexity API Request - Model: ${payload.model}, Temperature: ${payload.temperature}, Max Tokens: ${payload.max_tokens}`);
    
    // Call the Perplexity API
    const response = UrlFetchApp.fetch(url, options);
    const responseCode = response.getResponseCode();
    
    if (responseCode !== 200) {
      throw new Error(`Perplexity API returned status code ${responseCode}: ${response.getContentText()}`);
    }
    
    const responseData = JSON.parse(response.getContentText());
    Logger.log(`Perplexity API Response - Status: Success, Tokens: ${responseData.usage ? responseData.usage.total_tokens : 'unknown'}`);
    
    // Add debugging to log the raw response
    Logger.log("Raw Perplexity response (first 500 chars):");
    Logger.log(responseData.choices[0].message.content.substring(0, 500) + "...");
    
    // Extract JSON from the response with improved handling
    const content = responseData.choices[0].message.content;
    let jsonData;
    
    try {
      // First try to parse the entire response as JSON
      jsonData = JSON.parse(content);
      Logger.log("Successfully parsed entire response as JSON");
    } catch (e) {
      // If that fails, try to extract JSON from markdown code blocks
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/) || content.match(/\{[\s\S]*\}/);
      
      if (!jsonMatch) {
        throw new Error("Could not extract JSON from Perplexity response: " + content.substring(0, 200) + "...");
      }
      
      try {
        jsonData = JSON.parse(jsonMatch[1] || jsonMatch[0]);
        Logger.log("Successfully extracted market sentiment JSON using regex pattern");
      } catch (parseError) {
        throw new Error("Failed to parse extracted JSON: " + parseError + "\nExtracted content: " + 
                     (jsonMatch[1] || jsonMatch[0]).substring(0, 200) + "...");
      }
    }
    
    // Ensure the data has the expected structure
    if (jsonData && jsonData.analysts && Array.isArray(jsonData.analysts)) {
      Logger.log(`Found ${jsonData.analysts.length} analysts in the response`);
      
      // Filter out analysts with no commentary or with "no recent commentary found" messages
      jsonData.analysts = jsonData.analysts.filter(analyst => {
        if (!analyst.commentary) return false;
        if (analyst.commentary.toLowerCase().includes("no recent commentary")) return false;
        if (analyst.commentary.toLowerCase().includes("could not be found")) return false;
        return true;
      });
      
      Logger.log(`After filtering, ${jsonData.analysts.length} analysts with actual commentary remain`);
    } else {
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
    
    // Add success flag and timestamp
    jsonData.success = true;
    jsonData.lastUpdated = new Date().toISOString();
    
    // Log some information about the retrieved data
    if (jsonData.analysts) {
      Logger.log(`Market sentiment data retrieved with ${jsonData.analysts.length} analysts and ${jsonData.sentimentIndicators.length} sentiment indicators.`);
    }
    
    return jsonData;
  } catch (error) {
    Logger.log(`Error retrieving market sentiment data from Perplexity: ${error}`);
    return {
      success: false,
      error: error.toString(),
      analysts: [],
      sentimentIndicators: []
    };
  }
}

/**
 * Generates a prompt for Perplexity to retrieve market sentiment data
 * @return {String} The prompt for Perplexity
 */
function getOpenAIMarketSentimentPrompt() {
  const currentDate = new Date();
  const formattedDate = Utilities.formatDate(currentDate, TIME_ZONE, "MMMM dd, yyyy");
  
  // Get configurable analyst names
  const analystNames = getAnalystNames();
  const prominentFigures = getProminentFinancialFigures();
  
  return `You are a financial analyst assistant with access to the most current market information. Your task is to provide ONLY VERIFIED, RECENT market sentiment analysis from financial analysts and experts.

Current Date: ${formattedDate}

CRITICAL TASK: Search the web for the MOST RECENT commentary (within the last 48 hours) from financial analysts and experts. ONLY include analysts for whom you can find ACTUAL recent commentary.

Search specifically for these financial analysts and prominent figures:
- Financial Analysts: ${analystNames.join(", ")}
- Prominent Figures: ${prominentFigures.join(", ")}
- Major Institutions: AAII, CNN Money, Bank of America, Goldman Sachs, JPMorgan

Focus on these sources (in order of priority):
1. CNBC TV segments and articles (highest priority)
2. Bloomberg TV and articles
3. Unusualwhales, Cheddarflow
4. Wall Street Journal, Financial Times, Reuters, MSNBC
5. Twitter/X posts from verified analysts
6. Seeking Alpha, Yahoo Finance, Reddit

For EACH analyst and figure, you MUST include:
1. SPECIFIC recent commentary (direct quotes when possible)
2. The EXACT source with publication date
3. SPECIFIC stocks mentioned (with ticker symbols)
4. CLEAR sentiment classification (Bullish/Neutral/Bearish)

Format your response as a valid JSON object with the following structure:

{
  "analysts": [
    {
      "name": "Analyst Name",
      "firm": "Firm Name",
      "commentary": "Direct quote or summary of their commentary with specific details and market insights",
      "sentiment": "Bullish/Neutral/Bearish",
      "mentionedStocks": ["AAPL", "MSFT"],
      "source": "Source Name",
      "url": "https://source-url.com/exact-article-url",
      "lastUpdated": "YYYY-MM-DD"
    }
  ],
  "sentimentIndicators": [
    {
      "name": "Indicator Name",
      "value": "Current Value",
      "interpretation": "What this value suggests with specific market implications",
      "trend": "Increasing/Decreasing/Stable",
      "mentionedStocks": ["AAPL", "MSFT"],
      "source": "Source Name",
      "url": "https://source-url.com/exact-article-url",
      "lastUpdated": "YYYY-MM-DD"
    }
  ],
  "patternAnalysis": {
    "commonThemes": ["Detailed description of common themes across analysts with specific sectors and trends"],
    "contradictions": ["Specific areas where analysts disagree with examples"],
    "emergingTrends": ["Emerging trends mentioned by multiple analysts with supporting evidence"],
    "frequentlyMentionedStocks": [
      {
        "symbol": "AAPL",
        "mentionCount": 5,
        "sentimentBreakdown": {"Bullish": 3, "Neutral": 1, "Bearish": 1}
      }
    ]
  },
  "overallSentiment": "Bullish/Neutral/Bearish",
  "summary": "Detailed summary of the overall market sentiment with specific sectors and catalysts. Consider if there are patterns, contradciting opinions or consensus across all sources/analysts"
}

Here's an example of a well-formatted analyst entry:
{
  "name": "Jim Cramer",
  "firm": "CNBC",
  "commentary": "I'm seeing real strength in semiconductor stocks. Taiwan Semiconductor's earnings were spectacular, and this bodes well for the entire sector. As I said on Mad Money yesterday, 'The AI boom is far from over, and chip stocks will continue to lead the market.'",
  "sentiment": "Bullish",
  "mentionedStocks": ["TSM", "NVDA", "AMD", "INTC"],
  "source": "CNBC Mad Money",
  "url": "https://www.cnbc.com/2025/05/11/cramer-semiconductor-stocks-still-have-room-to-run.html",
  "lastUpdated": "2025-05-11"
}

CRITICAL GUIDELINES:
1. ONLY include analysts and figures for whom you can find ACTUAL recent commentary. DO NOT include any "no recent commentary found" messages or placeholders.
2. If you cannot find recent commentary from an analyst or figure, simply OMIT them completely from the results.
3. For each analyst and prominent figure, include ONLY their MOST RECENT commentary (within the last 48 hours).
4. You MUST identify patterns, commonalities, and contradictions across all analyst commentary and include this analysis in the patternAnalysis section.
5. You MUST identify frequently mentioned stocks across all analysts and include sentiment breakdowns for these stocks.
6. You MUST include complete URLs to the source of each commentary or data point.
7. You MUST include the exact publication date (YYYY-MM-DD) for each commentary or data point in the lastUpdated field.
8. You MUST format the response as a valid JSON object.

Your response should ONLY include the JSON object, without any additional text.`;
}

/**
 * Gets the Perplexity API key from script properties
 * @return {String} The Perplexity API key
 */
function getPerplexityApiKey() {
  const scriptProperties = PropertiesService.getScriptProperties();
  const apiKey = scriptProperties.getProperty('PERPLEXITY_API_KEY');
  return apiKey;
}

/**
 * Initializes default configuration values if they don't exist
 */
function initializeMarketSentimentConfig() {
  try {
    Logger.log("Initializing market sentiment configuration...");
    
    const scriptProperties = PropertiesService.getScriptProperties();
    const configDefaults = {
      'PERPLEXITY_API_KEY': '',
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
 * Internal function to invoke the Market Sentiment Google Cloud Function.
 * @return {Object} An object with {success: boolean, data: Object|null, error: String|null, source: 'GCF'}
 */
function invokeMarketSentimentGCFInternal() {
  const GCF_URL = 'https://us-central1-peppy-cosmos-461901-k8.cloudfunctions.net/marketSentimentAPI';
  const API_KEY_PROPERTY_NAME = 'MARKET_SENTIMENT_API_KEY';
  let apiKey = '';

  Logger.log("Attempting to fetch market sentiment from GCF...");

  try {
    apiKey = PropertiesService.getScriptProperties().getProperty(API_KEY_PROPERTY_NAME);
    if (!apiKey) {
      const errorMsg = `GCF Error: API Key '${API_KEY_PROPERTY_NAME}' not found in Script Properties.`;
      Logger.log(errorMsg);
      return { success: false, data: null, error: errorMsg, source: 'GCF' };
    }
  } catch (e) {
    const errorMsg = `GCF Error retrieving API Key: ${e.toString()}`;
    Logger.log(errorMsg);
    return { success: false, data: null, error: errorMsg, source: 'GCF' };
  }

  const testQuery = 'gas_internal_call'; // Query parameter is not used by GCF
  const fullUrl = `${GCF_URL}?query=${encodeURIComponent(testQuery)}`;

  const options = {
    'method': 'GET',
    'headers': { 'x-api-key': apiKey },
    'muteHttpExceptions': true,
    'contentType': 'application/json',
    'validateHttpsCertificates': true // Good practice
  };

  try {
    const response = UrlFetchApp.fetch(fullUrl, options);
    const responseCode = response.getResponseCode();
    const responseText = response.getContentText();

    if (responseCode === 200) {
      try {
        const jsonResponse = JSON.parse(responseText);
        Logger.log('GCF call successful. Data received.');
        return { success: true, data: jsonResponse, error: null, source: 'GCF' };
      } catch (e) {
        const errorMsg = `GCF Error: Failed to parse JSON response. ${e.toString()}`;
        Logger.log(errorMsg);
        Logger.log(`GCF Raw Response (first 500 chars): ${responseText.substring(0, 500)}`);
        return { success: false, data: null, error: errorMsg, source: 'GCF' };
      }
    } else {
      const errorMsg = `GCF Error: Received HTTP ${responseCode}. Response: ${responseText.substring(0, 500)}`;
      Logger.log(errorMsg);
      return { success: false, data: null, error: errorMsg, source: 'GCF' };
    }
  } catch (e) {
    const errorMsg = `GCF Error: Failed to fetch. ${e.toString()}`;
    Logger.log(errorMsg);
    return { success: false, data: null, error: errorMsg, source: 'GCF' };
  }
}

/**
 * Tests invoking the Market Sentiment Google Cloud Function.
 */
function testInvokeMarketSentimentGCF() {
  const GCF_URL = 'https://us-central1-peppy-cosmos-461901-k8.cloudfunctions.net/marketSentimentAPI';
  const API_KEY_PROPERTY_NAME = 'MARKET_SENTIMENT_API_KEY';
  let apiKey = '';

  try {
    apiKey = PropertiesService.getScriptProperties().getProperty(API_KEY_PROPERTY_NAME);
    if (!apiKey) {
      Logger.log(`Error: API Key '${API_KEY_PROPERTY_NAME}' not found in Script Properties.`);
      return;
    }
  } catch (e) {
    Logger.log(`Error retrieving API Key from Script Properties: ${e.toString()}`);
    return;
  }

  // As we established, the query parameter is not currently used by the GCF.
  // We can send a dummy one or omit it. For this test, let's send a simple one.
  const testQuery = 'test_query_from_gas';
  const fullUrl = `${GCF_URL}?query=${encodeURIComponent(testQuery)}`;

  const options = {
    'method': 'GET',
    'headers': {
      'x-api-key': apiKey
    },
    'muteHttpExceptions': true, // Important to handle non-200 responses without throwing an error
    'contentType': 'application/json'
  };

  Logger.log(`Attempting to call GCF: ${fullUrl}`);

  try {
    const response = UrlFetchApp.fetch(fullUrl, options);
    const responseCode = response.getResponseCode();
    const responseText = response.getContentText();

    Logger.log(`Response Code: ${responseCode}`);
    
    if (responseCode === 200) {
      Logger.log('GCF Invoked Successfully!');
      // Attempt to parse and log a snippet if it's JSON
      try {
        const jsonResponse = JSON.parse(responseText);
        Logger.log(`Response (parsed snippet): Overall Sentiment: ${jsonResponse.overallSentiment || 'N/A'}`);
        // You can log more details or the full responseText if needed for debugging
        // Logger.log('Full Response Text: ' + responseText);
      } catch (e) {
        Logger.log('Response is not valid JSON or does not contain expected fields. Raw response:');
        Logger.log(responseText.substring(0, 500) + (responseText.length > 500 ? '...' : ''));
      }
    } else {
      Logger.log(`Error invoking GCF. Status: ${responseCode}. Response:`);
      Logger.log(responseText);
    }
  } catch (e) {
    Logger.log(`Failed to fetch GCF. Error: ${e.toString()}`);
    Logger.log(`Error details: Name: ${e.name}, Message: ${e.message}, Stack: ${e.stack}`);
  }
}
