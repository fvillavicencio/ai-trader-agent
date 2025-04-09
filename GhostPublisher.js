/**
 * Publishes an HTML file from Google Drive to Ghost CMS.
 * 
 * @param {string} fileId - The ID of the HTML file in Google Drive
 * @param {string} folderId - The ID of the folder containing the HTML file
 * @param {string} fileName - The name of the HTML file
 * @returns {Object} - The response from Ghost API
 */
function publishToGhost(fileId, folderId, fileName) {
    // Get script properties
    const props = PropertiesService.getScriptProperties();
    const ghostApiUrl = props.getProperty('GHOST_API_URL') || 'https://market-pulse-daily.ghost.io';
    const ghostAdminApiKey = props.getProperty('GHOST_ADMIN_API_KEY') || '67f553a7f41c9900013e1fbe:36fe3da206f1ebb61643868fffca951da8ce9571521c1e8f853aadffe2f56e2e';
    const ghostAuthorId = props.getProperty('GHOST_AUTHOR_ID') || null;

    // Log configuration
    Logger.log('Ghost API Configuration:');
    Logger.log('Raw API URL: ' + ghostApiUrl);
    Logger.log('Raw Admin API Key: ' + ghostAdminApiKey);
    Logger.log('Raw Author ID: ' + ghostAuthorId);

    // Validate required configurations
    if (!ghostApiUrl || !ghostAdminApiKey) {
      throw new Error('Both Ghost API URL and Admin API Key must be configured');
    }

    // Set configuration
    const config = {
      apiUrl: ghostApiUrl,
      apiKey: ghostAdminApiKey,
      authorId: ghostAuthorId
    };

    // Log the final configuration being used
    Logger.log('Final Configuration:');
    Logger.log('Final API URL: ' + config.apiUrl);
    Logger.log('Final API Key: ' + config.apiKey);
    Logger.log('Final Author ID: ' + config.authorId);

    // Get the file content
    const file = DriveApp.getFileById(fileId);
    const content = file.getBlob().getDataAsString();
    
    // Extract and format the HTML content
    const bodyContent = extractBody(content);
    const formattedContent = '<div class="market-pulse-content">' + bodyContent + '</div>';

    // Build the Lexical JSON structure
    const lexicalPayload = {
      root: {
        type: "root",
        version: 1,
        indent: 0,
        format: "",
        direction: null,
        children: [
          {
            type: "html",
            version: 1,
            html: formattedContent
          }
        ]
      }
    };

    // Build the post payload
    const title = `Market Pulse Daily: ${Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "EEEE, MMMM d, yyyy")}`;
    const postPayload = {
      title: title,
      lexical: JSON.stringify(lexicalPayload),
      status: "published",
      tags: ["Market Analysis", "Daily Update"]
    };

    if (config.authorId) {
      postPayload.authors = [config.authorId];
    }

    // Log the payload
    Logger.log('Post Payload: ' + JSON.stringify(postPayload, null, 2));

    // Generate JWT token
    const token = generateGhostJWT(config.apiKey);
    Logger.log('Generated JWT: ' + token);

    // Set up the request options with the correct token
    const options = {
      method: "post",
      contentType: "application/json",
      payload: JSON.stringify(postPayload),
      headers: {
        "Authorization": `Ghost ${token}`,
        "Accept-Version": "v5.0",
        "Accept": "application/json",
        "Content-Type": "application/json"
      },
      muteHttpExceptions: true
    };

    // Log the full request URL - use the correct endpoint format
    const apiBase = `${config.apiUrl}/ghost/api/admin`;
    const checkUrl = `${apiBase}/posts/?filter=title:${encodeURIComponent(title)}`;
    Logger.log('Checking for existing post at: ' + checkUrl);
    
    // Check for existing post with the same title
    const existingPosts = UrlFetchApp.fetch(
      checkUrl,
      options
    );
    
    const existingPostsText = existingPosts.getContentText();
    Logger.log('Existing posts response: ' + existingPostsText);
    Logger.log('Existing posts status code: ' + existingPosts.getResponseCode());
    
    let existingPostsData;
    try {
      existingPostsData = JSON.parse(existingPostsText);
    } catch (e) {
      Logger.log('Error parsing existing posts response: ' + e.toString());
      Logger.log('Response text: ' + existingPostsText);
      throw new Error('Failed to parse existing posts response: ' + e.toString());
    }

    if (existingPostsData.posts && existingPostsData.posts.length > 0) {
      // Update existing post
      const postId = existingPostsData.posts[0].id;
      options.method = "put";
      const updateResponse = UrlFetchApp.fetch(
        `${apiBase}/posts/${postId}/`,
        options
      );
      
      const updateResult = updateResponse.getContentText();
      Logger.log("Update response from Ghost: " + updateResult);
      Logger.log('Update response status code: ' + updateResponse.getResponseCode());
      
      try {
        return JSON.parse(updateResult);
      } catch (e) {
        Logger.log('Error parsing update response: ' + e.toString());
        Logger.log('Response text: ' + updateResult);
        throw new Error('Failed to parse update response: ' + e.toString());
      }
    } else {
      // Create new post
      Logger.log('Creating new post at: ' + `${apiBase}/posts/`);
      const createResponse = UrlFetchApp.fetch(
        `${apiBase}/posts/`,
        options
      );
      
      const createResult = createResponse.getContentText();
      Logger.log("Create response from Ghost: " + createResult);
      Logger.log('Create response status code: ' + createResponse.getResponseCode());
      
      try {
        return JSON.parse(createResult);
      } catch (e) {
        Logger.log('Error parsing create response: ' + e.toString());
        Logger.log('Response text: ' + createResult);
        throw new Error('Failed to parse create response: ' + e.toString());
      }
    }
}

/**
 * Generates a valid JWT token for Ghost Admin API requests.
 * Your Admin API key should be in the form "id:secret".
 */
function generateGhostJWT(adminApiKey) {
  var parts = adminApiKey.split(':');
  if (parts.length !== 2) {
    throw new Error('Invalid Admin API key format. Expect "id:secret".');
  }
  var keyId = parts[0];
  var secret = parts[1]; // Hex string
  
  // Convert hex to byte array
  var keyBytes = [];
  for (var i = 0; i < secret.length; i += 2) {
    keyBytes.push(parseInt(secret.substr(i, 2), 16));
  }
  
  // Create a proper key from bytes
  var keyBlob = Utilities.newBlob('').setBytes(keyBytes);
  
  var header = {
    alg: "HS256",
    typ: "JWT",
    kid: keyId
  };
  
  var now = Math.floor(Date.now() / 1000);
  var payload = {
    iat: now,
    exp: now + 300,
    aud: "/v5/admin/"
  };
  
  // Base64Url encode the header and payload
  var encodedHeader = Utilities.base64EncodeWebSafe(JSON.stringify(header)).replace(/=+$/, '');
  var encodedPayload = Utilities.base64EncodeWebSafe(JSON.stringify(payload)).replace(/=+$/, '');
  
  // Create the content to be signed
  var tokenContent = encodedHeader + "." + encodedPayload;
  
  // Sign the content
  var signature = Utilities.computeHmacSha256Signature(tokenContent, keyBlob.getBytes());
  var encodedSignature = Utilities.base64EncodeWebSafe(signature).replace(/=+$/, '');
  
  // Return the complete JWT
  return tokenContent + "." + encodedSignature;
}

/**
 * Helper function: Converts a hex string into an array of numbers (bytes)
 */
function hexToBytes(hex) {
  var bytes = [];
  for (var i = 0; i < hex.length; i += 2) {
    bytes.push(parseInt(hex.substr(i, 2), 16));
  }
  return bytes;
}

/**
 * Extracts the content from within the <body> tag.
 */
function extractBody(html) {
  var regex = /<body[^>]*>([\s\S]*?)<\/body>/i;
  var match = html.match(regex);
  return match ? match[1] : html;
}

/**
 * Test function to locate and publish the latest trading analysis HTML file to Ghost.
 */
function testPublishLatestAnalysis() {
  try {
    // Get script properties
    const props = PropertiesService.getScriptProperties();
    const folderName = props.getProperty('GOOGLE_FOLDER_NAME');
    const fileName = props.getProperty('GOOGLE_FILE_NAME');

    // Find the folder by name
    const folderIterator = DriveApp.getFoldersByName(folderName);
    if (!folderIterator.hasNext()) {
      throw new Error(`Folder ${folderName} not found`);
    }
    const folder = folderIterator.next();
    
    Logger.log(`Searching for file: ${fileName} in folder: ${folderName}`);

    // Search for the file in the specified folder
    const files = folder.getFilesByName(fileName);

    if (!files.hasNext()) {
      throw new Error(`File ${fileName} not found in folder ${folderName}`);
    }

    const file = files.next();
    Logger.log(`Found file: ${file.getName()} with ID: ${file.getId()}`);

    // Publish the file to Ghost
    const result = publishToGhost(file.getId(), folder.getId(), fileName);
    Logger.log('Ghost publishing result: ' + JSON.stringify(result, null, 2));
    
    return result;
  } catch (error) {
    Logger.log('Error in testPublishLatestAnalysis:' + error.toString());
    throw error;
  }
}

/**
 * Main function to be called from other scripts
 * 
 * @param {Object} options - Configuration options
 * @param {string} options.fileId - The ID of the HTML file in Google Drive
 * @param {string} options.folderId - The ID of the folder containing the HTML file
 * @param {string} options.fileName - The name of the HTML file
 */
function runGhostPublisher(options) {
  try {
    const result = publishToGhost(
      options.fileId,
      options.folderId,
      options.fileName
    );
    
    Logger.log('Ghost publishing result: ' + JSON.stringify(result, null, 2));
    return result;
  } catch (error) {
    Logger.log('Error in runGhostPublisher:' + error.toString());
    throw error;
  }
}
