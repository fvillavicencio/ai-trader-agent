import axios from 'axios';

/**
 * Fetches S&P 500 (SPY) EPS (TTM) and P/E using yahoo-finance15 API via RapidAPI.
 * Returns: { eps, pe, price, sourceName, sourceUrl, lastUpdated }
 * Throws on error or missing data.
 */
export async function getSP500EpsAndPeFromYahoo15() {
  const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
  const RAPIDAPI_HOST = 'yahoo-finance15.p.rapidapi.com';
  if (!RAPIDAPI_KEY) throw new Error('RAPIDAPI_KEY not set in environment');
  const options = {
    method: 'GET',
    url: `https://${RAPIDAPI_HOST}/api/yahoo/qu/quote/SPY`,
    headers: {
      'X-RapidAPI-Key': RAPIDAPI_KEY,
      'X-RapidAPI-Host': RAPIDAPI_HOST,
    },
  };
  const response = await axios.request(options);
  const quote = response.data.body && response.data.body.length > 0 ? response.data.body[0] : null;
  if (!quote) throw new Error('No quote data in yahoo-finance15 response');
  const price = quote.regularMarketPrice;
  const pe = quote.trailingPE;
  const eps = quote.epsTrailingTwelveMonths;
  if (!price || !pe || !eps) throw new Error('Missing EPS/PE/Price from yahoo-finance15');
  return {
    eps,
    pe,
    price,
    sourceName: 'yahoo-finance15 (RapidAPI)',
    sourceUrl: 'https://rapidapi.com/sparior/api/yahoo-finance15',
    lastUpdated: new Date().toISOString(),
  };
}
