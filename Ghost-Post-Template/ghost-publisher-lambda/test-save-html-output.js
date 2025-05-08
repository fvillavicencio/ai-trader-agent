/**
 * Test script to invoke the Lambda function and save the HTML output
 * This will help us verify that our mobile-friendly table improvements are included
 */

const fs = require('fs');
const path = require('path');
const { handler } = require('./index');

// Format the current date and time for the output filename
const getFormattedDateTime = () => {
  const now = new Date();
  return now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
};

// Read the market pulse data
const readMarketPulseData = () => {
  const dataPath = path.resolve(__dirname, '../market_pulse_data.json');
  console.log(`Reading market pulse data from: ${dataPath}`);
  try {
    const data = fs.readFileSync(dataPath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error(`Error reading market pulse data: ${error.message}`);
    throw error;
  }
};

// Create a test event for the Lambda function
const createTestEvent = () => {
  const data = readMarketPulseData();
  
  return {
    testMode: true, // This will make the Lambda function return the HTML without publishing
    jsonData: data,
    ghostUrl: process.env.GHOST_URL || 'https://market-pulse-daily.ghost.io',
    ghostApiKey: process.env.GHOST_API_KEY || 'dummy-key-for-test-mode',
    newsletterId: process.env.NEWSLETTER_ID || '67f427c5744a72000854ee8f'
  };
};

// Invoke the Lambda function and save the HTML output
const testLambdaAndSaveHtml = async () => {
  console.log('Starting Lambda test with HTML output...');
  
  try {
    const event = createTestEvent();
    console.log('Test event created');
    
    // Create a mock context
    const context = {
      succeed: (result) => {
        console.log('Lambda execution succeeded');
        return result;
      },
      fail: (error) => {
        console.error('Lambda execution failed:', error);
        throw error;
      }
    };
    
    // Invoke the Lambda handler
    const result = await new Promise((resolve, reject) => {
      handler(event, context, (error, response) => {
        if (error) {
          reject(error);
        } else {
          resolve(response);
        }
      });
    });
    
    console.log('Lambda execution completed');
    
    // Extract the HTML content from the response
    let html = '';
    if (result.html) {
      html = result.html;
      console.log('HTML content extracted from response');
    } else if (result.body) {
      const body = typeof result.body === 'string' ? JSON.parse(result.body) : result.body;
      html = body.html || '';
      console.log('HTML content extracted from response body');
    }
    
    if (html) {
      // Save the HTML to a file
      const outputFilename = `lambda-html-output-${getFormattedDateTime()}.html`;
      const outputPath = path.resolve(__dirname, outputFilename);
      fs.writeFileSync(outputPath, html);
      console.log(`HTML output saved to: ${outputPath}`);
      
      // Check for mobile-friendly table styles
      const mobileStyles = [
        'overflow-x: auto',
        '-webkit-overflow-scrolling: touch',
        'min-width:',
        '#0c6e3d' // Dark green header color
      ];
      
      const forwardEpsTableMarkers = [
        'S&P 500 Forward EPS & Implied Index Values',
        'Annual Estimate',
        'Forward EPS'
      ];
      
      // Check if the HTML contains our mobile-friendly table styles
      const hasMobileStyles = mobileStyles.every(style => html.includes(style));
      const hasForwardEpsTable = forwardEpsTableMarkers.every(marker => html.includes(marker));
      
      if (hasMobileStyles && hasForwardEpsTable) {
        console.log('✅ Mobile-friendly table styles found in the Lambda output!');
        
        // Find the Forward EPS table section
        const forwardEpsTableStart = html.indexOf('S&P 500 Forward EPS & Implied Index Values');
        if (forwardEpsTableStart !== -1) {
          const forwardEpsTableSection = html.substring(forwardEpsTableStart, forwardEpsTableStart + 1000);
          
          // Check if the Forward EPS table has the mobile-friendly styles
          const hasForwardEpsMobileStyles = mobileStyles.every(style => forwardEpsTableSection.includes(style));
          
          if (hasForwardEpsMobileStyles) {
            console.log('✅ Forward EPS table has the mobile-friendly styles!');
          } else {
            console.log('❌ Forward EPS table is missing some mobile-friendly styles!');
            mobileStyles.forEach(style => {
              if (!forwardEpsTableSection.includes(style)) {
                console.log(`  - Missing: ${style}`);
              }
            });
          }
        }
      } else {
        console.log('❌ Some mobile-friendly table styles or Forward EPS table markers are missing!');
        
        if (!hasMobileStyles) {
          mobileStyles.forEach(style => {
            if (!html.includes(style)) {
              console.log(`  - Missing style: ${style}`);
            }
          });
        }
        
        if (!hasForwardEpsTable) {
          forwardEpsTableMarkers.forEach(marker => {
            if (!html.includes(marker)) {
              console.log(`  - Missing marker: ${marker}`);
            }
          });
        }
      }
    } else {
      console.log('No HTML content found in the response');
    }
    
    return result;
  } catch (error) {
    console.error('Error testing Lambda function:', error);
    throw error;
  }
};

// Run the test
testLambdaAndSaveHtml()
  .then(() => console.log('Test completed successfully'))
  .catch(err => console.error('Test failed:', err.message));
