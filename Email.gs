/**
 * Sends the trade decision email and saves the HTML to Google Drive
 * 
 * @param {Object} analysisJson - The analysis result JSON object
 * @param {Boolean} newTemplate - Whether to use the new template approach
 * @return {Boolean} Success status
 */
function sendTradeDecisionEmail(analysisJson, newTemplate=false) {
  try {
    Logger.log("Preparing to send trade decision email...");
    
    // Check if DEBUG_MODE is enabled
    const props = PropertiesService.getScriptProperties();
    const debugMode = props.getProperty('DEBUG_MODE') === 'true';
    
    if (debugMode) {
      Logger.log("Debug mode enabled - generating full JSON dataset with detailed logging");
    }
    
    let htmlContent = "";
    let jsonUrl = "";
    
    if (newTemplate) {
      // Generate the full JSON dataset using JsonExport
      try {
        Logger.log("Using new template approach with JSON export");
        
        // Generate the full JSON dataset
        const fullJsonDataset = JsonExport.generateFullJsonDataset(analysisJson);
        
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
    
    // Save the HTML to Google Drive
    try {
      Logger.log("Saving HTML email to Google Drive...");
    
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
        
        // Publish to Ghost via Lambda function
        ghostResult = GhostPublisher.publishToGhostWithLambda(jsonDataToPublish, {
          draftOnly: debugMode  // Create a draft if in debug mode, otherwise publish
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
        const teaserHtmlBody = GhostPublisher.generateTeaserTeaserHtml({
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
          const subject = `${newsletterName}: ${decision}`;
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
        
        // Fall back to the old Ghost publishing method if Lambda fails
        try {
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
          const subject = `${newsletterName} - ${analysisJson.decision}`;

          // Send the email using our enhanced sendEmail function
          const recipientList = recipients.join(",");
          const emailResult = sendEmail(subject, htmlContent, recipientList, false, true); // true for forceBcc
          if (!emailResult.success) {
            Logger.log(`Failed to send email to recipients: ${recipientList}`);
            sendErrorEmail("Trade Decision Email Error", emailResult.error || "Unknown error");
            return false;
          }
        } catch (fallbackError) {
          Logger.log("Error in fallback Ghost publishing: " + fallbackError);
          throw fallbackError;
        }
      }
      
      Logger.log("HTML content saved successfully to Google Drive and published to Ghost");
    } catch (error) {
      Logger.log("Error saving HTML to Google Drive or publishing to Ghost: " + error.toString());
      throw error;
    }

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
  }
}

/**
 * Sends an email with the generated OpenAI prompt
 * 
 * @param {string} prompt - The prompt that will be sent to OpenAI
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
    
    if (!debugMode && !sendPromptEmails) {
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
  }
}
