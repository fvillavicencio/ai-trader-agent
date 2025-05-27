// Unified S&P 500 (SPY) EPS (TTM) and P/E retrieval script with cascading fallbacks
// Attempts Yahoo Finance (yahoo-finance15), then yahu-finance2, then falls back to S&P Global and multpl.com

require('dotenv').config();
const axios = require('axios');
const cheerio = require('cheerio');

const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;

if (!RAPIDAPI_KEY) {
  console.error('Error: RAPIDAPI_KEY not found in environment variables.');
  process.exit(1);
}

async function fetchFromYahoo15() {
  const RAPIDAPI_HOST = 'yahoo-finance15.p.rapidapi.com';
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

async function fetchFromYahu2() {
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
  if (!price || !pe || !eps) throw new Error('Missing EPS/PE/Price from yahu-finance2');
  return {
    eps,
    pe,
    price,
    sourceName: 'yahu-finance2 (RapidAPI)',
    sourceUrl: 'https://rapidapi.com/tonyapi9892/api/yahu-finance2',
    lastUpdated: new Date().toISOString(),
  };
}

async function fetchFromSPGlobalOrMultpl() {
  // Try S&P Global first
  try {
    const url = 'https://www.spglobal.com/spdji/en/indices/equity/sp-500/#overview';
    const { data } = await axios.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    const $ = cheerio.load(data);
    let eps = null, lastUpdated = null;
    $(".index-data-table__body__row").each((i, row) => {
      const label = $(row).find('.index-data-table__body__cell--label').text().trim();
      if (/Earnings Per Share/i.test(label)) {
        const value = $(row).find('.index-data-table__body__cell--value').text().replace(/[$,]/g, '').trim();
        if (value) eps = value;
      }
    });
    $(".index-data-table__disclaimer, .index-data-table__footer, .index-data-table__last-updated").each((i, el) => {
      const text = $(el).text();
      const d = /As of:?\s*([A-Za-z]{3,9})\s*([0-9]{1,2}),?\s*([0-9]{4})/i.exec(text);
      if (d) {
        const mon = d[1].slice(0,3);
        const day = d[2];
        const year = d[3];
        const monthNum = {Jan:0,Feb:1,Mar:2,Apr:3,May:4,Jun:5,Jul:6,Aug:7,Sep:8,Oct:9,Nov:10,Dec:11}[mon];
        if (monthNum !== undefined) {
          lastUpdated = new Date(Date.UTC(parseInt(year), monthNum, parseInt(day))).toISOString();
        }
      }
    });
    if (eps) {
      return {
        value: eps,
        sourceName: 'S&P Global',
        sourceUrl: url,
        lastUpdated: lastUpdated || new Date().toISOString()
      };
    }
  } catch (e) {
    // If forbidden or fails, fall back
  }
  // Fallback: multpl.com
  const url = 'https://www.multpl.com/s-p-500-earnings/table/by-month';
  const { data } = await axios.get(url);
  const $ = cheerio.load(data);
  const table = $('table');
  if (table.length === 0) {
    throw new Error('No table found');
  }
  const row = table.find('tbody tr').eq(1);
  const cell = row.find('td').eq(1).text();
  const dateCell = row.find('td').eq(0).text();
  const earnings = cell.replace(/[^0-9.]/g, '').trim();
  const lastUpdated = dateCell.trim() || new Date().toISOString();
  if (!earnings) throw new Error('Could not parse earnings from table');
  return {
    value: earnings,
    sourceName: 'multpl.com',
    sourceUrl: url,
    lastUpdated
  };
}

async function getSP500Fundamentals() {
  // Try yahoo-finance15
  try {
    const yahoo15 = await fetchFromYahoo15();
    return { ...yahoo15, provider: 'yahoo15' };
  } catch (e) {
    console.warn('[WARN] yahoo-finance15 failed:', e.message);
  }
  // Try yahu-finance2
  try {
    const yahu2 = await fetchFromYahu2();
    return { ...yahu2, provider: 'yahu2' };
  } catch (e) {
    console.warn('[WARN] yahu-finance2 failed:', e.message);
  }
  // Fallback to S&P Global or multpl.com
  try {
    const fallback = await fetchFromSPGlobalOrMultpl();
    return { ...fallback, provider: fallback.sourceName };
  } catch (e) {
    console.error('[ERROR] All providers failed:', e.message);
    throw new Error('All S&P 500 EPS sources failed');
  }
}

(async () => {
  try {
    const result = await getSP500Fundamentals();
    console.log('=== S&P 500 (SPY) EPS (TTM) & P/E (Cascading) ===');
    if (result.price) console.log(`Price: $${result.price}`);
    if (result.pe) console.log(`TTM P/E: ${result.pe}`);
    if (result.eps) console.log(`TTM EPS: $${result.eps}`);
    if (result.value) console.log(`TTM EPS (fallback): $${result.value}`);
    console.log(`Source: ${result.sourceName || result.provider}`);
    console.log(`Last Updated: ${result.lastUpdated}`);
    if (result.sourceUrl) console.log(`Source URL: ${result.sourceUrl}`);
  } catch (err) {
    console.error('Failed to fetch S&P 500 EPS:', err.message);
    process.exit(1);
  }
})();
