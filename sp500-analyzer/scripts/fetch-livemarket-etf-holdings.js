// fetch-livemarket-etf-holdings.js
// Fetches ETF holdings and weights from the Live Stock Market API via RapidAPI
import axios from 'axios';
import 'dotenv/config';

const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
const RAPIDAPI_HOST = 'live-stock-market.p.rapidapi.com';

if (!RAPIDAPI_KEY) {
  console.error('Error: RapidAPI key not found in environment variables.');
  process.exit(1);
}

async function fetchETFHoldings(symbol = 'SPY') {
  try {
    const options = {
      method: 'GET',
      url: `https://${RAPIDAPI_HOST}/etf/holdings`,
      params: { symbol },
      headers: {
        'X-RapidAPI-Key': RAPIDAPI_KEY,
        'X-RapidAPI-Host': RAPIDAPI_HOST,
      },
    };
    const response = await axios.request(options);
    console.log('=== ETF Holdings Response ===');
    console.dir(response.data, { depth: null });
    if (response.data.holdings) {
      console.log(`First 5 holdings for ${symbol}:`);
      response.data.holdings.slice(0, 5).forEach(h => {
        console.log(`${h.symbol}: ${h.name} (${h.weight}%)`);
      });
    } else {
      console.log('No holdings data found in response.');
    }
  } catch (error) {
    if (error.response) {
      console.error('API Error:', error.response.status, error.response.data);
    } else {
      console.error('Error:', error.message);
    }
  }
}

fetchETFHoldings();
