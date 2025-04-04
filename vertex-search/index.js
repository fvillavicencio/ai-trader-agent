require('dotenv').config();
const { google } = require('googleapis');
const axios = require('axios');
const path = require('path');

// Configuration from environment variables with defaults
const PROJECT_ID = process.env.GCP_PROJECT_ID || 'ai-trader-agent';
const PROJECT_NUMBER = process.env.PROJECT_NUMBER || '820158831475';
const LOCATION = 'us-central1'; // Vertex AI Search is in us-central1 based on your screenshot
const INDEX_ENDPOINT_ID = '694957319452098560';
const INDEX_ID = 'geopolitical-risks-index';

// Function to get authenticated client
async function getAuthClient() {
  const auth = new google.auth.GoogleAuth({
    keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS || 
             path.join(__dirname, 'ai-trader-agent-26a2b921b48d.json'),
    scopes: ['https://www.googleapis.com/auth/cloud-platform']
  });
  
  const client = await auth.getClient();
  const token = await client.getAccessToken();
  return token.token;
}

// Function to make API requests with proper error handling
async function makeRequest(url, method = 'GET', data = null) {
  try {
    const token = await getAuthClient();
    
    const config = {
      url,
      method,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    };
    
    if (data && (method === 'POST' || method === 'PUT')) {
      config.data = data;
    }
    
    console.log(`Making ${method} request to: ${url}`);
    const response = await axios(config);
    return response.data;
  } catch (error) {
    console.error(`Error making request to ${url}:`, error.message);
    
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Response:', JSON.stringify(error.response.data, null, 2));
    }
    
    return { error: error.message, details: error.response?.data };
  }
}

// Get Vertex AI index endpoint details
async function getIndexEndpointDetails() {
  console.log('\n=== Getting Index Endpoint Details ===');
  
  const url = `https://${LOCATION}-aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/${LOCATION}/indexEndpoints/${INDEX_ENDPOINT_ID}`;
  console.log(`\nFetching details from: ${url}`);
  
  const result = await makeRequest(url);
  
  if (!result.error) {
    console.log('✅ Successfully retrieved index endpoint details:');
    console.log(JSON.stringify(result, null, 2));
    return result;
  } else {
    console.log('❌ Failed to retrieve index endpoint details');
    return result;
  }
}

// List deployed indexes
async function listDeployedIndexes() {
  console.log('\n=== Listing Deployed Indexes ===');
  
  const url = `https://${LOCATION}-aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/${LOCATION}/indexEndpoints/${INDEX_ENDPOINT_ID}/deployedIndexes`;
  console.log(`\nFetching deployed indexes from: ${url}`);
  
  const result = await makeRequest(url);
  
  if (!result.error) {
    console.log('✅ Successfully retrieved deployed indexes:');
    console.log(JSON.stringify(result, null, 2));
    return result;
  } else {
    console.log('❌ Failed to retrieve deployed indexes');
    return result;
  }
}

// Search the index
async function searchIndex(query = "recent geopolitical risks financial markets impact last week") {
  console.log('\n=== Searching Vertex AI Index ===');
  
  // Use the public endpoint domain name for the search request
  const url = `https://1827117796.us-central1-820158831475.vdb.vertexai.goog/v1/projects/${PROJECT_ID}/locations/${LOCATION}/indexEndpoints/${INDEX_ENDPOINT_ID}:findNeighbors`;
  
  console.log(`\nSearching with query: ${query}`);
  console.log(`Search endpoint: ${url}`);
  
  const result = await makeRequest(url, 'POST', {
    queries: [[query]],
    neighborCount: 10
  });
  
  if (!result.error) {
    console.log('✅ Successfully retrieved search results:');
    if (result.matchingItems && result.matchingItems.length > 0) {
      console.log('\nFound matching items:');
      result.matchingItems.forEach((item, index) => {
        console.log(`\nResult ${index + 1}:`);
        console.log('ID:', item.id);
        console.log('Score:', item.matchingScore);
        if (item.document) {
          console.log('Document:', item.document);
        }
      });
    } else {
      console.log('No matching items found');
    }
    return result;
  } else {
    console.log('❌ Failed to retrieve search results');
    return result;
  }
}

// Try alternative search method
async function tryAlternativeSearch(query) {
  const url = `https://${LOCATION}-aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/${LOCATION}/indexEndpoints/${INDEX_ENDPOINT_ID}:findNeighbors`;
  console.log(`\nTrying findNeighbors endpoint: ${url}`);
  
  const searchRequest = {
    deployedIndexId: INDEX_ID,
    queries: [{
      datapoint: {
        datapoint_id: "query",
        feature_vector: [], // This would need embedding but we'll try text first
        restricts: [],
        sparse_vector: {},
        numerical_restricts: []
      },
      neighbor_count: 10
    }]
  };
  
  // Add text query if available
  if (query) {
    searchRequest.queries[0].datapoint.textInput = query;
  }
  
  const result = await makeRequest(url, 'POST', searchRequest);
  
  if (!result.error) {
    console.log('✅ Alternative search successful!');
    console.log(JSON.stringify(result, null, 2));
    return result;
  } else {
    console.log('❌ Alternative search failed');
    return result;
  }
}

// Diagnose issues with index or authentication
async function diagnoseIssues() {
  console.log('\n=== Diagnosing Issues ===');
  
  // Check IAM permissions
  const iamUrl = `https://iam.googleapis.com/v1/projects/${PROJECT_ID}/serviceAccounts`;
  console.log(`\nChecking service accounts: ${iamUrl}`);
  
  const iamResult = await makeRequest(iamUrl);
  
  if (!iamResult.error) {
    console.log('✅ Successfully retrieved service accounts');
    // Check if we have any service accounts with Vertex AI permissions
    if (iamResult.accounts) {
      console.log('Service accounts:');
      iamResult.accounts.forEach(account => {
        console.log(`- ${account.email}: ${account.displayName}`);
      });
    }
  } else {
    console.log('❌ Failed to retrieve service accounts, possible permission issue');
  }
  
  // Check if Vertex AI API is enabled
  const apisUrl = `https://serviceusage.googleapis.com/v1/projects/${PROJECT_ID}/services/aiplatform.googleapis.com`;
  console.log(`\nChecking if Vertex AI API is enabled: ${apisUrl}`);
  
  const apiResult = await makeRequest(apisUrl);
  
  if (!apiResult.error && apiResult.state === 'ENABLED') {
    console.log('✅ Vertex AI API is enabled');
  } else {
    console.log('❌ Vertex AI API may not be enabled');
    console.log('To enable it, run:');
    console.log(`gcloud services enable aiplatform.googleapis.com --project=${PROJECT_ID}`);
  }
  
  // Try to list all available index endpoints
  const endpointsUrl = `https://${LOCATION}-aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/${LOCATION}/indexEndpoints`;
  console.log(`\nListing all index endpoints: ${endpointsUrl}`);
  
  const endpointsResult = await makeRequest(endpointsUrl);
  
  if (!endpointsResult.error) {
    console.log('✅ Successfully retrieved index endpoints');
    if (endpointsResult.indexEndpoints && endpointsResult.indexEndpoints.length > 0) {
      console.log('Available index endpoints:');
      endpointsResult.indexEndpoints.forEach(endpoint => {
        console.log(`- ${endpoint.displayName} (${endpoint.name})`);
      });
    } else {
      console.log('No index endpoints found');
    }
  } else {
    console.log('❌ Failed to retrieve index endpoints');
  }
  
  return {
    iam: iamResult,
    api: apiResult,
    endpoints: endpointsResult
  };
}

// Main function to run the diagnosis
async function main() {
  console.log('\n=== Vertex AI Search Diagnostics ===');
  console.log(`Project ID: ${PROJECT_ID}`);
  console.log(`Project Number: ${PROJECT_NUMBER}`);
  console.log(`Location: ${LOCATION}`);
  console.log(`Index Endpoint ID: ${INDEX_ENDPOINT_ID}`);
  console.log(`Index ID: ${INDEX_ID}`);

  // Get index endpoint details
  const endpointDetails = await getIndexEndpointDetails();
  if (endpointDetails.error) {
    console.error('Failed to get index endpoint details');
    return;
  }

  // Search the index
  const searchResult = await searchIndex();
  if (searchResult.error) {
    console.error('Failed to search index');
    return;
  }
}

main().catch(console.error);