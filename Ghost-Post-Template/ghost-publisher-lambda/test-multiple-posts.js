/**
 * Test script to create multiple posts with different titles
 * This will invoke the Lambda function 5 times with different titles
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// API Gateway endpoint for the Lambda function
const apiGatewayUrl = 'https://vrwz4xsvml.execute-api.us-east-2.amazonaws.com/prod/publish';

// Different titles to test with different sentiments
const testTitles = [
  { title: "Greed Is Good: Markets Rally on Strong Earnings", sentiment: "bullish" },
  { title: "The Correction Is Coming: Warning Signs Flashing Red", sentiment: "bearish" },
  { title: "Money Never Sleeps: After-Hours Trading Shows Momentum", sentiment: "bullish" },
  { title: "The Perfect Storm: Multiple Factors Converge for Volatility", sentiment: "volatile" },
  { title: "Patience, Grasshopper: Markets Await Fed Decision", sentiment: "neutral" }
];

// Function to make a request to the API Gateway
function makeRequest(title, sentiment, index) {
  return new Promise((resolve, reject) => {
    console.log(`\n[${index + 1}/5] Testing with title: "${title}" (${sentiment})`);
    
    // Create request data with the specified title and sentiment
    const requestData = {
      title: title,
      overrides: {
        sentiment: sentiment
      }
    };
    
    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    };
    
    const req = https.request(apiGatewayUrl, options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        console.log(`Status: ${res.statusCode}`);
        
        if (res.statusCode === 200) {
          try {
            const responseObj = JSON.parse(data);
            
            // Save the response to a file
            const outputFile = path.join(__dirname, '..', `api-response-${index + 1}.json`);
            fs.writeFileSync(outputFile, JSON.stringify(responseObj, null, 2));
            console.log(`Response saved to: ${outputFile}`);
            
            // Extract HTML content if available
            if (responseObj.html) {
              const htmlFile = path.join(__dirname, '..', `market-pulse-test-${index + 1}.html`);
              fs.writeFileSync(htmlFile, responseObj.html);
              
              const fileSizeInKB = (fs.statSync(htmlFile).size / 1024).toFixed(2);
              console.log(`HTML content saved to: ${htmlFile}`);
              console.log(`Size: ${fileSizeInKB} KB`);
              console.log(`View in browser: file://${htmlFile}`);
            }
            
            resolve(responseObj);
          } catch (error) {
            console.error('Error parsing response:', error);
            reject(error);
          }
        } else {
          console.error(`Error: ${res.statusCode}`);
          reject(new Error(`HTTP Error: ${res.statusCode}`));
        }
      });
    });
    
    req.on('error', (error) => {
      console.error('Request error:', error);
      reject(error);
    });
    
    // Send the request data
    req.write(JSON.stringify(requestData));
    req.end();
  });
}

// Run the tests sequentially
async function runTests() {
  console.log('Starting test of multiple posts with different titles...');
  
  for (let i = 0; i < testTitles.length; i++) {
    try {
      await makeRequest(testTitles[i].title, testTitles[i].sentiment, i);
      // Add a delay between requests to avoid rate limiting
      if (i < testTitles.length - 1) {
        console.log('Waiting 3 seconds before next request...');
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
    } catch (error) {
      console.error(`Error with request ${i + 1}:`, error);
    }
  }
  
  console.log('\nAll tests completed!');
}

// Run the tests
runTests();
