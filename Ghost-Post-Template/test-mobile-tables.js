const http = require('http');

// Sample data for testing
const sampleData = {
  year2025: {
    year: "2025",
    eps: "$261.04",
    targetAt15x: "$3,915.60",
    targetAt17x: "$4,437.68",
    targetAt20x: "$5,220.80",
    percentVsIndex15x: "30.70%",
    percentVsIndex17x: "21.80%",
    percentVsIndex20x: "7.60%"
  },
  year2026: {
    year: "2026",
    eps: "$298.48",
    targetAt15x: "$4,477.20",
    targetAt17x: "$5,074.16",
    targetAt20x: "$5,969.60",
    percentVsIndex15x: "25.86%",
    percentVsIndex17x: "10.20%",
    percentVsIndex20x: "5.60%"
  },
  eps: {
    ttm: "$232.47",
    targetAt15x: "$3,487.05",
    targetAt17x: "$3,951.99",
    targetAt20x: "$4,649.40"
  },
  peRatio: {
    current: "24.36",
    fiveYearAvg: "22.54",
    tenYearAvg: "20.87"
  }
};

// Create HTML with our improved tables
function generateHTML() {
  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Mobile-Friendly Tables Test</title>
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
      </style>
    </head>
    <body>
      <h1>Mobile-Friendly Tables Test</h1>
      <p>This page tests the mobile-friendliness of tables in the Fundamental Metrics section.</p>
      
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
      
      <h2>S&P 500 Forward EPS & Implied Index Values</h2>
      <div class="table-container">
        <div style="overflow-x: auto; -webkit-overflow-scrolling: touch; max-width: 100%;">
          <table style="width: 100%; min-width: 500px; border-collapse: separate; border-spacing: 0 14px; background: #fff; margin-bottom: 10px; border-radius: 10px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.04); font-size: clamp(0.95rem, 2vw, 1.05rem);">
            <thead>
              <tr style="background-color: #0c6e3d; text-align: center; font-weight: 600; color: white;">
                <th style="padding: 16px 0 12px 0; white-space: nowrap;">Annual Estimate</th>
                <th style="padding: 16px 0 12px 0; white-space: nowrap;">Forward EPS</th>
                <th style="padding: 16px 0 12px 0; white-space: nowrap;">15x</th>
                <th style="padding: 16px 0 12px 0; white-space: nowrap;">17x</th>
                <th style="padding: 16px 0 12px 0; white-space: nowrap;">20x</th>
              </tr>
            </thead>
            <tbody>
              <tr style="text-align: center; background: #fff; border-bottom: 1px solid #e5e7eb; color: #111;">
                <td style="font-weight: bold; color: #111; font-size: 0.85rem; padding: 8px 4px;">${sampleData.year2025.year}</td>
                <td style="font-weight: bold; color: #111; font-size: 0.85rem; padding: 8px 4px;">${sampleData.year2025.eps}</td>
                <td style="color: #111; font-size: 0.85rem; padding: 8px 4px;">${sampleData.year2025.targetAt15x} <span style="font-size: 0.75rem; color: #10b981;">(▲ 30.70%)</span></td>
                <td style="color: #111; font-size: 0.85rem; padding: 8px 4px;">${sampleData.year2025.targetAt17x} <span style="font-size: 0.75rem; color: #10b981;">(▲ 21.80%)</span></td>
                <td style="color: #111; font-size: 0.85rem; padding: 8px 4px;">${sampleData.year2025.targetAt20x} <span style="font-size: 0.75rem; color: #10b981;">(▲ 7.60%)</span></td>
              </tr>
              <tr style="text-align: center; background: #fff; border-bottom: 1px solid #e5e7eb; color: #111;">
                <td style="font-weight: bold; color: #111; font-size: 0.85rem; padding: 8px 4px;">${sampleData.year2026.year}</td>
                <td style="font-weight: bold; color: #111; font-size: 0.85rem; padding: 8px 4px;">${sampleData.year2026.eps}</td>
                <td style="color: #111; font-size: 0.85rem; padding: 8px 4px;">${sampleData.year2026.targetAt15x} <span style="font-size: 0.75rem; color: #10b981;">(▲ 25.86%)</span></td>
                <td style="color: #111; font-size: 0.85rem; padding: 8px 4px;">${sampleData.year2026.targetAt17x} <span style="font-size: 0.75rem; color: #10b981;">(▲ 10.20%)</span></td>
                <td style="color: #111; font-size: 0.85rem; padding: 8px 4px;">${sampleData.year2026.targetAt20x} <span style="font-size: 0.75rem; color: #10b981;">(▲ 5.60%)</span></td>
              </tr>
            </tbody>
          </table>
        </div>
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
              viewToggle.textContent = 'Switch to Mobile View';
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
