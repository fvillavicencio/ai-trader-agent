/**
 * Test script to verify the mobile-friendly table improvements in the fundamental-metrics.js module
 */

const fs = require('fs');
const path = require('path');

// Import the fundamental-metrics module from the Lambda function
const { addFundamentalMetrics } = require('./ghost-publisher-lambda/src/modules/fundamental-metrics');

// Helper function to create a simple mobiledoc structure
const createMobiledoc = () => {
  return {
    version: '0.3.1',
    atoms: [],
    cards: [],
    markups: [],
    sections: []
  };
};

// Helper function to add HTML to the mobiledoc
const addHTML = (mobiledoc, html) => {
  mobiledoc.cards.push(['html', { html }]);
  mobiledoc.sections.push([10, mobiledoc.cards.length - 1]);
};

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

// Generate HTML for the fundamental metrics section
const generateFundamentalMetricsHTML = () => {
  const data = readMarketPulseData();
  const mobiledoc = createMobiledoc();
  
  // Add the fundamental metrics content to the mobiledoc
  addFundamentalMetrics(mobiledoc, data);
  
  // Extract the HTML from the mobiledoc
  let html = '';
  mobiledoc.cards.forEach(card => {
    if (card[0] === 'html') {
      html += card[1].html;
    }
  });
  
  return html;
};

// Check if the HTML contains our mobile-friendly table styles
const checkMobileFriendlyTables = (html) => {
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
  
  console.log('Mobile-friendly table styles check:');
  if (hasMobileStyles) {
    console.log('✅ All mobile-friendly table styles found!');
  } else {
    console.log('❌ Some mobile-friendly table styles are missing:');
    mobileStyles.forEach(style => {
      if (!html.includes(style)) {
        console.log(`  - Missing: ${style}`);
      } else {
        console.log(`  - Found: ${style}`);
      }
    });
  }
  
  console.log('\nForward EPS table check:');
  if (hasForwardEpsTable) {
    console.log('✅ Forward EPS table found!');
    
    // Find the Forward EPS table section
    const forwardEpsTableStart = html.indexOf('S&P 500 Forward EPS & Implied Index Values');
    if (forwardEpsTableStart !== -1) {
      const forwardEpsTableSection = html.substring(forwardEpsTableStart, forwardEpsTableStart + 2000);
      
      // Check if the Forward EPS table has the mobile-friendly styles
      const hasForwardEpsMobileStyles = mobileStyles.every(style => forwardEpsTableSection.includes(style));
      
      if (hasForwardEpsMobileStyles) {
        console.log('✅ Forward EPS table has all the mobile-friendly styles!');
      } else {
        console.log('❌ Forward EPS table is missing some mobile-friendly styles:');
        mobileStyles.forEach(style => {
          if (!forwardEpsTableSection.includes(style)) {
            console.log(`  - Missing: ${style}`);
          } else {
            console.log(`  - Found: ${style}`);
          }
        });
      }
    }
  } else {
    console.log('❌ Forward EPS table not found!');
    forwardEpsTableMarkers.forEach(marker => {
      if (!html.includes(marker)) {
        console.log(`  - Missing marker: ${marker}`);
      } else {
        console.log(`  - Found marker: ${marker}`);
      }
    });
  }
  
  return { hasMobileStyles, hasForwardEpsTable };
};

// Main function to test the fundamental metrics module
const testFundamentalMetrics = () => {
  console.log('Testing fundamental-metrics.js module...');
  
  try {
    // Generate the HTML for the fundamental metrics section
    const html = generateFundamentalMetricsHTML();
    
    // Save the HTML to a file for inspection
    const outputFilename = 'fundamental-metrics-output.html';
    fs.writeFileSync(outputFilename, html);
    console.log(`\nHTML output saved to: ${outputFilename}`);
    
    // Check if the HTML contains our mobile-friendly table styles
    checkMobileFriendlyTables(html);
    
    // Create a simple HTML page for viewing the output
    const viewableHtml = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Fundamental Metrics Test</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
          }
          
          h1 {
            margin-bottom: 20px;
          }
          
          .toggle-button {
            background-color: #3182ce;
            color: white;
            border: none;
            border-radius: 4px;
            padding: 8px 16px;
            font-weight: bold;
            cursor: pointer;
            margin-bottom: 20px;
          }
        </style>
      </head>
      <body>
        <h1>Fundamental Metrics Test</h1>
        <button class="toggle-button" id="toggleView">Toggle Mobile View</button>
        
        ${html}
        
        <script>
          document.addEventListener('DOMContentLoaded', function() {
            const toggleButton = document.getElementById('toggleView');
            const viewport = document.querySelector('meta[name="viewport"]');
            
            toggleButton.addEventListener('click', function() {
              if (viewport.content.includes('width=375')) {
                viewport.content = 'width=device-width, initial-scale=1.0';
                toggleButton.textContent = 'Switch to Mobile View';
              } else {
                viewport.content = 'width=375, initial-scale=1.0';
                toggleButton.textContent = 'Switch to Desktop View';
              }
            });
          });
        </script>
      </body>
      </html>
    `;
    
    // Save the viewable HTML to a file
    const viewableFilename = 'fundamental-metrics-view.html';
    fs.writeFileSync(viewableFilename, viewableHtml);
    console.log(`\nViewable HTML page saved to: ${viewableFilename}`);
    console.log(`Open this file in a browser to view and test the tables`);
    
    // Start a simple HTTP server to view the output
    const http = require('http');
    const PORT = 3000;
    
    const server = http.createServer((req, res) => {
      if (req.url === '/' || req.url === '/index.html') {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(viewableHtml);
      } else {
        res.writeHead(404);
        res.end('Not found');
      }
    });
    
    server.listen(PORT, () => {
      console.log(`\nServer running at http://localhost:${PORT}/`);
      console.log('Open this URL in your browser to view and test the tables');
      console.log('Press Ctrl+C to stop the server');
    });
    
  } catch (error) {
    console.error('Error testing fundamental metrics module:', error);
  }
};

// Run the test
testFundamentalMetrics();
