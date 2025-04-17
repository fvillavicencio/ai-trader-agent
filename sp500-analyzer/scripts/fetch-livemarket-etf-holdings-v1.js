// fetch-livemarket-etf-holdings-v1.js
// Fetches ETF holdings and key ratios from the Live Stock Market API (v1/etf/holdings) via RapidAPI
import axios from 'axios';
import 'dotenv/config';

const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
const RAPIDAPI_HOST = 'live-stock-market.p.rapidapi.com';

if (!RAPIDAPI_KEY) {
  console.error('Error: RapidAPI key not found in environment variables.');
  process.exit(1);
}

async function fetchETFHoldingsV1(symbol = 'SPY') {
  try {
    const options = {
      method: 'GET',
      url: `https://${RAPIDAPI_HOST}/v1/etf/holdings`,
      params: { symbol },
      headers: {
        'X-RapidAPI-Key': RAPIDAPI_KEY,
        'X-RapidAPI-Host': RAPIDAPI_HOST,
      },
    };
    const response = await axios.request(options);
    console.log('=== /v1/etf/holdings Response ===');
    console.dir(response.data, { depth: null });
    // Try to extract and print key metrics
    const result = response.data?.data?.quoteSummary?.result?.[0]?.topHoldings;
    if (result) {
      const eq = result.equityHoldings;
      if (eq) {
        console.log('Equity Holdings Ratios:');
        console.log('P/E:', eq.priceToEarnings?.fmt, '(', eq.priceToEarnings?.raw, ')');
        console.log('P/B:', eq.priceToBook?.fmt, '(', eq.priceToBook?.raw, ')');
        console.log('P/S:', eq.priceToSales?.fmt, '(', eq.priceToSales?.raw, ')');
        console.log('P/CF:', eq.priceToCashflow?.fmt, '(', eq.priceToCashflow?.raw, ')');
      }
      if (result.holdings) {
        console.log('First 5 Holdings:');
        result.holdings.slice(0, 5).forEach(h => {
          console.log(`${h.symbol}: ${h.holdingName} (${h.holdingPercent?.fmt})`);
        });
      }
    } else {
      console.log('No topHoldings data found in response.');
    }
  } catch (error) {
    if (error.response) {
      console.error('API Error:', error.response.status, error.response.data);
    } else {
      console.error('Error:', error.message);
    }
  }
}

fetchETFHoldingsV1();
