/**
 * Test script to generate HTML with the modified S&P 500 EPS forward estimates table
 */

const fs = require('fs');
const path = require('path');
const { addFundamentalMetrics } = require('./src/modules/fundamental-metrics');
const { addHeading, addHTML } = require('./src/utils/mobiledoc-helpers');

// Create a simple mobiledoc structure
const createMobiledoc = () => {
  return {
    version: '0.3.1',
    atoms: [],
    cards: [],
    markups: [],
    sections: []
  };
};

// Sample data with S&P 500 forward EPS estimates
const sampleData = {
  sp500: {
    indexLevel: 5670.25,
    asOf: '2025-05-05T13:48:15-04:00',
    peRatio: {
      current: 24.8,
      fiveYearAvg: 22.5,
      tenYearAvg: 20.7,
      source: 'Yahoo Finance',
      sourceUrl: 'https://finance.yahoo.com/quote/%5EGSPC/',
      asOf: '2025-05-05T13:48:15-04:00'
    },
    eps: {
      ttm: '$228.64',
      targetAt15x: '$3,429.60',
      targetAt17x: '$3,886.88',
      targetAt20x: '$4,572.80',
      source: 'S&P Global',
      sourceUrl: 'https://www.spglobal.com/spdji/en/indices/equity/sp-500/',
      asOf: '2025-05-05T13:48:15-04:00'
    },
    forwardEps: [
      {
        year: '2025',
        eps: '$261.04',
        targetAt15x: '$3,915.60',
        percentVsIndex15x: -30.95,
        targetAt17x: '$4,437.68',
        percentVsIndex17x: -21.74,
        targetAt20x: '$5,220.80',
        percentVsIndex20x: -7.92
      },
      {
        year: '2026',
        eps: '$298.48',
        targetAt15x: '$4,477.20',
        percentVsIndex15x: -21.04,
        targetAt17x: '$5,074.16',
        percentVsIndex17x: -10.51,
        targetAt20x: '$5,969.60',
        percentVsIndex20x: 5.28
      }
    ],
    forwardEpsSource: {
      name: 'S&P Global',
      url: 'https://www.spglobal.com/spdji/en/documents/additional-material/sp-500-eps-est.xlsx',
      asOf: '2025-05-05T13:48:15-04:00'
    }
  }
};

// Generate the HTML
const generateTestHTML = () => {
  const mobiledoc = createMobiledoc();
  
  // Add a title
  addHeading(mobiledoc, 'S&P 500 EPS Forward Estimates Test', 1);
  
  // Add the fundamental metrics section
  addFundamentalMetrics(mobiledoc, sampleData);
  
  // Convert mobiledoc to HTML
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
      ${mobiledoc.sections.map(section => {
        if (section[0] === 1) {
          return `<h${section[1]}>${section[2]}</h${section[1]}>`;
        } else if (section[0] === 10) {
          return section[1];
        }
        return '';
      }).join('\n')}
    </body>
    </html>
  `;
  
  // Write the HTML to a file
  fs.writeFileSync(path.join(__dirname, 'eps-table-test.html'), html);
  console.log('Test HTML generated: eps-table-test.html');
};

// Run the test
generateTestHTML();
