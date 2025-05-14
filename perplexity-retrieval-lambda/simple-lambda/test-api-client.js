/**
 * Sample client for testing the Perplexity Retriever API
 * 
 * This script demonstrates how to call the API Gateway endpoint
 * that invokes the perplexity-retriever Lambda function.
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

// API Gateway configuration
const API_URL = 'https://sbyrgndny4.execute-api.us-east-2.amazonaws.com/staging/retrieve';
const API_KEY = 'oqPH7vqLx748szMHJHmkG0KfJTzH4ad8nnn39VKg';

// Create output directory if it doesn't exist
const outputDir = path.join(__dirname, 'output');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir);
}

/**
 * Call the Perplexity Retriever API
 * @param {string} requestType - Type of data to retrieve ('geopoliticalRisks' or 'marketSentiment')
 * @returns {Promise<Object>} - API response data
 */
async function callPerplexityRetrieverAPI(requestType = 'geopoliticalRisks') {
  console.log(`Calling Perplexity Retriever API with requestType: ${requestType}`);
  
  try {
    const startTime = Date.now();
    
    // Make the API request
    const response = await axios({
      method: 'post',
      url: API_URL,
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY
      },
      data: {
        requestType: requestType
      }
    });
    
    const endTime = Date.now();
    const executionTime = (endTime - startTime) / 1000;
    
    console.log(`API call completed in ${executionTime.toFixed(2)} seconds`);
    console.log(`Status code: ${response.status}`);
    
    // If the response contains a body field, it needs to be parsed
    let responseData = response.data;
    if (responseData.body && typeof responseData.body === 'string') {
      try {
        responseData.body = JSON.parse(responseData.body);
        console.log('Successfully parsed body JSON');
      } catch (error) {
        console.warn('Failed to parse body as JSON, keeping as string');
      }
    }
    
    // Save the response to a file
    const timestamp = new Date().toISOString().replace(/:/g, '-').replace(/\..+/, '');
    const outputFile = path.join(outputDir, `api-response-${requestType}-${timestamp}.json`);
    fs.writeFileSync(outputFile, JSON.stringify(responseData, null, 2));
    console.log(`Response saved to: ${outputFile}`);
    
    // Print a summary of the results
    if (responseData.body && responseData.body.geopoliticalRiskIndex !== undefined) {
      console.log(`Geopolitical Risk Index: ${responseData.body.geopoliticalRiskIndex}`);
      console.log(`Number of risks identified: ${responseData.body.risks ? responseData.body.risks.length : 0}`);
      
      if (responseData.body.risks && responseData.body.risks.length > 0) {
        console.log('\nTop risks:');
        responseData.body.risks.slice(0, 3).forEach((risk, index) => {
          console.log(`${index + 1}. ${risk.name}`);
        });
      }
    } else {
      console.log('Response data:', responseData);
    }
    
    return responseData;
  } catch (error) {
    console.error('Error calling API:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    throw error;
  }
}

// Main function to run the test
async function main() {
  try {
    console.log('Starting API test...');
    const result = await callPerplexityRetrieverAPI();
    console.log('API test completed successfully');
    return result;
  } catch (error) {
    console.error('API test failed:', error.message);
    return null;
  }
}

// Run the test
main();
