/**
 * Test function to verify that HTML is being properly retrieved from the Ghost publishing Lambda function
 * and saved to Google Drive.
 */
function testGhostHtmlRetrieval() {
  try {
    Logger.log("Starting test of Ghost HTML retrieval...");
    
    // Get script properties
    const props = PropertiesService.getScriptProperties();
    const folderName = props.getProperty('GOOGLE_FOLDER_NAME') || 'Trading Analysis Emails';
    const jsonFileName = props.getProperty('JSON_FILE_NAME') || 'market_pulse_data.json';
    
    // Find the folder
    let folder;
    const folderIterator = DriveApp.getFoldersByName(folderName);
    
    if (folderIterator.hasNext()) {
      folder = folderIterator.next();
      Logger.log(`Found existing folder: ${folderName}`);
    } else {
      folder = DriveApp.createFolder(folderName);
      Logger.log(`Created new folder: ${folderName}`);
    }
    
    // Find the JSON file
    const jsonFileIterator = folder.getFilesByName(jsonFileName);
    
    if (!jsonFileIterator.hasNext()) {
      throw new Error(`JSON file ${jsonFileName} not found in folder ${folderName}`);
    }
    
    const jsonFile = jsonFileIterator.next();
    Logger.log(`Found JSON file: ${jsonFileName}`);
    
    // Read the JSON content
    const jsonContent = jsonFile.getBlob().getDataAsString();
    const jsonData = JSON.parse(jsonContent);
    
    Logger.log(`JSON data loaded with keys: ${Object.keys(jsonData).join(', ')}`);
    
    // Call the Ghost Lambda function with returnHtml option
    Logger.log("Calling Ghost Lambda function with returnHtml option...");
    
    const ghostResult = publishToGhostWithLambda(jsonData, {
      draftOnly: true,  // Use draft mode for testing
      returnHtml: true  // Request HTML in the response
    });
    
    // Check if HTML was returned
    if (ghostResult && ghostResult.html) {
      Logger.log("HTML content successfully retrieved from Ghost Lambda function");
      Logger.log(`HTML content length: ${ghostResult.html.length} characters`);
      Logger.log(`HTML content starts with: ${ghostResult.html.substring(0, 100)}...`);
      
      // Save the HTML to Google Drive
      const htmlFileName = 'MarketPulseDaily_test.html';
      
      // Create or update the HTML file
      let htmlFile;
      const htmlFileIterator = folder.getFilesByName(htmlFileName);
      
      if (htmlFileIterator.hasNext()) {
        htmlFile = htmlFileIterator.next();
        Logger.log(`Found existing HTML file: ${htmlFileName}`);
        htmlFile.setContent(ghostResult.html);
      } else {
        htmlFile = folder.createFile(htmlFileName, ghostResult.html);
        Logger.log(`Created new HTML file: ${htmlFileName}`);
      }
      
      const htmlFileUrl = htmlFile.getUrl();
      Logger.log(`HTML file saved to Google Drive: ${htmlFileUrl}`);
      
      return {
        success: true,
        message: "HTML content successfully retrieved and saved",
        htmlUrl: htmlFileUrl,
        postUrl: ghostResult.postUrl,
        postId: ghostResult.postId
      };
    } else {
      Logger.log("No HTML content returned from Ghost Lambda function");
      
      if (ghostResult && ghostResult.htmlStatus) {
        Logger.log(`HTML status: ${ghostResult.htmlStatus}`);
      }
      
      return {
        success: false,
        message: "No HTML content returned from Ghost Lambda function",
        error: ghostResult.htmlStatus || "Unknown error"
      };
    }
  } catch (error) {
    Logger.log(`Error in testGhostHtmlRetrieval: ${error.toString()}`);
    
    return {
      success: false,
      message: "Error testing Ghost HTML retrieval",
      error: error.toString()
    };
  }
}
