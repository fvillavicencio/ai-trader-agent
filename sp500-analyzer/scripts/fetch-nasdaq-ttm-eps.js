// Fetch S&P 500 Trailing 12-Month (TTM) EPS from NASDAQ Data Link (Multpl)
// Docs: https://docs.data.nasdaq.com/docs/getting-started

import 'dotenv/config';
import axios from 'axios';

const NASDAQ_API_KEY = process.env.NASDAQ_DATA_LINK_API_KEY;

async function fetchTTMEPS() {
  const url = `https://data.nasdaq.com/api/v3/datasets/MULTPL/SP500_EARNINGS.json?api_key=${NASDAQ_API_KEY}`;
  const res = await axios.get(url);
  if (!res.data || !res.data.dataset || !Array.isArray(res.data.dataset.data) || res.data.dataset.data.length === 0) {
    throw new Error('No TTM EPS data returned from NASDAQ Data Link.');
  }
  // The latest value is the first row: [date, eps]
  const [date, eps] = res.data.dataset.data[0];
  console.log(`S&P 500 TTM EPS (NASDAQ Data Link): ${eps} (as of ${date})`);
}

fetchTTMEPS().catch(err => {
  console.error('Error fetching S&P 500 TTM EPS:', err.message);
  process.exit(1);
});
