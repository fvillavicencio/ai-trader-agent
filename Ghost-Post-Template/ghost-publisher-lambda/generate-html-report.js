/**
 * Generate HTML Report
 * 
 * This script invokes the Lambda function locally with market_pulse_data.json,
 * extracts the HTML content from the response, and saves it to a file.
 */

const fs = require('fs');
const path = require('path');
const { handler } = require('./index');

// Format the current date for the filename
const getFormattedDate = () => {
  const now = new Date();
  return now.toISOString().slice(0, 10);
};

// Main function to generate the HTML report
async function generateHtmlReport() {
  try {
    console.log('Reading market_pulse_data.json...');
    const jsonDataPath = path.resolve(__dirname, '../market_pulse_data.json');
    const jsonData = JSON.parse(fs.readFileSync(jsonDataPath, 'utf8'));
    
    console.log('Invoking Lambda function...');
    const event = {
      testMode: true,
      jsonData,
      ghostUrl: 'https://market-pulse-daily.ghost.io',
      ghostApiKey: '67f457a5f41c9900013e1e47:44daf1e666349bde96fad6f9a65979ba1d0b11b161a5c765847218f5bd263b7c',
      newsletterId: '67f427c5744a72000854ee8f'
    };
    
    // Invoke the Lambda handler
    const response = await new Promise((resolve, reject) => {
      handler(event, {}, (err, result) => {
        if (err) {
          console.error('Lambda execution failed:', err);
          reject(err);
        } else {
          resolve(result);
        }
      });
    });
    
    console.log('Lambda function executed successfully');
    
    // Parse the response body to get the HTML content
    if (response && response.body && typeof response.body === 'string') {
      try {
        const bodyObj = JSON.parse(response.body);
        
        if (bodyObj.html) {
          // Create filename with date
          const date = getFormattedDate();
          const htmlFilename = path.resolve(__dirname, `../market-pulse-report-${date}.html`);
          
          // Write HTML to file
          fs.writeFileSync(htmlFilename, bodyObj.html, 'utf8');
          console.log(`\nHTML report successfully generated!`);
          console.log(`File: ${htmlFilename}`);
          console.log(`Size: ${(bodyObj.html.length / 1024).toFixed(2)} KB`);
          console.log(`\nView in browser: file://${htmlFilename}`);
          
          return {
            success: true,
            filePath: htmlFilename,
            fileSize: bodyObj.html.length
          };
        } else {
          console.log('\nNo HTML content found in the Lambda response');
          console.log('Response body keys:', Object.keys(bodyObj));
          return {
            success: false,
            error: 'No HTML content in response'
          };
        }
      } catch (e) {
        console.error('\nError parsing response body:', e.message);
        return {
          success: false,
          error: `Failed to parse response body: ${e.message}`
        };
      }
    } else {
      console.log('\nResponse body is not available or not a string');
      console.log('Response structure:', Object.keys(response));
      return {
        success: false,
        error: 'Invalid response structure'
      };
    }
  } catch (error) {
    console.error('\nError generating HTML report:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

// Run the function
generateHtmlReport()
  .then(result => {
    if (!result.success) {
      console.error(`\nFailed to generate HTML report: ${result.error}`);
      process.exit(1);
    }
  })
  .catch(err => {
    console.error(`\nUnexpected error: ${err.message}`);
    process.exit(1);
  });
