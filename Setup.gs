/**
 * AI Trading Agent - One-Time Setup Script
 * 
 * This script automates the setup process for the AI Trading Agent:
 * 1. Creates time-based triggers for morning, midday, and evening analysis
 * 2. Sets up script properties for API key storage
 * 3. Performs initial validation tests
 * 4. Sends a confirmation email when setup is complete
 */

/**
 * Main setup function - Run this once to configure everything
 */
function setupTradingAgent() {
  try {
    // Display setup start message
    Logger.log("Starting AI Trading Agent setup...");
    
    // Step 1: Store the Perplexity API key in script properties (if provided)
    setupApiKey();
    
    // Step 2: Create time-based triggers
    setupTriggers();
    
    // Step 3: Validate the setup
    validateSetup();
    
    // Step 4: Send confirmation email
    sendSetupConfirmation();
    
    // Display setup completion message
    Logger.log("AI Trading Agent setup completed successfully!");
    Logger.log("The agent will run automatically at the scheduled times.");
    Logger.log("You can also run it manually by executing the runTradingAnalysis() function.");
    
    return "Setup completed successfully!";
  } catch (error) {
    Logger.log("Error during setup: " + error.message);
    return "Setup failed: " + error.message;
  }
}

/**
 * Stores the Perplexity API key in script properties
 */
function setupApiKey() {
  Logger.log("Setting up API key in script properties...");
  
  // Check if API key is already stored in script properties
  const scriptProperties = PropertiesService.getScriptProperties();
  let apiKey = scriptProperties.getProperty('PERPLEXITY_API_KEY');
  
  if (!apiKey) {
    // If no API key is found in script properties, use the one from Config.gs
    apiKey = PERPLEXITY_API_KEY;
    
    // Only store the API key if it's not the placeholder value
    if (apiKey && apiKey !== "YOUR_PERPLEXITY_API_KEY") {
      scriptProperties.setProperty('PERPLEXITY_API_KEY', apiKey);
      Logger.log("API key stored in script properties.");
    } else {
      throw new Error("Valid Perplexity API key not found. Please update the PERPLEXITY_API_KEY in Config.gs or set it in Script Properties.");
    }
  } else {
    Logger.log("API key already exists in script properties.");
  }
}

/**
 * Creates time-based triggers for morning, midday, and evening analysis
 * Uses an efficient approach with 3 triggers and day checking in the handler
 */
function setupTriggers() {
  Logger.log("Setting up time-based triggers...");
  
  // Delete any existing triggers to avoid duplicates
  deleteExistingTriggers();
  
  // Create morning trigger (9 AM ET, daily)
  ScriptApp.newTrigger('runTradingAnalysisWithDayCheck')
    .timeBased()
    .atHour(MORNING_SCHEDULE_HOUR)
    .nearMinute(MORNING_SCHEDULE_MINUTE)
    .everyDays(1) // Run every day
    .inTimezone(TIME_ZONE)
    .create();
  
  Logger.log(`Morning trigger created: ${MORNING_SCHEDULE_HOUR}:${MORNING_SCHEDULE_MINUTE} ${TIME_ZONE} (daily with weekday check)`);
  
  // Create midday trigger (12 PM ET, daily)
  ScriptApp.newTrigger('runTradingAnalysisWithDayCheck')
    .timeBased()
    .atHour(MIDDAY_SCHEDULE_HOUR)
    .nearMinute(MIDDAY_SCHEDULE_MINUTE)
    .everyDays(1) // Run every day
    .inTimezone(TIME_ZONE)
    .create();
  
  Logger.log(`Midday trigger created: ${MIDDAY_SCHEDULE_HOUR}:${MIDDAY_SCHEDULE_MINUTE} ${TIME_ZONE} (daily with weekday check)`);
  
  // Create evening trigger (6 PM ET, daily)
  ScriptApp.newTrigger('runTradingAnalysisWithDayCheck')
    .timeBased()
    .atHour(EVENING_SCHEDULE_HOUR)
    .nearMinute(EVENING_SCHEDULE_MINUTE)
    .everyDays(1) // Run every day
    .inTimezone(TIME_ZONE)
    .create();
  
  Logger.log(`Evening trigger created: ${EVENING_SCHEDULE_HOUR}:${EVENING_SCHEDULE_MINUTE} ${TIME_ZONE} (daily with weekday check)`);
}

/**
 * Wrapper function that checks if today is an appropriate day to run the analysis
 * Morning analysis: Monday-Friday (9 AM)
 * Midday analysis: Monday-Friday (12 PM)
 * Evening analysis: Sunday-Thursday (6 PM)
 * 
 * When manually executed, it will run regardless of the time
 * Also checks if today/tomorrow is a market trading day using Tradier API
 */
function runTradingAnalysisWithDayCheck() {
  const now = new Date();
  const hour = now.getHours();
  const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  
  // Check if this is a manual execution (not triggered by a time-based trigger)
  const executionType = checkExecutionType();
  
  if (executionType === 'MANUAL') {
    Logger.log("Manual execution detected - running trading analysis regardless of time");
    runTradingAnalysis();
    return;
  }
  
  // Check if today is a trading day for morning/midday reports
  // or if tomorrow is a trading day for evening reports
  const isTradingDay = checkTradingDay(now);
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const isTomorrowTradingDay = checkTradingDay(tomorrow);
  
  // Morning trigger (runs Monday-Friday at 9 AM)
  if (hour === MORNING_SCHEDULE_HOUR && dayOfWeek >= 1 && dayOfWeek <= 5) {
    // Only run if today is a trading day
    if (isTradingDay) {
      Logger.log("Running morning trading analysis (Monday-Friday)");
      runTradingAnalysis();
    } else {
      Logger.log("Skipping morning trading analysis: today is not a trading day");
    }
    return;
  }
  
  // Midday trigger (runs Monday-Friday at 12 PM)
  if (hour === MIDDAY_SCHEDULE_HOUR && dayOfWeek >= 1 && dayOfWeek <= 5) {
    // Only run if today is a trading day
    if (isTradingDay) {
      Logger.log("Running midday trading analysis (Monday-Friday)");
      runTradingAnalysis();
    } else {
      Logger.log("Skipping midday trading analysis: today is not a trading day");
    }
    return;
  }
  
  // Evening trigger (runs Sunday-Thursday at 6 PM)
  // Sunday (dayOfWeek = 0) OR Monday-Thursday (dayOfWeek = 1-4)
  if (hour === EVENING_SCHEDULE_HOUR && ((dayOfWeek === 0) || (dayOfWeek >= 1 && dayOfWeek <= 4))) {
    // Only run if tomorrow is a trading day
    if (isTomorrowTradingDay) {
      Logger.log("Running evening trading analysis (Sunday-Thursday)");
      runTradingAnalysis();
    } else {
      Logger.log("Skipping evening trading analysis: tomorrow is not a trading day");
    }
    return;
  }
  
  Logger.log("Trigger activated but skipping execution: not a scheduled day for this time slot");
}

/**
 * Test function for checkTradingDay
 * Tests both today and tomorrow at 10 AM
 */
function testTradingDayCheck() {
  // Get today's date at 10 AM
  const today = new Date();
  today.setHours(10, 0, 0, 0);
  
  // Get tomorrow's date at 10 AM
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  // Format dates for display
  const todayFormatted = Utilities.formatDate(today, "America/New_York", "yyyy-MM-dd HH:mm:ss");
  const tomorrowFormatted = Utilities.formatDate(tomorrow, "America/New_York", "yyyy-MM-dd HH:mm:ss");
  
  // Check if today is a trading day
  const isTodayTradingDay = checkTradingDay(today);
  
  // Check if tomorrow is a trading day
  const isTomorrowTradingDay = checkTradingDay(tomorrow);
  
  // Log the results
  Logger.log(`===== TRADING DAY CHECK RESULTS =====`);
  Logger.log(`Today (${todayFormatted}): ${isTodayTradingDay ? "IS a trading day" : "is NOT a trading day"}`);
  Logger.log(`Tomorrow (${tomorrowFormatted}): ${isTomorrowTradingDay ? "IS a trading day" : "is NOT a trading day"}`);
  
  // Return the results as an object
  return {
    today: {
      date: todayFormatted,
      isTradingDay: isTodayTradingDay
    },
    tomorrow: {
      date: tomorrowFormatted,
      isTradingDay: isTomorrowTradingDay
    }
  };
}

/**
 * Alternative implementation that uses a hardcoded list of market holidays
 * This is used as a fallback when the Tradier API call fails
 * @param {Date} date - The date to check
 * @return {boolean} - True if the date is a trading day, false otherwise
 */
function isMarketHoliday(date) {
  // Format the date as YYYY-MM-DD
  const formattedDate = Utilities.formatDate(date, "America/New_York", "yyyy-MM-dd");
  
  // Get the year of the date
  const year = date.getFullYear();
  
  // List of market holidays for 2025 and 2026
  // Source: https://www.nyse.com/markets/hours-calendars
  const marketHolidays = {
    2025: [
      "2025-01-01", // New Year's Day
      "2025-01-20", // Martin Luther King, Jr. Day
      "2025-02-17", // Presidents' Day
      "2025-04-18", // Good Friday
      "2025-05-26", // Memorial Day
      "2025-06-19", // Juneteenth National Independence Day
      "2025-07-04", // Independence Day
      "2025-09-01", // Labor Day
      "2025-11-27", // Thanksgiving Day
      "2025-12-25"  // Christmas Day
    ],
    2026: [
      "2026-01-01", // New Year's Day
      "2026-01-19", // Martin Luther King, Jr. Day
      "2026-02-16", // Presidents' Day
      "2026-04-03", // Good Friday
      "2026-05-25", // Memorial Day
      "2026-06-19", // Juneteenth National Independence Day
      "2026-07-03", // Independence Day (observed)
      "2026-09-07", // Labor Day
      "2026-11-26", // Thanksgiving Day
      "2026-12-25"  // Christmas Day
    ]
  };
  
  // Select the appropriate holiday list based on the year
  const holidayList = marketHolidays[year] || [];
  
  // If we don't have data for this year, log a warning
  if (holidayList.length === 0) {
    Logger.log(`Warning: No market holiday data available for ${year}. Using weekend check only.`);
  }
  
  // Check if the date is in the list of market holidays
  return holidayList.includes(formattedDate);
}

/**
 * Checks if a given date is a market trading day
 * @param {Date} date - The date to check
 * @return {boolean} - True if the date is a trading day, false otherwise
 */
function checkTradingDay(date) {
  try {
    // First, check if it's a weekend
    const dayOfWeek = date.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      Logger.log(`${Utilities.formatDate(date, "America/New_York", "yyyy-MM-dd")} is a weekend (not a trading day)`);
      return false;
    }
    
    // Then check if it's a market holiday
    if (isMarketHoliday(date)) {
      Logger.log(`${Utilities.formatDate(date, "America/New_York", "yyyy-MM-dd")} is a market holiday (not a trading day)`);
      return false;
    }
    
    // If it's not a weekend or a holiday, it's a trading day
    return true;
    
    // The code below is the original implementation using Tradier API
    // It's commented out because it's not working correctly
    /*
    // Format the date as YYYY-MM-DD
    const formattedDate = Utilities.formatDate(date, "America/New_York", "yyyy-MM-dd");
    
    // Get the calendar for the month containing the date
    const calendar = fetchTradierCalendar(date);
    
    // If we couldn't get the calendar, assume it's a trading day
    if (!calendar || !calendar.days || !calendar.days.day) {
      Logger.log("Could not retrieve market calendar from Tradier API. Assuming it's a trading day.");
      return true;
    }
    
    // Check if the date is in the calendar and is a market holiday
    const days = calendar.days.day;
    for (let i = 0; i < days.length; i++) {
      const day = days[i];
      if (day.date === formattedDate) {
        // If status is not defined or is "open", it's a trading day
        if (!day.status || day.status === "open") {
          return true;
        }
        // If status is "closed", check if it's a holiday or weekend
        if (day.status === "closed") {
          // If it's a holiday, it's not a trading day
          if (day.description && day.description !== "Market Holiday") {
            Logger.log(`Market closed on ${formattedDate}: ${day.description}`);
            return false;
          }
          // If it's a weekend, it's not a trading day
          const dayNum = date.getDay();
          if (dayNum === 0 || dayNum === 6) {
            return false;
          }
          // Otherwise, assume it's a trading day
          return true;
        }
      }
    }
    
    // If we didn't find the date in the calendar, check if it's a weekend
    const dayNum = date.getDay();
    if (dayNum === 0 || dayNum === 6) {
      return false;
    }
    
    // If it's not a weekend and not in the calendar, assume it's a trading day
    return true;
    */
  } catch (error) {
    Logger.log(`Error checking if ${date} is a trading day: ${error}`);
    // In case of error, assume it's a trading day to avoid skipping reports
    return true;
  }
}

/**
 * Fetches the market calendar from Tradier API for a given month
 * @param {Date} date - Any date in the month to fetch
 * @return {Object} - The calendar object or null if there was an error
 */
function fetchTradierCalendar(date) {
  try {
    // Format the date as YYYY-MM for the API request
    const month = Utilities.formatDate(date, "America/New_York", "yyyy-MM");
    
    // Get the Tradier API token
    const apiToken = PropertiesService.getScriptProperties().getProperty('TRADIER_API_KEY');
    if (!apiToken) {
      Logger.log("Tradier API token not found in script properties");
      return null;
    }
    
    // Determine the base URL based on environment
    const baseUrl = "https://api.tradier.com/v1"; // Production URL
    
    // Construct the URL for the calendar endpoint
    const url = `${baseUrl}/markets/calendar?month=${month}`;
    
    // Make the API request
    const options = {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Accept': 'application/json'
      },
      muteHttpExceptions: true
    };
    
    const response = UrlFetchApp.fetch(url, options);
    const responseCode = response.getResponseCode();
    
    if (responseCode !== 200) {
      Logger.log(`Error fetching market calendar: HTTP ${responseCode}`);
      return null;
    }
    
    const responseText = response.getContentText();
    const data = JSON.parse(responseText);
    
    // Return the calendar object
    return data.calendar;
  } catch (error) {
    Logger.log(`Error fetching market calendar: ${error}`);
    return null;
  }
}

/**
 * Determines if the current execution is manual or triggered
 * @return {string} 'MANUAL' for manual execution, 'TRIGGER' for trigger-based execution
 */
function checkExecutionType() {
  try {
    // Get the current trigger
    const triggers = ScriptApp.getProjectTriggers();
    const executionId = ScriptApp.getScriptId();
    const triggerUid = Session.getEffectiveUser().getEmail();
    
    // If we can't determine, assume it's a manual execution
    if (!triggers || triggers.length === 0) {
      return 'MANUAL';
    }
    
    // Check if any of the triggers match the current execution
    for (let i = 0; i < triggers.length; i++) {
      const trigger = triggers[i];
      if (trigger.getHandlerFunction() === 'runTradingAnalysisWithDayCheck') {
        // This is a bit of a hack, but if we find a matching trigger,
        // we'll assume this is a trigger-based execution
        return 'TRIGGER';
      }
    }
    
    // If no matching trigger was found, it's likely a manual execution
    return 'MANUAL';
  } catch (error) {
    Logger.log('Error determining execution type: ' + error);
    // Default to manual if we can't determine
    return 'MANUAL';
  }
}

/**
 * Deletes all existing triggers to avoid duplicates
 */
function deleteExistingTriggers() {
  const triggers = ScriptApp.getProjectTriggers();
  for (let i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === 'runTradingAnalysis' || 
        triggers[i].getHandlerFunction() === 'runTradingAnalysisWithDayCheck') {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }
  Logger.log(`Deleted ${triggers.length} existing trigger(s).`);
}

/**
 * Validates the setup by checking API key and required functions
 */
function validateSetup() {
  Logger.log("Validating setup...");
  
  // Check if API key is valid
  const apiKey = getPerplexityApiKey();
  if (!apiKey || apiKey === "YOUR_PERPLEXITY_API_KEY") {
    throw new Error("Invalid Perplexity API key. Please update it in Config.gs or Script Properties.");
  }
  
  // Check if required functions exist
  if (typeof runTradingAnalysis !== 'function') {
    throw new Error("runTradingAnalysis function not found. Please make sure Code.gs is properly set up.");
  }
  
  if (typeof getTradingAnalysisPrompt !== 'function') {
    throw new Error("getTradingAnalysisPrompt function not found. Please make sure Prompt.gs is properly set up.");
  }
  
  if (typeof sendTradingDecisionEmail !== 'function') {
    throw new Error("sendTradingDecisionEmail function not found. Please make sure Email.gs is properly set up.");
  }
  
  Logger.log("Setup validation completed successfully.");
}

/**
 * Sends a confirmation email to all recipients
 */
function sendSetupConfirmation() {
  Logger.log("Sending setup confirmation email...");
  
  const subject = "[AI Trading Agent] Setup Completed Successfully";
  const body = `
The AI Trading Agent has been successfully set up!

Configuration Details:
- Morning Analysis: ${MORNING_SCHEDULE_HOUR}:${MORNING_SCHEDULE_MINUTE} ${TIME_ZONE} (Monday-Friday)
- Midday Analysis: ${MIDDAY_SCHEDULE_HOUR}:${MIDDAY_SCHEDULE_MINUTE} ${TIME_ZONE} (Monday-Friday)
- Evening Analysis: ${EVENING_SCHEDULE_HOUR}:${EVENING_SCHEDULE_MINUTE} ${TIME_ZONE} (Sunday-Thursday)
- Schedule: Runs three times daily from Sunday evening to Friday morning (excluding Saturday, Friday evening, and Sunday morning)
- Recipients: ${RECIPIENT_EMAILS.join(", ")}

The agent will begin sending trading analysis emails at the next scheduled time.
You can also run it manually by executing the runTradingAnalysis() function.

This is an automated message from your AI Trading Agent setup script.
`;
  
  // Send confirmation email to all recipients
  RECIPIENT_EMAILS.forEach(recipient => {
    GmailApp.sendEmail(recipient, subject, body);
  });
  
  Logger.log("Setup confirmation email sent to all recipients.");
}

/**
 * Manually run a test analysis (without sending emails)
 */
function testTradingAnalysis() {
  Logger.log("Running test trading analysis...");
  
  try {
    // Get the trading analysis from OpenAI
    const analysisResult = getOpenAITradingAnalysis();
    Logger.log("Analysis received from OpenAI.");
    
    // Extract the decision and justification from the analysis
    const { decision, justification } = parseAnalysisResult(analysisResult);
    Logger.log(`Decision: ${decision}`);
    
    // Get the current time and calculate the next analysis time
    const currentTime = new Date();
    const nextAnalysisTime = calculateNextAnalysisTime(currentTime);
    
    // Format the email body (but don't send it)
    Logger.log("Test completed successfully. Email would contain:");
    Logger.log(`Decision: ${decision}`);
    Logger.log(`Next Analysis: ${nextAnalysisTime.toLocaleString('en-US', { timeZone: TIME_ZONE })}`);
    
    return "Test completed successfully. Check the logs for details.";
  } catch (error) {
    Logger.log("Error in test: " + error.message);
    return "Test failed: " + error.message;
  }
}

/**
 * View the current trigger configuration
 */
function viewTriggerConfig() {
  const triggers = ScriptApp.getProjectTriggers();
  let triggerInfo = "Current Trigger Configuration:\n\n";
  
  if (triggers.length === 0) {
    triggerInfo += "No triggers currently set up.";
  } else {
    triggers.forEach((trigger, index) => {
      triggerInfo += `Trigger ${index + 1}:\n`;
      triggerInfo += `- Function: ${trigger.getHandlerFunction()}\n`;
      
      // Get trigger type and details
      const triggerType = trigger.getEventType();
      triggerInfo += `- Type: ${triggerType}\n`;
      
      if (triggerType === ScriptApp.EventType.CLOCK) {
        const timezone = trigger.getTriggerSource() === ScriptApp.TriggerSource.CLOCK ? trigger.getTriggerSourceId() : "Unknown";
        triggerInfo += `- Time: ${trigger.getAtHour()}:${trigger.getAtMinute()}\n`;
        triggerInfo += `- Timezone: ${timezone}\n`;
        triggerInfo += `- Frequency: ${trigger.getTriggerSourceId()}\n`;
      }
      
      triggerInfo += "\n";
    });
  }
  
  Logger.log(triggerInfo);
  return triggerInfo;
}

/**
 * Sets up the required script properties for the application
 * This should be run once to initialize the necessary properties
 */
function setupScriptProperties() {
  const scriptProperties = PropertiesService.getScriptProperties();
  
  // Set up the recipient email
  const recipientEmail = Session.getActiveUser().getEmail();
  scriptProperties.setProperty('RECIPIENT_EMAIL', recipientEmail);
  
  // Set up any other required properties
  // scriptProperties.setProperty('OPENAI_API_KEY', 'your-api-key-here');
  
  Logger.log("Script properties have been set up successfully.");
  Logger.log("Recipient email set to: " + recipientEmail);
}

/**
 * View the current script properties (for debugging)
 */
function viewScriptProperties() {
  const scriptProperties = PropertiesService.getScriptProperties();
  const properties = scriptProperties.getProperties();
  
  Logger.log("Current script properties:");
  for (const key in properties) {
    // Mask API keys for security
    if (key.includes('API_KEY')) {
      Logger.log(key + ": " + "*".repeat(10));
    } else {
      Logger.log(key + ": " + properties[key]);
    }
  }
}

/**
 * Clears all script properties
 * Use with caution as this will remove all stored properties
 */
function clearScriptProperties() {
  const scriptProperties = PropertiesService.getScriptProperties();
  scriptProperties.deleteAllProperties();
  Logger.log("All script properties have been cleared.");
}

/**
 * Sets up the required script properties for the Market Pulse Daily application
 * Run this function once to initialize all necessary script properties
 */
function setupScriptProperties() {
  const scriptProperties = PropertiesService.getScriptProperties();
  
  // Set the admin email for debug and prompt emails
  scriptProperties.setProperty('ADMIN_EMAIL', 'fvillavicencio@gmail.com');
  
  // Set debug mode (true/false)
  scriptProperties.setProperty('DEBUG_MODE', 'true');
  
  // Set whether to send prompt emails
  scriptProperties.setProperty('SEND_PROMPT_EMAILS', 'true');
  
  // Set the newsletter name
  scriptProperties.setProperty('NEWSLETTER_NAME', 'Market Pulse Daily');
  
  // Set the time zone
  scriptProperties.setProperty('TIME_ZONE', 'America/New_York');
  
  // Set the output folder name for Google Drive files
  scriptProperties.setProperty('OUTPUT_FOLDER_NAME', 'Market Pulse Daily');
  
  // Log the current script properties
  const allProperties = scriptProperties.getProperties();
  Logger.log('Script properties set up successfully:');
  for (const key in allProperties) {
    // Don't log API keys for security
    if (key.includes('API_KEY')) {
      Logger.log(`${key}: [REDACTED]`);
    } else {
      Logger.log(`${key}: ${allProperties[key]}`);
    }
  }
  
  return 'Script properties set up successfully';
}

/**
 * Gets all script properties (for debugging)
 */
function getScriptProperties() {
  const scriptProperties = PropertiesService.getScriptProperties();
  const allProperties = scriptProperties.getProperties();
  
  Logger.log('Current script properties:');
  for (const key in allProperties) {
    // Don't log API keys for security
    if (key.includes('API_KEY')) {
      Logger.log(`${key}: [REDACTED]`);
    } else {
      Logger.log(`${key}: ${allProperties[key]}`);
    }
  }
  
  return allProperties;
}
