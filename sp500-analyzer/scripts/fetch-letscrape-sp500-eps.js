// fetch-letscrape-sp500-eps.js
// Fetches S&P 500 (SPY) EPS and P/E using letscrape Real Time Finance Data API via RapidAPI

import axios from 'axios';
import 'dotenv/config';

const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
const RAPIDAPI_HOST = 'real-time-finance-data.p.rapidapi.com';

if (!RAPIDAPI_KEY) {
  console.error('Error: RapidAPI key not found in environment variables.');
  process.exit(1);
}

async function fetchSPYFundamentalsLetscrape() {
  try {
    const options = {
      method: 'GET',
      url: `https://${RAPIDAPI_HOST}/stock-fundamentals`,
      params: {
        symbol: 'SPY',
        country: 'US',
      },
      headers: {
        'X-RapidAPI-Key': RAPIDAPI_KEY,
        'X-RapidAPI-Host': RAPIDAPI_HOST,
      },
    };
    const response = await axios.request(options);
    const data = response.data.data;

    const price = data.price;
    const peRatio = data.peRatio;
    const eps = data.eps;
    const forwardPE = data.forwardPE;
    const forwardEPS = data.forwardEps;

    console.log('=== letscrape Real Time Finance Data ===');
    console.log(`Price: $${price}`);
    console.log(`TTM P/E: ${peRatio}`);
    console.log(`TTM EPS: $${eps || (price && peRatio ? (price/peRatio).toFixed(2) : 'N/A')}`);
    console.log(`Forward P/E: ${forwardPE || 'N/A'}`);
    console.log(`Forward EPS: $${forwardEPS || (forwardPE && price ? (price/forwardPE).toFixed(2) : 'N/A')}`);
    return { price, peRatio, eps, forwardPE, forwardEPS };
  } catch (error) {
    if (error.response) {
      console.error('API Error:', error.response.status, error.response.data);
    } else {
      console.error('Error:', error.message);
    }
    return null;
  }
}

fetchSPYFundamentalsLetscrape();
