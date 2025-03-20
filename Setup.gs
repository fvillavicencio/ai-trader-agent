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
    
    // Step 1: Store the OpenAI API key in script properties (if provided)
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
 * Stores the OpenAI API key in script properties
 */
function setupApiKey() {
  Logger.log("Setting up API key in script properties...");
  
  // Check if API key is already stored in script properties
  const scriptProperties = PropertiesService.getScriptProperties();
  let apiKey = scriptProperties.getProperty('OPENAI_API_KEY');
  
  if (!apiKey) {
    // If no API key is found in script properties, use the one from Config.gs
    apiKey = OPENAI_API_KEY;
    
    // Only store the API key if it's not the placeholder value
    if (apiKey && apiKey !== "YOUR_OPENAI_API_KEY") {
      scriptProperties.setProperty('OPENAI_API_KEY', apiKey);
      Logger.log("API key stored in script properties.");
    } else {
      throw new Error("Valid OpenAI API key not found. Please update the OPENAI_API_KEY in Config.gs or set it in Script Properties.");
    }
  } else {
    Logger.log("API key already exists in script properties.");
  }
}

/**
 * Creates time-based triggers for morning and evening analysis
 */
function setupTriggers() {
  Logger.log("Setting up time-based triggers...");
  
  // Delete any existing triggers to avoid duplicates
  deleteExistingTriggers();
  
  // Create morning trigger (9:15 AM ET)
  ScriptApp.newTrigger('runTradingAnalysis')
    .timeBased()
    .atHour(MORNING_SCHEDULE_HOUR)
    .nearMinute(MORNING_SCHEDULE_MINUTE)
    .everyDays(1)
    .inTimezone(TIME_ZONE)
    .create();
  Logger.log(`Morning trigger created: ${MORNING_SCHEDULE_HOUR}:${MORNING_SCHEDULE_MINUTE} ${TIME_ZONE}`);
  
  // Create evening trigger (6:00 PM ET)
  ScriptApp.newTrigger('runTradingAnalysis')
    .timeBased()
    .atHour(EVENING_SCHEDULE_HOUR)
    .nearMinute(EVENING_SCHEDULE_MINUTE)
    .everyDays(1)
    .inTimezone(TIME_ZONE)
    .create();
  Logger.log(`Evening trigger created: ${EVENING_SCHEDULE_HOUR}:${EVENING_SCHEDULE_MINUTE} ${TIME_ZONE}`);
}

/**
 * Deletes all existing triggers to avoid duplicates
 */
function deleteExistingTriggers() {
  const triggers = ScriptApp.getProjectTriggers();
  for (let i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === 'runTradingAnalysis') {
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
  const apiKey = getOpenAIApiKey();
  if (!apiKey || apiKey === "YOUR_OPENAI_API_KEY") {
    throw new Error("Invalid OpenAI API key. Please update it in Config.gs or Script Properties.");
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
- Morning Analysis: ${MORNING_SCHEDULE_HOUR}:${MORNING_SCHEDULE_MINUTE} ${TIME_ZONE}
- Evening Analysis: ${EVENING_SCHEDULE_HOUR}:${EVENING_SCHEDULE_MINUTE} ${TIME_ZONE}
- Model: ${OPENAI_MODEL}
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
    const analysisResult = getOpenAIAnalysis();
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
