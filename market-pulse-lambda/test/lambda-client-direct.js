/**
 * Lambda Client Script - Direct API Gateway Version
 * 
 * This script takes a JSON input file, processes it with the Lambda function through API Gateway,
 * and saves the output HTML to a specified file.
 * 
 * Usage: 
 * node lambda-client-direct.js
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

// Hardcoded paths and credentials (no environment variables or .env file)
const INPUT_JSON_PATH = '/Users/frankvillavicencio/Documents/Development/Market Pulse Daily/market-pulse-handlebars/v2/full-sample-data.json';
const OUTPUT_HTML_PATH = '/Users/frankvillavicencio/Documents/Development/Market Pulse Daily/MarketPulseDaily.html';
const API_GATEWAY_URL = 'https://ykzj9ipn28.execute-api.us-east-1.amazonaws.com/staging/generate-html';
const API_KEY = 'M73vMuj3HM9XB2SZ8PAXk2coya7laaAe5a4GzIrP';

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
      console.log(`Response body: ${JSON.stringify(responseBody).substring(0, 200)}...`);
      
      // The Lambda function returns a nested response where the actual response is in the body property as a string
      let htmlContent;
      let comments = [];
      
      // Check if the response has the expected format
      if (responseBody.body) {
        // The body is a string that needs to be parsed
        const innerBody = JSON.parse(responseBody.body);
        console.log(`Inner body: ${JSON.stringify(innerBody).substring(0, 200)}...`);
        
        if (innerBody.html) {
          htmlContent = innerBody.html;
          comments = innerBody.comments || [];
        }
      } else if (responseBody.html) {
        // Direct format
        htmlContent = responseBody.html;
        comments = responseBody.comments || [];
      }
      
      if (htmlContent) {
        // Save the HTML output to the specified file
        fs.writeFileSync(OUTPUT_HTML_PATH, htmlContent);
        console.log(`HTML output saved to: ${OUTPUT_HTML_PATH}`);
        
        // Log any comments
        if (comments.length > 0) {
          console.log('\nComments:');
          comments.forEach(comment => console.log(`- ${comment}`));
        } else {
          console.log('\nNo comments returned.');
        }
        
        console.log('\nProcessing completed successfully!');
        return true;
      } else {
        console.error('Error: HTML content not found in the response');
        console.error(`Full response: ${result.body}`);
        return false;
      }
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
