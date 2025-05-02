// fetch-yahoo-sp500-eps.js
// Fetches S&P 500 (SPY) TTM and Forward EPS using Yahoo Finance via RapidAPI

import axios from 'axios';
import 'dotenv/config';

const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY || process.env.YAHOO_FINANCE_API_KEY;
const RAPIDAPI_HOST = 'apidojo-yahoo-finance-v1.p.rapidapi.com';

if (!RAPIDAPI_KEY) {
  console.error('Error: RapidAPI/Yahoo Finance API key not found in environment variables.');
  process.exit(1);
}

async function fetchSPYFundamentals() {
  try {
    const options = {
      method: 'GET',
      url: `https://${RAPIDAPI_HOST}/stock/v2/get-summary`,
      params: {
        symbol: 'SPY',
        region: 'US',
      },
      headers: {
        'X-RapidAPI-Key': RAPIDAPI_KEY,
        'X-RapidAPI-Host': RAPIDAPI_HOST,
      },
    };
    const response = await axios.request(options);
    const data = response.data;

    const price = data.price?.regularMarketPrice?.raw;
    const peRatio = data.summaryDetail?.trailingPE?.raw;
    const forwardPE = data.summaryDetail?.forwardPE?.raw;

    if (!price || !peRatio) {
      console.error('Could not retrieve price or TTM P/E ratio for SPY.');
      return;
    }

    const ttmEPS = price / peRatio;
    const forwardEPS = forwardPE ? price / forwardPE : null;

    console.log('=== S&P 500 (SPY) EPS from Yahoo Finance via RapidAPI ===');
    console.log(`Price: $${price}`);
    console.log(`TTM P/E: ${peRatio}`);
    console.log(`Forward P/E: ${forwardPE || 'N/A'}`);
    console.log(`TTM EPS: $${ttmEPS.toFixed(2)}`);
    if (forwardEPS) {
      console.log(`Forward EPS: $${forwardEPS.toFixed(2)}`);
    } else {
      console.log(`Forward EPS: N/A`);
    }
  } catch (error) {
    if (error.response) {
      console.error('API Error:', error.response.status, error.response.data);
    } else {
      console.error('Error:', error.message);
    }
  }
}

fetchSPYFundamentals();
