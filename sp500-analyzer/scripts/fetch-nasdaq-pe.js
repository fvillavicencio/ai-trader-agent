// sp500-analyzer/scripts/fetch-nasdaq-pe.js
// Fetch S&P 500 P/E Ratio (monthly) from NASDAQ Data Link (Quandl) API
// Usage: node scripts/fetch-nasdaq-pe.js

require('dotenv').config();
const axios = require('axios');

const API_KEY = process.env.NASDAQ_DATA_LINK_API_KEY;
if (!API_KEY) {
  console.error('NASDAQ_DATA_LINK_API_KEY not found in environment variables.');
  process.exit(1);
}

const SERIES_CODE = 'MULTPL/SP500_PE_RATIO_MONTH';
const BASE_URL = `https://data.nasdaq.com/api/v3/datasets/${SERIES_CODE}/data.json`;

function formatDate(iso) {
  return iso.split('T')[0];
}

async function fetchPE() {
  try {
    const url = `${BASE_URL}?api_key=${API_KEY}&rows=120&order=desc`;
    const resp = await axios.get(url);
    const data = resp.data.dataset_data;
    if (!data || !data.data || data.data.length === 0) {
      console.log('No data found for S&P 500 P/E Ratio.');
      return;
    }
    // data.data: [ [ 'YYYY-MM-DD', value ], ... ]
    const values = data.data
      .filter(row => row[1] !== null && !isNaN(row[1]))
      .map(row => ({ date: row[0], value: Number(row[1]) }));
    if (values.length === 0) {
      console.log('No valid P/E values found.');
      return;
    }
    const current = values[0];
    const avg5 = values.length >= 60 ? (values.slice(0, 60).reduce((a, b) => a + b.value, 0) / 60) : null;
    const avg10 = values.length >= 120 ? (values.slice(0, 120).reduce((a, b) => a + b.value, 0) / 120) : null;

    // Output in requested format
    console.log('S&P 500 Trailing P/E Ratio:');
    console.log(`  P/E: ${current.value.toFixed(2)}`);
    console.log('  Source: NASDAQ Data Link (MULTPL)');
    console.log('  URL: https://data.nasdaq.com/data/MULTPL/SP500_PE_RATIO_MONTH');
    console.log(`  Last Update: ${current.date}`);
    console.log();
    console.log('  Historical P/E Context:');
    console.log('  Current | 5-Year Avg | 10-Year Avg');
    console.log(`  ${current.value.toFixed(2)} | ${avg5 !== null ? avg5.toFixed(2) : 'N/A'} | ${avg10 !== null ? avg10.toFixed(2) : 'N/A'}`);
  } catch (err) {
    if (err.response) {
      console.error('NASDAQ Data Link API error:', err.response.status, err.response.data);
    } else {
      console.error('Request error:', err.message);
    }
    process.exit(1);
  }
}

fetchPE();
