/**
 * Demo for using the enhanced publishToGhostWithLambda function
 * This demonstrates how to make a single call to both publish content and retrieve HTML
 * 
 * IMPORTANT: This ensures we only make a single invocation of the Ghost publishing function
 * to avoid creating duplicate posts in Ghost while still retrieving the HTML content directly.
 */

/**
 * Demonstrates how to use the publishToGhostWithLambda function with returnHtml option
 * to make a single call that both publishes content and retrieves HTML
 */
function demoSingleGhostPublish() {
  try {
    // Get script properties
    var props = PropertiesService.getScriptProperties();
    var folderName = props.getProperty('GOOGLE_FOLDER_NAME') || 'Trading Analysis Emails';
    var jsonFileName = props.getProperty('JSON_FILE_NAME') || 'market_pulse_data.json';
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
    
    // IMPORTANT: This is the key part - making a single call to both publish content and retrieve HTML
    // Call publishToGhostWithLambda with returnHtml option
    var result = publishToGhostWithLambda(jsonData, {
      draftOnly: true, // Use draft mode for testing (set to false for production)
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
      
      // Now you can use the other information from the result as needed
      // For example, to send a teaser email with the post URL
      if (result.postUrl) {
        Logger.log('Post URL: ' + result.postUrl);
        // You could send a teaser email here using the post URL
      }
      
      return {
        success: true,
        message: 'Content published and HTML retrieved in a single call',
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
    Logger.log('Error in demoSingleGhostPublish: ' + error.toString());
    return {
      success: false,
      message: 'Error demonstrating single Ghost publish',
      error: error.toString()
    };
  }
}

/**
 * Demonstrates how to use the publishToGhostWithLambda function with returnHtml option
 * in a production workflow
 */
function productionSingleGhostPublishWorkflow() {
  try {
    // Get script properties and prepare data
    // ... (your data preparation code here)
    
    // For demonstration, we'll use a simple object
    var jsonData = {
      title: "Market Pulse Daily - " + new Date().toLocaleDateString(),
      decision: "Hold",
      summary: "Market conditions remain stable",
      // ... other data fields
    };
    
    // PRODUCTION WORKFLOW:
    // 1. Make a single call to publishToGhostWithLambda with returnHtml option
    var result = publishToGhostWithLambda(jsonData, {
      draftOnly: false,  // Publish immediately (not a draft)
      returnHtml: true   // Request HTML in the response
    });
    
    // 2. Save the HTML to Google Drive
    if (result && result.html) {
      // Save HTML to Google Drive
      // ... (your code to save HTML to Drive)
      
      // 3. Send teaser email with the post URL
      if (result.postUrl) {
        // Send teaser email with the post URL
        // ... (your code to send teaser email)
      }
      
      return {
        success: true,
        message: "Workflow completed successfully"
      };
    } else {
      return {
        success: false,
        message: "Failed to retrieve HTML content"
      };
    }
  } catch (error) {
    Logger.log('Error in productionSingleGhostPublishWorkflow: ' + error.toString());
    return {
      success: false,
      message: 'Error in production workflow',
      error: error.toString()
    };
  }
}
