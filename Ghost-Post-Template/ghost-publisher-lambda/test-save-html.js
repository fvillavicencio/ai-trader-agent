/**
 * Test script to save the HTML output locally for inspection
 */

const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Import the Lambda handler
const { handler } = require('./index');

// Set environment variables for Ghost credentials
process.env.GHOST_URL = process.env.GHOST_URL || 'https://market-pulse-daily.ghost.io';
process.env.GHOST_API_KEY = process.env.GHOST_API_KEY || '67f457a5f41c9900013e1e47:44daf1e666349bde96fad6f9a65979ba1d0b11b161a5c765847218f5bd263b7c';
process.env.GHOST_NEWSLETTER_ID = process.env.GHOST_NEWSLETTER_ID || '67f427c5744a72000854ee8f';

// Load the JSON data
const data = JSON.parse(fs.readFileSync(path.resolve(__dirname, 'test-rsi-null-unknown.json'), 'utf8'));

// Create a mock event object with a special flag to return HTML instead of creating a post
const event = {
  body: JSON.stringify({
    ...data,
    returnHtmlOnly: true  // This flag tells our Lambda to return HTML without creating a post
  })
};

// Execute the Lambda handler
async function runTest() {
  try {
    console.log('Starting test to save HTML output...');
    
    // Modify the handler function temporarily to return HTML
    const originalHandler = handler;
    global.handler = async (event, context) => {
      // Parse the event body
      const body = JSON.parse(event.body);
      
      // Process the data through our modules
      const { addMarketIndicators } = require('../src/modules/market-indicators');
      const { createMobiledoc } = require('../src/utils/mobiledoc-helpers');
      
      // Create a mobiledoc
      const mobiledoc = createMobiledoc();
      
      // Add market indicators section (this is what we want to test)
      addMarketIndicators(mobiledoc, body);
      
      // Convert mobiledoc to HTML
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>RSI Test</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
          </style>
        </head>
        <body>
          <h1>Market Indicators Test</h1>
          <div id="mobiledoc-content">
            ${JSON.stringify(mobiledoc)}
          </div>
        </body>
        </html>
      `;
      
      // Save the HTML to a file
      fs.writeFileSync('rsi-test-output.html', html);
      console.log('HTML saved to rsi-test-output.html');
      
      // Return success
      return {
        statusCode: 200,
        body: JSON.stringify({ success: true, message: 'HTML saved to file' })
      };
    };
    
    // Call our modified handler
    const result = await global.handler(event, {});
    console.log('Test completed successfully');
    
    // Restore the original handler
    global.handler = originalHandler;
    
    return result;
  } catch (error) {
    console.error('Test failed with error:', error);
    throw error;
  }
}

// Run the test
runTest()
  .then(() => console.log('Test completed'))
  .catch(err => console.error('Test failed:', err));
