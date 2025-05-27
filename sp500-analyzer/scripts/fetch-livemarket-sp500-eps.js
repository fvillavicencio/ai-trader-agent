// fetch-livemarket-sp500-eps.js
// Attempts to fetch S&P 500 (SPY) EPS and P/E using the Live Stock Market API via RapidAPI
import axios from 'axios';
import 'dotenv/config';

const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
const RAPIDAPI_HOST = 'live-stock-market.p.rapidapi.com';

if (!RAPIDAPI_KEY) {
  console.error('Error: RapidAPI key not found in environment variables.');
  process.exit(1);
}

async function fetchSPYFundamentalsLiveMarket() {
  try {
    // Guessing endpoint based on common conventions, may need adjustment
    const options = {
      method: 'GET',
      url: `https://${RAPIDAPI_HOST}/stock-fundamentals?symbol=SPY`,
      headers: {
        'X-RapidAPI-Key': RAPIDAPI_KEY,
        'X-RapidAPI-Host': RAPIDAPI_HOST,
      },
    };
    const response = await axios.request(options);
    console.log('=== RAW RESPONSE ===');
    console.dir(response.data, { depth: null });
    // Try to extract EPS, PE, Price if present
    const data = response.data;
    // Print likely fields
    const price = data.price || data.regularMarketPrice;
    const eps = data.eps || data.epsTrailingTwelveMonths;
    const pe = data.pe || data.trailingPE;
    console.log(`Price: $${price}`);
    console.log(`TTM EPS: $${eps}`);
    console.log(`TTM P/E: ${pe}`);
  } catch (error) {
    if (error.response) {
      console.error('API Error:', error.response.status, error.response.data);
    } else {
      console.error('Error:', error.message);
    }
  }
}

fetchSPYFundamentalsLiveMarket();
