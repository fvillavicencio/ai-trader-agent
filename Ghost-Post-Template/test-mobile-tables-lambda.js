/**
 * Test script to verify mobile-friendly tables in the deployed Lambda function
 * This script invokes the Lambda function through API Gateway and checks the HTML output
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');
require('dotenv').config({ path: path.join(__dirname, 'src', '.env') });

// API Gateway endpoint and API key
const API_ENDPOINT = 'https://vrwz4xsvml.execute-api.us-east-2.amazonaws.com/prod/publish';
const API_KEY = process.env.GHOST_LAMBDA_API_KEY;

// Read the market pulse data
const readMarketPulseData = () => {
  const dataPath = path.resolve(__dirname, 'market_pulse_data.json');
  console.log(`Reading market pulse data from: ${dataPath}`);
  try {
    const data = fs.readFileSync(dataPath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error(`Error reading market pulse data: ${error.message}`);
    throw error;
  }
};

// Create the payload for the API Gateway
const createApiPayload = () => {
  const marketPulseData = readMarketPulseData();
  
  return {
    ghostUrl: process.env.GHOST_URL,
    ghostApiKey: process.env.GHOST_API_KEY,
    newsletterId: "67f427c5744a72000854ee8f",
    jsonData: marketPulseData,
    featureImageUrl: "https://example.com/feature-image.jpg",
    // Set to true to only return the HTML without publishing to Ghost
    testMode: true
  };
};

// Check if the HTML contains our mobile-friendly table styles
const checkMobileFriendlyTables = (html) => {
  const mobileStyles = [
    'overflow-x: auto',
    '-webkit-overflow-scrolling: touch',
    'min-width:',
    '#0c6e3d' // Dark green header color
  ];
  
  const results = {
    hasMobileStyles: true,
    missingStyles: []
  };
  
  // Check for each mobile style
  mobileStyles.forEach(style => {
    if (!html.includes(style)) {
      results.hasMobileStyles = false;
      results.missingStyles.push(style);
    }
  });
  
  return results;
};

// Make the API request and verify the mobile-friendly tables
async function testMobileFriendlyTables() {
  const payload = createApiPayload();
  console.log('Testing mobile-friendly tables in Lambda function...');
  
  try {
    const response = await axios.post(API_ENDPOINT, payload, {
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY
      }
    });
    
    console.log('API Response Status:', response.status);
    
    // Check if we're in test mode and have HTML to analyze
    if (response.data && response.data.html) {
      const html = response.data.html;
      
      // Save the HTML to a file for manual inspection
      fs.writeFileSync(path.join(__dirname, 'lambda-output.html'), html);
      console.log('Lambda HTML output saved to lambda-output.html');
      
      // Check for mobile-friendly table styles
      const styleCheck = checkMobileFriendlyTables(html);
      
      if (styleCheck.hasMobileStyles) {
        console.log('✅ Mobile-friendly table styles found in the Lambda output!');
      } else {
        console.log('❌ Some mobile-friendly table styles are missing:');
        styleCheck.missingStyles.forEach(style => {
          console.log(`  - Missing: ${style}`);
        });
      }
    } else {
      console.log('No HTML content found in the response. Make sure testMode is set to true.');
      console.log('Response data:', JSON.stringify(response.data, null, 2));
    }
    
    return response.data;
  } catch (error) {
    console.error('API request failed:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    throw error;
  }
}

// Create a simple HTTP server to view the output
const startServer = (htmlFile) => {
  const http = require('http');
  
  const server = http.createServer((req, res) => {
    if (req.url === '/') {
      fs.readFile(htmlFile, 'utf8', (err, data) => {
        if (err) {
          res.writeHead(500);
          res.end('Error loading HTML file');
          return;
        }
        
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(data);
      });
    } else {
      res.writeHead(404);
      res.end('Not found');
    }
  });
  
  const PORT = 3000;
  server.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}/`);
    console.log('Open this URL in your browser to view the Lambda output');
    console.log('Press Ctrl+C to stop the server');
  });
};

// Run the test and then start a server to view the output
testMobileFriendlyTables()
  .then(() => {
    console.log('Test completed successfully');
    const htmlFile = path.join(__dirname, 'lambda-output.html');
    if (fs.existsSync(htmlFile)) {
      console.log('Starting server to view the Lambda output...');
      startServer(htmlFile);
    }
  })
  .catch(err => console.error('Test failed:', err.message));
