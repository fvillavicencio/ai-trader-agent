// Import the TIME_ZONE constant from Code.gs
// const TIME_ZONE = "America/New_York"; // Removing this line as TIME_ZONE is already defined in Code.gs

/**
 * Sends an email with the generated OpenAI prompt
 * 
 * @param {string} prompt - The prompt that will be sent to OpenAI
 */
function sendPromptEmail(prompt) {
  try {
    const currentDate = new Date();
    const formattedDate = Utilities.formatDate(currentDate, TIME_ZONE, "MMMM dd, yyyy 'at' hh:mm a 'ET'");
    
    // Create HTML email template
    const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AI Trader Agent - OpenAI Prompt</title>
  <style>
    body {
      font-family: 'Segoe UI', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      margin: 0;
      padding: 0;
      background-color: #f9f9f9;
    }
    .container {
      max-width: 850px;
      margin: 0 auto;
      padding: 25px;
      background-color: #ffffff;
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.05);
    }
    .header {
      text-align: center;
      margin-bottom: 30px;
      padding-bottom: 20px;
      border-bottom: 2px solid #f0f0f0;
    }
    .header h1 {
      margin: 0;
      color: #2196f3;
      font-size: 28px;
    }
    .header p {
      color: #7f8c8d;
      margin: 5px 0 0;
    }
    .prompt-box {
      background-color: #f5f5f5;
      padding: 20px;
      border-radius: 8px;
      border-left: 5px solid #2196f3;
      margin-bottom: 20px;
    }
    .prompt-title {
      color: #2196f3;
      font-size: 18px;
      font-weight: bold;
      margin-top: 0;
      margin-bottom: 10px;
    }
    .prompt-content {
      font-family: monospace;
      white-space: pre-wrap;
      overflow-x: auto;
      font-size: 14px;
      line-height: 1.5;
      color: #333;
      padding: 15px;
      background-color: #ffffff;
      border-radius: 4px;
      border: 1px solid #e0e0e0;
    }
    .footer {
      margin-top: 30px;
      text-align: center;
      font-size: 14px;
      color: #95a5a6;
      padding-top: 15px;
      border-top: 1px solid #eee;
    }
    .footer p {
      margin: 5px 0;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>AI Trader Agent - AI Prompt</h1>
      <p>Generated on ${formattedDate}</p>
    </div>
    
    <div class="prompt-box">
      <h2 class="prompt-title">AI Prompt</h2>
      <div class="prompt-content">
${prompt}
      </div>
    </div>
    
    <div class="footer">
      <p>  ${NEWSLETTER_NAME}</p>
      <p>This is an automated message. Please do not reply.</p>
    </div>
  </div>
</body>
</html>
    `;

    // Create plain text version
    const plainTextBody = `AI Trader Agent - AI Prompt
Generated on ${formattedDate}

OpenAI Prompt:
${prompt}

  ${NEWSLETTER_NAME}
This is an automated message. Please do not reply.`;

var subject = `AI Trader Agent - AI Prompt (${formattedDate})`;

    // Send the email using our enhanced sendEmail function
    const emailResult = sendEmail(subject, htmlBody, plainTextBody, true); // Always send as test email
    
    if (!emailResult.success) {
      throw new Error(`Failed to send prompt email: ${emailResult.error}`);
    }
    
    return true;
  } catch (error) {
    Logger.log(`Error in sendPromptEmail: ${error}`);
    return false;
  }
}

/**
 * Sends an error notification email
 * 
 * @param {string} subject - The email subject
 * @param {string} errorMessage - The error message to include in the email
 * @return {Object} - The result of the email sending operation
 */
function sendErrorEmail(subject, errorMessage) {
  try {
    const currentDate = new Date();
    const formattedDate = Utilities.formatDate(currentDate, TIME_ZONE, "MMMM dd, yyyy 'at' hh:mm a 'ET'");
    
    // Create HTML email template
    const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${NEWSLETTER_NAME} - Error</title>
  <style>
    body {
      font-family: 'Segoe UI', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      margin: 0;
      padding: 0;
      background-color: #f9f9f9;
    }
    .container {
      max-width: 650px;
      margin: 0 auto;
      padding: 25px;
      background-color: #ffffff;
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.05);
    }
    .header {
      text-align: center;
      margin-bottom: 30px;
      padding-bottom: 20px;
      border-bottom: 2px solid #f0f0f0;
    }
    .header h1 {
      margin: 0;
      color: #e74c3c;
      font-size: 28px;
    }
    .header p {
      color: #7f8c8d;
      margin: 5px 0 0;
    }
    .error-box {
      background-color: #ffebee;
      padding: 20px;
      border-radius: 8px;
      border-left: 5px solid #e74c3c;
      margin-bottom: 20px;
    }
    .error-title {
      color: #c0392b;
      font-size: 18px;
      font-weight: bold;
      margin-top: 0;
      margin-bottom: 10px;
    }
    .error-message {
      font-family: monospace;
      white-space: pre-wrap;
      overflow-x: auto;
      font-size: 14px;
      line-height: 1.5;
      color: #333;
      padding: 15px;
      background-color: #f9f9f9;
      border-radius: 4px;
      border: 1px solid #e0e0e0;
    }
    .footer {
      margin-top: 30px;
      text-align: center;
      font-size: 14px;
      color: #95a5a6;
      padding-top: 15px;
      border-top: 1px solid #eee;
    }
    .footer p {
      margin: 5px 0;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Error Notification</h1>
      <p>Generated on ${formattedDate}</p>
    </div>
    
    <div class="error-box">
      <h2 class="error-title">Error Details</h2>
      <div class="error-message">
${errorMessage}
      </div>
    </div>
    
    <div class="footer">
      <p>  ${NEWSLETTER_NAME}</p>
      <p>This is an automated message. Please do not reply.</p>
    </div>
  </div>
</body>
</html>
    `;
    
    // Create plain text version
    const plainTextBody = `Error Notification
Generated on ${formattedDate}

Error Details:
${errorMessage}

  ${NEWSLETTER_NAME}
This is an automated message. Please do not reply.`;

    // Send the email using our enhanced sendEmail function
    const emailResult = sendEmail(subject, htmlBody, plainTextBody, true); // Always send as test email
    
    if (!emailResult.success) {
      throw new Error(`Failed to send error email: ${emailResult.error}`);
    }
    
    return {
      success: true,
      result: emailResult.result
    };
  } catch (error) {
    Logger.log(`Error in sendErrorEmail: ${error}`);
    return {
      success: false,
      error: error.toString()
    };
  }
}

/**
 * Sends an email with the trading analysis results
 * 
 * @param {string} subject - The email subject
 * @param {string} htmlBody - The HTML body of the email
 * @param {string} plainTextBody - The plain text body of the email
 * @param {boolean} isTest - Whether this is a test email
 * @return {Object} - The result of the email sending operation
 */
function sendEmail(subject, htmlBody, plainTextBody, isTest = false) {
  try {
    // Get user email from script properties
    const scriptProperties = PropertiesService.getScriptProperties();
    const userEmail = scriptProperties.getProperty('USER_EMAIL') || Session.getEffectiveUser().getEmail();
    
    // Check if DEBUG_MODE is enabled
    const debugMode = scriptProperties.getProperty('DEBUG_MODE') === 'true';
    
    // Get the test email address and validate it
    const testEmail = TEST_EMAIL || userEmail;
    if (!testEmail || !testEmail.includes('@')) {
      throw new Error('Invalid test email address configured');
    }
    
    // Determine the recipient based on debug mode
    const recipient = debugMode ? testEmail : userEmail;
    
    // Add test prefix if needed
    if (isTest) {
      subject = `[TEST] ${subject}`;
    }
    
    // Attempt to send the email with retry logic
    let retryCount = 0;
    const maxRetries = 3;
    let result;
    
    while (retryCount < maxRetries) {
      try {
        result = GmailApp.sendEmail(recipient, subject, plainTextBody, {
          htmlBody: htmlBody,
          name: NEWSLETTER_NAME,
          replyTo: Session.getEffectiveUser().getEmail()
        });
        break;
      } catch (sendError) {
        retryCount++;
        if (retryCount >= maxRetries) {
          throw sendError;
        }
        Logger.log(`Email send attempt ${retryCount} failed for ${recipient}: ${sendError}. Retrying...`);
        Utilities.sleep(5000); // Wait 5 seconds between retries
      }
    }
    
    Logger.log(`Email sent successfully to ${recipient}`);
    return {
      success: true,
      result: result,
      recipient: recipient
    };
  } catch (error) {
    const errorMessage = `Failed to send email to ${recipient}: ${error}`;
    Logger.log(errorMessage);
    
    // Try to send the error to the test email as a fallback
    if (recipient !== testEmail) {
      try {
        GmailApp.sendEmail(testEmail, `Email Sending Failed - ${subject}`, 
          `Failed to send email to ${recipient}: ${error}\n\nEmail content:\n${plainTextBody}`, {
            htmlBody: `Failed to send email to ${recipient}: ${error}\n\nEmail content:\n${htmlBody}`,
            name: NEWSLETTER_NAME
          });
        Logger.log(`Error notification sent to test email ${testEmail}`);
      } catch (fallbackError) {
        Logger.log(`Failed to send error notification to test email: ${fallbackError}`);
      }
    }
    
    return {
      success: false,
      error: errorMessage,
      recipient: recipient
    };
  }
}

/**
 * Generates a complete HTML email from a trading analysis JSON object
 * This function can be used for testing without making OpenAI API calls
 * 
 * @param {Object} analysisJson - The trading analysis JSON object
 * @param {Date} nextScheduledTime - The next scheduled analysis time
 * @param {Boolean} isTest - Whether this is a test email
 * @return {String} Complete HTML email as a string
 */
function generateHtmlFromAnalysisJson(analysisJson, nextScheduledTime, isTest = false) {
  // Call the generateEmailTemplate function from Utils.gs
  return generateEmailTemplate(analysisJson, nextScheduledTime, isTest);
}

/**
 * Sends a trading analysis email
 * 
 * @param {String} recipient - Email address of the recipient
 * @param {Object} analysisJson - The analysis result JSON object
 * @param {Date} nextScheduledTime - When the next analysis is scheduled
 * @param {Boolean} isTest - Whether this is a test email
 * @return {Boolean} Success status
 */
function sendTradingAnalysisEmail(recipient, analysisJson, nextScheduledTime, isTest = false) {
  try {
    // Extract data from analysis result
    const decision = analysisJson.decision || 'No Decision';
    const analysis = analysisJson.analysis || {};
    const analysisTime = analysisJson.timestamp ? new Date(analysisJson.timestamp) : new Date();
    
    // Set email subject based on decision
    let subject = `Trading Analysis: ${decision}`;
    if (isTest) {
      subject = `[TEST] ${subject}`;
    }
    
    // Generate HTML and plain text email bodies
    const htmlBody = generateEmailTemplate(analysisJson, nextScheduledTime, isTest);
    const plainTextBody = formatPlainTextEmailBodyWithAnalysis(
      decision, 
      analysisJson, 
      analysisTime, 
      nextScheduledTime
    );

    // Send the email using our enhanced sendEmail function
    const emailResult = sendEmail(subject, htmlBody, plainTextBody, isTest);
    
    if (!emailResult.success) {
      throw new Error(`Failed to send trading analysis email: ${emailResult.error}`);
    }
    
    return true;
  } catch (error) {
    Logger.log(`Error in sendTradingAnalysisEmail: ${error}`);
    return false;
  }
}

/**
 * Sends a test trading analysis email to the current user
 * 
 * @param {Object} analysisJson - The analysis result JSON object
 * @return {Boolean} Success status
 */
function sendTestTradingAnalysisEmail(analysisJson) {
  try {
    const userEmail = Session.getEffectiveUser().getEmail();
    const nextScheduledTime = new Date();
    nextScheduledTime.setDate(nextScheduledTime.getDate() + 1); // Next day
    
    return sendTradingAnalysisEmail(userEmail, analysisJson, nextScheduledTime, true);
  } catch (error) {
    Logger.log(`Error sending test trading analysis email: ${error}`);
    return false;
  }
}

/**
 * Formats the analysis result into an email and sends it to the user
 * 
 * @param {Object} analysisJson - The analysis result JSON object
 * @param {Date} nextScheduledTime - When the next analysis is scheduled
 * @param {Boolean} isTest - Whether this is a test email
 * @return {String} HTML email content
 */
function formatAndSendAnalysisEmail(analysisJson, nextScheduledTime, isTest = false) {
  // Get user email from script properties
  const scriptProperties = PropertiesService.getScriptProperties();
  const userEmail = scriptProperties.getProperty('USER_EMAIL') || Session.getEffectiveUser().getEmail();
  
  // Send the email
  sendTradingAnalysisEmail(userEmail, analysisJson, nextScheduledTime, isTest);
  
  // Return the HTML content for logging or debugging
  return generateEmailTemplate(analysisJson, nextScheduledTime, isTest);
}

/**
 * Sends the trade decision email and saves the HTML to Google Drive
 * 
 * @param {Object} analysisJson - The analysis result JSON object
 * @return {Boolean} Success status
 */
function sendTradeDecisionEmail(analysisJson) {
  try {
    Logger.log("Preparing to send trade decision email...");
    
    // Calculate the next scheduled analysis time
    const currentTime = new Date();
    const nextScheduledTime = calculateNextAnalysisTime(currentTime);
    
    // Generate the HTML email content using the function from Utils.gs
    const htmlContent = generateEmailTemplate(analysisJson, nextScheduledTime, false);
    
    // Save the HTML to Google Drive
    try {
      Logger.log("Saving HTML email to Google Drive...");
      
      // Use a generic filename that will be overwritten each time
      const fileName = "Latest_Trading_Analysis.html";
      
      // Find or create the "Trading Analysis Emails" folder
      let folder;
      const folderName = "Trading Analysis Emails";
      const folderIterator = DriveApp.getFoldersByName(folderName);
      
      if (folderIterator.hasNext()) {
        folder = folderIterator.next();
        Logger.log(`Found existing folder: ${folderName}`);
      } else {
        folder = DriveApp.createFolder(folderName);
        Logger.log(`Created new folder: ${folderName}`);
      }
      
      // Check if the file already exists and delete it
      const existingFiles = folder.getFilesByName(fileName);
      if (existingFiles.hasNext()) {
        existingFiles.next().setTrashed(true);
        Logger.log(`Deleted existing file: ${fileName}`);
      }
      
      // Create the file in the folder
      const file = folder.createFile(fileName, htmlContent, MimeType.HTML);
      Logger.log(`HTML email saved to Google Drive: ${fileName}`);
    } catch (driveError) {
      Logger.log(`Error saving HTML to Google Drive: ${driveError}`);
      // Continue with sending emails even if Drive save fails
    }
    
    // Get the final recipients from script properties
    const recipients = RECIPIENT_EMAILS || [Session.getEffectiveUser().getEmail()];
    
    // Check if DEBUG_MODE is enabled
    const scriptProperties = PropertiesService.getScriptProperties();
    const debugMode = scriptProperties.getProperty('DEBUG_MODE') === 'true';
    
    // Send the email to each recipient
    let allSuccessful = true;
    if (debugMode) {
      Logger.log("Debug mode enabled - skipping email sending for trade decision email");
    } else {
      for (const recipient of recipients) {
        const success = sendTradingAnalysisEmail(recipient, analysisJson, nextScheduledTime, false);
        if (!success) {
          allSuccessful = false;
          Logger.log(`Failed to send email to recipient: ${recipient}`);
        }
      }
      Logger.log("Trade decision email process completed.");
    }
  return allSuccessful;
  } catch (error) {
    Logger.log(`Error in sendTradeDecisionEmail: ${error}`);
    sendErrorEmail("Trade Decision Email Error", error.toString());
    return false;
  }
}

/**
 * Gets the email recipient address from script properties
 * Falls back to the default email if not set
 * 
 * @return {string} The email address to send to
 */
function getEmailRecipient() {
  try {
    const scriptProperties = PropertiesService.getScriptProperties();
    const emailAddress = scriptProperties.getProperty("EMAIL_RECIPIENT");
    
    // If the email address is not set, use the default
    if (!emailAddress) {
      return PROMPT_ERROR_EMAIL;
    }
    
    return emailAddress;
  } catch (error) {
    Logger.log(`Error getting email recipient: ${error}`);
    return PROMPT_ERROR_EMAIL;
  }
}
