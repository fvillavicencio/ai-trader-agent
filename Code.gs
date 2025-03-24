/**
 * AI Trading Agent - Main Script
 * 
 * This script analyzes financial data and sends trading decisions via email.
 * It uses OpenAI API for data analysis.
 */

/**
 * Main function to run the trading analysis
 */
function runTradingAnalysis() {
  try {
    Logger.log("Starting trading analysis...");
    
    // Get the analysis from OpenAI
    const analysisResult = getOpenAITradingAnalysis();
    
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
 * Calls the OpenAI API to get the trading analysis
 * 
 * @return {string} - The analysis result from OpenAI
 */
function getOpenAITradingAnalysis() {
  try {
    Logger.log("Starting analysis with OpenAI API...");
    
    // Retrieve all data from our modules
    Logger.log("Retrieving all trading data...");
    const allData = retrieveAllData();
    
    if (!allData.success) {
      Logger.log("Error retrieving data: " + allData.message);
      throw new Error("Failed to retrieve trading data: " + allData.message);
    }
    
    Logger.log("Successfully retrieved all trading data");
    
    // Generate the prompt with all our data
    const prompt = generateOpenAIPrompt(allData);
    Logger.log("Generated analysis prompt");
    
    // Send the prompt via email before passing it to OpenAI
    sendPromptEmail(prompt);
    Logger.log("Sent prompt email");
    
    const apiKey = getOpenAIApiKey();
    
    const payload = {
      model: "gpt-4-turbo-preview",  // Using GPT-4 Turbo Preview instead of non-existent GPT-4.5
      messages: [
        {
          role: "system",
          content: "You are an AI agent tasked with providing actionable trading recommendations in JSON format. Your analysis should be accurate and based ONLY on the data provided in the prompt - do not attempt to browse the web or retrieve additional information.\n\nIMPORTANT: Return ONLY raw JSON without any markdown formatting, code blocks, or explanatory text. Do not wrap your response in ```json``` or any other formatting. Your entire response must be a valid, parseable JSON object with the structure specified in the prompt."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      max_tokens: 4000,
      temperature: 0.7
    };
    
    Logger.log("Sending request to OpenAI API...");
    
    const options = {
      method: 'post',
      contentType: 'application/json',
      headers: {
        'Authorization': 'Bearer ' + apiKey
      },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };
    
    const response = UrlFetchApp.fetch('https://api.openai.com/v1/chat/completions', options);
    const responseCode = response.getResponseCode();
    const responseText = response.getContentText();
    
    Logger.log("OpenAI API response code: " + responseCode);
    
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

Given the lack of real-time data, the most prudent course of action is to watch for better price action. Please check that the OpenAI API is functioning correctly and try again later.`;
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

Given the lack of real-time data, the most prudent course of action is to watch for better price action. Please check that the OpenAI API is functioning correctly and try again later.`;
    }
    
    return result.choices[0].message.content;
  } catch (error) {
    Logger.log("Error in getOpenAITradingAnalysis: " + error.toString());
    throw error;
  }
}

/**
 * Extracts the trading decision and justification from the analysis result
 * 
 * @param {string} analysisResult - The analysis result from OpenAI
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
      Logger.log("Successfully parsed analysis JSON");
    } catch (jsonError) {
      Logger.log("Error parsing JSON: " + jsonError);
      
      // If JSON parsing fails, try to extract the decision and justification directly
      const decisionMatch = analysisResult.match(/Recommendation:\s*(Buy Now|Sell Now|Watch for Better Price Action)/i);
      const justificationMatch = analysisResult.match(/Justification:\s*([\s\S]*?)(?:\n\n|$)/i);
      
      const decision = decisionMatch ? decisionMatch[1] : "Watch for Better Price Action";
      const justification = justificationMatch ? justificationMatch[1].trim() : "Unable to parse justification from response.";
      
      // Return the extracted decision and justification
      return {
        decision: decision,
        justification: justification,
        analysisJson: null
      };
    }
    
    // Extract the decision and justification from the parsed JSON
    let decision = "Watch for Better Price Action"; // Default decision
    let justification = ""; // Default empty justification
    
    if (analysisJson) {
      // Extract decision
      if (analysisJson.decision) {
        decision = analysisJson.decision;
      }
      
      // Extract justification
      if (analysisJson.justification) {
        justification = analysisJson.justification;
      } else if (analysisJson.summary) {
        justification = analysisJson.summary;
      }
      
      // If there's an analysis section, enhance the justification with it
      if (analysisJson.analysis) {
        let enhancedJustification = justification + "\n\n";
        
        // Add market sentiment analysis
        if (analysisJson.analysis.marketSentiment && analysisJson.analysis.marketSentiment.length > 0) {
          enhancedJustification += "Market Sentiment:\n";
          analysisJson.analysis.marketSentiment.forEach(sentiment => {
            enhancedJustification += `- ${sentiment.analyst}: "${sentiment.comment}"\n`;
          });
          enhancedJustification += "\n";
        }
        
        // Add market indicators analysis
        if (analysisJson.analysis.marketIndicators) {
          enhancedJustification += "Market Indicators:\n";
          const indicators = analysisJson.analysis.marketIndicators;
          
          if (indicators.fearGreedIndex) {
            enhancedJustification += `- Fear & Greed Index: ${indicators.fearGreedIndex.value} (${indicators.fearGreedIndex.interpretation})\n`;
          }
          
          if (indicators.vix) {
            enhancedJustification += `- VIX: ${indicators.vix.value} (${indicators.vix.trend})\n`;
          }
          
          if (indicators.upcomingEvents && indicators.upcomingEvents.length > 0) {
            enhancedJustification += "- Upcoming Events:\n";
            indicators.upcomingEvents.forEach(event => {
              enhancedJustification += `  * ${event.event} (${event.date})\n`;
            });
          }
          
          enhancedJustification += "\n";
        }
        
        // Add fundamental metrics analysis
        if (analysisJson.analysis.fundamentalMetrics && analysisJson.analysis.fundamentalMetrics.length > 0) {
          enhancedJustification += "Fundamental Metrics:\n";
          
          // First, identify any stocks mentioned by analysts
          const mentionedStocks = [];
          if (analysisJson.analysis.marketSentiment) {
            analysisJson.analysis.marketSentiment.forEach(sentiment => {
              if (sentiment.mentionedSymbols && Array.isArray(sentiment.mentionedSymbols)) {
                mentionedStocks.push(...sentiment.mentionedSymbols);
              }
            });
          }
          
          // Process mentioned stocks first
          const processedSymbols = [];
          if (mentionedStocks.length > 0) {
            enhancedJustification += "Stocks Mentioned by Analysts:\n";
            mentionedStocks.forEach(mentionedSymbol => {
              const stockMetric = analysisJson.analysis.fundamentalMetrics.find(metric => 
                metric.symbol && metric.symbol.toUpperCase() === mentionedSymbol.toUpperCase()
              );
              
              if (stockMetric) {
                enhancedJustification += `- ${stockMetric.symbol} (${stockMetric.name}): ${stockMetric.comment || 'No specific analysis'}\n`;
                processedSymbols.push(stockMetric.symbol);
              }
            });
            enhancedJustification += "\n";
          }
          
          // Process remaining stocks
          enhancedJustification += "Other Key Stocks/ETFs:\n";
          analysisJson.analysis.fundamentalMetrics.forEach(metric => {
            if (!processedSymbols.includes(metric.symbol)) {
              enhancedJustification += `- ${metric.symbol} (${metric.name}): ${metric.comment || 'No specific analysis'}\n`;
            }
          });
          
          enhancedJustification += "\n";
        }
        
        // Add macroeconomic factors analysis
        if (analysisJson.analysis.macroeconomicFactors) {
          enhancedJustification += "Macroeconomic Factors:\n";
          const macro = analysisJson.analysis.macroeconomicFactors;
          
          if (macro.treasuryYields) {
            enhancedJustification += `- Treasury Yields: 2Y (${macro.treasuryYields.twoYear}%), 10Y (${macro.treasuryYields.tenYear}%)\n`;
            enhancedJustification += `  * Yield Curve: ${macro.treasuryYields.yieldCurve}\n`;
            enhancedJustification += `  * Implications: ${macro.treasuryYields.implications}\n`;
          }
          
          if (macro.fedPolicy) {
            enhancedJustification += `- Fed Policy: Federal Funds Rate (${macro.fedPolicy.federalFundsRate}%)\n`;
            enhancedJustification += `  * Next FOMC Meeting: ${macro.fedPolicy.fomcMeetingDate}\n`;
            enhancedJustification += `  * Forward Guidance: ${macro.fedPolicy.forwardGuidance}\n`;
          }
          
          if (macro.inflation) {
            enhancedJustification += `- Inflation: CPI Core (${macro.inflation.cpi.core}%), PCE Core (${macro.inflation.pce.core}%)\n`;
            enhancedJustification += `  * Trend: ${macro.inflation.trend}\n`;
            enhancedJustification += `  * Impact on Fed Policy: ${macro.inflation.impactOnFedPolicy}\n`;
          }
          
          if (macro.geopoliticalRisks && macro.geopoliticalRisks.length > 0) {
            enhancedJustification += "- Geopolitical Risks:\n";
            macro.geopoliticalRisks.forEach(risk => {
              enhancedJustification += `  * ${risk.description} (Regions: ${risk.regionsAffected.join(', ')})\n`;
              enhancedJustification += `    Impact: ${risk.potentialMarketImpact}\n`;
            });
          }
        }
        
        justification = enhancedJustification;
      }
    }
    
    // Return the extracted decision and justification
    return {
      decision: decision,
      justification: justification,
      analysisJson: analysisJson
    };
  } catch (error) {
    Logger.log("Error in parseAnalysisResult: " + error);
    
    // Return a default response in case of error
    return {
      decision: "Watch for Better Price Action",
      justification: "Unable to parse the analysis result: " + error,
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
      enhancedPrompt += data.marketSentiment + "\n";
    }
    
    // Add other data sections as they are implemented
    // (We'll add these in future updates)
    
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
    const result = retrieveMarketSentiment();
    Logger.log(JSON.stringify(result, null, 2));
    return "Market sentiment test completed successfully.";
  } catch (error) {
    Logger.log("Error in runTestMarketSentiment: " + error);
    return "Error: " + error;
  }
}

/**
 * Test function to verify that mentioned stocks are properly included in the fundamental metrics analysis
 */
function testMentionedStocksAnalysis() {
  try {
    Logger.log("Starting test for mentioned stocks analysis...");
    
    // Retrieve all data for trading analysis
    Logger.log("Retrieving all data for trading analysis...");
    const allData = retrieveAllData();
    
    if (!allData.success) {
      Logger.log(`Error retrieving data: ${allData.message}`);
      return;
    }
    
    // Extract mentioned stocks from market sentiment data using the improved function
    const mentionedStocks = extractMentionedStocks(allData.marketSentiment);
    
    Logger.log(`Found ${mentionedStocks.length} mentioned stocks: ${mentionedStocks.length > 0 ? mentionedStocks.join(', ') : 'None'}`);
    
    // Check if mentioned stocks are included in fundamental metrics
    const includedStocks = [];
    const missingStocks = [];
    
    if (allData.fundamentalMetrics && allData.fundamentalMetrics.success && 
        allData.fundamentalMetrics.data && Array.isArray(allData.fundamentalMetrics.data)) {
      
      const analyzedStocks = allData.fundamentalMetrics.data.map(stock => stock.symbol);
      
      mentionedStocks.forEach(stock => {
        if (analyzedStocks.includes(stock)) {
          includedStocks.push(stock);
        } else {
          missingStocks.push(stock);
        }
      });
    }
    
    // Store the results for final logging
    const results = {
      success: true,
      mentionedStocks: mentionedStocks,
      includedStocks: includedStocks,
      missingStocks: missingStocks
    };
    
    Logger.log(`Found ${mentionedStocks.length} mentioned stocks: ${mentionedStocks.length > 0 ? mentionedStocks.join(', ') : 'None'}`);
    Logger.log(`Included mentioned stocks: ${includedStocks.length > 0 ? includedStocks.join(', ') : 'None'}`);
    Logger.log(`Missing mentioned stocks: ${missingStocks.length > 0 ? missingStocks.join(', ') : 'None'}`);
    
    return results;
  } catch (error) {
    Logger.log(`Error testing mentioned stocks analysis: ${error}`);
    return {
      success: false,
      error: error.toString()
    };
  }
}

/**
 * Runs all test functions to verify the stock extraction and analysis functionality
 */
function runAllTests() {
  Logger.log("=== RUNNING ALL TESTS ===");
  
  // Test 1: Mentioned Stocks Extraction
  Logger.log("\n=== TEST 1: Mentioned Stocks Extraction ===");
  try {
    const extractionResult = testMentionedStocksExtraction();
    Logger.log(`Test result: ${extractionResult.success ? 'SUCCESS' : 'FAILURE'}`);
    if (extractionResult.extractedStocks) {
      Logger.log(`Extracted stocks: ${extractionResult.extractedStocks.join(', ')}`);
    }
    if (extractionResult.missingStocks && extractionResult.missingStocks.length > 0) {
      Logger.log(`Missing stocks: ${extractionResult.missingStocks.join(', ')}`);
    }
  } catch (error) {
    Logger.log(`Error running extraction test: ${error}`);
  }
  
  // Test 2: Mentioned Stocks Analysis
  Logger.log("\n=== TEST 2: Mentioned Stocks Analysis ===");
  try {
    const analysisResult = testMentionedStocksAnalysis();
    Logger.log(`Test result: ${analysisResult.success ? 'SUCCESS' : 'FAILURE'}`);
    if (analysisResult.mentionedStocks) {
      Logger.log(`Mentioned stocks: ${analysisResult.mentionedStocks.join(', ')}`);
    }
    if (analysisResult.includedStocks) {
      Logger.log(`Included stocks: ${analysisResult.includedStocks.join(', ')}`);
    }
    if (analysisResult.missingStocks) {
      Logger.log(`Missing stocks: ${analysisResult.missingStocks.join(', ')}`);
    }
  } catch (error) {
    Logger.log(`Error running analysis test: ${error}`);
  }
  
  Logger.log("\n=== ALL TESTS COMPLETED ===");
}
