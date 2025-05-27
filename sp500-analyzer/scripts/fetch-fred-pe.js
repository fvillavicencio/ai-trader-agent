// sp500-analyzer/scripts/fetch-fred-pe.js
// Fetch S&P 500 Index from FRED API using .env and print in custom format
// Usage: node scripts/fetch-fred-pe.js [SERIES_ID]

require('dotenv').config();
const axios = require('axios');

const FRED_API_KEY = process.env.FRED_API_KEY;
if (!FRED_API_KEY) {
  console.error('FRED_API_KEY not found in environment variables.');
  process.exit(1);
}

const DEFAULT_SERIES_ID = 'SP500';
const seriesId = process.argv[2] || DEFAULT_SERIES_ID;

const BASE_URL = 'https://api.stlouisfed.org/fred/series/observations';
const FRED_SERIES_URL = `https://fred.stlouisfed.org/series/${seriesId}`;

function formatDate(iso) {
  // Returns YYYY-MM-DD from YYYY-MM-DD or YYYY-MM-DDTHH:mm:ssZ
  return iso.split('T')[0];
}

async function fetchFREDSeries(seriesId) {
  try {
    const url = `${BASE_URL}?series_id=${encodeURIComponent(seriesId)}&api_key=${FRED_API_KEY}&file_type=json&sort_order=desc&limit=10`;
    const response = await axios.get(url);
    const data = response.data;
    if (!data.observations || data.observations.length === 0) {
      console.log(`No data found for series_id: ${seriesId}`);
      return;
    }
    // Use the latest non-empty value as "Current"
    const latest = data.observations.find(obs => obs.value && obs.value !== ".");
    const currentValue = latest ? Number(latest.value) : null;
    const lastUpdate = latest ? latest.date : null;
    // For illustration, calculate 5-value and 10-value averages
    const validValues = data.observations.filter(obs => obs.value && obs.value !== ".").map(obs => Number(obs.value));
    const avg5 = validValues.length >= 5 ? (validValues.slice(0, 5).reduce((a, b) => a + b, 0) / 5) : null;
    const avg10 = validValues.length >= 10 ? (validValues.slice(0, 10).reduce((a, b) => a + b, 0) / 10) : null;

    // Output in specified format
    console.log(`S&P 500 Index:`);
    console.log(`  Index: ${currentValue !== null ? currentValue.toFixed(2) : 'N/A'}`);
    console.log(`  Source: FRED`);
    console.log(`  URL: ${FRED_SERIES_URL}`);
    console.log(`  Last Update: ${lastUpdate ? formatDate(lastUpdate) : 'N/A'}`);
    console.log();
    console.log(`  Historical Index Context:`);
    console.log(`  Current | 5-Day Avg | 10-Day Avg`);
    console.log(`  ${currentValue !== null ? currentValue.toFixed(2) : 'N/A'} | ${avg5 !== null ? avg5.toFixed(2) : 'N/A'} | ${avg10 !== null ? avg10.toFixed(2) : 'N/A'}`);
  } catch (err) {
    if (err.response) {
      console.error('FRED API error:', err.response.status, err.response.data);
    } else {
      console.error('Request error:', err.message);
    }
    process.exit(1);
  }
}

fetchFREDSeries(seriesId);
