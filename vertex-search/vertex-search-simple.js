/**
 * Demonstrates basic search functionality using the Vertex AI Search API.
 */

require('dotenv').config();
const axios = require('axios');
const { google } = require('googleapis');
const path = require('path');

/**
 * Gets authentication token
 * @returns {Promise<string>} The access token
 */
const getAuthToken = async () => {
  const auth = new google.auth.GoogleAuth({
    keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS ||
             path.join(__dirname, 'ai-trader-agent-26a2b921b48d.json'),
    scopes: ['https://www.googleapis.com/auth/cloud-platform']
  });
  const authClient = await auth.getClient();
  const token = await authClient.getAccessToken();
  return token.token;
};

/**
 * Lists all deployed indexes for a given index endpoint.
 * @param {string} projectId - The project ID.
 * @param {string} location - The location.
 * @param {string} indexEndpointId - The index endpoint ID.
 * @returns {Promise<any>} The list of deployed indexes.
 */
const listDeployedIndexes = async (projectId, location, indexEndpointId) => {
  const token = await getAuthToken();
  
  try {
    const listUrl = `https://us-central1-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${location}/indexEndpoints/${indexEndpointId}`;
    console.log('Checking index endpoint:', listUrl);
    
    const response = await axios.get(listUrl, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.data.deployedIndexes || response.data.deployedIndexes.length === 0) {
      console.log('No deployed indexes found');
      return [];
    }

    console.log('Found deployed indexes:');
    response.data.deployedIndexes.forEach(index => {
      console.log(`- Index: ${index.index}`);
      console.log(`  Deployed Index ID: ${index.id}`);
      console.log(`  Display Name: ${index.displayName}`);
      console.log(`  State: ${index.state}`);
      console.log('');
    });

    return response.data.deployedIndexes;
  } catch (error) {
    console.error('Error checking index:', error);
    if (error.response) {
      console.error('API Response:', error.response.data);
    }
    throw error;
  }
};

/**
 * Performs a search query using the Vertex AI Search API.
 * @param {string} projectId - The project ID.
 * @param {string} location - The location.
 * @param {string} indexEndpointId - The index endpoint ID.
 * @param {string} query - The search query.
 * @returns {Promise<any>} The search results.
 */
const searchIndex = async (projectId, location, indexEndpointId, query) => {
  const token = await getAuthToken();
  
  try {
    // First get the index endpoint details to verify the deployed index
    const endpointUrl = `https://us-central1-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${location}/indexEndpoints/${indexEndpointId}`;
    console.log('Checking index endpoint:', endpointUrl);
    
    const endpointResponse = await axios.get(endpointUrl, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!endpointResponse.data.deployedIndexes || endpointResponse.data.deployedIndexes.length === 0) {
      throw new Error('No deployed indexes found.');
    }

    const deployedIndex = endpointResponse.data.deployedIndexes[0];
    console.log('Found deployed index:', deployedIndex.index);

    // Use the public endpoint domain name for the search request
    const searchUrl = `https://${endpointResponse.data.publicEndpointDomainName}/v1/projects/${projectId}/locations/${location}/indexEndpoints/${indexEndpointId}:findNeighbors`;
    console.log('Searching index:', searchUrl);

    const response = await axios.post(searchUrl, {
      queries: [
        {
          deployedIndexId: deployedIndex.id,
          query: {
            query: query,
            neighborCount: 10
          }
        }
      ]
    }, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('Search results:');
    if (response.data.matchingItems && response.data.matchingItems.length > 0) {
      response.data.matchingItems.forEach((item, index) => {
        console.log(`\nResult ${index + 1}:`);
        console.log('ID:', item.id);
        console.log('Score:', item.matchingScore);
        if (item.document) {
          console.log('Document:', item.document);
        }
      });
    } else {
      console.log('No results found');
    }

    return response.data;
  } catch (error) {
    console.error('Error searching index:', error);
    if (error.response) {
      console.error('API Response:', error.response.data);
    }
    throw error;
  }
};

// Load configuration from environment variables
const PROJECT_ID = '820158831475';
const LOCATION = 'us-central1';
const INDEX_ENDPOINT_ID = '694957319452098560';

// Run the index listing
listDeployedIndexes(PROJECT_ID, LOCATION, INDEX_ENDPOINT_ID)
  .then(result => {
    console.log('Index listing completed');
  })
  .catch(error => {
    console.error('Error listing indexes:', error);
  });

// Run the search
const searchQuery = "recent geopolitical risks financial markets impact last week";
searchIndex(PROJECT_ID, LOCATION, INDEX_ENDPOINT_ID, searchQuery)
  .then(result => {
    console.log('Search completed');
  })
  .catch(error => {
    console.error('Error searching:', error);
  });
