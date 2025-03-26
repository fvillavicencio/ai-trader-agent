// Import the TIME_ZONE constant from Code.gs
// const TIME_ZONE = "America/New_York"; // Removing this line as TIME_ZONE is already defined in Code.gs

// Dedicated email address for prompt and error emails
const PROMPT_ERROR_EMAIL = "fvillavicencio+AI_trading_agent@gmail.com";

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
      color: #2c3e50;
      font-size: 28px;
    }
    .header p {
      margin: 5px 0 0;
      color: #7f8c8d;
      font-size: 16px;
    }
    .content {
      margin-bottom: 30px;
    }
    .content h2 {
      color: #2980b9;
      margin-top: 30px;
      margin-bottom: 15px;
      padding-bottom: 10px;
      border-bottom: 1px solid #eee;
    }
    .content pre {
      background-color: #f8f8f8;
      border: 1px solid #e0e0e0;
      border-radius: 4px;
      padding: 15px;
      overflow-x: auto;
      font-family: 'Courier New', monospace;
      font-size: 14px;
      line-height: 1.4;
      white-space: pre-wrap;
    }
    .footer {
      text-align: center;
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #f0f0f0;
      color: #7f8c8d;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>AI Trader Agent - OpenAI Prompt</h1>
      <p>${formattedDate}</p>
    </div>
    <div class="content">
      <h2>Generated Prompt</h2>
      <p>This is the prompt that will be sent to OpenAI for trading analysis:</p>
      <pre>${prompt.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>
    </div>
    <div class="footer">
      <p>AI Trader Agent - Debugging Email</p>
      <p>This email is for debugging purposes only.</p>
    </div>
  </div>
</body>
</html>
    `;
    
    // Send the email
    const subject = `AI Trader Agent - OpenAI Prompt (${formattedDate})`;
    const emailAddress = getEmailRecipient();
    
    // Log the email details
    Logger.log(`Sending prompt email to ${emailAddress}`);
    
    // Send the email
    MailApp.sendEmail({
      to: emailAddress,
      subject: subject,
      htmlBody: htmlBody
    });
    
    Logger.log("Prompt email sent successfully");
    return true;
  } catch (error) {
    Logger.log(`Error sending prompt email: ${error}`);
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
  <title>Market Pulse Daily - Error</title>
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
      <p>  Market Pulse Daily</p>
      <p>This is an automated message. Please do not reply.</p>
    </div>
  </div>
</body>
</html>
    `;
    
    // Create plain text version
    const plainTextBody = `Error Notification\nGenerated on ${formattedDate}\n\nError Details:\n${errorMessage}\n\n  Market Pulse Daily\nThis is an automated message. Please do not reply.`;
    
    // Send the email
    const result = GmailApp.sendEmail(PROMPT_ERROR_EMAIL, subject, plainTextBody, {
      htmlBody: htmlBody,
      name: "Market Pulse Daily"
    });
    
    Logger.log("Error email sent successfully");
    return {
      success: true,
      result: result
    };
  } catch (error) {
    Logger.log(`Failed to send error email: ${error}`);
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
    
    // Add test prefix if needed
    if (isTest) {
      subject = `[TEST] ${subject}`;
    }
    
    // Send the email
    const result = GmailApp.sendEmail(userEmail, subject, plainTextBody, {
      htmlBody: htmlBody,
      name: "Market Pulse Daily"
    });
    
    Logger.log(`Email sent successfully to ${userEmail}`);
    return {
      success: true,
      result: result
    };
  } catch (error) {
    Logger.log(`Failed to send email: ${error}`);
    return {
      success: false,
      error: error.toString()
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
    
    // Send the email
    GmailApp.sendEmail(recipient, subject, plainTextBody, {
      htmlBody: htmlBody,
      name: 'Market Pulse Daily',
      replyTo: Session.getEffectiveUser().getEmail()
    });
    
    // Log success
    Logger.log(`Trading analysis email sent to ${recipient}`);
    return true;
  } catch (error) {
    // Log error
    Logger.log(`Error sending trading analysis email: ${error}`);
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
    const scriptProperties = PropertiesService.getScriptProperties();
    const recipientsString = scriptProperties.getProperty('FINAL_EMAIL_RECIPIENTS') || Session.getEffectiveUser().getEmail();
    const recipients = recipientsString.split(',').map(email => email.trim());
    
    // Send the email to each recipient
    let allSuccessful = true;
    for (const recipient of recipients) {
      const success = sendTradingAnalysisEmail(recipient, analysisJson, nextScheduledTime, false);
      if (!success) {
        allSuccessful = false;
        Logger.log(`Failed to send email to recipient: ${recipient}`);
      }
    }
    
    Logger.log("Trade decision email process completed.");
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
