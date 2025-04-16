import axios from 'axios';
import * as cheerio from 'cheerio';

/**
 * Fetches the latest S&P 500 earnings per share (EPS) from multpl.com (by month table)
 * Returns an object: { value, sourceName, sourceUrl, lastUpdated }
 */
export async function getSP500Earnings() {
  try {
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
  } catch (e) {
    throw new Error(`Failed to fetch S&P 500 earnings: ${e.message}`);
  }
}
