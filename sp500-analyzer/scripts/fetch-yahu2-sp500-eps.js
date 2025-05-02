// fetch-yahu2-sp500-eps.js
// Fetches S&P 500 (SPY) EPS and P/E using yahu-finance2 API via RapidAPI

import axios from 'axios';
import 'dotenv/config';

const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
const RAPIDAPI_HOST = 'yahu-finance2.p.rapidapi.com';

if (!RAPIDAPI_KEY) {
  console.error('Error: RapidAPI key not found in environment variables.');
  process.exit(1);
}

async function fetchSPYFundamentalsYahu2() {
  try {
    const options = {
      method: 'GET',
      url: `https://${RAPIDAPI_HOST}/key-statistics/SPY`,
      headers: {
        'X-RapidAPI-Key': RAPIDAPI_KEY,
        'X-RapidAPI-Host': RAPIDAPI_HOST,
      },
    };
    const response = await axios.request(options);
    const data = response.data;
    // The structure may vary, so check the docs/sample response
    const price = data.price || data.regularMarketPrice;
    const peRatio = data.trailingPE || data.peRatio || data.trailingPe;
    const eps = data.trailingEps || data.eps;
    const forwardPE = data.forwardPE || data.forwardPe;
    const forwardEPS = data.forwardEps;

    console.log('=== yahu-finance2 Key Statistics ===');
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

fetchSPYFundamentalsYahu2();
