import axios from 'axios';
import { getSP500EpsAndPeFromYahoo15 } from './yahoo15.js';

/**
 * Attempts to fetch the latest S&P 500 EPS (TTM) and P/E with cascading fallbacks:
 * 1. yahoo-finance15 (RapidAPI)
 * 2. yahu-finance2 (RapidAPI)
 * 3. yahoo-finance127 (RapidAPI)
 * Returns: { eps, pe, price, value, sourceName, sourceUrl, lastUpdated, provider }
 */
export async function getSP500Earnings() {
  // Try yahoo-finance15 primary API first
  try {
    const yahoo15 = await getSP500EpsAndPeFromYahoo15();
    if (yahoo15 && yahoo15.eps && yahoo15.pe && yahoo15.price) {
      return {
        eps: yahoo15.eps,
        pe: yahoo15.pe,
        price: yahoo15.price,
        sourceName: yahoo15.sourceName,
        sourceUrl: yahoo15.sourceUrl,
        lastUpdated: yahoo15.lastUpdated,
        provider: 'yahoo15',
      };
    }
  } catch (e) {}
  // If yahoo-finance15 fails, try yahu-finance2
  try {
    const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
    const RAPIDAPI_HOST = 'yahu-finance2.p.rapidapi.com';
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
    const price = data.price || data.regularMarketPrice;
    const pe = data.trailingPE || data.peRatio || data.trailingPe;
    const eps = data.trailingEps || data.eps;
    if (price && pe && eps) {
      return {
        eps,
        pe,
        price,
        sourceName: 'yahu-finance2 (RapidAPI)',
        sourceUrl: 'https://rapidapi.com/tonyapi9892/api/yahu-finance2',
        lastUpdated: new Date().toISOString(),
        provider: 'yahu2',
      };
    }
  } catch (e) {}
  // Try yahoo-finance127 (RapidAPI)
  try {
    const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
    const RAPIDAPI_HOST = 'yahoo-finance127.p.rapidapi.com';
    const options = {
      method: 'GET',
      url: `https://${RAPIDAPI_HOST}/price/spy`,
      headers: {
        'X-RapidAPI-Key': RAPIDAPI_KEY,
        'X-RapidAPI-Host': RAPIDAPI_HOST,
      },
    };
    const response = await axios.request(options);
    const data = response.data;
    const price = data.regularMarketPrice?.raw || data.regularMarketPrice;
    const pe = data.trailingPE?.raw || data.trailingPE;
    const eps = data.epsTrailingTwelveMonths?.raw || data.epsTrailingTwelveMonths;
    if (price && pe && eps) {
      return {
        eps,
        pe,
        price,
        sourceName: 'yahoo-finance127 (RapidAPI)',
        sourceUrl: 'https://rapidapi.com/manwilbahaa/api/yahoo-finance127',
        lastUpdated: new Date().toISOString(),
        provider: 'yahoo127',
      };
    }
  } catch (e) {}
  // If all fail, return null
  return null;
}
