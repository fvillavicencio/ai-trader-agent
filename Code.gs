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
    const analysisJson = cleanAnalysisResult(content);
    
    // Cache the result for 10 minutes (600 seconds)
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
  try {
    // Find the JSON object in the content
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    
    if (!jsonMatch) {
      throw new Error("No JSON object found in the response");
    }
    
    const jsonString = jsonMatch[0];
    const analysisJson = JSON.parse(jsonString);
    
    return analysisJson;
  } catch (error) {
    Logger.log(`Error cleaning analysis result: ${error}`);
    throw new Error(`Failed to parse OpenAI response: ${error}`);
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
    const fullPrompt = promptTemplate + "\n\n**Retrieved Data:**\n\n" + dataRetrievalText;
    Logger.log("Combined prompt template with data retrieval text");
    
    // Send the prompt via email for review
    sendPromptEmail(fullPrompt);
    Logger.log("Sent prompt email for review");
    
    // Display the first 500 characters of the prompt in the logs
    const previewLength = 500;
    const promptPreview = fullPrompt.length > previewLength 
      ? fullPrompt.substring(0, previewLength) + "..." 
      : fullPrompt;
    
    Logger.log("Prompt preview: " + promptPreview);
    
    return "Prompt generated and emailed successfully. Check your inbox for the complete prompt.";
  } catch (error) {
    Logger.log("Error in testGenerateAndEmailPrompt: " + error);
    return "Error: " + error;
  }
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
 * NOTE: Trigger management has been moved to Setup.gs
 * Please use the setupTriggers() function in Setup.gs to create or modify triggers
 */
