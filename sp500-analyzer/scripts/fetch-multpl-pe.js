// sp500-analyzer/scripts/fetch-multpl-pe.js
// Scrape S&P 500 P/E Ratio (monthly) from Multpl.com
// Usage: node scripts/fetch-multpl-pe.js

const axios = require('axios');
const cheerio = require('cheerio');

const MULTPL_URL = 'https://www.multpl.com/s-p-500-pe-ratio/table/by-month';

function parsePECell(cell) {
  // e.g., "23.45"
  const val = parseFloat(cell.replace(/[^\d.]/g, ''));
  return isNaN(val) ? null : val;
}

async function fetchMultplPE() {
  try {
    const { data } = await axios.get(MULTPL_URL, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; sp500-analyzer/1.0)'
      },
      timeout: 20000
    });
    const $ = cheerio.load(data);
    const rows = $('table#datatable tbody tr');
    const peData = [];
    rows.each((i, el) => {
      const tds = $(el).find('td');
      const date = $(tds[0]).text().trim();
      const pe = parsePECell($(tds[1]).text().trim());
      if (date && pe !== null) {
        peData.push({ date, pe });
      }
    });
    if (peData.length === 0) {
      console.log('No P/E data found on Multpl.com');
      return;
    }
    const current = peData[0];
    const avg5 = peData.length >= 60 ? (peData.slice(0, 60).reduce((a, b) => a + b.pe, 0) / 60) : null;
    const avg10 = peData.length >= 120 ? (peData.slice(0, 120).reduce((a, b) => a + b.pe, 0) / 120) : null;

    // Output in requested format
    console.log('S&P 500 Trailing P/E Ratio:');
    console.log(`  P/E: ${current.pe.toFixed(2)}`);
    console.log('  Source: Multpl.com');
    console.log('  URL: https://www.multpl.com/s-p-500-pe-ratio/table/by-month');
    console.log(`  Last Update: ${current.date}`);
    console.log();
    console.log('  Historical P/E Context:');
    console.log('  Current | 5-Year Avg | 10-Year Avg');
    console.log(`  ${current.pe.toFixed(2)} | ${avg5 !== null ? avg5.toFixed(2) : 'N/A'} | ${avg10 !== null ? avg10.toFixed(2) : 'N/A'}`);
  } catch (err) {
    console.error('Error fetching or parsing Multpl.com:', err.message);
    process.exit(1);
  }
}

fetchMultplPE();
