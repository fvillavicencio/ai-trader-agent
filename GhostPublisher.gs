/**
 * Publishes HTML content to Ghost CMS
 * 
 * @param {String} fileId - The Google Drive file ID containing the HTML content
 * @param {String} folderId - The Google Drive folder ID where the file is located
 * @param {String} fileName - The name of the file
 * @return {Object} Result of the publication attempt
 */
function publishToGhost(fileId, folderId, fileName) {
  try {
    // Get script properties
    const props = PropertiesService.getScriptProperties();
    const ghostApiUrl = props.getProperty('GHOST_API_URL');
    const ghostApiKey = props.getProperty('GHOST_API_KEY');
    const ghostUsername = props.getProperty('GHOST_USERNAME');
    const ghostPassword = props.getProperty('GHOST_PASSWORD');
    
    // Check if Ghost API credentials are configured
    if (!ghostApiUrl || (!ghostApiKey && (!ghostUsername || !ghostPassword))) {
      Logger.log("Ghost API credentials not configured. Skipping publication.");
      return { success: false, message: "Ghost API credentials not configured" };
    }
    
    // Get the file content
    const file = DriveApp.getFileById(fileId);
    const htmlContent = file.getBlob().getDataAsString();
    
    // Extract title from the HTML content or use the file name
    let title = fileName;
    const titleMatch = htmlContent.match(/<title>(.*?)<\/title>/i);
    if (titleMatch && titleMatch[1]) {
      title = titleMatch[1];
    }
    
    // Format the date for the post
    const now = new Date();
    const formattedDate = Utilities.formatDate(now, "GMT", "yyyy-MM-dd'T'HH:mm:ss'Z'");
    
    // Create the post data
    const postData = {
      posts: [{
        title: title,
        html: htmlContent,
        status: "published",
        published_at: formattedDate,
        tags: ["Market Pulse Daily", "Trading Analysis"]
      }]
    };
    
    // Set up the request options
    let options;
    
    if (ghostApiKey) {
      // Use API key authentication
      options = {
        method: "post",
        contentType: "application/json",
        payload: JSON.stringify(postData),
        headers: {
          "Authorization": "Ghost " + ghostApiKey
        },
        muteHttpExceptions: true
      };
    } else {
      // Use username/password authentication
      options = {
        method: "post",
        contentType: "application/json",
        payload: JSON.stringify({
          username: ghostUsername,
          password: ghostPassword
        }),
        muteHttpExceptions: true
      };
      
      // Get authentication token
      const authResponse = UrlFetchApp.fetch(ghostApiUrl + "/authentication/token", options);
      const authData = JSON.parse(authResponse.getContentText());
      
      if (authResponse.getResponseCode() !== 200 || !authData.access_token) {
        Logger.log("Failed to authenticate with Ghost: " + authResponse.getContentText());
        return { success: false, message: "Authentication failed" };
      }
      
      // Set up the post request with the token
      options = {
        method: "post",
        contentType: "application/json",
        payload: JSON.stringify(postData),
        headers: {
          "Authorization": "Bearer " + authData.access_token
        },
        muteHttpExceptions: true
      };
    }
    
    // Make the request to create the post
    const response = UrlFetchApp.fetch(ghostApiUrl + "/posts/", options);
    const responseCode = response.getResponseCode();
    
    if (responseCode >= 200 && responseCode < 300) {
      Logger.log("Successfully published to Ghost");
      return { success: true, message: "Successfully published to Ghost" };
    } else {
      Logger.log("Failed to publish to Ghost: " + response.getContentText());
      return { success: false, message: "Failed to publish: " + response.getContentText() };
    }
  } catch (error) {
    Logger.log("Error in publishToGhost: " + error);
    return { success: false, message: "Error: " + error.toString() };
  }
}

/**
 * Export the functions for use in other scripts
 */
var GhostPublisher = {
  publishToGhost: publishToGhost
};