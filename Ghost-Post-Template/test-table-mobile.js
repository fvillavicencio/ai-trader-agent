const fs = require('fs');
const path = require('path');
const http = require('http');

// Import the fundamental metrics module directly
const { 
  addSP500AnalysisContent, 
  formatNumber, 
  formatCurrencyWithCommas 
} = require('./src/modules/fundamental-metrics');

// Sample data for testing
const sampleData = {
  sp500: {
    indexLevel: 5670.25,
    peRatio: {
      current: 24.36,
      fiveYearAvg: 22.54,
      tenYearAvg: 20.87,
      source: "Yahoo Finance",
      sourceUrl: "https://finance.yahoo.com/quote/%5EGSPC/",
      asOf: "May 6, 2025"
    },
    eps: {
      ttm: "$232.47",
      targetAt15x: "$3,487.05",
      targetAt17x: "$3,951.99",
      targetAt20x: "$4,649.40",
      source: "Yahoo Finance",
      sourceUrl: "https://finance.yahoo.com/quote/%5EGSPC/",
      asOf: "May 6, 2025"
    },
    forwardEps: [
      {
        year: "2025",
        eps: "$261.04",
        targetAt15x: "$3,915.60",
        targetAt17x: "$4,437.68",
        targetAt20x: "$5,220.80",
        percentVsIndex15x: "30.70%",
        percentVsIndex17x: "21.80%",
        percentVsIndex20x: "7.60%"
      },
      {
        year: "2026",
        eps: "$298.48",
        targetAt15x: "$4,477.20",
        targetAt17x: "$5,074.16",
        targetAt20x: "$5,969.60",
        percentVsIndex15x: "25.86%",
        percentVsIndex17x: "10.20%",
        percentVsIndex20x: "5.60%"
      }
    ],
    forwardEpsSource: {
      name: "S&P Global",
      url: "https://www.spglobal.com/spdji/en/documents/additional-material/sp-500-eps-est.xlsx",
      asOf: "May 5, 2025"
    }
  }
};

// Create a simple HTML page with our tables
function generateHTML() {
  // Generate the SP500 analysis content directly
  const sp500AnalysisContent = addSP500AnalysisContent(sampleData);
  
  // Create the HTML
  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Table Mobile Test</title>
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
      </style>
    </head>
    <body>
      <h1>Table Mobile Test</h1>
      <p>This page tests the mobile-friendliness of tables in the Fundamental Metrics section.</p>
      
      <div id="content">
        ${sp500AnalysisContent}
      </div>
      
      <button class="view-toggle" id="viewToggle">Toggle Mobile View</button>
      
      <script>
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
}

// Create a simple HTTP server to serve the HTML
function startServer() {
  const html = generateHTML();
  const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(html);
  });
  
  const PORT = 3000;
  server.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}/`);
    console.log('Please open your browser and navigate to: http://localhost:3000/');
  });
}

// Start the server
startServer();
