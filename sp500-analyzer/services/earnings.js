import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();
import { getSP500EpsAndPeFromYahoo15 } from './yahoo15.js';

/**
 * Attempts to fetch the latest S&P 500 EPS (TTM) and P/E with cascading fallbacks:
 * 1. yahoo-finance15 (RapidAPI)
 * 2. yahu-finance2 (RapidAPI)
 * 3. yahoo-finance127 (RapidAPI)
 * Returns: { eps, pe, price, value, sourceName, sourceUrl, lastUpdated, provider }
 */
// Helper: Fetch historical P/E averages from Multpl.com (monthly), fallback to yearly if monthly fails
async function getHistoricalPEAverages() {
  const axios = (await import('axios')).default;
  // Try to scrape monthly table first for more granular averages
  try {
    const cheerio = (await import('cheerio')).default || (await import('cheerio'));
    const url = 'https://www.multpl.com/s-p-500-pe-ratio/table/by-month';
    const { data } = await axios.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; sp500-analyzer/1.0)' } });
    const $ = cheerio.load(data);
    const rows = $('table#datatable tbody tr');
    const peData = [];
    rows.each((i, el) => {
      const tds = $(el).find('td');
      const date = $(tds[0]).text().trim();
      const pe = parseFloat($(tds[1]).text().replace(/[^\d.]/g, ''));
      if (date && !isNaN(pe)) {
        peData.push({ date, pe });
      }
    });
    if (peData.length === 0) throw new Error('No P/E data found on Multpl.com monthly table');
    const current = peData[0];
    const avg5 = peData.length >= 60 ? (peData.slice(0, 60).reduce((a, b) => a + b.pe, 0) / 60) : null;
    const avg10 = peData.length >= 120 ? (peData.slice(0, 120).reduce((a, b) => a + b.pe, 0) / 120) : null;
    return {
      current: current.pe ? Number(current.pe.toFixed(2)) : null,
      avg5: avg5 ? Number(avg5.toFixed(2)) : null,
      avg10: avg10 ? Number(avg10.toFixed(2)) : null,
      sourceName: 'multpl.com',
      sourceUrl: url,
      lastUpdated: current.date,
    };
  } catch (err) {
    console.error('[getHistoricalPEAverages] Multpl.com monthly scrape error:', err.message);
    // Fallback: scrape yearly table
    try {
      const cheerio = (await import('cheerio')).default || (await import('cheerio'));
      const url = 'https://www.multpl.com/s-p-500-pe-ratio/table/by-year';
      const { data } = await axios.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; sp500-analyzer/1.0)' } });
      const $ = cheerio.load(data);
      const rows = $('table#datatable tbody tr');
      const peByYear = [];
      rows.each((i, row) => {
        const year = parseInt($(row).find('td').eq(0).text().trim(), 10);
        const pe = parseFloat($(row).find('td').eq(1).text().trim());
        if (!isNaN(year) && !isNaN(pe)) {
          peByYear.push({ year, pe });
        }
      });
      const currentYear = new Date().getFullYear();
      const pe5 = peByYear.filter(r => r.year > currentYear - 5).map(r => r.pe);
      const pe10 = peByYear.filter(r => r.year > currentYear - 10).map(r => r.pe);
      const avg5 = pe5.length ? pe5.reduce((a, b) => a + b, 0) / pe5.length : null;
      const avg10 = pe10.length ? pe10.reduce((a, b) => a + b, 0) / pe10.length : null;
      return {
        current: peByYear[0] ? Number(peByYear[0].pe.toFixed(2)) : null,
        avg5: avg5 ? Number(avg5.toFixed(2)) : null,
        avg10: avg10 ? Number(avg10.toFixed(2)) : null,
        sourceName: 'multpl.com',
        sourceUrl: url,
        lastUpdated: peByYear[0] ? String(peByYear[0].year) : '',
      };
    } catch (fallbackErr) {
      console.error('[getHistoricalPEAverages] Fallback yearly scrape error:', fallbackErr.message);
      return { current: null, avg5: null, avg10: null, sourceName: 'multpl.com', sourceUrl: 'https://www.multpl.com/s-p-500-pe-ratio/', lastUpdated: new Date().toISOString() };
    }
  }
}

export async function getSP500Earnings() {
  try {
    // Try yahoo-finance15 primary API first
    try {
      const yahoo15 = await getSP500EpsAndPeFromYahoo15();
      if (yahoo15 && yahoo15.eps && yahoo15.pe && yahoo15.price) {
        // Fetch historical P/E averages
        const history = await getHistoricalPEAverages();
        return {
          eps: yahoo15.eps,
          pe: yahoo15.pe,
          price: yahoo15.price,
          sourceName: yahoo15.sourceName,
          sourceUrl: yahoo15.sourceUrl,
          lastUpdated: yahoo15.lastUpdated,
          provider: 'yahoo15',
          history, // { avg5, avg10, ... }
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
        const history = await getHistoricalPEAverages();
        return {
          eps,
          pe,
          price,
          sourceName: 'yahu-finance2 (RapidAPI)',
          sourceUrl: 'https://rapidapi.com/tonyapi9892/api/yahu-finance2',
          lastUpdated: new Date().toISOString(),
          provider: 'yahu2',
          history,
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
        const history = await getHistoricalPEAverages();
        return {
          eps,
          pe,
          price,
          sourceName: 'yahoo-finance127 (RapidAPI)',
          sourceUrl: 'https://rapidapi.com/manwilbahaa/api/yahoo-finance127',
          lastUpdated: new Date().toISOString(),
          provider: 'yahoo127',
          history,
        };
      }
    } catch (e) {}
    // If all fail, return null
    return null;
  } catch (err) {
    console.error('[getSP500Earnings] Error:', err);
    return { eps: null, pe: null, price: null, value: null, sourceName: 'N/A', sourceUrl: '', lastUpdated: new Date().toISOString(), provider: 'N/A' };
  }
}
