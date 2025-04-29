require('dotenv').config();
const { google } = require('googleapis');

// Configuration - Replace with your actual values
const PROJECT_ID = process.env.GCP_PROJECT_ID;
const LOCATION = 'global'; 
const SEARCH_ENGINE_ID = '694957319452098560';

async function performSearch(query) {
  try {
    // Initialize Google Cloud client with service account credentials
    const auth = new google.auth.GoogleAuth({
      credentials: require('./ai-trader-agent-26a2b921b48d.json'),
      scopes: ['https://www.googleapis.com/auth/cloud-platform']
    });

    // Get authenticated client
    const client = await auth.getClient();

    // Make the API request using the discovery engine API
    const response = await client.request({
      url: `https://discoveryengine.googleapis.com/v1beta/projects/${PROJECT_ID}/locations/${LOCATION}/dataStores/${SEARCH_ENGINE_ID}/servingConfigs/default_serving_config:search`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${await client.getAccessToken()}`
      },
      data: {
        query: query,
        pageSize: 10
      }
    });

    console.log("Raw Result:");
    console.log(JSON.stringify(response.data, null, 2));
    return response.data;

  } catch (e) {
    console.error('Error during search:', e);
    return { error: e.toString() };
  }
}

async function testSearch() {
  const searchQuery = "recent geopolitical risks financial markets impact last week";
  const results = await performSearch(searchQuery);

  console.log("\nSearch Query:", searchQuery);

  if (results && results.results) {
    console.log("Number of Results:", results.results.length);
    results.results.forEach((result, index) => {
      console.log(`\nResult ${index + 1}:`);
      console.log('ID:', result.document.id);
      console.log('Title:', result.document.title);
      console.log('URI:', result.document.uri);
      console.log('Score:', result.document.relevanceScore);
      console.log('Content:', result.document.content);
    });
  } else if (results && results.error) {
    console.log("Search Failed:", results.error);
  } else {
    console.log("No results found or unexpected response.");
  }
}

// Run the test
async function main() {
  try {
    console.log('Starting Vertex AI Search test...');
    await testSearch();
  } catch (error) {
    console.error('Error in main:', error);
  }
}

main();
