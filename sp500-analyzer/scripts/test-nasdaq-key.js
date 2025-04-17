// scripts/test-nasdaq-key.js
import 'dotenv/config';
import axios from 'axios';

const NASDAQ_API_KEY = process.env.NASDAQ_DATA_LINK_API_KEY;

async function testApiKey() {
  // FRED/GDP is a free, public dataset
  const url = `https://data.nasdaq.com/api/v3/datasets/FRED/GDP/data.json?api_key=${NASDAQ_API_KEY}&rows=1`;
  try {
    const res = await axios.get(url);
    console.log('✅ API key works! Status:', res.status);
    console.log('Sample data:', JSON.stringify(res.data, null, 2));
  } catch (err) {
    if (err.response) {
      console.error('❌ API request failed. Status:', err.response.status);
      console.error('Error body:', err.response.data);
    } else {
      console.error('❌ Request error:', err.message);
    }
    process.exit(1);
  }
}

testApiKey();
