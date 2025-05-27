/**
 * Verify Mobile Tables Script
 * 
 * This script runs a local test to verify that our mobile-friendly table improvements
 * are correctly implemented in both the main project and the Lambda function.
 */

const fs = require('fs');
const path = require('path');
const http = require('http');

// Paths to the files we want to check
const mainProjectFile = path.join(__dirname, 'src/modules/fundamental-metrics.js');
const lambdaProjectFile = path.join(__dirname, 'ghost-publisher-lambda/src/modules/fundamental-metrics.js');

// Mobile-friendly styles we're looking for
const mobileStyles = [
  'overflow-x: auto',
  '-webkit-overflow-scrolling: touch',
  'min-width:',
  '#0c6e3d' // Dark green header color
];

// Check if a file contains the mobile-friendly styles
const checkFileForMobileStyles = (filePath) => {
  try {
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const results = {
      filePath,
      hasMobileStyles: true,
      foundStyles: [],
      missingStyles: []
    };
    
    // Check for each mobile style
    mobileStyles.forEach(style => {
      if (fileContent.includes(style)) {
        results.foundStyles.push(style);
      } else {
        results.hasMobileStyles = false;
        results.missingStyles.push(style);
      }
    });
    
    return results;
  } catch (error) {
    console.error(`Error reading file ${filePath}:`, error.message);
    return {
      filePath,
      hasMobileStyles: false,
      foundStyles: [],
      missingStyles: ['Error reading file']
    };
  }
};

// Generate HTML with sample tables for visual verification
const generateSampleHTML = () => {
  // Sample data for testing
  const sampleData = {
    peRatio: {
      current: "24.36",
      fiveYearAvg: "22.54",
      tenYearAvg: "20.87"
    },
    eps: {
      ttm: "$232.47",
      targetAt15x: "$3,487.05",
      targetAt17x: "$3,951.99",
      targetAt20x: "$4,649.40"
    }
  };

  // Get the table styles from the main project file
  let tableStyles = '';
  try {
    const mainFile = fs.readFileSync(mainProjectFile, 'utf8');
    // Extract the table styles from the file
    const tableStylesMatch = mainFile.match(/style="([^"]*overflow-x: auto[^"]*)"/);
    if (tableStylesMatch && tableStylesMatch[1]) {
      tableStyles = tableStylesMatch[1];
    }
  } catch (error) {
    console.error('Error extracting table styles:', error.message);
  }

  // Create HTML with our improved tables
  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Mobile-Friendly Tables Verification</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 1200px;
          margin: 0 auto;
          padding: 20px;
        }
        
        /* Mobile styles */
        @media (max-width: 768px) {
          body {
            padding: 10px;
          }
        }
        
        /* Toggle button for mobile/desktop view */
        .view-toggle {
          position: fixed;
          bottom: 20px;
          right: 20px;
          background: #3182ce;
          color: white;
          border: none;
          border-radius: 50px;
          padding: 10px 20px;
          font-weight: bold;
          cursor: pointer;
          z-index: 1000;
          box-shadow: 0 2px 10px rgba(0,0,0,0.2);
        }
        
        .table-container {
          margin-bottom: 30px;
          background-color: white;
          border-radius: 8px;
          padding: 20px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        
        h2 {
          margin-top: 40px;
          margin-bottom: 10px;
          color: #1a365d;
        }
        
        .results {
          background-color: #f8f9fa;
          padding: 20px;
          border-radius: 8px;
          margin-bottom: 30px;
        }
        
        .success {
          color: #0c6e3d;
          font-weight: bold;
        }
        
        .error {
          color: #e53e3e;
          font-weight: bold;
        }
      </style>
    </head>
    <body>
      <h1>Mobile-Friendly Tables Verification</h1>
      
      <div class="results">
        <h2>Verification Results</h2>
        <div id="results">Loading results...</div>
      </div>
      
      <h2>S&P 500 Trailing P/E Ratio</h2>
      <div class="table-container">
        <div style="overflow-x: auto; -webkit-overflow-scrolling: touch; max-width: 100%;">
          <table style="width: 100%; min-width: 300px; border-collapse: collapse; margin-bottom: 10px;">
            <thead>
              <tr style="background-color: #0c6e3d; text-align: center; font-weight: 600; color: white;">
                <th style="padding: 12px 8px; white-space: nowrap;">Current</th>
                <th style="padding: 12px 8px; white-space: nowrap;">5-Year Avg</th>
                <th style="padding: 12px 8px; white-space: nowrap;">10-Year Avg</th>
              </tr>
            </thead>
            <tbody>
              <tr style="text-align: center; background: white;">
                <td style="padding: 15px 8px; font-weight: bold; font-size: 1.25rem;">${sampleData.peRatio.current}</td>
                <td style="padding: 15px 8px; font-size: 1.25rem;">${sampleData.peRatio.fiveYearAvg}</td>
                <td style="padding: 15px 8px; font-size: 1.25rem;">${sampleData.peRatio.tenYearAvg}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      
      <h2>S&P 500 Earnings Per Share (Trailing 12M)</h2>
      <div class="table-container">
        <div style="overflow-x: auto; -webkit-overflow-scrolling: touch; max-width: 100%;">
          <table style="width: 100%; min-width: 400px; border-collapse: collapse; margin-bottom: 10px;">
            <thead>
              <tr style="background-color: #0c6e3d; text-align: center; font-weight: 600; color: white;">
                <th style="padding: 12px 8px; white-space: nowrap;">S&P 500 EPS (TTM)</th>
                <th style="padding: 12px 8px; white-space: nowrap;">Target at 15x</th>
                <th style="padding: 12px 8px; white-space: nowrap;">Target at 17x</th>
                <th style="padding: 12px 8px; white-space: nowrap;">Target at 20x</th>
              </tr>
            </thead>
            <tbody>
              <tr style="text-align: center; background: white;">
                <td style="padding: 15px 8px; font-weight: bold; font-size: 1.25rem;">${sampleData.eps.ttm}</td>
                <td style="padding: 15px 8px; font-size: 1.25rem;">${sampleData.eps.targetAt15x}</td>
                <td style="padding: 15px 8px; font-size: 1.25rem;">${sampleData.eps.targetAt17x}</td>
                <td style="padding: 15px 8px; font-size: 1.25rem;">${sampleData.eps.targetAt20x}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      
      <button class="view-toggle" id="viewToggle">Toggle Mobile View</button>
      
      <script>
        // Display the verification results
        document.addEventListener('DOMContentLoaded', function() {
          const resultsDiv = document.getElementById('results');
          
          // This would normally come from the server, but we're hardcoding it for this demo
          const verificationResults = JSON.parse('VERIFICATION_RESULTS_PLACEHOLDER');
          
          let resultsHTML = '';
          
          // Main project file results
          const mainResults = verificationResults.mainProject;
          resultsHTML += '<h3>Main Project File:</h3>';
          if (mainResults.hasMobileStyles) {
            resultsHTML += '<p class="success">✅ All mobile-friendly styles found!</p>';
            resultsHTML += '<ul>';
            mainResults.foundStyles.forEach(function(style) {
              resultsHTML += '<li>' + style + '</li>';
            });
            resultsHTML += '</ul>';
          } else {
            resultsHTML += '<p class="error">❌ Some mobile-friendly styles are missing:</p>';
            resultsHTML += '<ul>';
            mainResults.missingStyles.forEach(function(style) {
              resultsHTML += '<li class="error">Missing: ' + style + '</li>';
            });
            resultsHTML += '</ul>';
          }
          
          // Lambda project file results
          const lambdaResults = verificationResults.lambdaProject;
          resultsHTML += '<h3>Lambda Project File:</h3>';
          if (lambdaResults.hasMobileStyles) {
            resultsHTML += '<p class="success">✅ All mobile-friendly styles found!</p>';
            resultsHTML += '<ul>';
            lambdaResults.foundStyles.forEach(function(style) {
              resultsHTML += '<li>' + style + '</li>';
            });
            resultsHTML += '</ul>';
          } else {
            resultsHTML += '<p class="error">❌ Some mobile-friendly styles are missing:</p>';
            resultsHTML += '<ul>';
            lambdaResults.missingStyles.forEach(function(style) {
              resultsHTML += '<li class="error">Missing: ' + style + '</li>';
            });
            resultsHTML += '</ul>';
          }
          
          resultsDiv.innerHTML = resultsHTML;
        });
        
        // Toggle mobile view
        document.addEventListener('DOMContentLoaded', function() {
          const viewToggle = document.getElementById('viewToggle');
          viewToggle.addEventListener('click', function() {
            const viewport = document.querySelector('meta[name="viewport"]');
            if (viewport.content.includes('width=375')) {
              viewport.content = 'width=device-width, initial-scale=1.0';
              viewToggle.textContent = 'Switch to Mobile View';
            } else {
              viewport.content = 'width=375, initial-scale=1.0';
              viewToggle.textContent = 'Switch to Desktop View';
            }
          });
        });
      </script>
    </body>
    </html>
  `;
  
  return html;
};

// Create a simple HTTP server to serve the HTML
const startServer = (verificationResults) => {
  // Generate the HTML with the verification results
  let html = generateSampleHTML();
  html = html.replace('VERIFICATION_RESULTS_PLACEHOLDER', JSON.stringify(verificationResults));
  
  const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(html);
  });
  
  const PORT = 3000;
  server.listen(PORT, () => {
    console.log(`\nServer running at http://localhost:${PORT}/`);
    console.log('Open this URL in your browser to view the verification results and test the tables');
    console.log('Press Ctrl+C to stop the server');
  });
};

// Main function to verify the mobile-friendly tables
const verifyMobileTables = () => {
  console.log('Verifying mobile-friendly tables...\n');
  
  // Check the main project file
  console.log(`Checking main project file: ${mainProjectFile}`);
  const mainProjectResults = checkFileForMobileStyles(mainProjectFile);
  
  if (mainProjectResults.hasMobileStyles) {
    console.log('✅ All mobile-friendly styles found in main project file!');
  } else {
    console.log('❌ Some mobile-friendly styles are missing in main project file:');
    mainProjectResults.missingStyles.forEach(style => {
      console.log(`  - Missing: ${style}`);
    });
  }
  
  // Check the Lambda project file
  console.log(`\nChecking Lambda project file: ${lambdaProjectFile}`);
  const lambdaProjectResults = checkFileForMobileStyles(lambdaProjectFile);
  
  if (lambdaProjectResults.hasMobileStyles) {
    console.log('✅ All mobile-friendly styles found in Lambda project file!');
  } else {
    console.log('❌ Some mobile-friendly styles are missing in Lambda project file:');
    lambdaProjectResults.missingStyles.forEach(style => {
      console.log(`  - Missing: ${style}`);
    });
  }
  
  // Combine the results
  const verificationResults = {
    mainProject: mainProjectResults,
    lambdaProject: lambdaProjectResults
  };
  
  // Start a server to display the results and test the tables
  console.log('\nStarting server to display verification results and test tables...');
  startServer(verificationResults);
};

// Run the verification
verifyMobileTables();
