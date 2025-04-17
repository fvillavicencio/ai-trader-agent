// scripts/test-polygon-spx.js
import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

const API_KEY = process.env.POLYGON_API_KEY; // Add POLYGON_API_KEY=your_key to .env
const TICKER = 'I:SPX';

async function fetchSPXSnapshot() {
  try {
    const url = `https://api.polygon.io/v3/snapshot/indices?ticker=${encodeURIComponent(TICKER)}&apiKey=${API_KEY}`;
    const { data } = await axios.get(url);
    console.log(JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Polygon.io API error:', err.response?.data || err.message);
    process.exit(1);
  }
}

fetchSPXSnapshot();
