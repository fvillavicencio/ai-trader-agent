/**
 * Tests the Vertex AI Search API using the Vertex AI endpoint.
 *
 * Ensure that:
 * - Your index "geopolitical-risks-index" (ID: 694957319452098560) is created in us-central1.
 * - The Vertex AI API is enabled in your project.
 * - Your Apps Script project has the proper OAuth scopes (e.g., "https://www.googleapis.com/auth/cloud-platform").
 */
function testVertexAISearch() {
  // Configuration details.
  const projectId = 'ai-trader-agent';
  const location = 'us-central1';
  const indexId = '694957319452098560';
  
  // Construct the Vertex AI Search endpoint URL.
  const url = `https://${location}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${location}/indexes/${indexId}:search`;
  
  // Define the search query payload.
  const payload = {
    query: "What is the capital of France?"  // Replace or adjust your query as needed.
    // You can include additional parameters as required by your search configuration.
  };
  
  // Retrieve the OAuth2 access token.
  const oauthToken = ScriptApp.getOAuthToken();
  
  // Set up the request options.
  const options = {
    method: 'post',
    contentType: 'application/json',
    headers: {
      'Authorization': 'Bearer ' + oauthToken
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };
  
  try {
    // Make the API call.
    const response = UrlFetchApp.fetch(url, options);
    const content = response.getContentText();
    Logger.log("Response: " + content);
    
    // Optionally parse the response.
    const json = JSON.parse(content);
    Logger.log("Parsed Response: " + JSON.stringify(json, null, 2));
  } catch (e) {
    Logger.log("Error during API call: " + e.toString());
  }
}