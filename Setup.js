/**
 * AI Trading Agent - One-Time Setup Script
 * 
 * This script automates the setup process for the AI Trading Agent:
 * 1. Creates time-based triggers for morning and evening analysis
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
 * Creates time-based triggers for morning and evening analysis
 * Uses a more efficient approach with just 2 triggers and day checking in the handler
 */
function setupTriggers() {
  Logger.log("Setting up time-based triggers...");
  
  // Delete any existing triggers to avoid duplicates
  deleteExistingTriggers();
  
  // Create a single morning trigger (daily)
  ScriptApp.newTrigger('runTradingAnalysisWithDayCheck')
    .timeBased()
    .atHour(MORNING_SCHEDULE_HOUR)
    .nearMinute(MORNING_SCHEDULE_MINUTE)
    .everyDays(1) // Run every day
    .inTimezone(TIME_ZONE)
    .create();
  
  Logger.log(`Morning trigger created: ${MORNING_SCHEDULE_HOUR}:${MORNING_SCHEDULE_MINUTE} ${TIME_ZONE} (daily with weekday check)`);
  
  // Create a single evening trigger (daily)
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
 * Morning analysis: Monday-Friday
 * Evening analysis: Sunday-Thursday
 */
function runTradingAnalysisWithDayCheck() {
  const now = new Date();
  const hour = now.getHours();
  const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  
  // Morning trigger (runs Monday-Friday)
  if (hour === MORNING_SCHEDULE_HOUR && dayOfWeek >= 1 && dayOfWeek <= 5) {
    Logger.log("Running morning trading analysis (weekday)");
    runTradingAnalysis();
    return;
  }
  
  // Evening trigger (runs Sunday-Thursday)
  if (hour === EVENING_SCHEDULE_HOUR && (dayOfWeek === 0 || (dayOfWeek >= 1 && dayOfWeek <= 4))) {
    Logger.log("Running evening trading analysis (Sunday-Thursday)");
    runTradingAnalysis();
    return;
  }
  
  Logger.log("Trigger activated but skipping execution: not a scheduled day for this time slot");
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
- Evening Analysis: ${EVENING_SCHEDULE_HOUR}:${EVENING_SCHEDULE_MINUTE} ${TIME_ZONE} (Sunday-Thursday)
- Schedule: Runs twice daily from Sunday evening to Friday morning (excluding Saturday, Friday evening, and Sunday morning)
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
