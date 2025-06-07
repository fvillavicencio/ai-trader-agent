/**
 * Test client for the Geopolitical Risk API
 * 
 * This script tests the local implementation of the geopolitical risk functions
 * to verify the random provider selection, retries, and failover mechanisms.
 */
require('dotenv').config();
const axios = require('axios');
const { Storage } = require('@google-cloud/storage');
const fs = require('fs');
const path = require('path');

// Import the generator function directly for local testing
const generator = require('./functions/generator/index.js');

// Configuration
const BUCKET_NAME = process.env.BUCKET_NAME || 'geopolitical-risk-data';
const API_URL = process.env.API_URL || 'https://us-central1-geopolitical-risk-analysis.cloudfunctions.net';
const API_KEY = process.env.API_KEY || 'your_api_key_here';

// Initialize Cloud Storage client if needed
const storage = new Storage();
const bucket = storage.bucket(BUCKET_NAME);

/**
 * Test the geopolitical risk generator function via HTTP endpoint
 */
async function testGeneratorHttpFunction() {
  console.log('🧪 Testing geopolitical risk generator HTTP endpoint...');
  
  try {
    // Call the HTTP test endpoint
    console.log(`Calling HTTP test endpoint at ${API_URL}/testGeopoliticalRiskGenerator`);
    const response = await axios.get(`${API_URL}/testGeopoliticalRiskGenerator`, {
      headers: {
        'X-API-Key': API_KEY
      }
    });
    
    console.log('✅ Generator HTTP endpoint responded successfully');
    console.log(JSON.stringify(response.data, null, 2));
    return response.data;
  } catch (error) {
    console.error('❌ Error testing generator HTTP endpoint:', error);
    if (error.response) {
      console.error('Response data:', error.response.data);
      console.error('Response status:', error.response.status);
    }
    throw error;
  }
}

/**
 * Test the API function with different operations
 */
async function testAPIFunction() {
  console.log('🧪 Testing geopolitical risk API function...');
  
  try {
    // Test GET operation
    console.log('\n📥 Testing GET operation...');
    const getResponse = await axios.get(`${API_URL}/geopoliticalRiskAPI`, {
      headers: {
        'X-API-Key': API_KEY
      }
    });
    console.log('✅ GET operation successful:');
    console.log(JSON.stringify(getResponse.data, null, 2));
    
    // Test status check
    console.log('\n📊 Testing status check...');
    const statusResponse = await axios.get(`${API_URL}/geopoliticalRiskAPI?status=true`, {
      headers: {
        'X-API-Key': API_KEY
      }
    });
    console.log('✅ Status check successful:');
    console.log(JSON.stringify(statusResponse.data, null, 2));
    
    // Test refresh operation
    console.log('\n🔄 Testing refresh operation...');
    const refreshResponse = await axios.post(`${API_URL}/geopoliticalRiskAPI`, {
      operation: 'refresh'
    }, {
      headers: {
        'X-API-Key': API_KEY
      }
    });
    console.log('✅ Refresh operation successful:');
    console.log(JSON.stringify(refreshResponse.data, null, 2));
    
    return true;
  } catch (error) {
    console.error('❌ Error testing API function:', error);
    if (error.response) {
      console.error('Response data:', error.response.data);
      console.error('Response status:', error.response.status);
    }
    throw error;
  }
}

/**
 * Save test results to a file
 * @param {Object} data - Data to save
 * @param {string} filename - Filename to save to
 */
async function saveTestResults(data, filename) {
  try {
    const outputDir = path.join(__dirname, 'test-results');
    
    // Create the output directory if it doesn't exist
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    const outputPath = path.join(outputDir, filename);
    fs.writeFileSync(outputPath, JSON.stringify(data, null, 2));
    
    console.log(`✅ Test results saved to ${outputPath}`);
  } catch (error) {
    console.error('❌ Error saving test results:', error);
  }
}

/**
 * Run all tests
 */
async function runTests() {
  try {
    console.log('🚀 Starting geopolitical risk function tests...');
    
    // Ask the user which test to run
    const readline = require('readline').createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    console.log('\n📝 Available tests:');
    console.log('1. Test generator HTTP endpoint');
    console.log('2. Test API function (get latest data)');
    console.log('3. Test API status check');
    console.log('4. Test API refresh operation');
    console.log('5. Run all tests');
    
    readline.question('\nEnter test number to run (1-5): ', async (answer) => {
      try {
        switch (answer) {
          case '1':
            const generatorResult = await testGeneratorHttpFunction();
            await saveTestResults(generatorResult, 'generator-test-results.json');
            break;
          case '2':
            console.log('\n📥 Testing GET operation...');
            const getResponse = await axios.get(`${API_URL}/geopoliticalRiskAPI`, {
              headers: {
                'X-API-Key': API_KEY
              }
            });
            console.log('✅ GET operation successful:');
            console.log(JSON.stringify(getResponse.data, null, 2));
            await saveTestResults(getResponse.data, 'api-get-results.json');
            break;
          case '3':
            console.log('\n📊 Testing status check...');
            const statusResponse = await axios.get(`${API_URL}/geopoliticalRiskAPI?status=true`, {
              headers: {
                'X-API-Key': API_KEY
              }
            });
            console.log('✅ Status check successful:');
            console.log(JSON.stringify(statusResponse.data, null, 2));
            await saveTestResults(statusResponse.data, 'api-status-results.json');
            break;
          case '4':
            console.log('\n🔄 Testing refresh operation...');
            const refreshResponse = await axios.post(`${API_URL}/geopoliticalRiskAPI`, {
              operation: 'refresh'
            }, {
              headers: {
                'X-API-Key': API_KEY
              }
            });
            console.log('✅ Refresh operation successful:');
            console.log(JSON.stringify(refreshResponse.data, null, 2));
            await saveTestResults(refreshResponse.data, 'api-refresh-results.json');
            break;
          case '5':
            // Run all tests sequentially
            console.log('\n📥 Running all tests sequentially...');
            
            // Test generator HTTP endpoint
            console.log('\n🧪 Testing generator HTTP endpoint...');
            const allGeneratorResult = await testGeneratorHttpFunction();
            await saveTestResults(allGeneratorResult, 'generator-test-results.json');
            
            // Test API GET
            console.log('\n📥 Testing GET operation...');
            const allGetResponse = await axios.get(`${API_URL}/geopoliticalRiskAPI`);
            console.log('✅ GET operation successful');
            await saveTestResults(allGetResponse.data, 'api-get-results.json');
            
            // Test API status
            console.log('\n📊 Testing status check...');
            const allStatusResponse = await axios.get(`${API_URL}/geopoliticalRiskAPI?status=true`);
            console.log('✅ Status check successful');
            await saveTestResults(allStatusResponse.data, 'api-status-results.json');
            
            // Test API refresh
            console.log('\n🔄 Testing refresh operation...');
            const allRefreshResponse = await axios.post(`${API_URL}/geopoliticalRiskAPI`, {
              operation: 'refresh'
            });
            console.log('✅ Refresh operation successful');
            await saveTestResults(allRefreshResponse.data, 'api-refresh-results.json');
            
            console.log('\n✅ All tests completed successfully!');
            break;
          default:
            console.log('❌ Invalid option. Please run the script again.');
        }
      } catch (error) {
        console.error('❌ Test failed:', error);
      } finally {
        readline.close();
      }
    });
  } catch (error) {
    console.error('❌ Error running tests:', error);
  }
}

// Run the tests
runTests();
