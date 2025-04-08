/**
 * Sends the trade decision email and saves the HTML to Google Drive
 * 
 * @param {Object} analysisJson - The analysis result JSON object
 * @return {Boolean} Success status
 */
function sendTradeDecisionEmail(analysisJson) {
  try {
    Logger.log("Preparing to send trade decision email...");
    
    // Generate the HTML email content using the function from Utils.gs
    const htmlContent = generateEmailTemplate(analysisJson, false);
    
    // Save the HTML to Google Drive
    try {
      Logger.log("Saving HTML email to Google Drive...");
      
      // Get folder name from properties
      const props = PropertiesService.getScriptProperties();
      const folderName = props.getProperty('GOOGLE_FOLDER_NAME');
      const fileName = props.getProperty('GOOGLE_FILE_NAME');
      
      // Find or create the folder
      let folder;
      const folderIterator = DriveApp.getFoldersByName(folderName);
      
      if (folderIterator.hasNext()) {
        folder = folderIterator.next();
        Logger.log(`Found existing folder: ${folderName}`);
      } else {
        folder = DriveApp.createFolder(folderName);
        Logger.log(`Created new folder: ${folderName}`);
      }
      
      // Create or update the file
      let file;
      const fileIterator = folder.getFilesByName(fileName);
      
      if (fileIterator.hasNext()) {
        file = fileIterator.next();
        Logger.log(`Found existing file: ${fileName}`);
        file.setContent(htmlContent);
      } else {
        file = folder.createFile(fileName, htmlContent);
        Logger.log(`Created new file: ${fileName}`);
      }
      
      // Publish to Ghost
      try {
        Logger.log("Publishing to Ghost...");
        const ghostResult = GhostPublisher.runGhostPublisher({
          fileId: file.getId(),
          folderId: folder.getId(),
          fileName: fileName
        });
        Logger.log("Ghost publishing result:", JSON.stringify(ghostResult, null, 2));
      } catch (error) {
        Logger.log("Error publishing to Ghost:", error.toString());
        throw error;
      }
      
      Logger.log("Email content saved successfully to Google Drive and published to Ghost");
    } catch (error) {
      Logger.log("Error saving HTML to Google Drive:", error.toString());
      throw error;
    }
    
    // Get the final recipients from Config.gs
    const recipients = getEmailRecipients();
    
    // Send the email to each recipient
    let allSuccessful = true;
    for (const recipient of recipients) {
        const success = sendTradingAnalysisEmail(recipient, analysisJson, false);
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
 * Sends an email with the generated OpenAI prompt
 * 
 * @param {string} prompt - The prompt that will be sent to OpenAI
 */
function sendPromptEmail(prompt) {
  try {
    const props = PropertiesService.getScriptProperties();
    const currentDate = new Date();
    const formattedDate = Utilities.formatDate(currentDate, props.getProperty('TIME_ZONE'), "MMMM dd, yyyy 'at' hh:mm a 'ET'");
    
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
    .content {
      margin: 20px 0;
      padding: 20px;
      background-color: #f8f9fa;
      border-radius: 8px;
    }
    .content pre {
      white-space: pre-wrap;
      background-color: #f8f9fa;
      padding: 15px;
      border-radius: 4px;
      font-family: 'Courier New', monospace;
      font-size: 14px;
      line-height: 1.5;
      color: #333;
    }
    .footer {
      text-align: center;
      margin-top: 30px;
      padding-top: 20px;
      border-top: 2px solid #f0f0f0;
    }
    .footer p {
      margin: 5px 0;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>AI Trader Agent - OpenAI Prompt</h1>
      <p>Generated on ${formattedDate}</p>
    </div>
    
    <div class="content">
      <h2>OpenAI Prompt</h2>
      <pre>
${prompt}
      </pre>
    </div>
    
    <div class="footer">
      <p>${props.getProperty('NEWSLETTER_NAME')}</p>
      <p>This is an automated message. Please do not reply.</p>
    </div>
  </div>
</body>
</html>
    `;

    const subject = `AI Trader Agent - AI Prompt (${formattedDate})`;

    // Send the email using our enhanced sendEmail function
    const emailResult = sendEmail(subject, htmlBody, props.getProperty('TEST_EMAIL'), false); // Always send as test email
    
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
    const props = PropertiesService.getScriptProperties();
    const currentDate = new Date();
    const formattedDate = Utilities.formatDate(currentDate, props.getProperty('TIME_ZONE'), "MMMM dd, yyyy 'at' hh:mm a 'ET'");
    
    // Create HTML email template
    const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${props.getProperty('NEWSLETTER_NAME')} - Error</title>
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
      <p>  ${props.getProperty('NEWSLETTER_NAME')}</p>
      <p>This is an automated message. Please do not reply.</p>
    </div>
  </div>
</body>
</html>
    `;
    
    // Send the email using our enhanced sendEmail function
    const emailResult = sendEmail(subject, htmlBody, props.getProperty('TEST_EMAIL'), true); // Always send as test email
    
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
 * @param {string} recipient - The email address of the recipient
 * @param {boolean} isTest - Whether this is a test email
 * @return {Object} - The result of the email sending operation
 */
function sendEmail(subject, htmlBody, recipient, isTest = false) {
  try {
    const props = PropertiesService.getScriptProperties();
    // Get the test email address and validate it
    const testEmail = props.getProperty('TEST_EMAIL');
    if (!testEmail || !testEmail.includes('@')) {
      throw new Error('Invalid test email address configured');
    }
    
    // Determine the recipient based on test mode
    const finalRecipient = isTest ? testEmail : recipient;
    Logger.log(`Sending email to ${finalRecipient}`);
    
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
        result = GmailApp.sendEmail(finalRecipient, subject, '', {
          htmlBody: htmlBody,
          name: props.getProperty('NEWSLETTER_NAME'),
          replyTo: Session.getEffectiveUser().getEmail()
        });
        break;
      } catch (sendError) {
        retryCount++;
        if (retryCount >= maxRetries) {
          throw sendError;
        }
        Logger.log(`Email send attempt ${retryCount} failed for ${finalRecipient}: ${sendError}. Retrying...`);
        Utilities.sleep(5000); // Wait 5 seconds between retries
      }
    }
    
    Logger.log(`Email sent successfully to ${finalRecipient}`);
    return {
      success: true,
      result: result,
      recipient: finalRecipient
    };
  } catch (error) {
    const errorMessage = `Failed to send email to ${recipient}: ${error}`;
    Logger.log(errorMessage);
    
    // Try to send the error to the test email as a fallback
    if (recipient !== props.getProperty('TEST_EMAIL')) {
      try {
        GmailApp.sendEmail(props.getProperty('TEST_EMAIL'), `Email Sending Failed - ${subject}`, 
          `Failed to send email to ${recipient}: ${error}\n\nEmail content:\n${htmlBody}`, {
            htmlBody: `Failed to send email to ${recipient}: ${error}\n\nEmail content:\n${htmlBody}`,
            name: props.getProperty('NEWSLETTER_NAME')
          });
        Logger.log(`Error notification sent to test email ${props.getProperty('TEST_EMAIL')}`);
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
    Logger.log(`Sending trading analysis email to: ${recipient}`);
    
    // Extract data from analysis result
    const decision = analysisJson.decision || 'No Decision';
    const analysis = analysisJson.analysis || {};
    const analysisTime = analysisJson.timestamp ? new Date(analysisJson.timestamp) : new Date();
    
    // Set email subject based on decision
    let subject = `Trading Analysis: ${decision}`;
    if (isTest) {
      subject = `[TEST] ${subject}`;
    }
    
    // Generate HTML email body
    const htmlBody = generateEmailTemplate(analysisJson, nextScheduledTime, isTest);

    // Send the email using our enhanced sendEmail function
    const emailResult = sendEmail(subject, htmlBody, recipient, isTest);
    
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
    const props = PropertiesService.getScriptProperties();
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
  try {
    // Get the recipients
    const recipients = getEmailRecipients();
    Logger.log(`Sending trading analysis email to ${recipients.length} recipients: ${recipients.join(', ')}`);
    
    // Send the email to each recipient
    for (const recipient of recipients) {
      const success = sendTradingAnalysisEmail(recipient, analysisJson, nextScheduledTime, isTest);
      if (!success) {
        Logger.log(`Failed to send email to recipient: ${recipient}`);
      } else {
        Logger.log(`Successfully sent email to: ${recipient}`);
      }
    }
    
    // Return the HTML content for logging or debugging
    return generateEmailTemplate(analysisJson, nextScheduledTime, isTest);
  } catch (error) {
    Logger.log(`Error in formatAndSendAnalysisEmail: ${error}`);
    throw error;
  }
}
