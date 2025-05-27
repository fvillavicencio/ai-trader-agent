/**
 * Test script to directly generate HTML with the modified S&P 500 EPS forward estimates table
 */

const fs = require('fs');
const path = require('path');

// Sample data with S&P 500 forward EPS estimates
const sampleData = {
  sp500: {
    indexLevel: 5667.24,
    source: {
      name: "Yahoo Finance",
      url: "https://finance.yahoo.com/quote/%5EGSPC/",
      asOf: "May 5, 2025 at 1:24 PM EDT"
    },
    sourceUrl: "https://finance.yahoo.com/quote/%5EGSPC/",
    asOf: "May 5, 2025 at 1:24 PM EDT",
    peRatio: {
      current: 25.15,
      fiveYearAvg: 26.62,
      tenYearAvg: 24.79,
      source: "Yahoo Finance",
      sourceUrl: "https://finance.yahoo.com/quote/%5EGSPC/",
      asOf: "May 5, 2025 at 1:24 PM EDT"
    },
    eps: {
      ttm: "$22.47",
      targetAt15x: "$337.05",
      targetAt17x: "$381.99",
      targetAt20x: "$449.40",
      source: "Yahoo Finance",
      sourceUrl: "https://finance.yahoo.com/quote/%5EGSPC/",
      asOf: "May 5, 2025 at 1:24 PM EDT"
    },
    forwardEps: [
      {
        year: "2025",
        eps: "$261.04",
        targetAt15x: "$3915.60",
        percentVsIndex15x: "-30.9",
        targetAt17x: "$4437.68",
        percentVsIndex17x: "-21.7",
        targetAt20x: "$5220.80",
        percentVsIndex20x: "-7.9"
      },
      {
        year: "2026",
        eps: "$298.48",
        targetAt15x: "$4477.20",
        percentVsIndex15x: "-21.0",
        targetAt17x: "$5074.16",
        percentVsIndex17x: "-10.5",
        targetAt20x: "$5969.60",
        percentVsIndex20x: "5.3"
      }
    ],
    forwardEpsSource: {
      name: "S&P Global",
      url: "https://www.spglobal.com/spdji/en/",
      asOf: "May 4, 2025 at 8:00 PM EDT"
    }
  }
};

// Helper functions
const formatNumber = (value, decimals = 2) => {
  if (value === undefined || value === null || value === '') return 'N/A';
  
  // Remove any existing commas and dollar signs
  const cleanValue = typeof value === 'string' 
    ? value.replace(/[$,]/g, '') 
    : value.toString();
  
  // Parse as float and check if it's a valid number
  const num = parseFloat(cleanValue);
  if (isNaN(num)) return 'N/A';
  
  // Format with commas and fixed decimal places
  return num.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
};

const formatCurrencyWithCommas = (value) => {
  if (!value) return 'N/A';
  
  // If the value already has a dollar sign, remove it
  const numericValue = value.replace(/^\$/, '');
  
  // Split by decimal point to handle dollars and cents separately
  const parts = numericValue.split('.');
  
  // Format the dollars part with commas
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  
  // Return with dollar sign and join back with decimal if it exists
  return '$' + (parts.length > 1 ? parts.join('.') : parts[0]);
};

// Generate the S&P 500 Forward EPS table HTML
const generateForwardEpsTableHTML = (data) => {
  const sp500Data = data.sp500 || {};
  
  return `
    <div class="forward-eps-container" style="margin: 20px 0; padding: 28px 32px; background-color: white; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
      <div class="forward-eps-header label-col" style="font-weight: bold; font-size: clamp(1.1rem,2vw,1.25rem); margin-bottom: 15px; color: #1a365d; text-align: center;">S&P 500 Forward EPS & Implied Index Values</div>
      <div class="forward-eps-table" style="overflow-x:auto;">
        <table style="width:100%; border-collapse:separate; border-spacing:0 14px; background: #fff; margin-bottom: 10px; border-radius:10px; overflow:hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.04); font-size: clamp(0.95rem, 2vw, 1.05rem);">
          <thead>
            <tr style="background:#166534; text-align: center; font-weight: 600; color: white;">
              <th style="padding:16px 0 12px 0;">Annual Estimate</th>
              <th>Forward EPS</th>
              <th>15x</th>
              <th>17x</th>
              <th>20x</th>
            </tr>
          </thead>
          <tbody>
            ${sp500Data.forwardEps?.map((item, index) => {
              return `
                <tr style="text-align:center; background:#fff; border-bottom:1px solid #e5e7eb; color:#111;">
                  <td style="font-weight:bold; color:#111; font-size: 0.85rem;">${item.year}</td>
                  <td style="font-weight:bold; color:#111; font-size: 0.85rem;">${item.eps}</td>
                  <td style="color:#111; font-size: 0.85rem;">${formatCurrencyWithCommas(item.targetAt15x)} <span style="font-size: 0.75rem; color: ${parseFloat(item.percentVsIndex15x) >= 0 ? '#10b981' : '#ef4444'};">(${parseFloat(item.percentVsIndex15x) >= 0 ? '▲' : '▼'} ${Math.abs(parseFloat(item.percentVsIndex15x)).toFixed(2)}%)</span></td>
                  <td style="color:#111; font-size: 0.85rem;">${formatCurrencyWithCommas(item.targetAt17x)} <span style="font-size: 0.75rem; color: ${parseFloat(item.percentVsIndex17x) >= 0 ? '#10b981' : '#ef4444'};">(${parseFloat(item.percentVsIndex17x) >= 0 ? '▲' : '▼'} ${Math.abs(parseFloat(item.percentVsIndex17x)).toFixed(2)}%)</span></td>
                  <td style="color:#111; font-size: 0.85rem;">${formatCurrencyWithCommas(item.targetAt20x)} <span style="font-size: 0.75rem; color: ${parseFloat(item.percentVsIndex20x) >= 0 ? '#10b981' : '#ef4444'};">(${parseFloat(item.percentVsIndex20x) >= 0 ? '▲' : '▼'} ${Math.abs(parseFloat(item.percentVsIndex20x)).toFixed(2)}%)</span></td>
                </tr>
              `;
            }).join('') || `
              <tr>
                <td colspan="5" style="text-align: center; padding: 15px;">No forward EPS data available</td>
              </tr>
            `}
          </tbody>
        </table>
      </div>
      <div class="forward-eps-source" style="font-size: 10px; color: #888; margin-top: 8px; text-align: right;">
        Source: <a href="${sp500Data.forwardEpsSource?.url || '#'}" target="_blank" style="color:#2563eb; text-decoration:underline;">${sp500Data.forwardEpsSource?.name || 'S&P Global'}</a>, as of ${sp500Data.forwardEpsSource?.asOf || sp500Data.source?.asOf || 'N/A'}
      </div>
    </div>
  `;
};

// Generate the complete HTML
const generateTestHTML = () => {
  const forwardEpsTableHTML = generateForwardEpsTableHTML(sampleData);
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>S&P 500 EPS Forward Estimates Test</title>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 1200px;
          margin: 0 auto;
          padding: 20px;
          background-color: #f8f9fa;
        }
        h1 {
          text-align: center;
          margin-bottom: 30px;
        }
      </style>
    </head>
    <body>
      <h1>S&P 500 EPS Forward Estimates Test</h1>
      ${forwardEpsTableHTML}
    </body>
    </html>
  `;
  
  // Write the HTML to a file
  fs.writeFileSync(path.join(__dirname, 'eps-table-test.html'), html);
  console.log('Test HTML generated: eps-table-test.html');
};

// Run the test
generateTestHTML();
