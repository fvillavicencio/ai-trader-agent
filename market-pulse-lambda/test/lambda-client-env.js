/**
 * Lambda Client Script with Environment Variables - API Gateway Version
 * 
 * This script takes a JSON input file, processes it with the Lambda function through API Gateway,
 * and saves the output HTML to a specified file. It uses environment variables
 * for the input and output paths, API Gateway URL, and API key.
 * 
 * Environment Variables:
 * - INPUT_JSON_PATH: Path to the input JSON file
 * - OUTPUT_HTML_PATH: Path to save the output HTML file
 * - LAMBDA_SERVICE_URL: URL of the API Gateway endpoint
 * - LAMBDA_API_KEY: API key for the API Gateway
 * 
 * Usage: 
 * INPUT_JSON_PATH=/path/to/input.json OUTPUT_HTML_PATH=/path/to/output.html node lambda-client-env.js
 * 
 * If environment variables are not provided, it uses default paths.
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
require('dotenv').config();

// Get paths from environment variables or use defaults
const INPUT_JSON_PATH = process.env.INPUT_JSON_PATH || 
  '/Users/frankvillavicencio/Documents/Development/Market Pulse Daily/market-pulse-handlebars/v2/full-sample-data.json';
const OUTPUT_HTML_PATH = process.env.OUTPUT_HTML_PATH || 
  '/Users/frankvillavicencio/Documents/Development/Market Pulse Daily/MarketPulseDaily.html';
const API_GATEWAY_URL = process.env.LAMBDA_SERVICE_URL;
const API_KEY = process.env.LAMBDA_API_KEY;

async function processWithApiGateway() {
  console.log(`Processing input file: ${INPUT_JSON_PATH}`);
  console.log(`Output will be saved to: ${OUTPUT_HTML_PATH}`);
  console.log(`Using API Gateway URL: ${API_GATEWAY_URL}`);
  console.log(`Using API key: ${API_KEY.substring(0, 5)}...`);
  
  try {
    // Read and parse the input JSON file
    const inputData = JSON.parse(fs.readFileSync(INPUT_JSON_PATH, 'utf8'));
    
    // Add isTest flag to get more detailed output
    inputData.isTest = true;
    
    // Call the API Gateway
    console.log('Calling API Gateway...');
    
    const result = await makeHttpRequest(API_GATEWAY_URL, inputData, API_KEY);
    
    // Log the result status
    console.log(`Status code: ${result.statusCode}`);
    
    if (result.statusCode === 200) {
      // Parse the response body
      const responseBody = JSON.parse(result.body);
      
      // Save the HTML output to the specified file
      fs.writeFileSync(OUTPUT_HTML_PATH, responseBody.html);
      console.log(`HTML output saved to: ${OUTPUT_HTML_PATH}`);
      
      // Log any comments
      if (responseBody.comments && responseBody.comments.length > 0) {
        console.log('\nComments:');
        responseBody.comments.forEach(comment => console.log(`- ${comment}`));
      } else {
        console.log('\nNo comments returned.');
      }
      
      console.log('\nProcessing completed successfully!');
      return true;
    } else {
      console.error(`Error from API Gateway: ${result.statusCode}`);
      console.error(`Response body: ${result.body}`);
      return false;
    }
  } catch (error) {
    console.error(`Error processing JSON to HTML: ${error.message}`);
    console.error(error.stack);
    return false;
  }
}

// Helper function to make HTTP request to API Gateway
function makeHttpRequest(url, data, apiKey) {
  return new Promise((resolve, reject) => {
    // Parse the URL
    const parsedUrl = new URL(url);
    
    // Prepare the request options
    const options = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
      path: parsedUrl.pathname + parsedUrl.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey
      }
    };
    
    console.log(`Request options: ${JSON.stringify(options)}`);
    
    // Choose the appropriate request module based on the protocol
    const requestModule = parsedUrl.protocol === 'https:' ? https : http;
    
    // Make the request
    const req = requestModule.request(options, (res) => {
      let responseBody = '';
      
      // Collect response data
      res.on('data', (chunk) => {
        responseBody += chunk;
      });
      
      // Resolve the promise when the response is complete
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: responseBody
        });
      });
    });
    
    // Handle request errors
    req.on('error', (error) => {
      reject(error);
    });
    
    // Send the request with the JSON data
    req.write(JSON.stringify(data));
    req.end();
  });
}

// Process the file
processWithApiGateway()
  .then(success => {
    if (success) {
      console.log('HTML generation completed successfully.');
      process.exit(0);
    } else {
      console.error('HTML generation failed.');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });
