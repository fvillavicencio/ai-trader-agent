/**
 * Network Access Check Script
 * 
 * This script verifies network access to all required external APIs
 * used by the geopolitical risk analysis function.
 */

const axios = require('axios');

// List of API endpoints to check (without using any API keys)
const ENDPOINTS_TO_CHECK = [
  { name: 'OpenAI API', url: 'https://api.openai.com/v1/models' },
  { name: 'Perplexity API', url: 'https://api.perplexity.ai/health' },
  { name: 'Google Cloud Storage', url: 'https://storage.googleapis.com/' },
  { name: 'Google Cloud Functions', url: 'https://cloudfunctions.googleapis.com/' }
];

/**
 * Check network access to an endpoint
 * @param {Object} endpoint - Endpoint to check
 * @returns {Promise<Object>} - Result of the check
 */
async function checkEndpoint(endpoint) {
  console.log(`Checking access to ${endpoint.name} (${endpoint.url})...`);
  
  try {
    // We're just checking if we can reach the endpoint, not making actual API calls
    // So we use HEAD request which doesn't return body data
    const startTime = Date.now();
    const response = await axios.head(endpoint.url, {
      timeout: 5000,
      validateStatus: () => true // Accept any status code
    });
    const endTime = Date.now();
    
    return {
      name: endpoint.name,
      url: endpoint.url,
      accessible: true,
      status: response.status,
      latency: endTime - startTime,
      error: null
    };
  } catch (error) {
    return {
      name: endpoint.name,
      url: endpoint.url,
      accessible: false,
      status: error.response?.status || null,
      latency: null,
      error: error.message
    };
  }
}

/**
 * Check network access to all endpoints
 */
async function checkAllEndpoints() {
  console.log('Starting network access checks...');
  
  const results = [];
  
  for (const endpoint of ENDPOINTS_TO_CHECK) {
    const result = await checkEndpoint(endpoint);
    results.push(result);
    
    if (result.accessible) {
      console.log(`✅ ${result.name}: Accessible (Status: ${result.status}, Latency: ${result.latency}ms)`);
    } else {
      console.log(`❌ ${result.name}: Not accessible (Error: ${result.error})`);
    }
  }
  
  console.log('\nNetwork Access Summary:');
  const accessibleCount = results.filter(r => r.accessible).length;
  console.log(`${accessibleCount} of ${results.length} endpoints are accessible`);
  
  if (accessibleCount < results.length) {
    console.log('\nInaccessible Endpoints:');
    results.filter(r => !r.accessible).forEach(r => {
      console.log(`- ${r.name}: ${r.error}`);
    });
    
    console.log('\nPossible solutions:');
    console.log('1. Check network firewall settings');
    console.log('2. Verify VPC Service Controls if using them');
    console.log('3. Check if the Cloud Function has proper IAM permissions');
    console.log('4. Ensure the function has outbound internet access');
  }
  
  return results;
}

// Run the checks if this script is executed directly
if (require.main === module) {
  checkAllEndpoints().then(() => {
    console.log('Network access check completed');
  }).catch(error => {
    console.error('Error during network access check:', error);
  });
}

module.exports = {
  checkEndpoint,
  checkAllEndpoints
};
