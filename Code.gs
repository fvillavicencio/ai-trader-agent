/**
 * AI Trading Agent - Main Script
 * 
 * This script analyzes financial data and sends trading decisions via email.
 * It uses the OpenAI API to analyze market data and generate trading recommendations.
 */

/**
 * Gets the trading analysis from OpenAI
 * This function retrieves all necessary data, generates a prompt,
 * sends it to OpenAI, and returns the cleaned analysis result
 * @return {Object} The trading analysis result from OpenAI
 */
function getOpenAITradingAnalysis() {
  try {
    Logger.log("Getting trading analysis from OpenAI...");
    
    // Retrieve all data with caching
    const allData = retrieveAllData();
    
    // Check for success or status flag
    const isDataSuccessful = allData.success || allData.status === "success";
    if (!isDataSuccessful) {
      // Log the error but continue if possible
      Logger.log("Warning: " + allData.message);
      // Only throw an error if data is completely missing
      if (!allData.marketSentiment || !allData.keyMarketIndicators || 
          (!allData.fundamentalMetrics || (!allData.fundamentalMetrics.success && allData.fundamentalMetrics.status !== "success")) || !allData.macroeconomicFactors) {
        throw new Error("Failed to retrieve essential trading data: " + allData.message);
      }
    }
    
    // Check if fundamental metrics data has any actual data
    if (allData.fundamentalMetrics && 
        (!allData.fundamentalMetrics.metrics || Object.keys(allData.fundamentalMetrics.metrics).length === 0)) {
      throw new Error("Failed to retrieve essential trading data: Fundamental metrics data is empty");
    }
    
    // Cache the allData object for later use in email generation
    try {
      const cache = CacheService.getScriptCache();
      // Convert allData to JSON string and cache it
      // Note: Script cache has a 100KB limit per cached value
      const allDataJson = JSON.stringify(allData);
      
      // Check if the JSON string is too large for the cache (100KB limit)
      if (allDataJson.length > 100000) {
        Logger.log("Warning: allData is too large to cache completely. Caching essential parts only.");
        
        // Create a smaller version with just the essential data
        const essentialData = {
          fundamentalMetrics: allData.fundamentalMetrics,
          timestamp: allData.timestamp
        };
        
        cache.put('allData', JSON.stringify(essentialData), 600); // Cache for 10 minutes
      } else {
        cache.put('allData', allDataJson, 600); // Cache for 10 minutes
      }
      
      Logger.log("Successfully cached allData for later use");
    } catch (cacheError) {
      Logger.log("Warning: Failed to cache allData: " + cacheError);
      // Continue even if caching fails
    }
    
    // Get the prompt template from Prompt.gs
    const promptTemplate = getTradingAnalysisPrompt();
    Logger.log("Retrieved prompt template from Prompt.gs");
    
    // Generate the data retrieval JSON for OpenAI
    const dataRetrievalJson = JsonExport.generateFullJsonDataset(null, false);
    Logger.log("Generated data retrieval JSON for OpenAI");
    
    // Convert the JSON data to a formatted string
    const jsonString = JSON.stringify(dataRetrievalJson, null, 2);
    
    // Combine the prompt template with the JSON data
    const fullPrompt = promptTemplate + "\n\n**Retrieved Data (JSON Format):**\n```json\n" + jsonString + "\n```\n";
    Logger.log("Combined prompt template with JSON data");
    
    // Always send the prompt email before checking cache or submitting to OpenAI
    Logger.log("Sending prompt email before checking cache or submitting to OpenAI...");
    const promptEmailSent = sendPromptEmail(fullPrompt);
    
    if (!promptEmailSent) {
      Logger.log("Warning: Failed to send prompt email, but continuing with OpenAI submission");
    } else {
      Logger.log("Prompt email sent successfully");
    }
    
    // Add a small delay to ensure the prompt email is sent before continuing
    Utilities.sleep(1000);
    
    // Check cache after sending the prompt email
    const cache = CacheService.getScriptCache();
    const cachedAnalysis = cache.get('OPENAI_ANALYSIS_CACHE');
    
    if (cachedAnalysis) {
      Logger.log("Using cached OpenAI analysis (valid for 10 minutes)");
      return JSON.parse(cachedAnalysis);
    }
    
    // Check if DEBUG_MODE is enabled - do this earlier in the function
    const scriptProperties = PropertiesService.getScriptProperties();
    const debugMode = scriptProperties.getProperty('DEBUG_MODE') === 'true';
    
    // Always send the prompt email in debug mode
    if (debugMode) {
      Logger.log("Debug mode enabled - sending prompt email regardless of settings");
      // Force sending the prompt email by directly calling sendEmail
      const adminEmail = scriptProperties.getProperty('ADMIN_EMAIL');
      if (adminEmail) {
        const timeZone = scriptProperties.getProperty('TIME_ZONE') || 'America/New_York';
        const currentDate = new Date();
        const formattedDate = Utilities.formatDate(currentDate, timeZone, "MMMM dd, yyyy 'at' hh:mm a 'ET'");
        
        // Get detailed information about top holdings for the debug email
        let topHoldingsInfo = "";
        try {
          // Get top holdings from ETFs
          const topHoldings = getTopIndexHoldings();
          
          // Get the original ETF holdings data
          const sp500Data = SP500Analyzer();
          let etfData;
          try {
            etfData = typeof sp500Data.body === 'string' ? JSON.parse(sp500Data.body) : sp500Data.body;
          } catch (e) {
            Logger.log(`Error parsing SP500 data: ${e}`);
            etfData = null;
          }
          
          // Format the top holdings information
          topHoldingsInfo = `
            <h3 style="color: #1976d2; margin-top: 20px;">Top ETF Holdings (${topHoldings.length} unique symbols)</h3>
            <p><strong>All unique top holdings:</strong> ${topHoldings.join(', ')}</p>
          `;
          
          // Add ETF holdings details if available
          if (etfData && etfData.etfHoldings && Array.isArray(etfData.etfHoldings)) {
            topHoldingsInfo += `<h4>ETF Holdings Details:</h4><ul>`;
            
            etfData.etfHoldings.forEach(etf => {
              if (etf.symbol && etf.holdings && Array.isArray(etf.holdings)) {
                topHoldingsInfo += `<li><strong>${etf.symbol} (${etf.indexName || 'Unknown'})</strong> Top 5 Holdings:<ol>`;
                
                etf.holdings.slice(0, 5).forEach((holding) => {
                  topHoldingsInfo += `<li>${holding.symbol} (${holding.name || 'Unknown'}) - Weight: ${holding.weight}</li>`;
                });
                
                topHoldingsInfo += `</ol></li>`;
              }
            });
            
            topHoldingsInfo += `</ul>`;
          }
        } catch (e) {
          topHoldingsInfo = `<p>Error retrieving top holdings information: ${e}</p>`;
          Logger.log(`Error getting top holdings info for debug email: ${e}`);
        }
        
        // Create HTML body with the prompt and top holdings information
        const htmlBody = `
          <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 5px;">
            <h2 style="color: #1976d2;">Market Pulse Daily OpenAI Prompt (Debug Mode)</h2>
            <p><strong>Date:</strong> ${formattedDate}</p>
            <p><strong>Prompt Length:</strong> ${fullPrompt.length} characters</p>
            
            ${topHoldingsInfo}
            
            <h3 style="color: #1976d2; margin-top: 20px;">Full Prompt</h3>
            <div style="background-color: #f5f5f5; padding: 15px; border-left: 4px solid #1976d2; margin: 15px 0; font-family: monospace; white-space: pre-wrap; overflow-x: auto; max-height: 500px; overflow-y: auto;">
              ${fullPrompt.replace(/</g, '&lt;').replace(/>/g, '&gt;')}
            </div>
            <p style="font-size: 12px; color: #757575; margin-top: 30px;">
              This is an automated email from Market Pulse Daily containing the prompt that would be sent to OpenAI in debug mode.
            </p>
          </div>
        `;
        
        // Send email directly
        sendEmail("[DEBUG] OpenAI Prompt with Top Holdings", htmlBody, adminEmail, false, false);
        Logger.log("Debug mode prompt email with top holdings sent directly to admin");
      } else {
        Logger.log("No admin email configured. Debug mode prompt email not sent.");
      }
      
      // Generate debug response
      Logger.log("Debug mode enabled - using generateDebugOpenAIResponse");
      const debugResponse = generateDebugOpenAIResponse();
      return debugResponse;
    }
    
    // Get the OpenAI API key
    const apiKey = getOpenAIApiKey();
    
    // Send the prompt to OpenAI
    Logger.log("Sending prompt to OpenAI...");
    
    const response = sendPromptToOpenAI(fullPrompt, apiKey);
    const content = extractContentFromResponse(response);
    Logger.log("Received response from OpenAI");
    
    // Parse the analysis result
    Logger.log("Parsing analysis result");
    const analysisJson = cleanAnalysisResult(content);
    
    // Cache the result for 10 minutes (600 seconds)
    Logger.log("Caching OpenAI analysis");
    cache.put('OPENAI_ANALYSIS_CACHE', JSON.stringify(analysisJson), 600);
    Logger.log("Cached OpenAI analysis for 10 minutes");
    
    return analysisJson;
  } catch (error) {
    Logger.log("Error in getOpenAITradingAnalysis: " + error);
    throw new Error("Failed to get OpenAI trading analysis: " + error);
  }
}

/**
 * Main function to run the trading analysis
 */
function runTradingAnalysis() {
  try {
    Logger.log("Starting trading analysis...");
    
    // Get the analysis from OpenAI (will use cache if available)
    const analysisJson = getOpenAITradingAnalysis();
    
    // Save the JSON response to Google Drive for debugging
    const jsonFileName = "openai_response.json";
    // Get folder name from script properties instead of hardcoding
    const props = PropertiesService.getScriptProperties();
    const folderName = props.getProperty('GOOGLE_FOLDER_NAME') || "Market Pulse Daily";
    const jsonFileUrl = saveJsonToGoogleDrive(analysisJson, jsonFileName, folderName);
    Logger.log(`OpenAI response saved to Google Drive: ${jsonFileUrl} in folder: ${folderName}`);

    // Retrieve Script Property to determine which template to use
    const scriptProperties = PropertiesService.getScriptProperties();
    const newTemplate = (scriptProperties.getProperty('USE_NEW_TEMPLATE') === 'true') ? true : false;
    
    // Send the trading decision email - only call this once
    sendTradeDecisionEmail(analysisJson, newTemplate);
    
    Logger.log("Trading analysis completed successfully.");
    return "Trading analysis completed successfully.";
  } catch (error) {
    Logger.log("Error in runTradingAnalysis: " + error);
    return "Error: " + error;
  }
}

/**
 * Clears the OpenAI analysis cache
 * Use this function to force a fresh analysis from OpenAI
 * 
 * @return {string} Status message
 */
function clearOpenAIAnalysisCache() {
  try {
    const cache = CacheService.getScriptCache();
    cache.remove('OPENAI_ANALYSIS_CACHE');
    Logger.log("OpenAI analysis cache cleared successfully");
    return "OpenAI analysis cache cleared successfully";
  } catch (error) {
    Logger.log("Error clearing OpenAI analysis cache: " + error);
    return "Error clearing OpenAI analysis cache: " + error;
  }
}

/**
 * Test function to run the trading analysis and display the result
 */
function testTradingAnalysis() {
  Logger.log("========== STARTING TEST TRADING ANALYSIS ==========");
  Logger.log("IMPORTANT: CLEARING ALL CACHES NOW");
  
  // Force cache clearing directly
  try {
    const scriptCache = CacheService.getScriptCache();
    const documentCache = CacheService.getDocumentCache();
    
    // List of critical cache keys to clear
    const keysToForceClean = [
      'MARKET_SENTIMENT_DATA',
      'KEY_MARKET_INDICATORS',
      'GEOPOLITICAL_RISKS_DATA',
      'GEOPOLITICAL_RISKS',
      'OPENAI_ANALYSIS_CACHE',
      'OPENAI_ANALYSIS',
      'SP500_ANALYSIS'
    ];
    
    // Clear each key individually and log the result
    keysToForceClean.forEach(key => {
      scriptCache.remove(key);
      if (documentCache) documentCache.remove(key);
      Logger.log(`CACHE CLEARED: ${key}`);
    });
    
    Logger.log("CACHE CLEARING COMPLETE - VERIFIED");
  } catch (error) {
    Logger.log(`ERROR CLEARING CACHE: ${error}`);
  }
  
  // Add a small delay to ensure cache clearing completes
  Utilities.sleep(10);
  
  // Run the trading analysis
  Logger.log("Running test trading analysis...");
  const result = runTradingAnalysis();
  
  Logger.log("========== TEST TRADING ANALYSIS COMPLETE ==========");
  return result;
}

/**
 * Parses the analysis result from OpenAI to extract the decision and justification
 * @param {Object} analysisResult - The analysis result from OpenAI
 * @return {Object} An object containing the decision and justification
 */
function parseAnalysisResult(analysisResult) {
  try {
    // Check if analysisResult is valid
    if (!analysisResult || typeof analysisResult !== 'object') {
      Logger.log('Invalid analysis result format');
      return { decision: 'HOLD', justification: 'Invalid analysis result format' };
    }
    
    // Extract the decision and justification
    const decision = analysisResult.tradingDecision || 'HOLD';
    const justification = analysisResult.justification || 'No justification provided';
    
    return { decision, justification };
  } catch (error) {
    Logger.log('Error parsing analysis result: ' + error);
    return { decision: 'HOLD', justification: 'Error parsing analysis result: ' + error };
  }
}

/**
 * Calculates the next analysis time based on the current time and schedule configuration
 * @param {Date} currentTime - The current time
 * @return {Date} - The next scheduled analysis time
 */
function calculateNextAnalysisTime(currentTime) {
  try {
    // Get the schedule configuration from Config.gs
    const morningHour = MORNING_SCHEDULE_HOUR;
    const morningMinute = MORNING_SCHEDULE_MINUTE;
    const middayHour = MIDDAY_SCHEDULE_HOUR;
    const middayMinute = MIDDAY_SCHEDULE_MINUTE;
    const eveningHour = EVENING_SCHEDULE_HOUR;
    const eveningMinute = EVENING_SCHEDULE_MINUTE;
    
    // Create a new Date object for the next analysis time
    const nextTime = new Date(currentTime);
    
    // Get the current hour and minute
    const currentHour = currentTime.getHours();
    const currentMinute = currentTime.getMinutes();
    
    // Determine which schedule is next
    if (currentHour < morningHour || (currentHour === morningHour && currentMinute < morningMinute)) {
      // Next analysis is this morning
      nextTime.setHours(morningHour, morningMinute, 0, 0);
    } else if (currentHour < middayHour || (currentHour === middayHour && currentMinute < middayMinute)) {
      // Next analysis is midday
      nextTime.setHours(middayHour, middayMinute, 0, 0);
    } else if (currentHour < eveningHour || (currentHour === eveningHour && currentMinute < eveningMinute)) {
      // Next analysis is this evening
      nextTime.setHours(eveningHour, eveningMinute, 0, 0);
    } else {
      // Next analysis is tomorrow morning
      nextTime.setDate(nextTime.getDate() + 1);
      nextTime.setHours(morningHour, morningMinute, 0, 0);
    }
    
    return nextTime;
  } catch (error) {
    Logger.log('Error calculating next analysis time: ' + error);
    // Return a default time (24 hours from now) if there's an error
    const defaultTime = new Date(currentTime);
    defaultTime.setDate(defaultTime.getDate() + 1);
    return defaultTime;
  }
}

/**
 * Gets the OpenAI API key from script properties
 * 
 * @return {string} - The OpenAI API key
 */
function getOpenAIApiKey() {
  const scriptProperties = PropertiesService.getScriptProperties();
  const apiKey = scriptProperties.getProperty('OPENAI_API_KEY');
  
  if (!apiKey) {
    throw new Error("OpenAI API key not found in script properties");
  }
  
  return apiKey;
}

/**
 * Sends a prompt to the OpenAI API and returns the response
 * 
 * @param {string} prompt - The prompt to send to OpenAI
 * @param {string} apiKey - The OpenAI API key
 * @return {Object} - The response from OpenAI
 */
function sendPromptToOpenAI(prompt, apiKey) {
  try {
    // OpenAI API endpoint
    const apiUrl = "https://api.openai.com/v1/chat/completions";
    
    // Request payload
    const payload = {
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a professional financial analyst specializing in market analysis and trading recommendations. Please provide your analysis in valid JSON format."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.3,
      max_tokens: 4000
    };
    
    // Request options
    const options = {
      method: "post",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + apiKey
      },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };
    
    // Send the request
    const response = UrlFetchApp.fetch(apiUrl, options);
    const responseCode = response.getResponseCode();
    
    // Check if the request was successful
    if (responseCode !== 200) {
      const errorText = response.getContentText();
      Logger.log(`OpenAI API error (${responseCode}): ${errorText}`);
      throw new Error(`OpenAI API returned error ${responseCode}: ${errorText}`);
    }
    
    // Parse the response
    const jsonResponse = JSON.parse(response.getContentText());
    
    // Validate the response structure
    if (!jsonResponse.choices || !Array.isArray(jsonResponse.choices) || 
        jsonResponse.choices.length === 0 || !jsonResponse.choices[0].message.content) {
      throw new Error('Invalid response structure from OpenAI');
    }
    
    return jsonResponse;
  } catch (error) {
    Logger.log('Error in sendPromptToOpenAI: ' + error);
    throw new Error('Failed to get response from OpenAI: ' + error);
  }
}

/**
 * Extracts the content from the OpenAI API response
 * 
 * @param {Object} response - The response from OpenAI
 * @return {string} - The content of the response
 */
function extractContentFromResponse(response) {
  try {
    if (!response || typeof response !== 'object') {
      throw new Error('Invalid response format: expected an object');
    }

    if (!response.choices || !Array.isArray(response.choices) || response.choices.length === 0) {
      throw new Error('Invalid response format: missing choices array');
    }

    const content = response.choices[0].message.content;
    if (!content || typeof content !== 'string') {
      throw new Error('Invalid response format: content is not a string');
    }

    return content;
  } catch (error) {
    Logger.log('Error extracting content from response: ' + error);
    throw new Error('Failed to extract content from OpenAI response: ' + error);
  }
}

/**
 * Cleans and parses the analysis result from OpenAI
 * 
 * @param {string} content - The content of the response from OpenAI
 * @return {Object} - The cleaned and parsed analysis result
 */
function cleanAnalysisResult(content) {
  try {
    // Save the raw response for debugging
    saveToGoogleDrive('raw_openai_response.json', content);

    // Remove markdown code fences if present
    let cleanedContent = content;
    if (cleanedContent.trim().startsWith("```")) {
      cleanedContent = cleanedContent.trim()
        .replace(/^```(?:json)?\s*/, '')
        .replace(/\s*```$/, '');
    }

    // First, try to parse the cleaned content
    try {
      const parsed = JSON.parse(cleanedContent);
      validateAnalysisStructure(parsed);
      return parsed;
    } catch (e) {
      Logger.log("Parsing failed on cleaned content: " + e);

      // Try minimal cleanup: remove trailing commas and comments
      let minimalCleaned = cleanedContent
        .replace(/,\s*\}\s*/g, '}')
        .replace(/,\s*\]\s*/g, ']')
        .replace(/\}\s*,\s*\}\s*/g, '}')
        .replace(/\]\s*,\s*\]\s*/g, ']')
        // Remove comments and trailing content
        .replace(/\/\/.*?\n/g, '\n')
        .replace(/\/\*.*?\*\//g, '')
        .replace(/\s*\}\s*\]\s*/g, ']')
        .replace(/\s*\]\s*\}\s*/g, '}');
      saveToGoogleDrive('minimally_cleaned_openai_response.json', minimalCleaned);

      try {
        const parsed2 = JSON.parse(minimalCleaned);
        validateAnalysisStructure(parsed2);
        return parsed2;
      } catch (e2) {
        Logger.log("Parsing failed after minimal cleanup: " + e2);

        // Try more aggressive cleanup: fix common JSON issues
        let aggressiveCleaned = minimalCleaned
          // Fix missing commas between properties
          .replace(/(["']\s*:\s*[^,\}\[]+)(["']\s*:\s*[^,\}\[]+)/g, '$1,$2')
          // Fix missing commas in arrays
          .replace(/(["']\s*\]\s*[^,\}\[]+)/g, '$1,')
          // Fix missing commas between array elements
          .replace(/(["']\s*\]\s*[^,\}\[]+)/g, '$1,')
          // Fix missing quotes around keys
          .replace(/([{,]\s*)([^"'\{\}\[\]\s,]+)(\s*:\s*)/g, '$1"$2"$3')
          // Fix missing quotes around string values
          .replace(/([{,]\s*)([^"'\{\}\[\]\s,]+)(\s*[\},\]])/g, '$1"$2"$3');
        saveToGoogleDrive('aggressively_cleaned_openai_response.json', aggressiveCleaned);

        try {
          const parsed3 = JSON.parse(aggressiveCleaned);
          validateAnalysisStructure(parsed3);
          return parsed3;
        } catch (e3) {
          Logger.log("Parsing failed after aggressive cleanup: " + e3);
          
          // Try to extract JSON from within text
          const jsonMatch = aggressiveCleaned.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            try {
              const extractedJson = JSON.parse(jsonMatch[0]);
              validateAnalysisStructure(extractedJson);
              return extractedJson;
            } catch (e4) {
              Logger.log("Failed to parse extracted JSON: " + e4);
            }
          }

          throw new Error("Failed to parse OpenAI response after multiple attempts. " + 
            "Please check the saved JSON files in Google Drive for debugging.");
        }
      }
    }
  } catch (error) {
    Logger.log('Error in cleanAnalysisResult: ' + error);
    throw new Error('Failed to clean and parse OpenAI response: ' + error);
  }
}

/**
 * Validates the structure of the analysis object
 * @param {Object} analysis - The parsed analysis object
 * @throws {Error} If the analysis structure is invalid
 */
function validateAnalysisStructure(analysis) {
  if (!analysis || typeof analysis !== 'object') {
    throw new Error('Invalid analysis object');
  }

  const requiredKeys = ['decision', 'summary', 'analysis'];
  for (const key of requiredKeys) {
    if (!analysis[key]) {
      throw new Error(`Missing required key: ${key}`);
    }
  }

  // Validate analysis substructure
  if (!analysis.analysis) {
    throw new Error('Missing required analysis section');
  }

  const analysisKeys = ['marketSentiment', 'marketIndicators', 'fundamentalMetrics', 'macroeconomicFactors'];
  for (const key of analysisKeys) {
    if (!analysis.analysis[key]) {
      Logger.log(`Warning: Missing optional analysis section: ${key}`);
      continue;
    }

    // Validate arrays have proper structure
    const arrayKeys = {
      marketSentiment: 'analysts',
      marketIndicators: 'upcomingEvents',
      fundamentalMetrics: undefined, // fundamentalMetrics is an array itself
      macroeconomicFactors: 'geopoliticalRisks.regions'
    };

    if (arrayKeys[key]) {
      const path = arrayKeys[key].split('.');
      let obj = analysis.analysis[key];
      for (const p of path) {
        if (!obj[p]) {
          Logger.log(`Warning: Missing optional array: ${key}.${p}`);
          break;
        }
        obj = obj[p];
      }
      if (obj && !Array.isArray(obj)) {
        Logger.log(`Warning: ${key}.${path.join('.')} is not an array`);
      }
    }
  }
}

/**
 * Test function to generate and email the trading analysis prompt without sending it to OpenAI
 * This is useful for reviewing the prompt before making actual API calls
 * @return {String} Status message
 */
function testGenerateAndEmailPrompt() {
  try {
    Logger.log("Starting prompt generation test...");
    
    // Retrieve all data with caching
    const allData = retrieveAllData();
    
    // Check if data retrieval was successful
    // Note: fundamentalMetricsData uses status:"success" instead of success:true
    if (!allData.success && !allData.status) {
      // Log the error but continue if possible
      Logger.log("Warning: " + allData.message);
      // Only throw an error if data is completely missing
      if (!allData.marketSentiment || !allData.keyMarketIndicators || 
          (!allData.fundamentalMetrics || (!allData.fundamentalMetrics.success && allData.fundamentalMetrics.status !== "success")) || !allData.macroeconomicFactors) {
        throw new Error("Failed to retrieve essential trading data: " + allData.message);
      }
    }
    
    Logger.log("Retrieved trading data with warnings or success");
    
    // Get the prompt template from Prompt.gs
    const promptTemplate = getTradingAnalysisPrompt();
    Logger.log("Retrieved prompt template from Prompt.gs");
    
    // Generate the data retrieval JSON for OpenAI
    const dataRetrievalJson = JsonExport.generateFullJsonDataset(null, false);
    Logger.log("Generated data retrieval JSON for OpenAI");
    
    // Convert the JSON data to a formatted string
    const jsonString = JSON.stringify(dataRetrievalJson, null, 2);
    
    // Combine the prompt template with the JSON data
    const fullPrompt = promptTemplate + "\n\n**Retrieved Data (JSON Format):**\n```json\n" + jsonString + "\n```\n";
    Logger.log("Combined prompt template with JSON data");
    
    // Send the prompt via email for review
    sendPromptEmail(fullPrompt);
    Logger.log("Sent prompt email for review");
    
    // Create a sample JSON response for testing the HTML template
    const sampleResponse = createSampleJsonResponse();
    
    // Save the sample JSON response to Google Drive
    const jsonFileName = "sample_openai_response.json";
    const jsonFileUrl = saveJsonToGoogleDrive(sampleResponse, jsonFileName);
    Logger.log(`Sample response saved to Google Drive: ${jsonFileUrl}`);
    
    // Generate and send a test email with the sample response
    sendTradeDecisionEmail(sampleResponse);
    Logger.log("Sent test email with sample response");
    
    // Display the first 500 characters of the prompt in the logs
    const previewLength = 500;
    const promptPreview = fullPrompt.length > previewLength 
      ? fullPrompt.substring(0, previewLength) + "..." 
      : fullPrompt;
    
    Logger.log("Prompt preview: " + promptPreview);
    
    return "Prompt generation test completed successfully.";
  } catch (error) {
    Logger.log("Error in testGenerateAndEmailPrompt: " + error);
    return "Error: " + error;
  }
}

/**
 * Creates a sample JSON response for testing the HTML template
 * @return {Object} Sample JSON response
 */
function createSampleJsonResponse() {
  return {
    "timestamp": new Date().toISOString(),
    "decision": "Watch for Better Price Action",
    "summary": "Given the current market volatility, particularly in the tech sector, and mixed macroeconomic signals, a cautious approach is recommended.",
    "justification": "The decision to 'Watch for Better Price Action' is based on the current market volatility, particularly in the tech sector, and the mixed macroeconomic signals. The presence of geopolitical tensions and the cautious stance of analysts suggest waiting for clearer market direction before making significant moves.",
    "analysis": {
      "marketSentiment": {
        "overall": "Mixed sentiment with a lean towards caution due to volatility in the tech sector and economic uncertainties.",
        "analysts": [
          {
            "name": "Dan Nathan",
            "quote": "The tech sector remains volatile, but I see potential in select AI-driven companies.",
            "source": "CNBC",
            "mentionedStocks": ["AAPL", "NVDA"]
          },
          {
            "name": "Josh Brown",
            "quote": "Markets are showing resilience despite economic uncertainties, leaning towards a more bullish stance.",
            "source": "Financial Times",
            "mentionedStocks": ["MSFT", "AMZN"]
          },
          {
            "name": "Steve Weiss",
            "quote": "I'm cautious about the current market, particularly with the overheated real estate sector.",
            "source": "Bloomberg"
          },
          {
            "name": "Joe Terranova",
            "quote": "Energy stocks are undervalued and present a good buying opportunity.",
            "source": "MarketWatch",
            "mentionedStocks": ["XOM", "CVX"]
          },
          {
            "name": "Dan Niles",
            "quote": "The semiconductor sector could face challenges from regulatory pressures.",
            "source": "Reuters",
            "mentionedStocks": ["INTC", "AMD"]
          },
          {
            "name": "Mohamed El-Erian",
            "quote": "Inflation concerns are overstated; the economy is on a stable path.",
            "source": "The Wall Street Journal"
          }
        ],
        "lastUpdated": "2025-03-26 15:31"
      },
      "keyMarketIndicators": {
        "fearAndGreedIndex": {
          "value": 29,
          "interpretation": "Market sentiment is leaning towards fear.",
          "source": "CNN",
          "lastUpdated": "2025-03-26 17:02"
        },
        "vix": {
          "value": 18.33,
          "trend": "Increasing",
          "interpretation": "Volatility indicator showing market fear and uncertainty.",
          "source": "CBOE",
          "lastUpdated": "2025-03-26 16:15"
        },
        "lastUpdated": "2025-03-26 17:02"
      },
      "fundamentalMetrics": [
        {
          "symbol": "SPY",
          "name": "SPDR S&P 500 ETF Trust",
          "price": "486.25",
          "priceChange": "+1.25 (+0.26%)",
          "marketCap": "N/A",
          "peRatio": "24.5",
          "beta": "1.0",
          "summary": "SPY shows slight positive movement with stable fundamentals.",
          "lastUpdated": "2025-03-26 16:30"
        },
        {
          "symbol": "QQQ",
          "name": "Invesco QQQ Trust",
          "price": "480.80",
          "priceChange": "+1.60 (+0.33%)",
          "marketCap": "N/A",
          "peRatio": "31.2",
          "beta": "1.2",
          "summary": "QQQ continues to show strength in the tech sector despite broader market concerns.",
          "lastUpdated": "2025-03-26 16:30"
        },
        {
          "symbol": "AAPL",
          "name": "Apple Inc",
          "price": "175.45",
          "priceChange": "-0.85 (-0.48%)",
          "marketCap": "2.75T",
          "peRatio": "28.9",
          "pegRatio": "2.8",
          "beta": "1.3",
          "summary": "Apple faces slight pressure amid broader tech sector volatility.",
          "lastUpdated": "2025-03-26 16:30"
        },
        {
          "symbol": "MSFT",
          "name": "Microsoft Corporation",
          "price": "425.22",
          "priceChange": "+2.15 (+0.51%)",
          "marketCap": "3.16T",
          "peRatio": "36.5",
          "pegRatio": "2.2",
          "beta": "0.9",
          "summary": "Microsoft shows resilience with strong cloud segment performance.",
          "lastUpdated": "2025-03-26 16:30"
        },
        {
          "symbol": "NVDA",
          "name": "NVIDIA Corporation",
          "price": "925.15",
          "priceChange": "+15.30 (+1.68%)",
          "marketCap": "2.28T",
          "peRatio": "78.4",
          "pegRatio": "1.9",
          "beta": "1.7",
          "summary": "NVIDIA continues its strong performance driven by AI demand.",
          "lastUpdated": "2025-03-26 16:30"
        },
        {
          "symbol": "GOOGL",
          "name": "Alphabet Inc",
          "price": "152.80",
          "priceChange": "+0.65 (+0.43%)",
          "marketCap": "1.92T",
          "peRatio": "26.2",
          "pegRatio": "1.5",
          "beta": "1.1",
          "summary": "Google parent Alphabet shows steady growth with strong ad revenue.",
          "lastUpdated": "2025-03-26 16:30"
        }
      ],
      "macroeconomicFactors": {
        "treasuryYields": {
          "threeMonth": "4.33",
          "oneYear": "4.11",
          "twoYear": "4.04",
          "tenYear": "4.34",
          "thirtyYear": "4.66",
          "yieldCurve": "flat",
          "interpretation": "The flat yield curve suggests market uncertainty about future economic conditions."
        },
        "inflation": {
          "cpiHeadline": "2.82",
          "cpiCore": "3.12",
          "pceHeadline": "2.51",
          "pceCore": "2.65",
          "trend": "Moderating",
          "outlook": "Inflation appears to be moderating toward the Fed's target."
        }
      },
      "geopoliticalRisks": [
        {
          "region": "Asia-Pacific, Global",
          "level": "High",
          "description": "Escalating tensions between the US and China over trade policies and military activities in the South China Sea.",
          "source": "Reuters",
          "lastUpdated": "2025-03-26 14:15"
        },
        {
          "region": "Europe, Global",
          "level": "Severe",
          "description": "Ongoing military conflict between Russia and Ukraine, causing global energy supply concerns and sanctions.",
          "source": "Bloomberg",
          "lastUpdated": "2025-03-26 15:30"
        },
        {
          "region": "Middle East",
          "level": "Moderate",
          "description": "Rising tensions in the Middle East, particularly involving Iran's nuclear program and relations with Israel.",
          "source": "Financial Times",
          "lastUpdated": "2025-03-26 13:45"
        }
      ],
      "geopoliticalOverview": "High geopolitical risks from US-China tensions, the Russia-Ukraine conflict, and Middle East tensions may impact market stability."
    }
  };
}

/**
 * Gets the schedule configuration from Config.gs
 * 
 * @return {Object} - The schedule configuration object
 */
function getScheduleConfig() {
  return {
    morningHour: MORNING_SCHEDULE_HOUR || 9,
    morningMinute: MORNING_SCHEDULE_MINUTE || 15,
    eveningHour: EVENING_SCHEDULE_HOUR || 18,
    eveningMinute: EVENING_SCHEDULE_MINUTE || 0
  };
}

/**
 * Scheduled function to run the trading analysis at 9:15 AM ET
 */
function morningTradingAnalysis() {
  try {
    Logger.log("Running morning trading analysis...");
    runTradingAnalysis();
  } catch (error) {
    Logger.log("Error in morningTradingAnalysis: " + error);
    sendErrorEmail("Morning Trading Analysis Error", error.toString());
  }
}

/**
 * Scheduled function to run the trading analysis at 6:00 PM ET
 */
function eveningTradingAnalysis() {
  try {
    Logger.log("Running evening trading analysis...");
    runTradingAnalysis();
  } catch (error) {
    Logger.log("Error in eveningTradingAnalysis: " + error);
    sendErrorEmail("Evening Trading Analysis Error", error.toString());
  }
}

/**
 * Scheduled function to run the trading analysis at 9:15 AM ET on Mondays
 */
function mondayMorningTradingAnalysis() {
  try {
    Logger.log("Running Monday morning trading analysis...");
    runTradingAnalysis();
  } catch (error) {
    Logger.log("Error in mondayMorningTradingAnalysis: " + error);
    sendErrorEmail("Monday Morning Trading Analysis Error", error.toString());
  }
}

/**
 * Saves JSON data to a file in Google Drive
 * 
 * @param {Object} jsonData - The JSON data to save
 * @param {String} fileName - The name of the file to save
 * @param {String} [customFolderName] - Optional custom folder name (defaults to "Trading Analysis Emails")
 * @return {String} The URL of the saved file
 */
function saveJsonToGoogleDrive(jsonData, fileName, customFolderName) {
  try {
    // Create or get the folder
    const folderName = customFolderName || "Trading Analysis Emails";
    Logger.log(`Saving file to folder: ${folderName}`);
    const folder = getOrCreateFolder(folderName);
    
    // Check if file already exists and delete it
    const existingFiles = folder.getFilesByName(fileName);
    while (existingFiles.hasNext()) {
      const file = existingFiles.next();
      file.setTrashed(true);
      Logger.log(`Deleted existing file: ${fileName}`);
    }
    
    // Create the JSON file
    const jsonContent = JSON.stringify(jsonData, null, 2);
    const file = folder.createFile(fileName, jsonContent, MimeType.PLAIN_TEXT);
    
    Logger.log(`JSON saved to Google Drive: ${fileName} in folder: ${folderName}`);
    return file.getUrl();
  } catch (error) {
    Logger.log(`Error saving JSON to Google Drive: ${error}`);
    return null;
  }
}

/**
 * Gets or creates a folder in Google Drive
 * @param {String} folderName - The name of the folder
 * @return {Folder} The folder object
 */
function getOrCreateFolder(folderName) {
  try {
    // Get the root folder
    const root = DriveApp.getRootFolder();
    
    // Check if folder already exists
    const folderIterator = root.getFoldersByName(folderName);
    if (folderIterator.hasNext()) {
      Logger.log(`Found existing folder: ${folderName}`);
      return folderIterator.next();
    }
    
    // Create the folder if it doesn't exist
    const folder = root.createFolder(folderName);
    Logger.log(`Created new folder: ${folderName}`);
    return folder;
  } catch (error) {
    Logger.log(`Error getting or creating folder: ${error}`);
    throw error;
  }
}

/**
 * Function sendTradeDecisionEmail removed as redundant. Now only defined in Email.gs
 */

/**
 * Calculates the next scheduled analysis time based on the current time
 * 
 * @param {Date} currentTime - The current time
 * @return {Date} The next scheduled analysis time
 */
function getNextScheduledAnalysisTime(currentTime) {
  try {
    // Get the schedule configuration
    const scheduleConfig = getScheduleConfig();
    
    // Create a new date object to avoid modifying the input
    const nextTime = new Date(currentTime);
    
    // Get the current day of week (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
    const currentDay = nextTime.getDay();
    const currentHour = nextTime.getHours();
    const currentMinute = nextTime.getMinutes();
    
    // Morning schedule: Monday-Friday at 8:50 AM
    // Evening schedule: Sunday-Thursday at 6:00 PM
    
    // Check if we're before the morning schedule today (and it's a weekday)
    if (currentDay >= 1 && currentDay <= 5 && 
        (currentHour < scheduleConfig.morningHour || 
         (currentHour === scheduleConfig.morningHour && currentMinute < scheduleConfig.morningMinute))) {
      // Set to today's morning schedule
      nextTime.setHours(scheduleConfig.morningHour, scheduleConfig.morningMinute, 0, 0);
      return nextTime;
    }
    
    // Check if we're before the evening schedule today (and it's Sunday-Thursday)
    if (currentDay >= 0 && currentDay <= 4 && 
        (currentHour < scheduleConfig.eveningHour || 
         (currentHour === scheduleConfig.eveningHour && currentMinute < scheduleConfig.eveningMinute))) {
      // Set to today's evening schedule
      nextTime.setHours(scheduleConfig.eveningHour, scheduleConfig.eveningMinute, 0, 0);
      return nextTime;
    }
    
    // If it's Friday after morning schedule or Saturday, next is Monday morning
    if ((currentDay === 5 && (currentHour > scheduleConfig.morningHour || 
                            (currentHour === scheduleConfig.morningHour && currentMinute >= scheduleConfig.morningMinute))) || 
        currentDay === 6) {
      // Calculate days until next Monday
      const daysUntilMonday = (currentDay === 5) ? 3 : 1;
      nextTime.setDate(nextTime.getDate() + daysUntilMonday);
      nextTime.setHours(scheduleConfig.morningHour, scheduleConfig.morningMinute, 0, 0);
      return nextTime;
    }
    
    // If it's a weekday after morning but before evening, next is evening
    if (currentDay >= 0 && currentDay <= 4 && 
        (currentHour > scheduleConfig.morningHour || 
         (currentHour === scheduleConfig.morningHour && currentMinute >= scheduleConfig.morningMinute))) {
      // Set to today's evening schedule
      nextTime.setHours(scheduleConfig.eveningHour, scheduleConfig.eveningMinute, 0, 0);
      return nextTime;
    }
    
    // Otherwise, next is tomorrow morning (if it's a weekday)
    nextTime.setDate(nextTime.getDate() + 1);
    const nextDay = nextTime.getDay();
    
    // If tomorrow is a weekend, adjust to Monday
    if (nextDay === 0 || nextDay === 6) {
      const daysUntilMonday = (nextDay === 0) ? 1 : 2;
      nextTime.setDate(nextTime.getDate() + daysUntilMonday);
    }
    
    // Set to morning schedule
    nextTime.setHours(scheduleConfig.morningHour, scheduleConfig.morningMinute, 0, 0);
    return nextTime;
  } catch (error) {
    Logger.log(`Error in getNextScheduledAnalysisTime: ${error}`);
    // Return a default time (24 hours from now)
    const defaultNext = new Date(currentTime);
    defaultNext.setDate(defaultNext.getDate() + 1);
    return defaultNext;
  }
}

/**
 * Gets the schedule configuration from script properties or defaults
 * 
 * @return {Object} The schedule configuration
 */
function getScheduleConfig() {
  try {
    // Get script properties
    const props = PropertiesService.getScriptProperties();
    
    // Get schedule configuration from properties or use defaults
    const morningHour = parseInt(props.getProperty('MORNING_SCHEDULE_HOUR') || '8');
    const morningMinute = parseInt(props.getProperty('MORNING_SCHEDULE_MINUTE') || '50');
    const eveningHour = parseInt(props.getProperty('EVENING_SCHEDULE_HOUR') || '18');
    const eveningMinute = parseInt(props.getProperty('EVENING_SCHEDULE_MINUTE') || '0');
    
    return {
      morningHour,
      morningMinute,
      eveningHour,
      eveningMinute
    };
  } catch (error) {
    Logger.log(`Error getting schedule config: ${error}`);
    // Return default schedule
    return {
      morningHour: 8,
      morningMinute: 50,
      eveningHour: 18,
      eveningMinute: 0
    };
  }
}
