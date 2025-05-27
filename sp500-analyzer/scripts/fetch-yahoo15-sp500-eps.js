// fetch-yahoo15-sp500-eps.js
// Fetches S&P 500 (SPY) EPS and P/E using yahoo-finance15 API via RapidAPI

import axios from 'axios';
import 'dotenv/config';

const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
const RAPIDAPI_HOST = 'yahoo-finance15.p.rapidapi.com';

if (!RAPIDAPI_KEY) {
  console.error('Error: RapidAPI key not found in environment variables.');
  process.exit(1);
}

async function fetchSPYFundamentalsYahoo15() {
  try {
    const options = {
      method: 'GET',
      url: `https://${RAPIDAPI_HOST}/api/yahoo/qu/quote/SPY`,
      headers: {
        'X-RapidAPI-Key': RAPIDAPI_KEY,
        'X-RapidAPI-Host': RAPIDAPI_HOST,
      },
    };
    const response = await axios.request(options);
    console.log('=== RAW RESPONSE ===');
    console.dir(response.data, { depth: null });
    // Correctly extract the first element from the body array
    const quote = response.data.body && response.data.body.length > 0 ? response.data.body[0] : {};
    const price = quote.regularMarketPrice;
    const peRatio = quote.trailingPE;
    const eps = quote.epsTrailingTwelveMonths;
    const forwardPE = quote.forwardPE;
    const forwardEPS = quote.epsForward || quote.forwardEps;

    console.log('=== yahoo-finance15 Quote ===');
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

fetchSPYFundamentalsYahoo15();
