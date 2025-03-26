/**
 * AI Trading Agent - Main Script
 * 
 * This script analyzes financial data and sends trading decisions via email.
 * It uses the Perplexity API to get real-time market data through web browsing.
 */

/**
 * Main function to run the trading analysis
 */
function runTradingAnalysis() {
  try {
    Logger.log("Starting trading analysis...");
    
    // Get the analysis from Perplexity
    const analysisResult = getPerplexityAnalysis();
    
    // Parse the analysis result to extract the decision and justification
    const { decision, justification, analysisJson } = parseAnalysisResult(analysisResult);
    
    // Get the current time
    const currentTime = new Date();
    
    // Calculate the next analysis time
    const nextAnalysisTime = calculateNextAnalysisTime(currentTime);
    
    // Send the trading decision email
    sendTradeDecisionEmailWrapper(decision, justification);
    
    Logger.log("Trading analysis completed successfully.");
    return "Trading analysis completed successfully.";
  } catch (error) {
    Logger.log("Error in runTradingAnalysis: " + error);
    return "Error: " + error;
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
 * Gets the Perplexity API key from script properties
 * 
 * @return {string} - The Perplexity API key
 */
function getPerplexityApiKey() {
  const scriptProperties = PropertiesService.getScriptProperties();
  return scriptProperties.getProperty('PERPLEXITY_API_KEY');
}

/**
 * Calls the Perplexity API to get the trading analysis
 * 
 * @return {string} - The analysis result from Perplexity
 */
function getPerplexityAnalysis() {
  try {
    Logger.log("Starting analysis with Perplexity API...");
    
    // Retrieve all data from our modules
    Logger.log("Retrieving all trading data...");
    const allData = retrieveAllData();
    
    if (!allData.success) {
      Logger.log("Error retrieving data: " + allData.message);
      throw new Error("Failed to retrieve trading data: " + allData.message);
    }
    
    Logger.log("Successfully retrieved all trading data");
    
    // Generate the Perplexity prompt with all our data
    const prompt = generatePerplexityPrompt(allData);
    Logger.log("Generated Perplexity prompt");
    
    // Send the prompt via email before passing it to Perplexity
    sendPromptEmail(prompt);
    Logger.log("Sent prompt email");
    
    const apiKey = getPerplexityApiKey();
    
    const payload = {
      model: "sonar-pro",  // Updated to the latest model name
      messages: [
        {
          role: "system",
          content: "You are an AI agent tasked with providing actionable trading recommendations in JSON format. Your analysis should be accurate, clearly sourced, and include timestamps (Eastern Time) and URLs for cited data points when available. Use the most current data you can find through web browsing.\n\nIMPORTANT: Return ONLY raw JSON without any markdown formatting, code blocks, or explanatory text. Do not wrap your response in ```json``` or any other formatting. Your entire response must be a valid, parseable JSON object with the following structure:\n\n{\n  \"decision\": \"Buy Now | Sell Now | Watch for Better Price Action\",\n  \"summary\": \"Brief summary of the recommendation\",\n  \"analysis\": {\n    \"marketSentiment\": [\n      {\"analyst\": \"Analyst Name\", \"comment\": \"Quote or summary\", \"source\": \"Source URL\", \"timestamp\": \"Date and time ET\"}\n    ],\n    \"marketIndicators\": {\n      \"fearGreedIndex\": {\"value\": 0, \"interpretation\": \"Description\"},\n      \"vix\": {\"value\": 0, \"trend\": \"Description\"},\n      \"upcomingEvents\": [\n        {\"event\": \"Event name\", \"date\": \"Date\"}\n      ]\n    },\n    \"fundamentalMetrics\": [\n      {\"symbol\": \"Ticker\", \"name\": \"Company Name\", \"pegRatio\": 0, \"forwardPE\": 0, \"comment\": \"Analysis\"}\n    ],\n    \"macroeconomicFactors\": {\n      \"treasuryYields\": {\"twoYear\": 0, \"tenYear\": 0, \"date\": \"YYYY-MM-DD\", \"source\": \"URL\", \"yieldCurve\": \"normal|inverted|flat\", \"implications\": \"Description\"},\n      \"fedPolicy\": {\"federalFundsRate\": 0.00, \"fomcMeetingDate\": \"YYYY-MM-DD\", \"forwardGuidance\": \"Description\", \"source\": \"URL\"},\n      \"inflation\": {\"cpi\": {\"core\": 0.0, \"headline\": 0.0, \"releaseDate\": \"YYYY-MM-DD\", \"source\": \"URL\"}, \"pce\": {\"core\": 0.0, \"headline\": 0.0, \"releaseDate\": \"YYYY-MM-DD\", \"source\": \"URL\"}, \"trend\": \"Description\", \"impactOnFedPolicy\": \"Description\"},\n      \"geopoliticalRisks\": [{\"description\": \"Description\", \"regionsAffected\": [\"Region\"], \"potentialMarketImpact\": \"Description\", \"newsSource\": \"URL\"}]\n    }\n  },\n  \"justification\": \"Detailed explanation for the decision\"\n}"
        },
        {
          role: "user",
          content: prompt
        }
      ],
      // Add parameters to enable web browsing capabilities
      search_mode: "websearch",
      max_tokens: 4000,
      temperature: 0.7,
      frequency_penalty: 0.5
    };
    
    Logger.log("Sending request to Perplexity API...");
    
    const options = {
      method: 'post',
      contentType: 'application/json',
      headers: {
        'Authorization': 'Bearer ' + apiKey
      },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };
    
    const response = UrlFetchApp.fetch('https://api.perplexity.ai/chat/completions', options);
    const responseCode = response.getResponseCode();
    const responseText = response.getContentText();
    
    Logger.log("Perplexity API response code: " + responseCode);
    
    if (responseCode !== 200) {
      Logger.log("API Error: " + responseCode);
      Logger.log("API Error Details: " + responseText);
      
      // Provide a fallback response for API errors
      return `Recommendation: Watch for Better Price Action

Justification:

I was unable to retrieve real-time market data due to an API error (HTTP ${responseCode}). Without current market information, I cannot confidently recommend buying or selling at this time.

1. Market Sentiment:
   Unable to access current CNBC commentary and analyst opinions.

2. Key Market Indicators:
   Unable to access current Fear & Greed Index, VIX, and other market indicators.

3. Fundamental Metrics:
   Unable to access current stock/ETF metrics and performance data.

4. Macroeconomic Factors:
   Unable to access current Treasury yields, Fed statements, and economic indicators.

Given the lack of real-time data, the most prudent course of action is to watch for better price action. Please check that the Perplexity API is functioning correctly and try again later.`;
    }
    
    const result = JSON.parse(responseText);
    
    if (!result.choices || !result.choices[0] || !result.choices[0].message || !result.choices[0].message.content) {
      Logger.log("Unexpected API response structure: " + JSON.stringify(result));
      
      // Provide a fallback response for unexpected response structures
      return `Recommendation: Watch for Better Price Action

Justification:

I received an unexpected response format from the API and could not retrieve real-time market data. Without current market information, I cannot confidently recommend buying or selling at this time.

1. Market Sentiment:
   Unable to access current CNBC commentary and analyst opinions.

2. Key Market Indicators:
   Unable to access current Fear & Greed Index, VIX, and other market indicators.

3. Fundamental Metrics:
   Unable to access current stock/ETF metrics and performance data.

4. Macroeconomic Factors:
   Unable to access current Treasury yields, Fed statements, and economic indicators.

Given the lack of real-time data, the most prudent course of action is to watch for better price action. Please check that the Perplexity API is functioning correctly and try again later.`;
    }
    
    return result.choices[0].message.content;
  } catch (error) {
    Logger.log("Error in getPerplexityAnalysis: " + error.toString());
    throw error;
  }
}

/**
 * Extracts the trading decision and justification from the analysis result
 * 
 * @param {string} analysisResult - The analysis result from Perplexity
 * @return {Object} - Object containing the decision and justification
 */
function parseAnalysisResult(analysisResult) {
  // First, check if the response is wrapped in markdown code blocks and extract the JSON
  let cleanedResult = analysisResult;
  
  try {
    // Remove markdown code blocks if present (```json ... ```)
    const codeBlockMatch = analysisResult.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (codeBlockMatch && codeBlockMatch[1]) {
      cleanedResult = codeBlockMatch[1].trim();
      Logger.log("Extracted JSON from markdown code block");
    }
    
    // Clean up any potential issues in the JSON
    // Replace any non-standard quotes with standard ones
    cleanedResult = cleanedResult.replace(/[\u2018\u2019]/g, "'").replace(/[\u201C\u201D]/g, '"');
    
    // Remove any trailing commas in arrays or objects (common JSON error)
    cleanedResult = cleanedResult.replace(/,\s*([}\]])/g, '$1');
    
    // Fix any unescaped quotes in strings
    cleanedResult = cleanedResult.replace(/"([^"]*)":/g, function(match, p1) {
      return '"' + p1.replace(/"/g, '\\"') + '":';
    });
    
    // Try to parse the cleaned JSON
    let analysisJson;
    try {
      analysisJson = JSON.parse(cleanedResult);
      
      // Extract the decision from the JSON
      let decision = analysisJson.decision || "Watch for Better Price Action";
      
      // Use the full JSON as justification
      const justification = JSON.stringify(analysisJson, null, 2);
      
      return { 
        decision: decision, 
        justification: justification,
        analysisJson: analysisJson
      };
    } catch (e) {
      // If parsing still fails, log the error with more details
      Logger.log("Error parsing JSON: " + e);
      Logger.log("Error position: " + e.message);
      
      // Log a portion of the JSON around the error position if possible
      const errorMatch = e.message.match(/position (\d+)/);
      if (errorMatch && errorMatch[1]) {
        const position = parseInt(errorMatch[1]);
        const start = Math.max(0, position - 50);
        const end = Math.min(cleanedResult.length, position + 50);
        Logger.log("JSON snippet around error: " + cleanedResult.substring(start, end));
      }
      
      // Try to extract decision using regex as a fallback
      const decisionMatch = cleanedResult.match(/decision["\s:]+([^"]+)/i);
      let decision = "Watch for Better Price Action"; // Default
      
      if (decisionMatch && decisionMatch[1]) {
        decision = decisionMatch[1].trim();
        // Clean up any trailing commas or quotes
        decision = decision.replace(/[",}]/g, '').trim();
      }
      
      return { 
        decision: decision, 
        justification: cleanedResult,
        analysisJson: null
      };
    }
  } catch (outerError) {
    // Catch any errors in the preprocessing steps
    Logger.log("Error in preprocessing JSON: " + outerError);
    
    // Fall back to a very basic extraction
    let decision = "Watch for Better Price Action"; // Default
    
    // Try to extract decision using a simple pattern
    if (analysisResult.includes("Buy Now")) {
      decision = "Buy Now";
    } else if (analysisResult.includes("Sell Now")) {
      decision = "Sell Now";
    }
    
    return {
      decision: decision,
      justification: analysisResult,
      analysisJson: null
    };
  }
}

/**
 * Calculates the next analysis time based on the current time
 * 
 * @param {Date} currentTime - The current time
 * @return {Date} - The next analysis time
 */
function calculateNextAnalysisTime(currentTime) {
  // Convert to Eastern Time for calculation
  const etDate = new Date(currentTime.toLocaleString('en-US', { timeZone: getTimeZone() }));
  const currentHour = etDate.getHours();
  const currentMinute = etDate.getMinutes();
  
  // Use the schedule configuration from Config.gs
  const scheduleConfig = getScheduleConfig();
  const morningScheduleHour = scheduleConfig.morningScheduleHour;
  const morningScheduleMinute = scheduleConfig.morningScheduleMinute;
  const eveningScheduleHour = scheduleConfig.eveningScheduleHour;
  const eveningScheduleMinute = scheduleConfig.eveningScheduleMinute;
  
  const nextTime = new Date(currentTime);
  
  // Determine if the next analysis is morning or evening
  if (currentHour < morningScheduleHour || 
      (currentHour === morningScheduleHour && currentMinute < morningScheduleMinute)) {
    // Next analysis is this morning
    nextTime.setHours(morningScheduleHour);
    nextTime.setMinutes(morningScheduleMinute);
  } else if (currentHour < eveningScheduleHour || 
             (currentHour === eveningScheduleHour && currentMinute < eveningScheduleMinute)) {
    // Next analysis is this evening
    nextTime.setHours(eveningScheduleHour);
    nextTime.setMinutes(eveningScheduleMinute);
  } else {
    // Next analysis is tomorrow morning
    nextTime.setDate(nextTime.getDate() + 1);
    nextTime.setHours(morningScheduleHour);
    nextTime.setMinutes(morningScheduleMinute);
  }
  
  return nextTime;
}

/**
 * Gets the time zone from Config.gs
 * 
 * @return {string} - The time zone
 */
function getTimeZone() {
  return TIME_ZONE;
}

/**
 * Gets the schedule configuration from Config.gs
 * 
 * @return {Object} - The schedule configuration object
 */
function getScheduleConfig() {
  return {
    morningScheduleHour: MORNING_SCHEDULE_HOUR,
    morningScheduleMinute: MORNING_SCHEDULE_MINUTE,
    eveningScheduleHour: EVENING_SCHEDULE_HOUR,
    eveningScheduleMinute: EVENING_SCHEDULE_MINUTE
  };
}

/**
 * Scheduled function to run the trading analysis at 9:15 AM ET
 */
function morningTradingAnalysis() {
  try {
    runTradingAnalysis();
  } catch (error) {
    sendErrorEmail("Morning Trading Analysis Error", error);
  }
}

/**
 * Scheduled function to run the trading analysis at 6:00 PM ET
 */
function eveningTradingAnalysis() {
  try {
    runTradingAnalysis();
  } catch (error) {
    sendErrorEmail("Evening Trading Analysis Error", error);
  }
}

/**
 * Scheduled function to run the trading analysis at 9:15 AM ET on Mondays
 */
function mondayMorningTradingAnalysis() {
  try {
    runTradingAnalysis();
  } catch (error) {
    sendErrorEmail("Monday Morning Trading Analysis Error", error);
  }
}

/**
 * Wrapper function to send the trading decision email
 * 
 * @param {string} decision - The trading decision
 * @param {string} justification - The justification for the decision
 */
function sendTradeDecisionEmailWrapper(decision, justification) {
  const currentTime = new Date();
  const nextAnalysisTime = calculateNextAnalysisTime(currentTime);
  
  // Call the implementation in Email.gs with all required parameters
  sendTradingDecisionEmail(decision, justification, currentTime, nextAnalysisTime);
}

/**
 * Sends a test email with the trading decision
 * 
 * @param {string} decision - The trading decision (Buy Now, Sell Now, Watch for Better Price Action)
 * @param {string} justification - The justification for the decision
 */
function sendTestEmail(decision, justification) {
  const currentTime = new Date();
  const nextTime = new Date(currentTime.getTime() + (12 * 60 * 60 * 1000)); // 12 hours later
  
  // Get the recipients from Config.gs
  const recipients = getEmailRecipients();
  
  // Log the recipients for debugging
  Logger.log(`Sending test email to: ${recipients.join(', ')}`);
  
  // Send the email
  sendTradeDecisionEmailWrapper(decision, justification);
}

/**
 * Gets the email subject for a trading decision
 * 
 * @param {string} decision - The trading decision
 * @return {string} - The email subject
 */
function getEmailSubject(decision) {
  const today = new Date();
  const dateString = today.toISOString().split('T')[0];
  return `[AI Trading Decision] ${decision} - ${dateString}`;
}

/**
 * Gets the email body for a trading decision and justification
 * 
 * @param {string} decision - The trading decision
 * @param {string} justification - The justification for the decision
 * @return {string} - The HTML email body
 */
function getEmailBody(decision, justification) {
  // Get the current time and next analysis time
  const currentTime = new Date();
  const nextAnalysisTime = calculateNextAnalysisTime(currentTime);
  
  // Format the email body using the HTML formatter
  return formatHtmlEmailBody(decision, justification, currentTime, nextAnalysisTime);
}

/**
 * Sends an error email to the admin
 * 
 * @param {string} subject - The email subject
 * @param {string} error - The error message
 */
function sendErrorEmail(subject, error) {
  const adminEmail = "fvillavicencio@gmail.com"; // Admin email address
  GmailApp.sendEmail(adminEmail, subject, `Error in AI Trading Agent: ${error}`);
}

/**
 * NOTE: Trigger management has been moved to Setup.gs
 * Please use the setupTriggers() function in Setup.gs to create or modify triggers
 */

/**
 * Formats market sentiment data for inclusion in the prompt
 * 
 * @param {Object} marketSentiment - The market sentiment data
 * @return {string} Formatted market sentiment data
 */
function formatMarketSentimentData(marketSentiment) {
  try {
    let formattedData = "### Market Sentiment Data (Retrieved directly from sources)\n\n";
    
    // Format CNBC analyst comments
    if (marketSentiment.cnbcAnalysts && marketSentiment.cnbcAnalysts.length > 0) {
      formattedData += "#### CNBC Analyst Comments (Last 24 hours)\n\n";
      
      for (const comment of marketSentiment.cnbcAnalysts) {
        const timestamp = new Date(comment.timestamp);
        const formattedTimestamp = Utilities.formatDate(timestamp, TIME_ZONE, "MMM dd, yyyy hh:mm a 'ET'");
        
        formattedData += `- **${comment.analyst}**: "${comment.comment}"\n`;
        formattedData += `  - Source: ${comment.source}\n`;
        formattedData += `  - Time: ${formattedTimestamp}\n\n`;
      }
    } else {
      formattedData += "#### CNBC Analyst Comments\n\n";
      formattedData += "No recent comments found from CNBC analysts in the last 24 hours.\n\n";
    }
    
    // Format Dan Niles insights
    if (marketSentiment.danNilesInsights && marketSentiment.danNilesInsights.length > 0) {
      formattedData += "#### Dan Niles Insights (Last 24 hours)\n\n";
      
      for (const insight of marketSentiment.danNilesInsights) {
        const timestamp = new Date(insight.timestamp);
        const formattedTimestamp = Utilities.formatDate(timestamp, TIME_ZONE, "MMM dd, yyyy hh:mm a 'ET'");
        
        formattedData += `- **Dan Niles** (${insight.source}): `;
        
        if (insight.content) {
          formattedData += `"${insight.content}"\n`;
        } else if (insight.title) {
          formattedData += `${insight.title}\n`;
        }
        
        if (insight.url) {
          formattedData += `  - Source: ${insight.url}\n`;
        }
        
        formattedData += `  - Time: ${formattedTimestamp}\n\n`;
      }
    } else {
      formattedData += "#### Dan Niles Insights\n\n";
      formattedData += "No recent insights found from Dan Niles in the last 24 hours.\n\n";
    }
    
    return formattedData;
  } catch (error) {
    Logger.log("Error in formatMarketSentimentData: " + error);
    return "Error formatting market sentiment data: " + error;
  }
}

/**
 * Enhances the prompt with retrieved data
 * 
 * @param {string} originalPrompt - The original analysis prompt
 * @param {Object} data - Object containing retrieved data for different sections
 * @return {string} Enhanced prompt with retrieved data
 */
function enhancePromptWithData(originalPrompt, data) {
  try {
    let enhancedPrompt = originalPrompt;
    
    // Add a section explaining that we're providing retrieved data
    enhancedPrompt += "\n\n## IMPORTANT: RETRIEVED DATA\n\n";
    enhancedPrompt += "The following data has been directly retrieved from various sources within the last 24 hours. ";
    enhancedPrompt += "Please use this data for your analysis instead of searching for it again. ";
    enhancedPrompt += "This ensures you have the most recent and accurate information.\n\n";
    
    // Add market sentiment data if available
    if (data.marketSentiment) {
      enhancedPrompt += "### Market Sentiment\n";
      enhancedPrompt += data.marketSentiment + "\n\n";
    }
    
    // Add key market indicators data if available
    if (data.keyMarketIndicators) {
      enhancedPrompt += "### Key Market Indicators\n";
      enhancedPrompt += data.keyMarketIndicators + "\n\n";
    }
    
    // Add fundamental metrics data if available
    if (data.fundamentalMetrics) {
      enhancedPrompt += "### Fundamental Metrics\n";
      enhancedPrompt += data.fundamentalMetrics + "\n\n";
    }
    
    // Add macroeconomic factors data if available
    if (data.macroeconomicFactors) {
      enhancedPrompt += "### Macroeconomic Factors\n";
      enhancedPrompt += data.macroeconomicFactors + "\n\n";
    }
    
    // Add a reminder to use the provided data
    enhancedPrompt += "\n## REMINDER\n\n";
    enhancedPrompt += "Please use the data provided above for your analysis. ";
    enhancedPrompt += "For any data points not provided, you may search for the most current information available.\n";
    
    return enhancedPrompt;
  } catch (error) {
    Logger.log("Error in enhancePromptWithData: " + error);
    return originalPrompt; // Return the original prompt if there's an error
  }
}

/**
 * Test function to retrieve market sentiment data and display the enhanced prompt
 */
function testMarketSentimentEnhancement() {
  try {
    Logger.log("Testing market sentiment data retrieval and prompt enhancement...");
    
    // Get the current date
    const currentDate = new Date();
    
    // Retrieve market sentiment data
    Logger.log("Retrieving market sentiment data...");
    const marketSentiment = retrieveMarketSentiment(currentDate);
    Logger.log(`Retrieved ${marketSentiment.cnbcAnalysts ? marketSentiment.cnbcAnalysts.length : 0} CNBC analyst comments and ${marketSentiment.danNilesInsights ? marketSentiment.danNilesInsights.length : 0} Dan Niles insights`);
    
    // Format the market sentiment data
    const marketSentimentData = formatMarketSentimentData(marketSentiment);
    
    // Get the original prompt
    const originalPrompt = getTradingAnalysisPrompt();
    
    // Enhance the prompt with the retrieved data
    const enhancedPrompt = enhancePromptWithData(originalPrompt, {
      marketSentiment: marketSentimentData
    });
    
    // Log the enhanced prompt
    Logger.log("Enhanced Prompt:");
    Logger.log(enhancedPrompt);
    
    return "Market sentiment data retrieval and prompt enhancement test completed successfully. Check logs for details.";
  } catch (error) {
    Logger.log("Error in testMarketSentimentEnhancement: " + error);
    return "Error: " + error;
  }
}

/**
 * Test function to run the market sentiment analysis and display the result
 */
function runTestMarketSentiment() {
  try {
    Logger.log("Running market sentiment test...");
    // Call the testMarketSentiment function from MarketSentiment.gs
    testMarketSentiment();
    return "Market sentiment test completed successfully.";
  } catch (error) {
    Logger.log("Error in runTestMarketSentiment: " + error);
    return "Error: " + error;
  }
}
