// fetch-livemarket-market-etfs.js
// Fetches ETF quote/market data from the Live Stock Market API (v1/market/etfs) via RapidAPI
import axios from 'axios';
import 'dotenv/config';

const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
const RAPIDAPI_HOST = 'live-stock-market.p.rapidapi.com';

if (!RAPIDAPI_KEY) {
  console.error('Error: RapidAPI key not found in environment variables.');
  process.exit(1);
}

async function fetchMarketEtfs(symbols = 'GDX') {
  try {
    const options = {
      method: 'GET',
      url: `https://${RAPIDAPI_HOST}/v1/market/etfs`,
      params: { symbols },
      headers: {
        'X-RapidAPI-Key': RAPIDAPI_KEY,
        'X-RapidAPI-Host': RAPIDAPI_HOST,
      },
    };
    const response = await axios.request(options);
    console.log('=== /v1/market/etfs Response ===');
    console.dir(response.data, { depth: null });
    // Try to extract and print key metrics
    const result = response.data?.data?.quoteResponse?.result?.[0];
    if (result) {
      console.log('Symbol:', result.symbol);
      console.log('Name:', result.longName);
      console.log('Price:', result.regularMarketPrice?.fmt);
      console.log('Change:', result.regularMarketChange?.fmt);
      console.log('Change Percent:', result.regularMarketChangePercent?.fmt);
      console.log('Day Range:', result.regularMarketDayRange?.fmt);
      console.log('52W Range:', result.fiftyTwoWeekRange?.fmt);
      console.log('Previous Close:', result.regularMarketPreviousClose?.fmt);
      console.log('Open:', result.regularMarketOpen?.fmt);
      console.log('Volume:', result.regularMarketVolume?.fmt);
    } else {
      console.log('No result data found in response.');
    }
  } catch (error) {
    if (error.response) {
      console.error('API Error:', error.response.status, error.response.data);
    } else {
      console.error('Error:', error.message);
    }
  }
}

fetchMarketEtfs();
