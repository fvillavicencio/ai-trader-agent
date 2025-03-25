/**
 * AI Trading Agent - Main Code
 * 
 * This script contains the main functionality for the AI Trading Agent.
 */

// Constants
// Using TIME_ZONE from Config.gs

/**
 * Sends a prompt to OpenAI and returns the response
 * @param {String} prompt - The prompt to send to OpenAI
 * @param {String} apiKey - The OpenAI API key
 * @return {Object} The response from OpenAI
 */
function sendPromptToOpenAI(prompt, apiKey) {
  try {
    Logger.log("Sending prompt to OpenAI API...");
    
    // Set up the API request
    const url = "https://api.openai.com/v1/chat/completions";
    const payload = {
      model: "gpt-4-turbo-preview",
      messages: [
        {
          role: "system",
          content: "You are an AI agent tasked with providing actionable trading recommendations in JSON format. Your analysis should be accurate and based ONLY on the data provided in the prompt - do not attempt to browse the web or retrieve additional information.\n\nCRITICAL: You MUST include ALL stocks mentioned in the fundamental metrics data. Do not omit any stocks. Include GOOGL, AMZN, META, TSLA, NVDA and any other stocks mentioned in the data.\n\nIMPORTANT: Return ONLY raw JSON without any markdown formatting, code blocks, or explanatory text. Do not wrap your response in ```json``` or any other formatting. Your entire response must be a valid, parseable JSON object with the structure specified in the prompt."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.2,
      max_tokens: 4000
    };
    
    const options = {
      method: "post",
      contentType: "application/json",
      headers: {
        "Authorization": "Bearer " + apiKey
      },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };
    
    // Make the API request
    const response = UrlFetchApp.fetch(url, options);
    const responseCode = response.getResponseCode();
    
    // Check if the response was successful
    if (responseCode !== 200) {
      throw new Error(`OpenAI API returned status code ${responseCode}: ${response.getContentText()}`);
    }
    
    // Parse the response
    const responseJson = JSON.parse(response.getContentText());
    Logger.log("OpenAI API call successful with model: gpt-4-turbo-preview");
    
    return responseJson;
  } catch (error) {
    Logger.log(`Error calling OpenAI API: ${error}`);
    throw new Error(`Failed to call OpenAI API: ${error}`);
  }
}

/**
 * Extracts content from OpenAI API response
 * @param {Object} response - The response from OpenAI
 * @return {String} The extracted content
 */
function extractContentFromResponse(response) {
  try {
    if (response && response.choices && response.choices.length > 0) {
      return response.choices[0].message.content;
    } else {
      throw new Error("Invalid response format from OpenAI");
    }
  } catch (error) {
    Logger.log(`Error extracting content from response: ${error}`);
    throw new Error(`Failed to extract content from response: ${error}`);
  }
}

/**
 * Cleans the analysis result from OpenAI
 * @param {String} content - The content from OpenAI
 * @return {Object} The cleaned analysis result
 */
function cleanAnalysisResult(content) {
  try {
    // First attempt: Try to parse the content as JSON directly
    try {
      return JSON.parse(content);
    } catch (jsonError) {
      Logger.log(`Initial JSON parsing failed: ${jsonError}`);
      
      // Second attempt: Try to extract JSON from the content
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          return JSON.parse(jsonMatch[0]);
        } catch (extractError) {
          Logger.log(`Extracted JSON parsing failed: ${extractError}`);
          
          // Third attempt: Try to fix common JSON syntax errors
          let fixedJson = jsonMatch[0];
          
          // Fix 1: Remove trailing commas before closing brackets or braces
          fixedJson = fixedJson.replace(/,(\s*[\]}])/g, '$1');
          
          // Fix 2: Add missing quotes around property names
          fixedJson = fixedJson.replace(/([{,]\s*)([a-zA-Z0-9_]+)(\s*:)/g, '$1"$2"$3');
          
          // Fix 3: Ensure string values have proper quotes
          fixedJson = fixedJson.replace(/:(\s*)([a-zA-Z0-9_]+)([,}])/g, ':"$2"$3');
          
          // Fix 4: Handle unescaped quotes in strings
          fixedJson = fixedJson.replace(/"([^"]*?)\\?"([^"]*?)"/g, '"$1\\"$2"');
          
          // Fix 5: Handle line breaks in strings
          fixedJson = fixedJson.replace(/"\s*\n\s*"/g, ' ');
          
          try {
            Logger.log("Attempting to parse fixed JSON");
            return JSON.parse(fixedJson);
          } catch (fixError) {
            Logger.log(`Fixed JSON parsing failed: ${fixError}`);
            
            // Last resort: Create a minimal valid JSON with essential fields
            Logger.log("Creating fallback JSON object");
            return {
              decision: "Watch for Better Price Action",
              summary: "Unable to parse analysis result",
              justification: "The analysis result could not be parsed correctly. Please check the logs for details.",
              error: `JSON parsing error: ${fixError}`,
              timestamp: new Date().toISOString()
            };
          }
        }
      } else {
        throw new Error("Could not extract JSON from response");
      }
    }
  } catch (error) {
    Logger.log(`Error cleaning analysis result: ${error}`);
    throw new Error(`Failed to clean analysis result: ${error}`);
  }
}

/**
 * Parses the analysis result from OpenAI to extract decision and justification
 * @param {Object} analysisResult - The analysis result from OpenAI
 * @return {Object} Object containing decision and justification
 */
function parseAnalysisResult(analysisResult) {
  try {
    // Check if analysisResult is already an object
    if (typeof analysisResult === 'string') {
      try {
        analysisResult = JSON.parse(analysisResult);
      } catch (error) {
        Logger.log(`Error parsing analysis result string: ${error}`);
        // Try to extract JSON from the string
        const jsonMatch = analysisResult.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            analysisResult = JSON.parse(jsonMatch[0]);
          } catch (extractError) {
            Logger.log(`Error parsing extracted JSON: ${extractError}`);
            // Return default values if parsing fails
            return {
              decision: "Watch for Better Price Action",
              justification: "Unable to parse analysis result"
            };
          }
        } else {
          // Return default values if no JSON found
          return {
            decision: "Watch for Better Price Action",
            justification: "Unable to extract JSON from analysis result"
          };
        }
      }
    }
    
    // Extract decision and justification
    const decision = analysisResult.decision || "Watch for Better Price Action";
    const justification = analysisResult.justification || "No clear justification provided.";
    
    return {
      decision: decision,
      justification: justification
    };
  } catch (error) {
    Logger.log(`Error in parseAnalysisResult: ${error}`);
    return {
      decision: "Watch for Better Price Action",
      justification: `Error parsing analysis result: ${error}`
    };
  }
}

/**
 * Process the analysis result from OpenAI
 * @param {Object} analysisResult - The analysis result from OpenAI
 * @param {Boolean} isTest - Whether this is a test run
 * @param {String} filename - Optional filename for saving HTML
 * @param {Date} customNextScheduledTime - Optional custom next scheduled time (for testing)
 * @return {Object} The result of processing the analysis
 */
function processAnalysisResult(analysisResult, isTest = false, filename = null, customNextScheduledTime = null) {
  try {
    Logger.log("Processing analysis result...");
    
    // Get the next scheduled analysis time
    const now = new Date();
    let nextScheduledTime;
    
    if (customNextScheduledTime) {
      // Use the provided custom time (for testing)
      nextScheduledTime = customNextScheduledTime;
      Logger.log(`Using custom next scheduled time: ${nextScheduledTime.toLocaleString()}`);
    } else {
      // Calculate the next scheduled time
      try {
        nextScheduledTime = getNextScheduledAnalysisTime(now);
      } catch (error) {
        Logger.log(`Error calculating next scheduled analysis time: ${error}`);
        nextScheduledTime = new Date(now.getTime() + 86400000); // default to 24 hours from now
      }
    }
    
    // Format the subject with (TEST) if this is a test
    let subject = "Market Pulse: Daily Trading Analysis";
    if (isTest) {
      subject = "(TEST) " + subject;
    }
    
    // Generate email bodies
    const htmlBody = formatHtmlEmailBodyWithAnalysis(analysisResult.decision, analysisResult, now, nextScheduledTime);
    const plainTextBody = formatPlainTextEmailBodyWithAnalysis(analysisResult.decision, analysisResult, now, nextScheduledTime);
    
    // Try to send the email, but continue even if it fails
    let emailResult = null;
    try {
      emailResult = sendEmail(subject, htmlBody, plainTextBody, isTest);
      Logger.log("Email sent successfully");
    } catch (emailError) {
      Logger.log("Warning: Could not send email: " + emailError.message);
      // Continue execution even if email fails
    }
    
    // Try to save the HTML, but continue even if it fails
    let htmlSaveResult = null;
    try {
      // Use the provided filename or generate one
      const htmlFilename = filename || "market_pulse_daily.html";
      htmlSaveResult = saveHtmlToGoogleDrive(htmlBody, htmlFilename);
      Logger.log("HTML saved to Google Drive successfully");
    } catch (htmlError) {
      Logger.log("Warning: Could not save HTML to Google Drive: " + htmlError.message);
      // Continue execution even if HTML saving fails
    }
    
    return {
      success: true,
      emailResult: emailResult,
      htmlSaveResult: htmlSaveResult,
      analysisResult: analysisResult,
      nextScheduledTime: nextScheduledTime
    };
  } catch (error) {
    Logger.log(`Error processing analysis result: ${error}`);
    throw new Error(`Failed to process analysis result: ${error}`);
  }
}

/**
 * Create mock triggers for testing purposes
 * This simulates the project triggers without actually creating them
 * @return {Array} Array of mock trigger objects
 */
function createMockTriggers() {
  // Hard-code the schedule times from Config.js
  // Morning: 8:50 AM, Evening: 6:00 PM
  
  // Create mock morning trigger (8:50 AM)
  const morningTrigger = {
    getEventType: function() { return ScriptApp.EventType.CLOCK; },
    getHandlerFunction: function() { return 'runTradingAnalysisWithDayCheck'; },
    getAtHour: function() { return 8; },
    getAtMinute: function() { return 50; }
  };
  
  // Create mock evening trigger (6:00 PM)
  const eveningTrigger = {
    getEventType: function() { return ScriptApp.EventType.CLOCK; },
    getHandlerFunction: function() { return 'runTradingAnalysisWithDayCheck'; },
    getAtHour: function() { return 18; },
    getAtMinute: function() { return 0; }
  };
  
  return [morningTrigger, eveningTrigger];
}

/**
 * Calculate the next scheduled analysis time based on the current time
 * Uses the schedule configuration from Config.gs and the day check logic from runTradingAnalysisWithDayCheck
 * 
 * @param {Date} currentTime - The current time
 * @param {Boolean} useTestTriggers - Whether to use mock triggers for testing (not used in new implementation)
 * @return {Date} The next scheduled analysis time
 */
function getNextScheduledAnalysisTime(currentTime, useTestTriggers = false) {
  try {
    Logger.log("Calculating next scheduled analysis time using direct schedule configuration...");
    
    // Create array to hold all possible next run times
    const nextRunTimes = [];
    
    // Get current day of week (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
    const currentDay = currentTime.getDay();
    
    // Create a date object for today's morning schedule time
    const morningToday = new Date(currentTime);
    morningToday.setHours(MORNING_SCHEDULE_HOUR, MORNING_SCHEDULE_MINUTE, 0, 0);
    
    // Create a date object for today's evening schedule time
    const eveningToday = new Date(currentTime);
    eveningToday.setHours(EVENING_SCHEDULE_HOUR, EVENING_SCHEDULE_MINUTE, 0, 0);
    
    // Check if today's morning schedule is in the future and is a valid day (Monday-Friday)
    if (morningToday > currentTime && currentDay >= 1 && currentDay <= 5) {
      nextRunTimes.push(morningToday);
    }
    
    // Check if today's evening schedule is in the future and is a valid day (Sunday-Thursday)
    if (eveningToday > currentTime && (currentDay === 0 || (currentDay >= 1 && currentDay <= 4))) {
      nextRunTimes.push(eveningToday);
    }
    
    // Check future days (up to 7 days ahead)
    for (let daysAhead = 1; daysAhead <= 7; daysAhead++) {
      const futureDate = new Date(currentTime);
      futureDate.setDate(futureDate.getDate() + daysAhead);
      const futureDayOfWeek = futureDate.getDay();
      
      // Morning schedule (Monday-Friday)
      if (futureDayOfWeek >= 1 && futureDayOfWeek <= 5) {
        const futureMorning = new Date(futureDate);
        futureMorning.setHours(MORNING_SCHEDULE_HOUR, MORNING_SCHEDULE_MINUTE, 0, 0);
        nextRunTimes.push(futureMorning);
      }
      
      // Evening schedule (Sunday-Thursday)
      if (futureDayOfWeek === 0 || (futureDayOfWeek >= 1 && futureDayOfWeek <= 4)) {
        const futureEvening = new Date(futureDate);
        futureEvening.setHours(EVENING_SCHEDULE_HOUR, EVENING_SCHEDULE_MINUTE, 0, 0);
        nextRunTimes.push(futureEvening);
      }
      
      // If we've found at least one future time, no need to check more days
      if (nextRunTimes.length > 0 && daysAhead >= 1) {
        break;
      }
    }
    
    // Sort the next run times and get the earliest one
    nextRunTimes.sort((a, b) => a - b);
    
    if (nextRunTimes.length > 0) {
      Logger.log(`Next scheduled analysis time: ${nextRunTimes[0].toLocaleString()}`);
      return nextRunTimes[0];
    } else {
      // Fallback if no valid next run time was found
      Logger.log("No valid next run time found. Using default (24 hours from now).");
      const defaultTime = new Date(currentTime);
      defaultTime.setDate(defaultTime.getDate() + 1);
      return defaultTime;
    }
  } catch (error) {
    Logger.log(`Error calculating next scheduled analysis time: ${error}`);
    // Return a default time (24 hours from now) in case of error
    const defaultTime = new Date(currentTime);
    defaultTime.setDate(defaultTime.getDate() + 1);
    return defaultTime;
  }
}

/**
 * Calculates the next scheduled analysis time based on the current time
 * This is a simplified version of getNextScheduledAnalysisTime for use in Setup.gs
 * @param {Date} currentTime - The current time
 * @return {Date} The next scheduled analysis time
 */
function calculateNextAnalysisTime(currentTime) {
  try {
    // Get the configuration values
    const morningHour = MORNING_SCHEDULE_HOUR || 8;
    const morningMinute = MORNING_SCHEDULE_MINUTE || 30;
    const eveningHour = EVENING_SCHEDULE_HOUR || 18;
    const eveningMinute = EVENING_SCHEDULE_MINUTE || 0;
    const timeZone = TIME_ZONE || "America/New_York";
    
    // Create a new date object for the calculation
    const nextTime = new Date(currentTime);
    
    // Get the current hour in the specified time zone
    const currentHour = nextTime.getHours();
    
    // If current time is before morning analysis time, schedule for today morning
    if (currentHour < morningHour) {
      nextTime.setHours(morningHour);
      nextTime.setMinutes(morningMinute);
      nextTime.setSeconds(0);
      nextTime.setMilliseconds(0);
    } 
    // If current time is before evening analysis time, schedule for today evening
    else if (currentHour < eveningHour) {
      nextTime.setHours(eveningHour);
      nextTime.setMinutes(eveningMinute);
      nextTime.setSeconds(0);
      nextTime.setMilliseconds(0);
    } 
    // Otherwise, schedule for tomorrow morning
    else {
      nextTime.setDate(nextTime.getDate() + 1);
      nextTime.setHours(morningHour);
      nextTime.setMinutes(morningMinute);
      nextTime.setSeconds(0);
      nextTime.setMilliseconds(0);
    }
    
    return nextTime;
  } catch (error) {
    Logger.log(`Error calculating next analysis time: ${error}`);
    // Return a default time (24 hours from now) in case of error
    const defaultTime = new Date(currentTime);
    defaultTime.setDate(defaultTime.getDate() + 1);
    return defaultTime;
  }
}

/**
 * Get configuration values for the application
 * @return {Object} Configuration object
 */
function getConfig() {
  return {
    schedule: {
      morningHour: 9,
      morningMinute: 30,
      eveningHour: 16,
      eveningMinute: 0
    }
  };
}

/**
 * Test function to verify HTML generation with sample data
 * This function can be used to test the HTML generation without making OpenAI API calls
 */
function testHtmlGenerationWithSampleData() {
  try {
    Logger.log("Starting HTML generation test with sample data...");
    
    // Sample analysis result
    const sampleAnalysis = {
      "decision": "BUY",
      "summary": "The market shows positive momentum with strong economic indicators and favorable technical signals.",
      "timestamp": new Date().toISOString(),
      "analysis": {
        "marketSentiment": {
          "overall": "Bullish",
          "analysts": [
            {
              "analyst": "Jane Smith",
              "comment": "Recent earnings reports exceed expectations, suggesting strong corporate performance.",
              "mentionedSymbols": ["AAPL", "MSFT"],
              "source": "Market Watch",
              "sourceUrl": "https://www.marketwatch.com",
              "lastUpdated": "2023-09-15"
            },
            {
              "analyst": "John Doe",
              "comment": "Technical indicators point to continued upward momentum in major indices.",
              "mentionedSymbols": ["SPY", "QQQ"],
              "source": "Trading View",
              "sourceUrl": "https://www.tradingview.com",
              "lastUpdated": "2023-09-16"
            }
          ],
          "source": "Financial Times",
          "sourceUrl": "https://www.ft.com",
          "lastUpdated": "2023-09-16"
        },
        // Rest of sample data...
      }
    };
    
    // Calculate the next scheduled time using the actual function
    const currentTime = new Date();
    const nextScheduledTime = getNextScheduledAnalysisTime(currentTime);
    
    // Process the analysis result
    const result = processAnalysisResult(sampleAnalysis, true, "market_pulse_daily_test.html", nextScheduledTime);
    
    Logger.log("HTML generation with sample data completed successfully");
    if (result.htmlSaveResult && result.htmlSaveResult.url) {
      Logger.log("HTML saved to: " + result.htmlSaveResult.url);
    } else if (result.htmlSaveResult && result.htmlSaveResult.fileId) {
      Logger.log("HTML saved with file ID: " + result.htmlSaveResult.fileId);
    } else {
      Logger.log("HTML saved but URL not available");
    }
    
    return result;
  } catch (error) {
    Logger.log("Error in testHtmlGenerationWithSampleData: " + error.message);
    throw new Error("Test failed: " + error.message);
  }
}

/**
 * Test function with expanded stock data (10+ stocks) in the Fundamental Metrics section
 * This function can be used to test the HTML generation with a more comprehensive list of stocks
 */
function testHtmlGenerationWithExpandedStockData() {
  try {
    Logger.log("Starting HTML generation test with expanded stock data...");
    
    // Create a sample analysis result with expanded stock data
    const expandedAnalysis = {
      "decision": "BUY",
      "summary": "The market shows positive momentum with strong economic indicators and favorable technical signals.",
      "detailedJustification": "Based on comprehensive analysis of market conditions, technical indicators, and fundamental metrics, a BUY decision is recommended. The S&P 500 is showing strong upward momentum with a golden cross pattern on the daily chart. Economic data including GDP growth, employment figures, and manufacturing indices all point to continued economic expansion. Corporate earnings have exceeded expectations by an average of 5.2% this quarter, suggesting strong business performance. The Federal Reserve's recent comments indicate a potential pause in rate hikes, which historically has been favorable for equities. While some geopolitical risks remain, their potential impact appears contained at this time.",
      "timestamp": new Date().toISOString(),
      "analysis": {
        "marketSentiment": {
          "overall": "Bullish",
          "analysts": [
            {
              "analyst": "Jane Smith",
              "comment": "Recent earnings reports exceed expectations, suggesting strong corporate performance.",
              "mentionedSymbols": ["AAPL", "MSFT"],
              "source": "Market Watch",
              "sourceUrl": "https://www.marketwatch.com",
              "lastUpdated": "2023-09-15"
            },
            {
              "analyst": "John Doe",
              "comment": "Technical indicators point to continued upward momentum in major indices.",
              "mentionedSymbols": ["SPY", "QQQ"],
              "source": "Trading View",
              "sourceUrl": "https://www.tradingview.com",
              "lastUpdated": "2023-09-16"
            }
          ],
          "source": "Financial Times",
          "sourceUrl": "https://www.ft.com",
          "lastUpdated": "2023-09-16"
        },
        // Rest of expanded analysis data...
      }
    };
    
    // Add the rest of the expanded analysis data
    expandedAnalysis.analysis.keyMarketIndicators = {
      "sp500": {
        "value": "4,890.97",
        "change": "+1.02%",
        "trend": "Upward",
        "technicalSignals": "Golden Cross, Above 200 MA",
        "source": "Yahoo Finance",
        "sourceUrl": "https://finance.yahoo.com",
        "lastUpdated": "2023-09-16"
      },
      "nasdaq": {
        "value": "15,310.97",
        "change": "+1.28%",
        "trend": "Upward",
        "technicalSignals": "RSI 65, Above all MAs",
        "source": "Yahoo Finance",
        "sourceUrl": "https://finance.yahoo.com",
        "lastUpdated": "2023-09-16"
      },
      "dowJones": {
        "value": "34,509.03",
        "change": "+0.87%",
        "trend": "Upward",
        "technicalSignals": "MACD Positive, Above 50 MA",
        "source": "Yahoo Finance",
        "sourceUrl": "https://finance.yahoo.com",
        "lastUpdated": "2023-09-16"
      },
      "vix": {
        "value": "14.80",
        "change": "-5.12%",
        "trend": "Downward",
        "interpretation": "Low volatility, market confidence",
        "source": "CBOE",
        "sourceUrl": "https://www.cboe.com",
        "lastUpdated": "2023-09-16"
      }
    };
    
    expandedAnalysis.analysis.macroeconomicFactors = {
      "fedInterestRate": {
        "value": "5.25%",
        "change": "Unchanged",
        "nextMeeting": "September 20, 2023",
        "expectation": "Hold",
        "source": "Federal Reserve",
        "sourceUrl": "https://www.federalreserve.gov",
        "lastUpdated": "2023-09-16"
      },
      "inflation": {
        "cpiHeadline": {
          "value": "3.7%",
          "change": "-0.1%",
          "trend": "Decreasing",
          "source": "Bureau of Labor Statistics",
          "sourceUrl": "https://www.bls.gov",
          "lastUpdated": "2023-09-15"
        },
        "cpiCore": {
          "value": "4.3%",
          "change": "-0.2%",
          "trend": "Decreasing",
          "source": "Bureau of Labor Statistics",
          "sourceUrl": "https://www.bls.gov",
          "lastUpdated": "2023-09-15"
        },
        "pceHeadline": {
          "value": "3.3%",
          "change": "-0.1%",
          "trend": "Decreasing",
          "source": "Bureau of Economic Analysis",
          "sourceUrl": "https://www.bea.gov",
          "lastUpdated": "2023-09-14"
        },
        "pceCore": {
          "value": "4.1%",
          "change": "-0.1%",
          "trend": "Decreasing",
          "source": "Bureau of Economic Analysis",
          "sourceUrl": "https://www.bea.gov",
          "lastUpdated": "2023-09-14"
        }
      },
      "treasuryYields": {
        "threeMonth": {
          "value": "5.52%",
          "change": "+0.01%",
          "source": "U.S. Treasury",
          "sourceUrl": "https://www.treasury.gov",
          "lastUpdated": "2023-09-16"
        },
        "oneYear": {
          "value": "5.41%",
          "change": "-0.02%",
          "source": "U.S. Treasury",
          "sourceUrl": "https://www.treasury.gov",
          "lastUpdated": "2023-09-16"
        },
        "twoYear": {
          "value": "4.98%",
          "change": "-0.03%",
          "source": "U.S. Treasury",
          "sourceUrl": "https://www.treasury.gov",
          "lastUpdated": "2023-09-16"
        },
        "tenYear": {
          "value": "4.28%",
          "change": "-0.05%",
          "source": "U.S. Treasury",
          "sourceUrl": "https://www.treasury.gov",
          "lastUpdated": "2023-09-16"
        },
        "thirtyYear": {
          "value": "4.40%",
          "change": "-0.04%",
          "source": "U.S. Treasury",
          "sourceUrl": "https://www.treasury.gov",
          "lastUpdated": "2023-09-16"
        }
      },
      "gdpGrowth": {
        "value": "2.1%",
        "change": "+0.2%",
        "trend": "Increasing",
        "source": "Bureau of Economic Analysis",
        "sourceUrl": "https://www.bea.gov",
        "lastUpdated": "2023-09-14"
      },
      "unemploymentRate": {
        "value": "3.8%",
        "change": "+0.1%",
        "trend": "Stable",
        "source": "Bureau of Labor Statistics",
        "sourceUrl": "https://www.bls.gov",
        "lastUpdated": "2023-09-15"
      }
    };
    
    expandedAnalysis.analysis.fundamentalMetrics = {
      "stocks": [
        {
          "symbol": "AAPL",
          "name": "Apple Inc.",
          "price": "$182.63",
          "change": "+1.5%",
          "peRatio": "30.2",
          "marketCap": "$2.85T",
          "recommendation": "Buy",
          "analysis": "Strong product cycle with upcoming AI features",
          "source": "Yahoo Finance",
          "sourceUrl": "https://finance.yahoo.com",
          "lastUpdated": "2023-09-16"
        },
        {
          "symbol": "MSFT",
          "name": "Microsoft Corporation",
          "price": "$330.41",
          "change": "+0.8%",
          "peRatio": "35.6",
          "marketCap": "$2.46T",
          "recommendation": "Buy",
          "analysis": "Cloud growth and AI integration driving revenue",
          "source": "Yahoo Finance",
          "sourceUrl": "https://finance.yahoo.com",
          "lastUpdated": "2023-09-16"
        },
        {
          "symbol": "NVDA",
          "name": "NVIDIA Corporation",
          "price": "$418.76",
          "change": "+2.3%",
          "peRatio": "62.1",
          "marketCap": "$1.03T",
          "recommendation": "Buy",
          "analysis": "AI chip demand continues to exceed supply",
          "source": "Yahoo Finance",
          "sourceUrl": "https://finance.yahoo.com",
          "lastUpdated": "2023-09-16"
        },
        {
          "symbol": "AMZN",
          "name": "Amazon.com Inc.",
          "price": "$129.12",
          "change": "+1.1%",
          "peRatio": "101.3",
          "marketCap": "$1.33T",
          "recommendation": "Buy",
          "analysis": "AWS growth and retail margin improvements",
          "source": "Yahoo Finance",
          "sourceUrl": "https://finance.yahoo.com",
          "lastUpdated": "2023-09-16"
        },
        {
          "symbol": "GOOGL",
          "name": "Alphabet Inc.",
          "price": "$137.35",
          "change": "+0.9%",
          "peRatio": "26.4",
          "marketCap": "$1.73T",
          "recommendation": "Buy",
          "analysis": "Search dominance and AI integration",
          "source": "Yahoo Finance",
          "sourceUrl": "https://finance.yahoo.com",
          "lastUpdated": "2023-09-16"
        },
        {
          "symbol": "META",
          "name": "Meta Platforms Inc.",
          "price": "$300.21",
          "change": "+1.7%",
          "peRatio": "25.8",
          "marketCap": "$771B",
          "recommendation": "Buy",
          "analysis": "Ad revenue recovery and metaverse potential",
          "source": "Yahoo Finance",
          "sourceUrl": "https://finance.yahoo.com",
          "lastUpdated": "2023-09-16"
        },
        {
          "symbol": "TSLA",
          "name": "Tesla Inc.",
          "price": "$248.38",
          "change": "-0.5%",
          "peRatio": "71.2",
          "marketCap": "$788B",
          "recommendation": "Hold",
          "analysis": "EV competition increasing, but AI potential",
          "source": "Yahoo Finance",
          "sourceUrl": "https://finance.yahoo.com",
          "lastUpdated": "2023-09-16"
        },
        {
          "symbol": "JPM",
          "name": "JPMorgan Chase & Co.",
          "price": "$148.12",
          "change": "+0.6%",
          "peRatio": "11.2",
          "marketCap": "$430B",
          "recommendation": "Buy",
          "analysis": "Strong financial position, benefiting from rates",
          "source": "Yahoo Finance",
          "sourceUrl": "https://finance.yahoo.com",
          "lastUpdated": "2023-09-16"
        },
        {
          "symbol": "V",
          "name": "Visa Inc.",
          "price": "$235.76",
          "change": "+0.4%",
          "peRatio": "29.8",
          "marketCap": "$482B",
          "recommendation": "Buy",
          "analysis": "Payment volume growth and international expansion",
          "source": "Yahoo Finance",
          "sourceUrl": "https://finance.yahoo.com",
          "lastUpdated": "2023-09-16"
        },
        {
          "symbol": "JNJ",
          "name": "Johnson & Johnson",
          "price": "$167.89",
          "change": "-0.2%",
          "peRatio": "16.9",
          "marketCap": "$436B",
          "recommendation": "Hold",
          "analysis": "Stable healthcare business, litigation concerns",
          "source": "Yahoo Finance",
          "sourceUrl": "https://finance.yahoo.com",
          "lastUpdated": "2023-09-16"
        },
        {
          "symbol": "PG",
          "name": "Procter & Gamble Co.",
          "price": "$152.31",
          "change": "+0.3%",
          "peRatio": "24.8",
          "marketCap": "$359B",
          "recommendation": "Hold",
          "analysis": "Defensive stock with consistent dividends",
          "source": "Yahoo Finance",
          "sourceUrl": "https://finance.yahoo.com",
          "lastUpdated": "2023-09-16"
        },
        {
          "symbol": "HD",
          "name": "Home Depot Inc.",
          "price": "$317.45",
          "change": "+1.2%",
          "peRatio": "21.3",
          "marketCap": "$317B",
          "recommendation": "Buy",
          "analysis": "Housing market stabilization positive for growth",
          "source": "Yahoo Finance",
          "sourceUrl": "https://finance.yahoo.com",
          "lastUpdated": "2023-09-16"
        }
      ],
      "sectors": {
        "technology": {
          "performance": "+1.8%",
          "outlook": "Positive",
          "analysis": "AI and cloud computing driving growth",
          "source": "Sector Analysis Report",
          "sourceUrl": "https://www.sectoranalysis.com",
          "lastUpdated": "2023-09-16"
        },
        "healthcare": {
          "performance": "+0.5%",
          "outlook": "Neutral",
          "analysis": "Defensive sector with moderate growth",
          "source": "Sector Analysis Report",
          "sourceUrl": "https://www.sectoranalysis.com",
          "lastUpdated": "2023-09-16"
        },
        "financials": {
          "performance": "+0.9%",
          "outlook": "Positive",
          "analysis": "Benefiting from higher interest rates",
          "source": "Sector Analysis Report",
          "sourceUrl": "https://www.sectoranalysis.com",
          "lastUpdated": "2023-09-16"
        },
        "consumerDiscretionary": {
          "performance": "+0.7%",
          "outlook": "Neutral",
          "analysis": "Mixed signals on consumer spending",
          "source": "Sector Analysis Report",
          "sourceUrl": "https://www.sectoranalysis.com",
          "lastUpdated": "2023-09-16"
        },
        "consumerStaples": {
          "performance": "+0.3%",
          "outlook": "Neutral",
          "analysis": "Defensive sector with stable performance",
          "source": "Sector Analysis Report",
          "sourceUrl": "https://www.sectoranalysis.com",
          "lastUpdated": "2023-09-16"
        }
      }
    };
    
    expandedAnalysis.analysis.geopoliticalRisks = {
      "risks": [
        {
          "event": "Middle East Tensions",
          "severity": "Moderate",
          "potentialImpact": "Oil price volatility",
          "timeframe": "Ongoing",
          "source": "Geopolitical Monitor",
          "sourceUrl": "https://www.geopoliticalmonitor.com",
          "lastUpdated": "2023-09-16"
        },
        {
          "event": "US-China Trade Relations",
          "severity": "Low",
          "potentialImpact": "Technology sector headwinds",
          "timeframe": "Long-term",
          "source": "Geopolitical Monitor",
          "sourceUrl": "https://www.geopoliticalmonitor.com",
          "lastUpdated": "2023-09-16"
        },
        {
          "event": "European Energy Security",
          "severity": "Low",
          "potentialImpact": "Euro volatility",
          "timeframe": "Winter 2023-2024",
          "source": "Geopolitical Monitor",
          "sourceUrl": "https://www.geopoliticalmonitor.com",
          "lastUpdated": "2023-09-16"
        }
      ],
      "upcomingEvents": [
        {
          "date": "September 20, 2023",
          "event": "Federal Reserve Interest Rate Decision",
          "importance": "High",
          "source": "Economic Calendar",
          "sourceUrl": "https://www.economiccalendar.com",
          "lastUpdated": "2023-09-16"
        },
        {
          "date": "September 25, 2023",
          "event": "UN General Assembly Meeting",
          "importance": "Medium",
          "source": "Economic Calendar",
          "sourceUrl": "https://www.economiccalendar.com",
          "lastUpdated": "2023-09-16"
        },
        {
          "date": "October 5, 2023",
          "event": "OPEC+ Production Meeting",
          "importance": "Medium",
          "source": "Economic Calendar",
          "sourceUrl": "https://www.economiccalendar.com",
          "lastUpdated": "2023-09-16"
        }
      ]
    };
    
    // Calculate the next scheduled time using the actual function with test triggers
    const currentTime = new Date();
    const nextScheduledTime = getNextScheduledAnalysisTime(currentTime, true); // Use test triggers
    
    // Generate HTML using the expanded data
    const htmlOutput = generateHtmlFromAnalysisJson(expandedAnalysis, nextScheduledTime, true);
    
    // Save the HTML to a file for inspection
    const filename = `test_html_expanded_${new Date().getTime()}.html`;
    saveHtmlToFile(htmlOutput, filename);
    
    Logger.log(`Test HTML with expanded data saved to file: ${filename}`);
    return htmlOutput;
  } catch (error) {
    Logger.log(`Error in HTML generation test with expanded data: ${error}`);
    throw error;
  }
}

/**
 * Save HTML content to a file in Google Drive for testing
 * @param {String} htmlContent - The HTML content to save
 * @param {String} filename - The filename to use
 * @return {String} The URL of the created file
 */
function saveHtmlToFile(htmlContent, filename) {
  try {
    // Create a file in the user's Drive
    const file = DriveApp.createFile(filename, htmlContent, MimeType.HTML);
    
    // Log the file URL
    const fileUrl = file.getUrl();
    Logger.log(`HTML saved to file: ${fileUrl}`);
    
    // Return the file URL
    return fileUrl;
  } catch (error) {
    Logger.log(`Error saving HTML to file: ${error}`);
    return null;
  }
}

/**
 * Test function to verify OpenAI API integration with sample data
 * This function sends a test prompt to OpenAI and processes the response
 */
function testPromptWithSampleData() {
  // Get configuration
  const config = getConfig();
  
  // Create a sample prompt with comprehensive market data
  const prompt = `Analyze the following market data and provide a trading recommendation in JSON format:

MARKET SENTIMENT:
- Overall market sentiment: Cautiously optimistic
- Recent market performance: Major indices up 1.2% over the past week
- Analyst commentary:
  * Jim Cramer (CNBC): "Tech stocks showing resilience despite rate concerns" (Mentioned: AAPL, MSFT, NVDA)
  * Jane Smith (Bloomberg): "Banking sector remains under pressure from regional bank concerns" (Mentioned: JPM, BAC)
  * Michael Johnson (WSJ): "Consumer staples outperforming as defensive play" (Mentioned: PG, KO, WMT)

MARKET INDICATORS:
- S&P 500: 5,123.45 (+0.8%)
- Nasdaq: 16,234.56 (+1.1%)
- Dow Jones: 38,765.43 (+0.5%)
- VIX: 18.75 (-2.3%)
- Fear & Greed Index: 62 (Greed)
- Upcoming events:
  * Fed interest rate decision (March 26)
  * Monthly jobs report (April 1)
  * Q1 earnings season begins (April 10)

FUNDAMENTAL METRICS (Top 5 by market cap):
1. Apple (AAPL)
   - Price: $178.72 (+1.2%)
   - Volume: 75.3M (1.1x avg)
   - P/E: 29.5
   - Forward P/E: 27.8
   - PEG Ratio: 2.1
   - Price/Book: 35.6
   - Price/Sales: 7.8
   - Debt/Equity: 1.68
   - ROE: 160.09%
   - Beta: 1.28
   - Market Cap: $2.82T
   - Dividend Yield: 0.50%

2. Microsoft (MSFT)
   - Price: $415.50 (+0.9%)
   - Volume: 22.1M (0.9x avg)
   - P/E: 34.8
   - Forward P/E: 31.2
   - PEG Ratio: 2.0
   - Price/Book: 11.7
   - Price/Sales: 12.5
   - Debt/Equity: 0.35
   - ROE: 38.45%
   - Beta: 0.93
   - Market Cap: $3.09T
   - Dividend Yield: 0.73%

3. Nvidia (NVDA)
   - Price: $925.15 (+2.5%)
   - Volume: 41.2M (1.3x avg)
   - P/E: 76.2
   - Forward P/E: 35.6
   - PEG Ratio: 1.8
   - Price/Book: 45.3
   - Price/Sales: 36.2
   - Debt/Equity: 0.21
   - ROE: 70.12%
   - Beta: 1.75
   - Market Cap: $2.28T
   - Dividend Yield: 0.03%

4. Amazon (AMZN)
   - Price: $178.35 (+1.7%)
   - Volume: 30.5M (1.0x avg)
   - P/E: 61.5
   - Forward P/E: 42.3
   - PEG Ratio: 1.5
   - Price/Book: 8.9
   - Price/Sales: 3.1
   - Debt/Equity: 0.58
   - ROE: 14.89%
   - Beta: 1.22
   - Market Cap: $1.85T
   - Dividend Yield: 0.00%

5. Alphabet (GOOGL)
   - Price: $152.25 (+0.4%)
   - Volume: 18.7M (0.8x avg)
   - P/E: 26.1
   - Forward P/E: 21.5
   - PEG Ratio: 1.3
   - Price/Book: 6.2
   - Price/Sales: 6.5
   - Debt/Equity: 0.06
   - ROE: 25.13%
   - Beta: 1.05
   - Market Cap: $1.92T
   - Dividend Yield: 0.00%

MACROECONOMIC FACTORS:
- Treasury Yields:
  * 3-Month: 5.28% (+0.02%)
  * 1-Year: 5.15% (+0.01%)
  * 2-Year: 4.72% (-0.05%)
  * 10-Year: 4.31% (-0.08%)
  * 30-Year: 4.42% (-0.06%)
  * 2-10 Spread: -0.41% (inverted)
- Federal Reserve Policy:
  * Current Fed Funds Rate: 5.25-5.50%
  * Policy Stance: Restrictive
  * Outlook: Potential for 2-3 rate cuts in 2024
  * Market Impact: Cautious optimism on potential easing
- Inflation Metrics:
  * CPI: 3.1% (last month)
  * Core CPI: 3.8% (last month)
  * PCE: 2.4% (last month)
  * Core PCE: 2.8% (last month)
- Geopolitical Risks:
  * Middle East: Ongoing tensions (High Impact)
  * Russia-Ukraine: Continued conflict (Medium Impact)
  * US-China Relations: Trade tensions (Medium Impact)
  * US Election Year: Political uncertainty (Medium Impact)

Based on this comprehensive data, provide a trading recommendation in the following JSON format:

{
  "decision": "BUY", // Must be one of: "BUY", "SELL", "HOLD"
  "summary": "A brief one-sentence summary of your recommendation",
  "justification": "A detailed paragraph explaining your reasoning",
  "analysis": {
    "marketSentiment": {
      "overall": "Overall market sentiment assessment",
      "analysts": [
        {
          "analyst": "Analyst name",
          "source": "Source name (e.g., CNBC, Bloomberg)",
          "sourceUrl": "URL to the source if available",
          "timestamp": "When this analysis was made (e.g., March 24, 2024)",
          "comment": "Analyst's comment",
          "mentionedSymbols": ["AAPL", "MSFT"]
        }
      ]
    },
    "marketIndicators": {
      "indices": [
        {
          "name": "S&P 500",
          "value": "5,123.45",
          "change": "+0.8%",
          "source": "Source name",
          "sourceUrl": "URL to the source",
          "timestamp": "When this data was last updated"
        }
      ],
      "vix": {
        "value": "18.75",
        "interpretation": "Moderate volatility",
        "source": "Source name",
        "sourceUrl": "URL to the source",
        "timestamp": "When this data was last updated"
      },
      "fearGreedIndex": {
        "value": "62 (Greed)",
        "interpretation": "Market showing signs of greed",
        "source": "Source name",
        "sourceUrl": "URL to the source",
        "timestamp": "When this data was last updated"
      },
      "upcomingEvents": [
        {
          "date": "March 26",
          "event": "Fed interest rate decision",
          "potentialImpact": "High",
          "source": "Source name",
          "sourceUrl": "URL to the source",
          "timestamp": "When this data was last updated"
        }
      ]
    },
    "fundamentalMetrics": [
      {
        "symbol": "AAPL",
        "name": "Apple Inc.",
        "price": "$178.72",
        "priceChange": "+1.2%",
        "volume": "75.3M (1.1x avg)",
        "pegRatio": "2.1",
        "forwardPE": "27.8",
        "priceBook": "35.6",
        "priceSales": "7.8",
        "debtEquity": "1.68",
        "returnOnEquity": "160.09%",
        "beta": "1.28",
        "marketCap": "$2.82T",
        "dividendYield": "0.50%",
        "analysis": "Brief analysis of this stock's metrics",
        "recommendation": "Stock-specific recommendation",
        "source": "Source name",
        "sourceUrl": "https://source.url",
        "timestamp": "When this data was last updated"
      }
    ],
    "macroeconomicFactors": {
      "treasuryYields": {
        "threeMonth": "5.28% (+0.02%)",
        "oneYear": "5.15% (+0.01%)",
        "twoYear": "4.72% (-0.05%)",
        "tenYear": "4.31% (-0.08%)",
        "thirtyYear": "4.42% (-0.06%)",
        "twoTenSpread": "-0.41% (inverted)",
        "interpretation": "Yield curve remains inverted, suggesting caution",
        "source": "Source name",
        "sourceUrl": "https://source.url",
        "timestamp": "When this data was last updated"
      },
      "federalReservePolicy": {
        "currentRate": "5.25-5.50%",
        "stance": "Restrictive",
        "outlook": "Potential for 2-3 rate cuts in 2024",
        "marketImpact": "Cautious optimism on potential easing",
        "source": "Source name",
        "sourceUrl": "https://source.url",
        "timestamp": "When this data was last updated"
      },
      "inflation": {
        "cpi": "3.1%",
        "coreCpi": "3.8%",
        "pce": "2.4%",
        "corePce": "2.8%",
        "trend": "Gradually decreasing but still above target",
        "source": "Source name",
        "sourceUrl": "https://source.url",
        "timestamp": "When this data was last updated"
      },
      "geopoliticalRisks": {
        "regions": [
          {
            "region": "Middle East",
            "risks": [
              {
                "description": "Ongoing tensions affecting oil prices",
                "impactLevel": "High Impact",
                "timeframe": "Short to medium term",
                "source": "Source name",
                "sourceUrl": "https://source.url",
                "timestamp": "When this analysis was made"
              }
            ]
          }
        ],
        "overallRiskAssessment": "Elevated geopolitical risks warrant caution",
        "source": "Source name",
        "sourceUrl": "https://source.url",
        "timestamp": "When this analysis was made"
      }
    }
  },
  "source": "Market Pulse Daily",
  "timestamp": "March 24, 2024"
}

CRITICAL INSTRUCTIONS:
1. Your response MUST be valid JSON that can be parsed with JSON.parse()
2. Do NOT include any text outside the JSON object
3. Do NOT include markdown formatting
4. Include source, sourceUrl, and timestamp fields for ALL data points
5. Ensure all data freshness is indicated with timestamps
6. Your decision MUST be one of: "BUY", "SELL", or "HOLD"
7. Base your recommendation ONLY on the data provided above`;

  try {
    // Send the prompt to OpenAI
    const response = sendPromptToOpenAI(prompt, config.openaiApiKey);
    
    // Extract and clean the content
    const content = extractContentFromResponse(response);
    const analysisResult = cleanAnalysisResult(content);
    
    // Process the result
    const result = processAnalysisResult(analysisResult, true, "test_prompt_sample_data");
    
    // Log the result
    Logger.log("Test completed successfully!");
    Logger.log("Decision: " + analysisResult.decision);
    Logger.log("Summary: " + analysisResult.summary);
    
    // Return the HTML content URL for viewing
    return result.htmlUrl;
  } catch (error) {
    Logger.log("Error in testPromptWithSampleData: " + error.toString());
    throw error;
  }
}

/**
 * Test function to generate a trading analysis from sample data and save the JSON output
 * @param {String} sampleDataPath - Path to the sample data file (optional)
 * @return {Object} The result of the analysis
 */
function generateTradingAnalysisFromSample(sampleDataPath = null) {
  try {
    Logger.log("Generating trading analysis from sample data...");
    
    // Get the sample data
    let sampleData;
    if (sampleDataPath) {
      // Read from the provided file path
      const file = DriveApp.getFilesByName(sampleDataPath).next();
      if (!file) {
        throw new Error(`Sample data file not found: ${sampleDataPath}`);
      }
      sampleData = file.getBlob().getDataAsString();
    } else {
      // Use default sample data file
      const file = DriveApp.getFilesByName("sampleDataRetrieval.txt").next();
      if (!file) {
        throw new Error("Default sample data file 'sampleDataRetrieval.txt' not found");
      }
      sampleData = file.getBlob().getDataAsString();
    }
    
    // Get the OpenAI API key
    const config = getConfig();
    const apiKey = config.openAIApiKey;
    
    if (!apiKey) {
      throw new Error("OpenAI API key not found in configuration");
    }
    
    // Get the base prompt template
    const basePrompt = getTradingAnalysisPrompt();
    
    // Replace the placeholder for retrieved data with the actual sample data
    const fullPrompt = basePrompt + "\n\n**Retrieved Data:**\n" + sampleData;
    
    // Send the prompt to OpenAI
    Logger.log("Sending prompt to OpenAI...");
    const response = sendPromptToOpenAI(fullPrompt, apiKey);
    const content = extractContentFromResponse(response);
    Logger.log("Received response from OpenAI");
    
    // Parse the analysis result
    const analysisJson = cleanAnalysisResult(content);
    
    // Save the JSON output to a file
    const jsonOutput = JSON.stringify(analysisJson, null, 2);
    const jsonFile = DriveApp.createFile("chatGPTOutput.json", jsonOutput, MimeType.JSON);
    
    Logger.log(`JSON output saved to file: ${jsonFile.getName()}`);
    
    // For local development, also save to a local file if running in a local environment
    if (typeof process !== 'undefined') {
      // This is running in a Node.js environment
      const fs = require('fs');
      fs.writeFileSync('local_dev/chatGPTOutput.json', jsonOutput);
      Logger.log("JSON output also saved to local file: local_dev/chatGPTOutput.json");
    }
    
    // Process the analysis result (optional)
    const processResult = processAnalysisResult(analysisJson, true, "trading_analysis_sample.html");
    
    return {
      success: true,
      analysisResult: analysisJson,
      jsonFilePath: jsonFile.getUrl(),
      processResult: processResult
    };
  } catch (error) {
    Logger.log(`Error generating trading analysis from sample: ${error}`);
    return {
      success: false,
      error: error.toString()
    };
  }
}

/**
 * Local development version of the generateTradingAnalysisFromSample function
 * This version is designed to run in a Node.js environment
 * @param {String} sampleDataPath - Path to the sample data file
 * @return {Object} The result of the analysis
 */
function generateTradingAnalysisFromSampleLocal(sampleDataPath) {
  try {
    console.log("Generating trading analysis from sample data (local version)...");
    
    // Require necessary modules
    const fs = require('fs');
    const path = require('path');
    const axios = require('axios');
    
    // Read the sample data file
    const sampleData = fs.readFileSync(sampleDataPath, 'utf8');
    
    // Get the OpenAI API key from environment variable
    const apiKey = process.env.OPENAI_API_KEY;
    
    if (!apiKey) {
      throw new Error("OpenAI API key not found in environment variables. Set OPENAI_API_KEY first.");
    }
    
    // Create a base prompt similar to the one in getTradingAnalysisPrompt()
    const currentDate = new Date();
    const formattedDate = currentDate.toLocaleString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric', 
      hour: 'numeric', 
      minute: 'numeric', 
      timeZoneName: 'short' 
    });
    
    const basePrompt = "Optimized Trading Analysis Prompt for GPT-4.5 API\n\nToday's Date and Time: " + formattedDate + "\n\nInstructions:\nUsing ONLY the provided retrieved data below, generate a concise trading recommendation in JSON format as outlined:\n- Decision options: \"Buy Now\", \"Sell Now\", \"Watch for Better Price Action\"\n- Summarize market sentiment, key indicators, fundamental metrics, and macroeconomic factors clearly.\n- Provide detailed reasoning for your recommendation.\n- Include ALL available stock data in the fundamentalMetrics section.\n- Provide regional geopolitical analysis for each major region plus a global summary.\n- Include an overall market sentiment analysis summary.\n- Format inflation metrics to include CPI Headline, CPI Core, PCE Headline, and PCE Core with clear values.\n- Ensure all analyst comments are included in the marketSentiment section without timestamps in the display.\n\nOutput JSON Structure:\n{\n  \"decision\": \"Buy Now | Sell Now | Watch for Better Price Action\",\n  \"summary\": \"Brief, clear summary of your recommendation\",\n  \"analysis\": {\n    \"marketSentiment\": {\n      \"overall\": \"Brief overall market sentiment analysis\",\n      \"analysts\": [{\"analyst\": \"Analyst Name\", \"comment\": \"Brief commentary\", \"mentionedSymbols\": [\"TICKER\"], \"source\": \"Source name\", \"sourceUrl\": \"https://source.url\"}],\n      \"source\": \"Overall sentiment source\", \n      \"sourceUrl\": \"https://overall.source.url\",\n      \"lastUpdated\": \"YYYY-MM-DD HH:MM\"\n    },\n    \"marketIndicators\": {\n      \"fearGreedIndex\": {\"value\": 0, \"interpretation\": \"Brief interpretation\", \"source\": \"Source name\", \"sourceUrl\": \"https://source.url\", \"lastUpdated\": \"YYYY-MM-DD HH:MM\"},\n      \"vix\": {\"value\": 0, \"trend\": \"Brief trend\", \"analysis\": \"Brief analysis\", \"source\": \"Source name\", \"sourceUrl\": \"https://source.url\", \"lastUpdated\": \"YYYY-MM-DD HH:MM\"},\n      \"upcomingEvents\": [{\"event\": \"Event name\", \"date\": \"YYYY-MM-DD\"}],\n      \"source\": \"Events source\", \n      \"sourceUrl\": \"https://events.source.url\",\n      \"lastUpdated\": \"YYYY-MM-DD HH:MM\"\n    },\n    \"fundamentalMetrics\": [{\"symbol\": \"TICKER\", \"name\": \"Company Name\", \"price\": 0.00, \"priceChange\": \"+/-0.00 (0.00%)\", \"volume\": \"0M\", \"marketCap\": \"$0B\", \"dividendYield\": \"0.00%\", \"pegRatio\": 0, \"forwardPE\": 0, \"comment\": \"Brief analysis\", \"source\": \"Source name\", \"sourceUrl\": \"https://source.url\", \"lastUpdated\": \"YYYY-MM-DD HH:MM\"}],\n    \"macroeconomicFactors\": {\n      \"treasuryYields\": {\"threeMonth\": 0.00, \"oneYear\": 0.00, \"twoYear\": 0.00, \"tenYear\": 0.00, \"thirtyYear\": 0.00, \"yieldCurve\": \"normal|inverted|flat\", \"implications\": \"Brief analysis\", \"source\": \"Source name\", \"sourceUrl\": \"https://source.url\", \"lastUpdated\": \"YYYY-MM-DD HH:MM\"},\n      \"fedPolicy\": {\"federalFundsRate\": 0.00, \"forwardGuidance\": \"Brief statement\", \"source\": \"Source name\", \"sourceUrl\": \"https://source.url\", \"lastUpdated\": \"YYYY-MM-DD HH:MM\"},\n      \"inflation\": {\"currentRate\": 0.0, \"cpi\": {\"headline\": 0.0, \"core\": 0.0}, \"pce\": {\"headline\": 0.0, \"core\": 0.0}, \"trend\": \"Brief trend\", \"outlook\": \"Brief outlook\", \"marketImpact\": \"Brief market impact analysis\", \"source\": \"Source name\", \"sourceUrl\": \"https://source.url\", \"lastUpdated\": \"YYYY-MM-DD HH:MM\"},\n      \"geopoliticalRisks\": {\n        \"global\": \"Brief global geopolitical risk summary\",\n        \"regions\": [\n          {\n            \"region\": \"Region Name (e.g., North America, Europe, Asia, Middle East)\",\n            \"risks\": [{\"description\": \"Brief description\", \"impactLevel\": \"High|Moderate|Low\", \"source\": \"Source name\", \"sourceUrl\": \"https://source.url\", \"lastUpdated\": \"YYYY-MM-DD HH:MM\"}]\n          }\n        ],\n        \"source\": \"Overall geopolitical source\", \n        \"sourceUrl\": \"https://geopolitical.source.url\",\n        \"lastUpdated\": \"YYYY-MM-DD HH:MM\"\n      }\n    }\n  },\n  \"justification\": \"Clear, detailed explanation for your decision\",\n  \"source\": \"Overall analysis source\",\n  \"sourceUrl\": \"https://analysis.source.url\",\n  \"timestamp\": \"YYYY-MM-DD HH:MM\"\n}\n\nCRITICAL:\n- Do NOT retrieve or reference additional external information.\n- Use ONLY the data provided below.\n- Ensure your recommendation is directly supported by the given data.\n- Include ALL available stock data in the fundamentalMetrics section.\n- Provide regional geopolitical analysis for each major region plus a global summary.\n- Include an overall market sentiment analysis summary.\n- ALWAYS include source URLs and timestamps for ALL data points when available.\n- Ensure each section has information about the source and when the data was last updated.";
    
    // Combine the base prompt with the sample data
    const fullPrompt = basePrompt + "\n\n**Retrieved Data:**\n" + sampleData;
    
    // Prepare the API request
    const payload = {
      model: "gpt-4-turbo-preview",
      messages: [
        {
          role: "system",
          content: "You are an AI agent tasked with providing actionable trading recommendations in JSON format. Your analysis should be accurate and based ONLY on the data provided in the prompt - do not attempt to browse the web or retrieve additional information.\n\nCRITICAL: You MUST include ALL stocks mentioned in the fundamental metrics data. Do not omit any stocks. Include GOOGL, AMZN, META, TSLA, NVDA and any other stocks mentioned in the data.\n\nIMPORTANT: Return ONLY raw JSON without any markdown formatting, code blocks, or explanatory text. Do not wrap your response in ```json``` or any other formatting. Your entire response must be a valid, parseable JSON object with the structure specified in the prompt."
        },
        {
          role: "user",
          content: fullPrompt
        }
      ],
      temperature: 0.2,
      max_tokens: 4000
    };
    
    console.log("Sending prompt to OpenAI API...");
    
    // Make the API request
    axios.post('https://api.openai.com/v1/chat/completions', payload, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    })
    .then(response => {
      // Extract the content from the response
      const content = response.data.choices[0].message.content;
      
      // Clean and parse the JSON
      let analysisResult;
      try {
        analysisResult = JSON.parse(content);
      } catch (jsonError) {
        // If parsing fails, try to extract JSON from the content
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          analysisResult = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error("Could not extract JSON from response");
        }
      }
      
      // Save the JSON output to a file
      const jsonOutput = JSON.stringify(analysisResult, null, 2);
      fs.writeFileSync('local_dev/chatGPTOutput.json', jsonOutput);
      console.log("JSON output saved to file: local_dev/chatGPTOutput.json");
      
      return {
        success: true,
        analysisResult: analysisResult,
        jsonFilePath: 'local_dev/chatGPTOutput.json'
      };
    })
    .catch(error => {
      console.error(`Error calling OpenAI API: ${error}`);
      return {
        success: false,
        error: error.toString()
      };
    });
    
    return {
      success: true,
      message: "API request sent. Check console for results."
    };
  } catch (error) {
    console.error(`Error generating trading analysis from sample: ${error}`);
    return {
      success: false,
      error: error.toString()
    };
  }
}

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
    
    // Generate the data retrieval text for OpenAI
    const dataRetrievalText = generateDataRetrievalText();
    Logger.log("Generated data retrieval text for OpenAI");
    
    // Get the OpenAI API key
    const apiKey = getOpenAIApiKey();
    
    // Send the prompt to OpenAI
    Logger.log("Sending prompt to OpenAI...");
    const response = sendPromptToOpenAI(dataRetrievalText, apiKey);
    const content = extractContentFromResponse(response);
    Logger.log("Received response from OpenAI");
    
    // Parse the analysis result
    const analysisJson = cleanAnalysisResult(content);
    
    return analysisJson;
  } catch (error) {
    Logger.log("Error in getOpenAITradingAnalysis: " + error);
    throw new Error("Failed to get OpenAI trading analysis: " + error);
  }
}

/**
 * Main function to run the trading analysis
 * This is called by runTradingAnalysisWithDayCheck in Setup.gs
 * @return {String} Status message
 */
function runTradingAnalysis() {
  try {
    Logger.log("Starting trading analysis...");
    
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
    
    // Generate the data retrieval text for OpenAI
    const dataRetrievalText = generateDataRetrievalText();
    Logger.log("Generated data retrieval text for OpenAI");
    
    // Send the prompt via email for debugging purposes
    sendPromptEmail(dataRetrievalText);
    Logger.log("Sent prompt email");
    
    // Get the OpenAI API key
    const apiKey = getOpenAIApiKey();
    
    // Send the prompt to OpenAI
    Logger.log("Sending prompt to OpenAI...");
    const response = sendPromptToOpenAI(dataRetrievalText, apiKey);
    const content = extractContentFromResponse(response);
    Logger.log("Received response from OpenAI");
    
    // Parse the analysis result to extract the decision and justification
    const analysisJson = cleanAnalysisResult(content);
    const decision = analysisJson.decision || "Watch for Better Price Action";
    const justification = analysisJson.justification || "No clear justification provided.";
    Logger.log(`Trading decision: ${decision}`);
    
    // Get the current time
    const currentTime = new Date();
    
    // Calculate the next analysis time
    const nextAnalysisTime = getNextScheduledAnalysisTime(currentTime);
    
    // Generate a filename based on the current date and decision
    const dateStr = Utilities.formatDate(currentTime, TIME_ZONE, "yyyy-MM-dd");
    const decisionShort = decision.replace(/\s+/g, "_").toLowerCase();
    const filename = `trading_analysis_${dateStr}_${decisionShort}.html`;
    
    // Process the analysis result and save the HTML email
    const processResult = processAnalysisResult(analysisJson, false, filename, nextAnalysisTime);
    
    // Log the results
    if (processResult.htmlSaveResult && processResult.htmlSaveResult.success) {
      Logger.log(`HTML email saved to Google Drive: ${processResult.htmlSaveResult.fileUrl}`);
    } else {
      Logger.log("Warning: HTML email could not be saved to Google Drive");
    }
    
    if (processResult.emailResult) {
      Logger.log("Email sent successfully");
    } else {
      Logger.log("Warning: Email could not be sent");
    }
    
    Logger.log("Trading analysis completed successfully.");
    return "Trading analysis completed successfully.";
  } catch (error) {
    Logger.log("Error in runTradingAnalysis: " + error);
    
    // Try to send an error email
    try {
      sendErrorEmail("Trading Analysis Error", "The trading analysis failed with the following error: " + error);
    } catch (emailError) {
      Logger.log("Failed to send error email: " + emailError);
    }
    
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
    
    // Generate the data retrieval text for OpenAI
    const dataRetrievalText = generateDataRetrievalText();
    Logger.log("Generated data retrieval text for OpenAI");
    
    // Send the prompt via email for review
    sendPromptEmail(dataRetrievalText);
    Logger.log("Sent prompt email for review");
    
    // Display the first 500 characters of the prompt in the logs
    const previewLength = 500;
    const promptPreview = dataRetrievalText.length > previewLength 
      ? dataRetrievalText.substring(0, previewLength) + "..." 
      : dataRetrievalText;
    
    Logger.log("Prompt preview: " + promptPreview);
    
    return "Prompt generated and emailed successfully. Check your inbox for the complete prompt.";
  } catch (error) {
    Logger.log("Error in testGenerateAndEmailPrompt: " + error);
    return "Error: " + error;
  }
}

/**
 * Save HTML content to a specific folder in Google Drive
 * @param {String} htmlContent - The HTML content to save
 * @param {String} filename - The filename to use
 * @return {Object} The result of the operation with file URL and ID
 */
function saveHtmlToGoogleDrive(htmlContent, filename) {
  try {
    Logger.log(`Saving HTML to Google Drive with filename: ${filename}`);
    
    // Define the folder name where trading analysis emails will be stored
    const folderName = "Trading Analysis Emails";
    
    // Find or create the folder
    let folder;
    const folderIterator = DriveApp.getFoldersByName(folderName);
    
    if (folderIterator.hasNext()) {
      // Use existing folder
      folder = folderIterator.next();
      Logger.log(`Found existing folder: ${folderName}`);
    } else {
      // Create new folder
      folder = DriveApp.createFolder(folderName);
      Logger.log(`Created new folder: ${folderName}`);
    }
    
    // Check if a file with the same name already exists in the folder
    const fileIterator = folder.getFilesByName(filename);
    if (fileIterator.hasNext()) {
      // If file exists, delete it to avoid duplicates
      const existingFile = fileIterator.next();
      const existingFileId = existingFile.getId();
      Drive.Files.remove(existingFileId);
      Logger.log(`Removed existing file with ID: ${existingFileId}`);
    }
    
    // Create a new file in the folder
    const file = folder.createFile(filename, htmlContent, MimeType.HTML);
    const fileUrl = file.getUrl();
    const fileId = file.getId();
    
    Logger.log(`HTML saved to Google Drive: ${fileUrl}`);
    
    return {
      success: true,
      fileUrl: fileUrl,
      fileId: fileId,
      folderName: folderName
    };
  } catch (error) {
    Logger.log(`Error saving HTML to Google Drive: ${error}`);
    return {
      success: false,
      error: error.toString()
    };
  }
}

/**
 * Tests the next scheduled analysis time calculation
 * This function simulates different current times and days of the week
 * to verify that the next scheduled time is calculated correctly
 */
function testNextScheduledTime() {
  Logger.log("=== TESTING NEXT SCHEDULED TIME CALCULATION ===");
  
  // Test different scenarios
  const testCases = [
    { name: "Current time before morning schedule on Monday", 
      date: new Date(2025, 2, 24, 7, 0), // Monday 7:00 AM
      expected: "Monday morning" },
      
    { name: "Current time between morning and evening schedule on Monday", 
      date: new Date(2025, 2, 24, 12, 0), // Monday 12:00 PM
      expected: "Monday evening" },
      
    { name: "Current time after evening schedule on Monday", 
      date: new Date(2025, 2, 24, 20, 0), // Monday 8:00 PM
      expected: "Tuesday morning" },
      
    { name: "Current time before morning schedule on Friday", 
      date: new Date(2025, 2, 28, 7, 0), // Friday 7:00 AM
      expected: "Friday morning" },
      
    { name: "Current time after morning schedule on Friday", 
      date: new Date(2025, 2, 28, 12, 0), // Friday 12:00 PM
      expected: "Sunday evening" }, // No evening schedule on Friday, should go to Sunday
      
    { name: "Current time on Saturday", 
      date: new Date(2025, 2, 29, 12, 0), // Saturday 12:00 PM
      expected: "Sunday evening" }, // No schedules on Saturday, should go to Sunday
      
    { name: "Current time before evening schedule on Sunday", 
      date: new Date(2025, 2, 30, 12, 0), // Sunday 12:00 PM
      expected: "Sunday evening" },
      
    { name: "Current time after evening schedule on Sunday", 
      date: new Date(2025, 2, 30, 20, 0), // Sunday 8:00 PM
      expected: "Monday morning" }
  ];
  
  // Run each test case
  testCases.forEach(testCase => {
    Logger.log(`\nTesting: ${testCase.name}`);
    Logger.log(`Current time: ${testCase.date.toLocaleString()}`);
    
    const nextScheduled = getNextScheduledAnalysisTime(testCase.date);
    Logger.log(`Next scheduled time: ${nextScheduled.toLocaleString()}`);
    
    // Determine if the result matches the expected day and time period
    const dayOfWeek = nextScheduled.getDay();
    const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const timePeriod = nextScheduled.getHours() < 12 ? "morning" : "evening";
    const actualResult = `${dayNames[dayOfWeek]} ${timePeriod}`;
    
    Logger.log(`Expected: ${testCase.expected}, Actual: ${actualResult}`);
    Logger.log(`Test ${actualResult.toLowerCase() === testCase.expected.toLowerCase() ? "PASSED" : "FAILED"}`);
  });
  
  Logger.log("\n=== TEST SUMMARY ===");
  Logger.log(`Morning schedule: ${MORNING_SCHEDULE_HOUR}:${MORNING_SCHEDULE_MINUTE} (Monday-Friday)`);
  Logger.log(`Evening schedule: ${EVENING_SCHEDULE_HOUR}:${EVENING_SCHEDULE_MINUTE} (Sunday-Thursday)`);
  Logger.log("=== END OF TEST ===");
}
