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
        const folderName = props.getProperty('GOOGLE_FOLDER_NAME') || 'Market Pulse Daily';
        const jsonFileName = props.getProperty('JSON_FILE_NAME') || 'market_pulse_data.json';
        
        // Find or create the folder
        let folder;
        const folderIterator = DriveApp.getFoldersByName(folderName);
        
        if (folderIterator.hasNext()) {
          folder = folderIterator.next();
          Logger.log("Found existing folder: " + folderName);
        } else {
          folder = DriveApp.createFolder(folderName);
          Logger.log("Created new folder: " + folderName);
        }
        
        // Create or update the JSON file
        let jsonFile;
        const jsonFileIterator = folder.getFilesByName(jsonFileName);
        
        if (jsonFileIterator.hasNext()) {
          jsonFile = jsonFileIterator.next();
          Logger.log("Found existing JSON file: " + jsonFileName);
          jsonFile.setContent(JSON.stringify(fullJsonDataset, null, 2));
        } else {
          jsonFile = folder.createFile(jsonFileName, JSON.stringify(fullJsonDataset, null, 2));
          Logger.log("Created new JSON file: " + jsonFileName);
        }
        
        // Get the URL of the JSON file
        jsonUrl = jsonFile.getUrl();
        Logger.log("JSON file saved to: " + jsonUrl);
        
        // Publish to Ghost using the Lambda function and retrieve the HTML directly
        try {
          Logger.log("Publishing to Ghost via Lambda function and retrieving HTML directly");
          
          // Publish to Ghost via Lambda function
          var ghostResult = publishToGhostWithLambda(fullJsonDataset, {
            draftOnly: false,  // Always publish, regardless of debug mode
            returnHtml: true   // Request HTML in the response
          });
          
          // Store the JSON data for later use
          var jsonDataToPublish = fullJsonDataset;
          
          // Check if HTML was returned in the response
          if (ghostResult && ghostResult.html) {
            htmlContent = ghostResult.html;
            Logger.log("Successfully retrieved HTML directly from Ghost Lambda function");
          } else {
            Logger.log("No HTML returned from Ghost Lambda function, falling back to old method");
            // Fall back to the old template method if Lambda doesn't return HTML
            htmlContent = generateFallbackEmailTemplate(analysisJson);
          }
        } catch (lambdaError) {
          Logger.log("Warning: Failed to retrieve HTML from Ghost Lambda: " + lambdaError);
          // Fall back to our simple fallback template
          htmlContent = generateFallbackEmailTemplate(analysisJson);
          Logger.log("Falling back to simple fallback template for HTML generation");
        }
      } catch (jsonExportError) {
        Logger.log("Error in JSON export process: " + jsonExportError);
        // Fall back to our simple fallback template if JSON export fails
        htmlContent = generateFallbackEmailTemplate(analysisJson);
        Logger.log("Falling back to simple fallback template due to JSON export error");
      }
    } else {
      // Use our simple fallback template
      htmlContent = generateFallbackEmailTemplate(analysisJson);
      Logger.log("Using simple fallback template for HTML generation");
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
        Logger.log("Found existing folder: " + folderName);
      } else {
        folder = DriveApp.createFolder(folderName);
        Logger.log("Created new folder: " + folderName);
      }
      
      // Create or update the file
      let file;
      const fileIterator = folder.getFilesByName(fileName);
      
      if (fileIterator.hasNext()) {
        file = fileIterator.next();
        Logger.log("Found existing file: " + fileName);
        file.setContent(htmlContent);
      } else {
        file = folder.createFile(fileName, htmlContent);
        Logger.log("Created new file: " + fileName);
      }    
      
      // Note: We've already published to Ghost and retrieved the HTML in the step above
      // So we just need to use the ghostResult that was already obtained
      
      // Define ghostResult if it's not already defined (in case we're using the old template approach)
      if (typeof ghostResult === 'undefined') {
        // We need to publish to Ghost now, since we didn't do it earlier
        // This ensures we only make a single call to the Ghost publishing function
        try {
          Logger.log("Publishing to Ghost via Lambda function (fallback path)");
          var jsonDataToPublish = newTemplate ? fullJsonDataset : analysisJson;
          var ghostResult = publishToGhostWithLambda(jsonDataToPublish, {
            draftOnly: false,  // Always publish, regardless of debug mode
            returnHtml: true   // Request HTML in the response
          });
          
          // If HTML was returned and we didn't already have it, use it
          if (ghostResult && ghostResult.html && !htmlContent) {
            htmlContent = ghostResult.html;
            Logger.log("Successfully retrieved HTML directly from Ghost Lambda function (fallback path)");
            
            // Update the file with the new HTML content
            file.setContent(htmlContent);
            Logger.log("Updated file with HTML content from Ghost Lambda");
          }
        } catch (fallbackError) {
          Logger.log("Error in fallback Ghost publishing: " + fallbackError);
          // Continue with what we have
          var ghostResult = { members: { all: [] } };
          var jsonDataToPublish = analysisJson;
        }
      }
      
      // Log success information
      Logger.log("Successfully published to Ghost via Lambda function");
      if (ghostResult && ghostResult.postUrl) {
        Logger.log("Post URL: " + ghostResult.postUrl);
      }
      if (ghostResult && ghostResult.postId) {
        Logger.log("Post ID: " + ghostResult.postId);
      }
        
        // Get the recipients list from the Ghost members
        const recipients = ghostResult.members.all || [];
        Logger.log("Retrieved " + recipients.length + " recipients from Ghost members");
        
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
          const subject = "[DEBUG] " + newsletterName + ": New Analysis Published";
          const draft = GmailApp.createDraft(
            testEmail,
            subject,
            'This email requires HTML to view properly.',
            {
              htmlBody: teaserHtmlBody,
              name: newsletterName
            }
          );
          Logger.log("Draft teaser email created with subject: " + subject + " to recipient: " + testEmail);
        } else {
          // Not in debug mode, send the email to all recipients
          Logger.log("Debug mode disabled - sending teaser email to all recipients");
          
          // Compose email subject
          
          const subject = newsletterName + " - " + decision;
          
          // Send the email to all recipients as BCC
          const recipientList = recipients.join(",");
          Logger.log("Sending email to " + recipients.length + " recipients");
          const emailResult = sendEmail(subject, teaserHtmlBody, recipientList, false, true); // true for forceBcc
          
          if (!emailResult.success) {
            Logger.log("Failed to send email to recipients: " + recipientList);
            sendErrorEmail("Trade Decision Email Error", emailResult.error || "Unknown error");
            return false;
          }
          
          Logger.log("Trade decision email sent successfully to all recipients");
        }
        
      } catch (ghostError) {
        Logger.log("Warning: Failed to publish to Ghost via Lambda: " + ghostError);
        
        // Store the JSON data to publish for use in the fallback path
        const jsonDataToPublish = newTemplate ? fullJsonDataset : analysisJson;
        
        // We've already tried to publish with the Lambda function earlier
        // Don't make another publishing attempt here to avoid duplicate posts
        // Just log the error and continue with what we have
        Logger.log("Skipping additional Ghost publishing attempt to avoid duplicate posts");
        
        // Create a minimal ghostResult to continue execution
        var ghostResult = { members: { all: [] } };
        try {
          
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
          
          const subject = newsletterName + " - " + decision;
          
          // In debug mode, create a draft instead of sending
          if (debugMode) {
            // Get test email from properties or use active user's email
            const testEmail = props.getProperty('TEST_EMAIL') || Session.getActiveUser().getEmail();
            
            // Create a draft email to the test recipient
            const draftSubject = "[DEBUG] " + newsletterName + " - " + decision;
            const draft = GmailApp.createDraft(
              testEmail,
              draftSubject,
              'This email requires HTML to view properly.',
              {
                htmlBody: htmlContent,
                name: newsletterName
              }
            );
            Logger.log("Debug mode: Draft email created with subject: " + draftSubject + " to recipient: " + testEmail);
          } else {
            // Send the email using our enhanced sendEmail function
            const recipientList = recipients.join(",");
            const emailResult = sendEmail(subject, htmlContent, recipientList, false, true); // true for forceBcc
            if (!emailResult.success) {
              Logger.log("Failed to send email to recipients: " + recipientList);
              sendErrorEmail("Trade Decision Email Error", emailResult.error || "Unknown error");
              return false;
            }
          }
        } catch (fallbackError) {
          Logger.log("Error in fallback Ghost publishing: " + fallbackError);
          throw fallbackError;
        }
      }
    
    Logger.log("HTML content saved successfully to Google Drive and published to Ghost");
    Logger.log("Trade decision email process completed.");
    return true;
  } catch (error) {
    Logger.log("Error in sendTradeDecisionEmail: " + error);
    sendErrorEmail("Trade Decision Email Error", error.toString());
    return false;
  }
}

/**
 * Sends an error notification email
 * 
 * @param {string} subject - The subject of the email
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
    const htmlBody = 
      "<div style=\"font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 5px;\">" +
        "<h2 style=\"color: #d32f2f;\">Market Pulse Daily Error</h2>" +
        "<p><strong>Date:</strong> " + formattedDate + "</p>" +
        "<div style=\"background-color: #f5f5f5; padding: 15px; border-left: 4px solid #d32f2f; margin: 15px 0; font-family: monospace; white-space: pre-wrap; overflow-x: auto;\">" +
          errorMessage +
        "</div>" +
        "<p style=\"font-size: 12px; color: #757575; margin-top: 30px;\">" +
          "This is an automated error notification from Market Pulse Daily." +
        "</p>" +
      "</div>";
    
    // Send email
    return sendEmail("[ERROR] " + subject, htmlBody, adminEmail, false, false);
  } catch (error) {
    Logger.log("Error in sendErrorEmail: " + error);
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
    const htmlBody = 
      "<div style=\"font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 5px;\">" +
        "<h2 style=\"color: #1976d2;\">Market Pulse Daily OpenAI Prompt</h2>" +
        "<p><strong>Date:</strong> " + formattedDate + "</p>" +
        "<p><strong>Prompt Length:</strong> " + prompt.length + " characters</p>" +
        "<div style=\"background-color: #f5f5f5; padding: 15px; border-left: 4px solid #1976d2; margin: 15px 0; font-family: monospace; white-space: pre-wrap; overflow-x: auto; max-height: 500px; overflow-y: auto;\">" +
          prompt.replace(/</g, '&lt;').replace(/>/g, '&gt;') +
        "</div>" +
        "<p style=\"font-size: 12px; color: #757575; margin-top: 30px;\">" +
          "This is an automated email from Market Pulse Daily containing the prompt sent to OpenAI." +
        "</p>" +
      "</div>";
    
    // Send email
    const result = sendEmail("[DEBUG] OpenAI Prompt", htmlBody, adminEmail, false, false);
    return result.success;
  } catch (error) {
    Logger.log("Error in sendPromptEmail: " + error);
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
    Logger.log("Preparing to send email to: " + recipient);
    
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
      Logger.log("No sender email configured, using active user email: " + senderEmail);
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
      Logger.log("Email sent with subject \"" + subject + "\" to " + recipients.length + " BCC recipients");
    } else {
      // Send directly to the first recipient, BCC the rest if there are multiple
      const mainRecipient = recipients[0];
      
      if (recipients.length > 1) {
        options.bcc = recipients.slice(1).join(',');
      }
      
      GmailApp.sendEmail(mainRecipient, subject, "This email contains HTML content. Please view in an HTML-compatible email client.", options);
      Logger.log("Email sent with subject \"" + subject + "\" to " + mainRecipient + " and " + (recipients.length - 1) + " BCC recipients");
    }
    
    return { success: true };
  } catch (error) {
    Logger.log("Error sending email: " + error);
    return { success: false, error: error.toString() };
  }
}
/**
 * Generates a simple fallback email template when Ghost publishing fails
 * 
 * @param {Object} analysisJson - The analysis result JSON object
 * @return {String} HTML content for the email
 */
function generateFallbackEmailTemplate(analysisJson) {
  try {
    // Extract basic information from the analysis JSON
    const decision = analysisJson.decision ? 
      (typeof analysisJson.decision === 'object' ? analysisJson.decision.text : analysisJson.decision) : 
      'Market Update';
    
    const summary = analysisJson.justification ? 
      (typeof analysisJson.justification === 'object' ? analysisJson.justification.summary : analysisJson.justification) : 
      'No summary available';
    
    const analysis = analysisJson.justification ? 
      (typeof analysisJson.justification === 'object' ? analysisJson.justification.analysis : analysisJson.justification) : 
      'No detailed analysis available';
    
    // Format current date
    const props = PropertiesService.getScriptProperties();
    const timeZone = props.getProperty('TIME_ZONE') || 'America/New_York';
    const currentDate = new Date();
    const formattedDate = Utilities.formatDate(currentDate, timeZone, "MMMM dd, yyyy 'at' hh:mm a 'ET'");
    
    // Create a simple HTML template
    const htmlContent = 
      "<div style=\"font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px;\">" +
        "<div style=\"background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin-bottom: 20px;\">" +
          "<h1 style=\"color: #333; margin-top: 0;\">" + decision + "</h1>" +
          "<p style=\"color: #666; font-style: italic;\">Generated on " + formattedDate + "</p>" +
        "</div>" +
        
        "<div style=\"margin-bottom: 30px;\">" +
          "<h2 style=\"color: #333;\">Summary</h2>" +
          "<p style=\"line-height: 1.6;\">" + summary + "</p>" +
        "</div>" +
        
        "<div style=\"margin-bottom: 30px;\">" +
          "<h2 style=\"color: #333;\">Analysis</h2>" +
          "<p style=\"line-height: 1.6;\">" + analysis + "</p>" +
        "</div>" +
        
        "<div style=\"border-top: 1px solid #eee; padding-top: 20px; margin-top: 30px; font-size: 12px; color: #999;\">" +
          "<p>This is a fallback template. For the full analysis with charts and detailed market data, please contact support.</p>" +
        "</div>" +
      "</div>";
    
    return htmlContent;
  } catch (error) {
    Logger.log("Error in generateFallbackEmailTemplate: " + error);
    
    // Return an ultra-simple template if there's an error
    return "<div style=\"font-family: Arial, sans-serif; padding: 20px;\">" +
           "<h1>Market Analysis</h1>" +
           "<p>There was an error generating the detailed report. Please contact support.</p>" +
           "</div>";
  }
}
