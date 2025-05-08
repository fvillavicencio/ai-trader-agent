/**
 * Sends the trade decision email and saves the HTML to Google Drive
 * 
 * @param {Object} analysisJson - The analysis result JSON object
<<<<<<< HEAD
 * @param {Boolean} newTemplate - Whether to use the new template approach
 * @return {Boolean} Success status
 */
function sendTradeDecisionEmail(analysisJson, newTemplate=false) {
=======
 * @return {Boolean} Success status
 */
function sendTradeDecisionEmail(analysisJson) {
>>>>>>> e80430d35c78aec5ecc761bbc6b43d16d32918fa
  try {
    Logger.log("Preparing to send trade decision email...");
    
    // Check if DEBUG_MODE is enabled
    const props = PropertiesService.getScriptProperties();
    const debugMode = props.getProperty('DEBUG_MODE') === 'true';
    
    if (debugMode) {
      Logger.log("Debug mode enabled - generating full JSON dataset with detailed logging");
    }
    
<<<<<<< HEAD
    let htmlContent = "";
    let jsonUrl = "";
    // Declare fullJsonDataset at function scope so it's available throughout the function
    let fullJsonDataset = analysisJson; // Default to analysisJson if not using new template
    
    if (newTemplate) {
      // Generate the full JSON dataset using JsonExport
      try {
        Logger.log("Using new template approach with JSON export");
        
        // Generate the full JSON dataset
        Logger.log("Before calling JsonExport.generateFullJsonDataset - analysisJson structure: " + Object.keys(analysisJson).join(', '));
        try {
          fullJsonDataset = JsonExport.generateFullJsonDataset(analysisJson);
          Logger.log("Successfully generated full JSON dataset");
          Logger.log("fullJsonDataset structure: " + (fullJsonDataset ? Object.keys(fullJsonDataset).join(', ') : "NULL"));
        } catch (jsonGenError) {
          Logger.log("Error generating full JSON dataset: " + jsonGenError);
          Logger.log("Error stack: " + jsonGenError.stack);
          throw jsonGenError; // Re-throw to be caught by the outer try-catch
        }
        
        // Save the JSON to Google Drive
        const folderName = props.getProperty('GOOGLE_FOLDER_NAME') || 'Trading Analysis Emails';
        const jsonFileName = props.getProperty('JSON_FILE_NAME') || 'market_pulse_data.json';
        
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
        
        // Create or update the JSON file
        let jsonFile;
        const jsonFileIterator = folder.getFilesByName(jsonFileName);
        
        if (jsonFileIterator.hasNext()) {
          jsonFile = jsonFileIterator.next();
          Logger.log(`Found existing JSON file: ${jsonFileName}`);
          jsonFile.setContent(JSON.stringify(fullJsonDataset, null, 2));
        } else {
          jsonFile = folder.createFile(jsonFileName, JSON.stringify(fullJsonDataset, null, 2));
          Logger.log(`Created new JSON file: ${jsonFileName}`);
        }
        
        // Get the URL of the JSON file
        jsonUrl = jsonFile.getUrl();
        Logger.log(`JSON file saved to: ${jsonUrl}`);
        
        // Generate HTML using the Lambda function
        try {
          htmlContent = JsonExport.generateHtmlFromJson(fullJsonDataset);
          Logger.log("Successfully generated HTML from JSON using Lambda function");
        } catch (lambdaError) {
          Logger.log(`Warning: Failed to generate HTML from Lambda: ${lambdaError}`);
          // Fall back to the old template method if Lambda fails
          htmlContent = generateEmailTemplate(analysisJson, false);
          Logger.log("Falling back to old template method for HTML generation");
        }
      } catch (jsonExportError) {
        Logger.log(`Error in JSON export process: ${jsonExportError}`);
        // Fall back to the old template method if JSON export fails
        htmlContent = generateEmailTemplate(analysisJson, false);
        Logger.log("Falling back to old template method due to JSON export error");
      }
    } else {
      // Use the old template method
      htmlContent = generateEmailTemplate(analysisJson, false);
      Logger.log("Using old template approach for HTML generation");
    }
=======
    // Generate the HTML email content using the function from Utils.gs
    const htmlContent = generateEmailTemplate(analysisJson, false);
>>>>>>> e80430d35c78aec5ecc761bbc6b43d16d32918fa
    
    // Save the HTML to Google Drive
    try {
      Logger.log("Saving HTML email to Google Drive...");
<<<<<<< HEAD
    
=======
      
>>>>>>> e80430d35c78aec5ecc761bbc6b43d16d32918fa
      // Get folder name from properties
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
<<<<<<< HEAD
      }    
      
      // Publish to Ghost using the Lambda function
      Logger.log("Publishing content to Ghost via Lambda function");
      
      // Use the fullJsonDataset to publish to Ghost via Lambda
      let ghostResult;
      try {
        // If we're using the new template, we already have the full JSON dataset
        const jsonDataToPublish = newTemplate ? fullJsonDataset : analysisJson;
        
        // Log the JSON data structure before publishing
        Logger.log("JSON data to publish structure: " + Object.keys(jsonDataToPublish).join(", "));
        Logger.log("Debug mode is: " + (debugMode ? "enabled" : "disabled"));
        
        // Always publish to Ghost, even in debug mode
        Logger.log(debugMode ? "Debug mode enabled - proceeding with Ghost publishing anyway" : "Publishing to Ghost");
        
        // Publish to Ghost via Lambda function
        ghostResult = publishToGhostWithLambda(jsonDataToPublish, {
          draftOnly: false  // Always publish, regardless of debug mode
        });
        
        Logger.log("Successfully published to Ghost via Lambda function");
        Logger.log(`Post URL: ${ghostResult.postUrl}`);
        Logger.log(`Post ID: ${ghostResult.postId}`);
        
        // Get the recipients list from the Ghost members
        const recipients = ghostResult.members.all || [];
        Logger.log(`Retrieved ${recipients.length} recipients from Ghost members`);
        
        // Get newsletter name from properties
        let newsletterName = 'Market Pulse Daily';
        try {
          const propName = props.getProperty('NEWSLETTER_NAME');
          if (propName && propName.trim() !== '') {
            newsletterName = propName.trim();
          }
        } catch (e) {
          Logger.log("Error getting newsletter name: " + e);
        }
        
        // Generate teaser email HTML using the same approach as in publishToGhostWithLambda
        const decision = jsonDataToPublish.decision ? 
          (typeof jsonDataToPublish.decision === 'object' ? jsonDataToPublish.decision.text : jsonDataToPublish.decision) : 
          'Market Update';
        const summary = jsonDataToPublish.justification ? 
          (typeof jsonDataToPublish.justification === 'object' ? jsonDataToPublish.justification.summary : jsonDataToPublish.justification) : 
          '';
        
        // Generate teaser email HTML
        const teaserHtmlBody = generateTeaserTeaserHtml({
          decision: decision,
          summary: summary,
          reportUrl: ghostResult.postUrl,
          generatedAt: new Date()
        });
        
        // Determine whether to send the email or create a draft based on debug mode
        if (debugMode) {
          // In debug mode, just create a draft email
          Logger.log("Debug mode enabled - creating draft teaser email");
          
          // Get test email from properties or use active user's email
          const testEmail = props.getProperty('TEST_EMAIL') || Session.getActiveUser().getEmail();
          
          // Create a draft email to the test recipient
          const subject = `[DEBUG] ${newsletterName}: New Analysis Published`;
          const draft = GmailApp.createDraft(
            testEmail,
            subject,
            'This email requires HTML to view properly.',
            {
              htmlBody: teaserHtmlBody,
              name: newsletterName
            }
          )
          Logger.log(`Draft teaser email created with subject: ${subject} to recipient: ${testEmail}`);
        } else {
          // Not in debug mode, send the email to all recipients
          Logger.log("Debug mode disabled - sending teaser email to all recipients");
          
          // Compose email subject
          
          const subject = `${newsletterName} - ${decision}`;
          
          // Send the email to all recipients as BCC
          const recipientList = recipients.join(",");
          Logger.log(`Sending email to ${recipients.length} recipients`);
          const emailResult = sendEmail(subject, teaserHtmlBody, recipientList, false, true); // true for forceBcc
          
          if (!emailResult.success) {
            Logger.log(`Failed to send email to recipients: ${recipientList}`);
            sendErrorEmail("Trade Decision Email Error", emailResult.error || "Unknown error");
            return false;
          }
          
          Logger.log("Trade decision email sent successfully to all recipients");
        }
        
      } catch (ghostError) {
        Logger.log("Warning: Failed to publish to Ghost via Lambda: " + ghostError);
        
        // Store the JSON data to publish for use in the fallback path
        const jsonDataToPublish = newTemplate ? fullJsonDataset : analysisJson;
        
        // Fall back to the old Ghost publishing method if Lambda fails
        try {
          // Always publish to Ghost, even in debug mode
          Logger.log(debugMode ? "Debug mode enabled - proceeding with fallback Ghost publishing anyway" : "Publishing to Ghost");
          
          ghostResult = GhostPublisher.publishToGhost(file.getId(), folder.getId(), fileName);
          Logger.log("Fallback: Published to Ghost using traditional method");
          
          // Get the final recipients from Config.gs
          const recipients = getEmailRecipients();
          
          // Compose email subject
          let newsletterName = 'Market Pulse Daily';
          try {
            const propName = props.getProperty('NEWSLETTER_NAME');
            if (propName && propName.trim() !== '') {
              newsletterName = propName.trim();
            }
          } catch (e) {}
          
          // Extract decision text
          const decision = jsonDataToPublish.decision ? 
            (typeof jsonDataToPublish.decision === 'object' ? jsonDataToPublish.decision.text : jsonDataToPublish.decision) : 
            'Market Update';
          
          const subject = `${newsletterName} - ${decision}`;
          
          // In debug mode, create a draft instead of sending
          if (debugMode) {
            // Get test email from properties or use active user's email
            const testEmail = props.getProperty('TEST_EMAIL') || Session.getActiveUser().getEmail();
            
            // Create a draft email to the test recipient
            const draftSubject = `[DEBUG] ${newsletterName} - ${decision}`;
            const draft = GmailApp.createDraft(
              testEmail,
              draftSubject,
              'This email requires HTML to view properly.',
              {
                htmlBody: htmlContent,
                name: newsletterName
              }
            );
            Logger.log(`Debug mode: Draft email created with subject: ${draftSubject} to recipient: ${testEmail}`);
          } else {
            // Send the email using our enhanced sendEmail function
            const recipientList = recipients.join(",");
            const emailResult = sendEmail(subject, htmlContent, recipientList, false, true); // true for forceBcc
            if (!emailResult.success) {
              Logger.log(`Failed to send email to recipients: ${recipientList}`);
              sendErrorEmail("Trade Decision Email Error", emailResult.error || "Unknown error");
              return false;
            }
          }
        } catch (fallbackError) {
          Logger.log("Error in fallback Ghost publishing: " + fallbackError);
          throw fallbackError;
        }
=======
      }     
      // Publish to Ghost
      Logger.log("Publishing HTML content to Ghost"); 
      let ghostResult;
      try {
        ghostResult = publishToGhost(file.getId(), folder.getId(), fileName);
      } catch (e) {
        Logger.log("Warning: Failed to publish to Ghost: " + e);
      }
      
      // Generate and save the full JSON dataset right before returning
      try {
        const jsonExportResult = JsonExport.generateAndSaveFullJsonDataset(analysisJson);
        
        if (typeof jsonExportResult === 'string') {
          // If result is just a string URL (JSON only)
          Logger.log(`Full JSON dataset saved to: ${jsonExportResult}`);
          // Generate instructions for HTML generation as a fallback
          const instructionsUrl = JsonExport.generateHtmlUsingLocalLambda(jsonExportResult);
          Logger.log(`Instructions for HTML generation: ${instructionsUrl}`);
        } else {
          // If result is an object with jsonUrl and htmlUrl properties
          Logger.log(`Full JSON dataset saved to: ${jsonExportResult.jsonUrl}`);
          if (jsonExportResult.htmlUrl) {
            Logger.log(`HTML saved to: ${jsonExportResult.htmlUrl}`);
          } else {
            // Generate instructions for HTML generation as a fallback
            const instructionsUrl = JsonExport.generateHtmlUsingLocalLambda(jsonExportResult.jsonUrl);
            Logger.log(`Instructions for HTML generation: ${instructionsUrl}`);
          }
        }
      } catch (jsonExportError) {
        Logger.log(`Error generating and saving full JSON dataset: ${jsonExportError}`);
>>>>>>> e80430d35c78aec5ecc761bbc6b43d16d32918fa
      }
      
      Logger.log("HTML content saved successfully to Google Drive and published to Ghost");
    } catch (error) {
<<<<<<< HEAD
      Logger.log("Error saving HTML to Google Drive or publishing to Ghost: " + error.toString());
      throw error;
    }

=======
      Logger.log("Error saving HTML to Google Drive:", error.toString());
      throw error;
    }

    // Get the final recipients from Config.gs
    const recipients = getEmailRecipients();
    // Compose email subject
    let newsletterName = 'Market Pulse Daily';
    try {
      const propName = props.getProperty('NEWSLETTER_NAME');
      if (propName && propName.trim() !== '') {
        newsletterName = propName.trim();
      }
    } catch (e) {}
    const subject = `${newsletterName} - ${analysisJson.decision}`;

    // Send the email using our enhanced sendEmail function
    const recipientList = recipients.join(",");
    const emailResult = sendEmail(subject, htmlContent, recipientList, false, true); // true for forceBcc
    if (!emailResult.success) {
      Logger.log(`Failed to send email to recipients: ${recipientList}`);
      sendErrorEmail("Trade Decision Email Error", emailResult.error || "Unknown error");
      return false;
    }
>>>>>>> e80430d35c78aec5ecc761bbc6b43d16d32918fa
    Logger.log("Trade decision email process completed.");
    return true;
  } catch (error) {
    Logger.log(`Error in sendTradeDecisionEmail: ${error}`);
    sendErrorEmail("Trade Decision Email Error", error.toString());
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
    const timeZone = props.getProperty('TIME_ZONE') || 'America/New_York'; // Default to Eastern Time if not set
    const currentDate = new Date();
    const formattedDate = Utilities.formatDate(currentDate, timeZone, "MMMM dd, yyyy 'at' hh:mm a 'ET'");
    
<<<<<<< HEAD
    // Get admin email from properties
    const adminEmail = props.getProperty('ADMIN_EMAIL');
    
    if (!adminEmail) {
      Logger.log("No admin email configured. Error notification not sent.");
      return { success: false, error: "No admin email configured" };
    }
    
    // Create HTML body
    const htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 5px;">
        <h2 style="color: #d32f2f;">Market Pulse Daily Error</h2>
        <p><strong>Date:</strong> ${formattedDate}</p>
        <p><strong>Error:</strong> ${subject}</p>
        <div style="background-color: #f5f5f5; padding: 15px; border-left: 4px solid #d32f2f; margin: 15px 0; font-family: monospace; white-space: pre-wrap; overflow-x: auto;">
          ${errorMessage}
        </div>
        <p style="font-size: 12px; color: #757575; margin-top: 30px;">
          This is an automated error notification from Market Pulse Daily.
        </p>
      </div>
    `;
    
    // Send email
    return sendEmail(`[ERROR] ${subject}`, htmlBody, adminEmail, false, false);
  } catch (error) {
    Logger.log(`Error in sendErrorEmail: ${error}`);
    return { success: false, error: error.toString() };
=======
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
      <p> ${props.getProperty('NEWSLETTER_NAME')}</p>
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
>>>>>>> e80430d35c78aec5ecc761bbc6b43d16d32918fa
  }
}

/**
 * Sends an email with the generated OpenAI prompt
 * 
 * @param {string} prompt - The prompt that will be sent to OpenAI
<<<<<<< HEAD
 * @return {boolean} - Whether the email was sent successfully
 */
function sendPromptEmail(prompt) {
  try {
    // Get admin email from properties
    const props = PropertiesService.getScriptProperties();
    const adminEmail = props.getProperty('ADMIN_EMAIL');
    const debugMode = props.getProperty('DEBUG_MODE') === 'true';
    
    // Only send the prompt email in debug mode or if explicitly configured
    const sendPromptEmails = props.getProperty('SEND_PROMPT_EMAILS') === 'true';
    
    // ALWAYS send the prompt email when in debug mode, regardless of other settings
    if (debugMode) {
      Logger.log("Debug mode enabled - sending prompt email regardless of other settings");
    } else if (!sendPromptEmails) {
      Logger.log("Not sending prompt email (debug mode off and SEND_PROMPT_EMAILS not enabled)");
      return true; // Return true to indicate this is expected behavior
    }
    
    if (!adminEmail) {
      Logger.log("No admin email configured. Prompt email not sent.");
      return false;
    }
    
    // Get the current date and time
    const timeZone = props.getProperty('TIME_ZONE') || 'America/New_York';
    const currentDate = new Date();
    const formattedDate = Utilities.formatDate(currentDate, timeZone, "MMMM dd, yyyy 'at' hh:mm a 'ET'");
    
    // Create HTML body with the prompt
    const htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 5px;">
        <h2 style="color: #1976d2;">Market Pulse Daily OpenAI Prompt</h2>
        <p><strong>Date:</strong> ${formattedDate}</p>
        <p><strong>Prompt Length:</strong> ${prompt.length} characters</p>
        <div style="background-color: #f5f5f5; padding: 15px; border-left: 4px solid #1976d2; margin: 15px 0; font-family: monospace; white-space: pre-wrap; overflow-x: auto; max-height: 500px; overflow-y: auto;">
          ${prompt.replace(/</g, '&lt;').replace(/>/g, '&gt;')}
        </div>
        <p style="font-size: 12px; color: #757575; margin-top: 30px;">
          This is an automated email from Market Pulse Daily containing the prompt sent to OpenAI.
        </p>
      </div>
    `;
    
    // Send email
    const result = sendEmail("[DEBUG] OpenAI Prompt", htmlBody, adminEmail, false, false);
    return result.success;
=======
 */
function sendPromptEmail(prompt) {
  try {
    const props = PropertiesService.getScriptProperties();
    const timeZone = props.getProperty('TIME_ZONE') || 'America/New_York'; // Default to Eastern Time if not set
    
    // Validate the time zone
    if (!timeZone || typeof timeZone !== 'string') {
      Logger.log('Invalid or missing time zone configuration, defaulting to America/New_York');
      timeZone = 'America/New_York';
    }

    const currentDate = new Date();
    const formattedDate = Utilities.formatDate(currentDate, timeZone, "MMMM dd, yyyy 'at' hh:mm a 'ET'");
    
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
>>>>>>> e80430d35c78aec5ecc761bbc6b43d16d32918fa
  } catch (error) {
    Logger.log(`Error in sendPromptEmail: ${error}`);
    return false;
  }
}

/**
 * Sends an email with the trading analysis results
 * 
 * @param {string} subject - The email subject
 * @param {string} htmlBody - The HTML body of the email
 * @param {string} recipient - The email address of the recipient
 * @param {boolean} isTest - Whether this is a test email
 * @param {boolean} forceBcc - Whether to send the email using BCC only (no direct recipient)
 * @return {Object} - The result of the email sending operation
 */
function sendEmail(subject, htmlBody, recipient, isTest = false, forceBcc = false) {
  try {
<<<<<<< HEAD
    Logger.log(`Preparing to send email to: ${recipient}`);
    
    // Get script properties
    const props = PropertiesService.getScriptProperties();
    const debugMode = props.getProperty('DEBUG_MODE') === 'true';
    
    // Add test prefix to subject if this is a test email
    if (isTest) {
      subject = "[TEST] " + subject;
    }
    
    // Add debug prefix to subject if in debug mode
    if (debugMode && !subject.includes("[DEBUG]")) {
      subject = "[DEBUG] " + subject;
    }
    
    // Get the sender name and email from properties
    let senderName = props.getProperty('SENDER_NAME') || 'Market Pulse Daily';
    let senderEmail = props.getProperty('SENDER_EMAIL');
    
    // If sender email is not configured, use the user's email
    if (!senderEmail) {
      senderEmail = Session.getActiveUser().getEmail();
      Logger.log(`No sender email configured, using active user email: ${senderEmail}`);
    }
    
    // Parse recipients
    const recipients = recipient.split(',').map(r => r.trim()).filter(r => r);
    
    if (recipients.length === 0) {
      return { success: false, error: "No valid recipients specified" };
    }
    
    // Create email options
    const options = {
      name: senderName,
      htmlBody: htmlBody,
      replyTo: senderEmail
    };
    
    // Handle BCC vs direct recipients
    if (forceBcc) {
      // Use BCC for all recipients
      options.bcc = recipients.join(',');
      
      // Send to self as the main recipient
      GmailApp.sendEmail(senderEmail, subject, "This email contains HTML content. Please view in an HTML-compatible email client.", options);
      Logger.log(`Email sent with subject "${subject}" to ${recipients.length} BCC recipients`);
    } else {
      // Send directly to the first recipient, BCC the rest if there are multiple
      const mainRecipient = recipients[0];
      
      if (recipients.length > 1) {
        options.bcc = recipients.slice(1).join(',');
      }
      
      GmailApp.sendEmail(mainRecipient, subject, "This email contains HTML content. Please view in an HTML-compatible email client.", options);
      Logger.log(`Email sent with subject "${subject}" to ${mainRecipient} and ${recipients.length - 1} BCC recipients`);
    }
    
    return { success: true };
  } catch (error) {
    Logger.log(`Error sending email: ${error}`);
    return { success: false, error: error.toString() };
=======
    const props = PropertiesService.getScriptProperties();
    // Get the test email address and validate it
    const testEmail = props.getProperty('TEST_EMAIL');
    if (!testEmail || !testEmail.includes('@')) {
      throw new Error('Invalid test email address configured');
    }
    
    // Determine the recipient based on test mode
    const finalRecipient = isTest ? testEmail : recipient;
    Logger.log(`Sending email to ${finalRecipient}${forceBcc ? ' (using BCC)' : ''}`);
    
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
        if (forceBcc && !isTest) {
          // Only BCC, blank To field
          result = GmailApp.sendEmail(
            '',
            subject,
            'This email requires an HTML-compatible client.',
            {
              bcc: finalRecipient,
              htmlBody: htmlBody,
              name: props.getProperty('NEWSLETTER_NAME'),
              replyTo: 'market-pulse-daily@ghost.io'
            }
          );
        } else if (forceBcc && isTest) {
          // Send with BCC in test mode
          result = GmailApp.sendEmail(
            'market-pulse-daily@ghost.io',
            subject,
            'This email requires an HTML-compatible client.',
            {
              bcc: testEmail,
              htmlBody: htmlBody,
              name: props.getProperty('NEWSLETTER_NAME'),
              replyTo: 'market-pulse-daily@ghost.io'
            }
          );
        } else {
          // Standard send
          result = GmailApp.sendEmail(finalRecipient, subject, '', {
            htmlBody: htmlBody,
            name: props.getProperty('NEWSLETTER_NAME'),
            replyTo: 'market-pulse-daily@ghost.io'
          });
        }
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
    
    Logger.log(`Email sent successfully to ${finalRecipient}${forceBcc ? ' (using BCC)' : ''}`);
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
    let subject = `${props.getProperty('NEWSLETTER_NAME')}: ${decision}`;
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
>>>>>>> e80430d35c78aec5ecc761bbc6b43d16d32918fa
  }
}
