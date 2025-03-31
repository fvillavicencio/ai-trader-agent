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
    
    if (!allData.success && !allData.status) {
      // Log the error but continue if possible
      Logger.log("Warning: " + allData.message);
      // Only throw an error if data is completely missing
      if (!allData.marketSentiment || !allData.keyMarketIndicators || 
          !allData.fundamentalMetrics || !allData.macroeconomicFactors) {
        throw new Error("Failed to retrieve essential trading data: " + allData.message);
      }
    }
    
    Logger.log("Retrieved trading data with warnings or success");
    
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
    
    // Generate the data retrieval text for OpenAI
    const dataRetrievalText = generateDataRetrievalText();
    Logger.log("Generated data retrieval text for OpenAI");
    
    // Combine the prompt template with the data retrieval text
    const fullPrompt = promptTemplate + dataRetrievalText;
    Logger.log("Combined prompt template with data retrieval text");
    
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
    const jsonFileUrl = saveJsonToGoogleDrive(analysisJson, jsonFileName);
    Logger.log(`OpenAI response saved to Google Drive: ${jsonFileUrl}`);
    
    // Get the current time
    const currentTime = new Date();
    
    // Calculate the next analysis time
    const nextAnalysisTime = calculateNextAnalysisTime(currentTime);
    
    // Send the trading decision email - only call this once
    sendTradeDecisionEmail(analysisJson);
    
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
  const result = runTradingAnalysis();
  Logger.log(result);
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
  // OpenAI API endpoint
  const apiUrl = "https://api.openai.com/v1/chat/completions";
  
  // Request payload
  const payload = {
    model: "gpt-4-turbo-preview",
    messages: [
      {
        role: "system",
        content: "You are a professional financial analyst specializing in market analysis and trading recommendations."
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
  
  return jsonResponse;
}

/**
 * Extracts the content from the OpenAI API response
 * 
 * @param {Object} response - The response from OpenAI
 * @return {string} - The content of the response
 */
function extractContentFromResponse(response) {
  if (response && response.choices && response.choices.length > 0) {
    return response.choices[0].message.content;
  }
  
  throw new Error("Invalid response format from OpenAI");
}

/**
 * Cleans and parses the analysis result from OpenAI
 * 
 * @param {string} content - The content of the response from OpenAI
 * @return {Object} - The cleaned and parsed analysis result
 */
function cleanAnalysisResult(content) {
  // Save the raw response for debugging
  saveToGoogleDrive('raw_openai_response.json', content);

  // Remove markdown code fences if present
  let cleanedContent = content;
  if (cleanedContent.trim().startsWith("```")) {
    // Remove the opening fence (which may include "json") and the closing fence
    cleanedContent = cleanedContent.trim()
      .replace(/^```(?:json)?\s*/, '')
      .replace(/\s*```$/, '');
  }

  // First, try to parse the cleaned content
  try {
    const parsed = JSON.parse(cleanedContent);
    // Validate required structure
    if (!parsed.decision || !parsed.summary || !parsed.analysis) {
      throw new Error('Parsed JSON structure is missing required keys.');
    }
    return parsed;
  } catch (e) {
    Logger.log("Parsing failed on cleaned content: " + e);

    // Minimal cleanup: remove trailing commas from objects and arrays
    let minimalCleaned = cleanedContent
      .replace(/,\s*\}/g, '}')
      .replace(/,\s*\]/g, ']');
    saveToGoogleDrive('minimally_cleaned_openai_response.json', minimalCleaned);

    try {
      const parsed2 = JSON.parse(minimalCleaned);
      if (!parsed2.decision || !parsed2.summary || !parsed2.analysis) {
        throw new Error('Cleaned JSON structure is missing required keys.');
      }
      return parsed2;
    } catch (e2) {
      Logger.log("Parsing failed after minimal cleanup: " + e2);
      throw e2;
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
          !allData.fundamentalMetrics || !allData.macroeconomicFactors) {
        throw new Error("Failed to retrieve essential trading data: " + allData.message);
      }
    }
    
    Logger.log("Retrieved trading data with warnings or success");
    
    // Get the prompt template from Prompt.gs
    const promptTemplate = getTradingAnalysisPrompt();
    Logger.log("Retrieved prompt template from Prompt.gs");
    
    // Generate the data retrieval text for OpenAI
    const dataRetrievalText = generateDataRetrievalText();
    Logger.log("Generated data retrieval text for OpenAI");
    
    // Combine the prompt template with the data retrieval text
    const fullPrompt = promptTemplate + dataRetrievalText;
    Logger.log("Combined prompt template with data retrieval text");
    
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
 * Calculates the next analysis time based on the current time
 * 
 * @param {Date} currentTime - The current time
 * @return {Date} - The next analysis time
 */
function calculateNextAnalysisTime(currentTime) {
  // Get the schedule configuration
  const scheduleConfig = getScheduleConfig();
  
  // Create a formatter for the time zone
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: TIME_ZONE,
    hour: 'numeric',
    minute: 'numeric',
    hour12: true
  });
  
  // Create a new date object for the next analysis time
  const nextAnalysisTime = new Date(currentTime);
  
  // Get the current day of the week (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
  const currentDayOfWeek = currentTime.getDay();
  
  // If it's a weekend, schedule for Monday morning
  if (currentDayOfWeek === 0 || currentDayOfWeek === 6) {
    // Calculate days until Monday
    const daysUntilMonday = currentDayOfWeek === 0 ? 1 : 2;
    
    // Set the next analysis time to Monday morning
    nextAnalysisTime.setDate(nextAnalysisTime.getDate() + daysUntilMonday);
    nextAnalysisTime.setHours(scheduleConfig.morningHour, scheduleConfig.morningMinute, 0, 0);
  } else {
    // It's a weekday, schedule for the next analysis time
    // If it's before morning analysis time, schedule for morning
    // If it's after morning but before evening, schedule for evening
    // If it's after evening, schedule for next morning
    
    const currentHour = currentTime.getHours();
    const currentMinute = currentTime.getMinutes();
    
    if (currentHour < scheduleConfig.morningHour || 
        (currentHour === scheduleConfig.morningHour && currentMinute < scheduleConfig.morningMinute)) {
      // Schedule for today morning
      nextAnalysisTime.setHours(scheduleConfig.morningHour, scheduleConfig.morningMinute, 0, 0);
    } else if (currentHour < scheduleConfig.eveningHour || 
               (currentHour === scheduleConfig.eveningHour && currentMinute < scheduleConfig.eveningMinute)) {
      // Schedule for today evening
      nextAnalysisTime.setHours(scheduleConfig.eveningHour, scheduleConfig.eveningMinute, 0, 0);
    } else {
      // Schedule for tomorrow morning
      nextAnalysisTime.setDate(nextAnalysisTime.getDate() + 1);
      nextAnalysisTime.setHours(scheduleConfig.morningHour, scheduleConfig.morningMinute, 0, 0);
      
      // If tomorrow is a weekend, schedule for Monday
      const nextDayOfWeek = nextAnalysisTime.getDay();
      if (nextDayOfWeek === 0 || nextDayOfWeek === 6) {
        // Calculate days until Monday
        const daysUntilMonday = nextDayOfWeek === 0 ? 1 : 2;
        
        // Set the next analysis time to Monday morning
        nextAnalysisTime.setDate(nextAnalysisTime.getDate() + daysUntilMonday);
      }
    }
  }
  
  return nextAnalysisTime;
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
 * Wrapper function to send the trading decision email
 * 
 * @param {Object} analysisJson - The analysis JSON object
 */
function sendTradeDecisionEmailWrapper(analysisJson) {
  try {
    Logger.log("Sending trade decision email...");
    
    // Send the email with the trading decision
    sendTradeDecisionEmail(analysisJson);
    
    Logger.log("Trade decision email sent successfully.");
  } catch (error) {
    Logger.log("Error in sendTradeDecisionEmailWrapper: " + error);
    sendErrorEmail("Trade Decision Email Error", error.toString());
  }
}

/**
 * Saves JSON data to a file in Google Drive
 * 
 * @param {Object} jsonData - The JSON data to save
 * @param {String} fileName - The name of the file to save
 * @return {String} The URL of the saved file
 */
function saveJsonToGoogleDrive(jsonData, fileName) {
  try {
    // Create or get the folder
    const folderName = "Trading Analysis Emails";
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
    
    Logger.log(`JSON saved to Google Drive: ${fileName}`);
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

