import axios from 'axios';
import * as cheerio from 'cheerio';

/**
 * Fetches the latest S&P 500 P/E ratio from multpl.com table (by month)
 * Returns an object: { value, sourceName, sourceUrl, lastUpdated }
 */
export async function getSP500PE() {
  try {
    const url = 'https://www.multpl.com/s-p-500-pe-ratio/table/by-month';
    const { data } = await axios.get(url);
    const $ = cheerio.load(data);
    const table = $('table');
    if (table.length === 0) {
      throw new Error('No table found');
    }
    const row = table.find('tbody tr').eq(1);
    const cell = row.find('td').eq(1).text();
    const dateCell = row.find('td').eq(0).text();
    const pe = cell.replace(/[^0-9.]/g, '').trim();
    const lastUpdated = dateCell.trim() || new Date().toISOString();
    if (!pe) throw new Error('Could not parse P/E from table');
    return {
      value: pe,
      sourceName: 'multpl.com',
      sourceUrl: url,
      lastUpdated
    };
  } catch (e) {
    throw new Error(`Failed to fetch S&P 500 P/E: ${e.message}`);
  }
}

/**
 * Placeholder for technical indicator (RSI, breadth, etc.)
 * TODO: Implement using Yahoo Finance or Finnhub API
 */
export async function getMarketPath() {
  // TODO: Implement real indicator
  return 'Not implemented';
}
