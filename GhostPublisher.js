/**
 * Publishes an HTML file from Google Drive to Ghost CMS via Lambda API.
 * 
 * @param {Object} jsonData - The JSON data to publish
 * @param {Object} options - Additional options
 * @param {boolean} options.draftOnly - Force the post to be created as a draft
 * @param {boolean} options.skipMembersFetch - Skip fetching members from Ghost API
 * @param {boolean} options.returnHtml - Request HTML content in the response
 * @returns {Object} - The response from Lambda API
 */
function publishToGhostWithLambda(jsonData, options = {}) {
  try {
    const props = PropertiesService.getScriptProperties();
    const ghostUrl = props.getProperty('GHOST_API_URL') || 'https://market-pulse-daily.ghost.io';
    const ghostApiKey = props.getProperty('GHOST_ADMIN_API_KEY');
    const newsletterId = props.getProperty('GHOST_NEWSLETTER_ID') || '67f427c5744a72000854ee8f';
    const lambdaApiUrl = 'https://vrwz4xsvml.execute-api.us-east-2.amazonaws.com/prod/publish';
    const lambdaApiKey = props.getProperty('GHOST_LAMBDA_API_KEY');
    
    // Prepare the request payload
    const payload = {
      ghostUrl: ghostUrl,
      ghostApiKey: ghostApiKey,
      newsletterId: newsletterId,
      jsonData: jsonData,
      draftOnly: !!options.draftOnly,  // Pass the draftOnly parameter to the Lambda function
      returnHtml: !!options.returnHtml  // Request HTML content in the response
    };
    
    // For testing purposes, we'll log the payload structure (without sensitive data)
    Logger.log('Preparing to publish to Ghost via Lambda with payload structure:');
    Logger.log('ghostUrl: ' + ghostUrl);
    Logger.log('newsletterId: ' + newsletterId);
    Logger.log('jsonData keys: ' + Object.keys(jsonData).join(', '));
    Logger.log('draftOnly: ' + !!options.draftOnly);
    
    // Make the actual API call to the Lambda function
    let lambdaResponse = null;
    let publishError = null;
    
    try {
      Logger.log('Calling Lambda API to ' + (options.draftOnly ? 'create draft' : 'publish') + ' article...');
      const response = UrlFetchApp.fetch(lambdaApiUrl, {
        method: 'post',
        contentType: 'application/json',
        headers: {
          'x-api-key': lambdaApiKey
        },
        payload: JSON.stringify(payload),
        muteHttpExceptions: true
      });
      
      const responseCode = response.getResponseCode();
      const responseText = response.getContentText();
      
      Logger.log('Lambda API response code: ' + responseCode);
      Logger.log('Lambda API response: ' + responseText);
      
      if (responseCode >= 200 && responseCode < 300) {
        // Check if the response is HTML directly
        if (options.returnHtml && (responseText.startsWith('<!DOCTYPE') || responseText.startsWith('<html'))) {
          lambdaResponse = { html: responseText };
          Logger.log('HTML content received directly from Lambda');
        } else {
          // Parse as JSON
          try {
            lambdaResponse = JSON.parse(responseText);
            Logger.log('Article successfully ' + (options.draftOnly ? 'saved as draft' : 'published') + ' to Ghost!');
            
            // Check if the response body contains HTML
            if (options.returnHtml && lambdaResponse.body && 
                typeof lambdaResponse.body === 'string' && 
                (lambdaResponse.body.startsWith('<!DOCTYPE') || lambdaResponse.body.startsWith('<html'))) {
              lambdaResponse.html = lambdaResponse.body;
              Logger.log('HTML content extracted from Lambda response body');
            }
          } catch (parseError) {
            publishError = 'Failed to parse Lambda response: ' + parseError.toString();
            Logger.log(publishError);
          }
        }
      } else {
        publishError = 'Error ' + responseCode + ' ' + (options.draftOnly ? 'creating draft' : 'publishing') + ' article to Ghost. Response: ' + responseText;
        Logger.log(publishError);
      }
    } catch (apiError) {
      publishError = 'Error calling Lambda API: ' + apiError.toString();
      Logger.log(publishError);
    }
    
    // If there was an error publishing, log it and send an error email
    if (publishError) {
      const errorMessage = `Failed to publish article to Ghost:\n\n` +
                         `Error: ${publishError}\n\n` +
                         `Payload sent to Lambda: ${JSON.stringify({
                           ghostUrl: ghostUrl,
                           newsletterId: newsletterId,
                           draftOnly: !!options.draftOnly,
                           jsonDataKeys: Object.keys(jsonData)
                         }, null, 2)}`;
      
      Logger.log('Sending error notification email...');
      try {
        sendErrorEmail('Ghost Publishing Failed', errorMessage);
      } catch (emailError) {
        Logger.log('Failed to send error email: ' + emailError);
      }
      
      // Return error response
      return {
        success: false,
        error: publishError,
        message: 'Failed to publish article to Ghost',
        timestamp: new Date().toISOString()
      };
    }
    
    // At this point, the article was published successfully
    // Extract decision and summary for teaser email
    const decision = jsonData.decision ? jsonData.decision.text || jsonData.decision : 'Market Update';
    const summary = jsonData.justification ? jsonData.justification.summary || jsonData.justification : '';
    
    // Generate a mock post URL for testing if we don't have a real one from the Lambda response
    const now = new Date();
    const dateStr = Utilities.formatDate(now, props.getProperty('TIME_ZONE') || 'America/New_York', 'yyyy-MM-dd');
    const timeStr = Utilities.formatDate(now, props.getProperty('TIME_ZONE') || 'America/New_York', 'HH-mm-ss');
    const mockPostSlug = `market-pulse-${dateStr}-${timeStr}`;
    
    // Use the real post URL if available, otherwise use the mock URL
    const postUrl = lambdaResponse && lambdaResponse.postUrl 
      ? lambdaResponse.postUrl 
      : `${ghostUrl}/${mockPostSlug}`;
    
    // Generate teaser email HTML
    const teaserHtmlBody = generateTeaserTeaserHtml({
      decision: decision,
      summary: summary,
      reportUrl: postUrl,
      generatedAt: now
    });
    
    // Log the teaser email HTML for preview
    Logger.log('Teaser Email HTML Preview:');
    Logger.log(teaserHtmlBody);
    
    // Fetch Ghost members to include in the response if we don't already have them from the Lambda response
    let members = lambdaResponse && lambdaResponse.members 
      ? lambdaResponse.members 
      : { all: [], paid: [], free: [], comped: [] };
    
    if (!lambdaResponse && !options.skipMembersFetch) {
      try {
        const token = generateGhostJWT(ghostApiKey);
        const membersUrl = ghostUrl + '/ghost/api/admin/members/?limit=all&filter=subscribed:true';
        const membersResp = UrlFetchApp.fetch(membersUrl, {
          method: 'get',
          headers: { 'Authorization': 'Ghost ' + token }
        });
        const membersData = JSON.parse(membersResp.getContentText());
        
        if (membersData && membersData.members) {
          for (let i = 0; i < membersData.members.length; i++) {
            const member = membersData.members[i];
            if (member.email) {
              members.all.push(member.email);
              
              // Categorize members
              if (member.status === 'paid') {
                members.paid.push(member.email);
              } else if (member.status === 'comped') {
                members.comped.push(member.email);
              } else {
                members.free.push(member.email);
              }
            }
          }
        }
      } catch (membersErr) {
        Logger.log('Error fetching members: ' + membersErr);
      }
    }
    
    // Create a draft email in Gmail
    const subject = 'Market Pulse Daily: ' + decision;
    const debugMode = props.getProperty('DEBUG_MODE') === 'true';
    const TEST_EMAIL = props.getProperty('TEST_EMAIL') || Session.getActiveUser().getEmail();
    
    // Create a draft email - use the TEST_EMAIL as recipient if in debug mode
    // or create a draft without sending if not in debug mode
    try {
      if (debugMode) {
        // In debug mode, create a draft to the test email
        const draft = GmailApp.createDraft(
          TEST_EMAIL,
          subject,
          'This email requires HTML to view properly.',
          {
            htmlBody: teaserHtmlBody,
            name: 'Market Pulse Daily'
          }
        );
        Logger.log('Draft teaser email created with subject: ' + subject + ' to recipient: ' + TEST_EMAIL);
      } else {
        // Not in debug mode, just create a draft without a recipient (will be in Drafts folder)
        const draft = GmailApp.createDraft(
          '',  // No recipient
          subject,
          'This email requires HTML to view properly.',
          {
            htmlBody: teaserHtmlBody,
            name: 'Market Pulse Daily',
            bcc: members.all.join(',')  // Add all members as BCC
          }
        );
        Logger.log('Draft teaser email created with subject: ' + subject + ' (no recipient, will be in Drafts folder)');
      }
    } catch (emailError) {
      const errorMsg = 'Failed to create draft email: ' + emailError.toString();
      Logger.log(errorMsg);
      sendErrorEmail('Email Draft Creation Failed', errorMsg);
      throw new Error(errorMsg);
    }
    
    // Create a response that matches the Lambda function's response format
    const response = {
      success: true,
      message: "Article successfully published and teaser email created" + (options.draftOnly ? " (draft only mode)" : ""),
      postUrl: lambdaResponse?.postUrl || postUrl,
      postId: lambdaResponse?.postId || "draft-" + Utilities.getUuid(),
      members: members,
      timestamp: new Date().toISOString()
    };
    
    // Merge any additional fields from the Lambda response
    if (lambdaResponse) {
      Object.assign(response, lambdaResponse);
    }
    
    // If HTML content was requested but not found in the Lambda response,
    // add a note to the response
    if (options.returnHtml && !response.html) {
      response.htmlStatus = "HTML content was requested but not returned by the Lambda function";
    }
    
    return response;
  } catch (error) {
    Logger.log('Error in publishToGhostWithLambda: ' + error.toString());
    throw error;
  }
}

/**
 * Test function for the publishToGhostWithLambda function
 * Retrieves the JSON payload from Google Drive and sends it to the Lambda function
 */
/**
 * Test function for the publishToGhostWithLambda function with returnHtml option
 * This demonstrates how to make a single call to both publish content and retrieve HTML
 */
function testPublishToGhostWithHtmlRetrieval() {
  try {
    // Get script properties
    var props = PropertiesService.getScriptProperties();
    var folderName = props.getProperty('GOOGLE_FOLDER_NAME');
    var jsonFileName = "market_pulse_data.json";
    var htmlFileName = props.getProperty('GOOGLE_FILE_NAME') || 'MarketPulseDaily.html';
    
    // Find the folder by name
    var folderIterator = DriveApp.getFoldersByName(folderName);
    if (!folderIterator.hasNext()) {
      throw new Error('Folder ' + folderName + ' not found');
    }
    var folder = folderIterator.next();
    Logger.log('Searching for file: ' + jsonFileName + ' in folder: ' + folderName);

    // Search for the JSON file in the specified folder
    var files = folder.getFilesByName(jsonFileName);
    if (!files.hasNext()) {
      throw new Error('File ' + jsonFileName + ' not found in folder ' + folderName);
    }
    var file = files.next();
    Logger.log('Found file: ' + file.getName());
    
    // Read the JSON content
    var jsonContent = file.getBlob().getDataAsString();
    var jsonData = JSON.parse(jsonContent);
    Logger.log('JSON data loaded successfully with keys: ' + Object.keys(jsonData).join(', '));
    
    // Call publishToGhostWithLambda with returnHtml option
    // This makes a single call to both publish the content and retrieve the HTML
    var result = publishToGhostWithLambda(jsonData, {
      draftOnly: true, // Use draft mode for testing
      returnHtml: true  // Request HTML in the response
    });
    
    // Check if HTML was returned
    if (result && result.html) {
      Logger.log('HTML content successfully retrieved from Ghost Lambda');
      Logger.log('HTML content length: ' + result.html.length + ' characters');
      
      // Save the HTML to Google Drive
      var htmlFile;
      var htmlFiles = folder.getFilesByName(htmlFileName);
      if (htmlFiles.hasNext()) {
        htmlFile = htmlFiles.next();
        Logger.log('Found existing HTML file: ' + htmlFileName);
        htmlFile.setContent(result.html);
      } else {
        htmlFile = folder.createFile(htmlFileName, result.html);
        Logger.log('Created new HTML file: ' + htmlFileName);
      }
      
      var htmlFileUrl = htmlFile.getUrl();
      Logger.log('HTML file saved to Google Drive: ' + htmlFileUrl);
      
      return {
        success: true,
        message: 'HTML content successfully retrieved and saved',
        htmlUrl: htmlFileUrl,
        postUrl: result.postUrl,
        postId: result.postId
      };
    } else {
      Logger.log('No HTML content returned from Ghost Lambda');
      if (result && result.htmlStatus) {
        Logger.log('HTML status: ' + result.htmlStatus);
      }
      
      return {
        success: false,
        message: 'No HTML content returned from Ghost Lambda',
        error: result.htmlStatus || 'Unknown error'
      };
    }
  } catch (error) {
    Logger.log('Error in testPublishToGhostWithHtmlRetrieval: ' + error.toString());
    return {
      success: false,
      message: 'Error testing Ghost HTML retrieval',
      error: error.toString()
    };
  }
}

/**
 * Test function for the publishToGhostWithLambda function
 * Retrieves the JSON payload from Google Drive and sends it to the Lambda function
 */
function testPublishToGhostWithLambda() {
  try {
    // Get script properties
    var props = PropertiesService.getScriptProperties();
    var folderName = props.getProperty('GOOGLE_FOLDER_NAME');
    var jsonFileName = "market_pulse_data.json";
    
    // Find the folder by name
    var folderIterator = DriveApp.getFoldersByName(folderName);
    if (!folderIterator.hasNext()) {
      throw new Error('Folder ' + folderName + ' not found');
    }
    var folder = folderIterator.next();
    Logger.log('Searching for file: ' + jsonFileName + ' in folder: ' + folderName);

    // Search for the JSON file in the specified folder
    var files = folder.getFilesByName(jsonFileName);
    if (!files.hasNext()) {
      throw new Error('File ' + jsonFileName + ' not found in folder ' + folderName);
    }
    var file = files.next();
    Logger.log('Found file: ' + file.getName() + ' with ID: ' + file.getId());

    // Get the JSON content from the file
    var jsonContent = file.getBlob().getDataAsString();
    var jsonData;
    
    try {
      // Parse the JSON content
      jsonData = JSON.parse(jsonContent);
      Logger.log('Successfully parsed JSON data with keys: ' + Object.keys(jsonData).join(', '));
    } catch (parseError) {
      Logger.log('Error parsing JSON: ' + parseError.toString());
      throw new Error('Invalid JSON format in file: ' + parseError.message);
    }
    
    // Call the function with the JSON data
    // Set draftOnly to false to actually publish the article to Ghost
    const result = publishToGhostWithLambda(jsonData, { 
      isTest: true,
      draftOnly: false  // Changed from true to false to actually publish the article
    });
    
    // Log the result
    Logger.log('Test publishToGhostWithLambda result:');
    Logger.log(JSON.stringify(result, null, 2));
    
    return result;
  } catch (error) {
    Logger.log('Error in testPublishToGhostWithLambda: ' + error.toString());
    throw error;
  }
}

/**
 * Generate teaser HTML for the teaser email
 * @param {Object} opts - Options for the teaser HTML
 * @param {string} opts.decision - The decision text
 * @param {string} opts.summary - The summary text
 * @param {string} opts.reportUrl - The URL of the report
 * @param {Date} opts.generatedAt - The date the report was generated
 * @returns {string} - The generated teaser HTML
 */
function generateTeaserTeaserHtml(opts) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Market Pulse Daily - Teaser</title>
</head>
<body style="background:#f6f8fa; margin:0; padding:0;">
  <div style="max-width: 700px; margin: 0 auto; padding: 20px; background-color: #fff; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
    <h1 style="color: #333; border-bottom: 1px solid #eee; padding-bottom: 10px; margin-top: 0; text-align: center;">Market Pulse Daily</h1>
    <div style="font-size: 11px; color: #666; margin-bottom: 20px; text-align: center;">Generated on ${Utilities.formatDate(opts.generatedAt || new Date(), 'America/New_York', 'MMM d, yyyy, h:mm a z')}</div>
    <!-- Decision/Alert Section -->
    <div style="text-align:center; margin: 18px 0 18px 0;">
      <span style="font-weight: bold; color: #FFA500; font-size: 1.7em;">${opts.decision}</span>
      <div style="margin-top: 8px; color: #444; font-size: 1.08em;">${opts.summary}</div>
    </div>
    <div style="text-align:center; margin: 32px 0 0 0;">
      <a href="${opts.reportUrl}" style="display:inline-block; background:#1a365d; color:#fff; font-weight:600; padding:16px 36px; border-radius:6px; font-size:1.1em; text-decoration:none; box-shadow:0 2px 8px rgba(26,54,93,0.08);">Read the Full Market Pulse Report &rarr;</a>
      <div style="margin-top:12px; color:#444; font-size:1em;">Unlock deeper insights and actionable trade ideas—click above to access the full analysis. <span style="color:#c0392b; font-weight:bold;">(Subscription required)</span></div>
    </div>
  </div>
</body>
</html>`;
}

/**
 * Generates a Ghost Admin API JWT for authentication.
 * @param {string} adminApiKey - The Ghost Admin API key in id:secret format
 * @returns {string} - The JWT token
 */
function generateGhostJWT(adminApiKey) {
  var parts = adminApiKey.split(':');
  if (parts.length !== 2) {
    throw new Error('Invalid Admin API key format. Expect "id:secret".');
  }
  var keyId = parts[0];
  var secretHex = parts[1];
  var secretBytes = hexToBytes(secretHex);
  var header = { alg: "HS256", typ: "JWT", kid: keyId };
  var now = Math.floor(Date.now() / 1000);
  var payload = { iat: now, exp: now + 300, aud: "/admin/" };
  var base64UrlEncode = function(obj) {
    return Utilities.base64EncodeWebSafe(JSON.stringify(obj)).replace(/=+$/, '');
  };
  var encodedHeader = base64UrlEncode(header);
  var encodedPayload = base64UrlEncode(payload);
  var toSign = Utilities.newBlob(encodedHeader + "." + encodedPayload).getBytes();
  var signatureBytes = Utilities.computeHmacSha256Signature(toSign, secretBytes);
  var encodedSignature = Utilities.base64EncodeWebSafe(signatureBytes).replace(/=+$/, '');
  return encodedHeader + "." + encodedPayload + "." + encodedSignature;
}

/**
 * Converts a hex string to a byte array with proper handling for signed 8-bit values
 * @param {string} hex - The hex string to convert
 * @returns {number[]} Array of bytes
 * @throws {Error} If the hex string is invalid
 */
function hexToBytes(hex) {
  var bytes = [];
  for (var i = 0; i < hex.length; i += 2) {
    var byte = parseInt(hex.substr(i, 2), 16);
    if (byte > 127) byte -= 256;
    bytes.push(byte);
  }
  return bytes;
}
