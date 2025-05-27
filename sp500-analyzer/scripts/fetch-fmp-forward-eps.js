// Fetch S&P 500 Forward EPS using Financial Modeling Prep (FMP) API
// Uses SPY ETF as proxy (SPY price * 10 = S&P 500 index)

import 'dotenv/config';
import axios from 'axios';

const FMP_API_KEY = process.env.FMP_API_KEY;

async function fetchSPYForwardPE() {
  const url = `https://financialmodelingprep.com/api/v3/ratios/SPY?apikey=${FMP_API_KEY}`;
  const res = await axios.get(url);
  console.log('FMP /ratios/SPY raw response:', JSON.stringify(res.data, null, 2));
  if (!Array.isArray(res.data) || res.data.length === 0) {
    throw new Error('No ratios data returned from FMP.');
  }
  // The latest data should be first
  const forwardPE = res.data[0].forwardPE;
  if (!forwardPE) {
    throw new Error('No forwardPE found in FMP ratios data.');
  }
  return forwardPE;
}

async function fetchSPYPrice() {
  const url = `https://financialmodelingprep.com/api/v3/quote/SPY?apikey=${FMP_API_KEY}`;
  const res = await axios.get(url);
  console.log('FMP /quote/SPY raw response:', JSON.stringify(res.data, null, 2));
  if (!Array.isArray(res.data) || res.data.length === 0) {
    throw new Error('No quote data returned from FMP.');
  }
  const price = res.data[0].price;
  if (!price) {
    throw new Error('No price found in FMP quote data.');
  }
  return price;
}

async function main() {
  try {
    const [forwardPE, spyPrice] = await Promise.all([
      fetchSPYForwardPE(),
      fetchSPYPrice()
    ]);
    const sp500Index = spyPrice * 10;
    const forwardEPS = sp500Index / forwardPE;
    console.log(`S&P 500 Forward EPS (FMP): ${forwardEPS.toFixed(2)}`);
    console.log(`(SPY Price: $${spyPrice}, Forward P/E: ${forwardPE}, S&P 500 Index: ${sp500Index})`);
  } catch (err) {
    console.error('Error fetching S&P 500 forward EPS:', err.message);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
} else {
  // Always run main for debugging in case import.meta.url check fails
  main();
}
