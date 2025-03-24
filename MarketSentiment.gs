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
    
    // Retrieve market sentiment data from OpenAI
    const marketSentimentData = retrieveOpenAIMarketSentiment();
    
    // Check if we have valid data
    if (marketSentimentData && marketSentimentData.success) {
      // Extract mentioned stocks from analyst comments
      const mentionedStocks = extractMentionedStocks(marketSentimentData);
      Logger.log(`Found ${mentionedStocks.length} mentioned stocks: ${mentionedStocks.join(', ')}`);
      
      // Return the results
      return {
        success: true,
        message: "Market sentiment data retrieved successfully.",
        data: marketSentimentData,
        mentionedStocks: mentionedStocks,
        timestamp: new Date()
      };
    } else {
      return {
        success: false,
        message: "Failed to retrieve market sentiment data.",
        error: marketSentimentData.error || "Unknown error",
        timestamp: new Date()
      };
    }
  } catch (error) {
    Logger.log(`Error retrieving market sentiment data: ${error}`);
    return {
      success: false,
      message: `Failed to retrieve market sentiment data: ${error}`,
      timestamp: new Date()
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
      if (analyst.mentionedSymbols && Array.isArray(analyst.mentionedSymbols)) {
        analyst.mentionedSymbols.forEach(symbol => {
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
      model: "gpt-4-turbo-preview",
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
      temperature: 0.3,
      max_tokens: 2000
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
    
    const response = UrlFetchApp.fetch("https://api.openai.com/v1/chat/completions", options);
    const responseCode = response.getResponseCode();
    
    if (responseCode !== 200) {
      throw new Error(`OpenAI API returned status code ${responseCode}: ${response.getContentText()}`);
    }
    
    const responseData = JSON.parse(response.getContentText());
    Logger.log("OpenAI API call successful with model: gpt-4-turbo-preview");
    
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
    
    // Try multiple approaches to extract JSON
    let marketSentimentData;
    
    // First, try to extract JSON using regex for JSON object pattern
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        marketSentimentData = JSON.parse(jsonMatch[0]);
        Logger.log("Successfully extracted market sentiment JSON using regex pattern");
      } catch (parseError) {
        Logger.log("Error parsing extracted market sentiment JSON: " + parseError);
      }
    }
    
    // If that fails, try to extract JSON from code blocks
    if (!marketSentimentData) {
      const codeBlockMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (codeBlockMatch && codeBlockMatch[1]) {
        try {
          marketSentimentData = JSON.parse(codeBlockMatch[1].trim());
          Logger.log("Successfully extracted market sentiment JSON from code block");
        } catch (parseError) {
          Logger.log("Error parsing market sentiment JSON from code block: " + parseError);
        }
      }
    }
    
    // If both approaches fail, try to parse the entire content as JSON
    if (!marketSentimentData) {
      try {
        marketSentimentData = JSON.parse(content);
        Logger.log("Successfully parsed entire market sentiment content as JSON");
      } catch (parseError) {
        Logger.log("Error parsing entire market sentiment content as JSON: " + parseError);
        throw new Error("Could not extract JSON from OpenAI response for market sentiment");
      }
    }
    
    return marketSentimentData;
  } catch (error) {
    Logger.log(`Error parsing OpenAI response: ${error}`);
    throw new Error(`Failed to parse OpenAI response: ${error}`);
  }
}

/**
 * Generates a prompt for OpenAI to retrieve market sentiment data
 * @return {String} The prompt for OpenAI
 */
function getOpenAIMarketSentimentPrompt() {
  const currentDate = new Date().toISOString();
  return `
  Provide a comprehensive market sentiment analysis with the following components:

  1. Analyst Commentary: Include comments from at least 5 prominent Wall Street analysts or strategists from the past 24 hours. For each analyst, provide:
     - Name and firm
     - Their specific commentary (direct quotes when possible)
     - Sentiment (Bullish, Neutral, Bearish)
     - Any specific stocks or sectors they mentioned (use ticker symbols)
     - Source of their commentary

  2. Sentiment Indicators: Include at least 5 current market sentiment indicators such as:
     - VIX (current value and recent trend)
     - Put/Call Ratio
     - CNN Fear & Greed Index
     - AAII Investor Sentiment Survey
     - Bullish/Bearish Percentage
     - Any other relevant sentiment metrics
     - For each indicator, provide the current value, interpretation, and source

  Format your response as a valid JSON object with this structure:
  {
    "overallMarketSentiment": "Bullish/Neutral/Bearish",
    "sentimentSummary": "Brief 1-2 sentence summary of overall market sentiment",
    "analysts": [
      {
        "name": "Analyst Name",
        "firm": "Firm Name",
        "commentary": "Direct quote or summary of their commentary",
        "sentiment": "Bullish/Neutral/Bearish",
        "mentionedSymbols": ["AAPL", "MSFT"],
        "source": "Source Name",
        "url": "https://source-url.com"
      }
    ],
    "sentimentIndicators": [
      {
        "name": "Indicator Name",
        "value": "Current value",
        "interpretation": "Brief interpretation",
        "source": "Source Name",
        "url": "https://source-url.com"
      }
    ]
  }

  DO NOT include any explanatory text, apologies, or content outside the JSON format.
  Provide EXACT URLs to specific articles or data sources, not just homepage URLs.
  Current date: ${currentDate}
  `;
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
