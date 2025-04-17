import axios from 'axios';
import * as cheerio from 'cheerio';

/**
 * Attempts to fetch the latest S&P 500 EPS (TTM) from S&P Global's public site.
 * Falls back to multpl.com if S&P Global is unavailable.
 * Returns: { value, sourceName, sourceUrl, lastUpdated }
 */
export async function getSP500Earnings() {
  // Try S&P Global first
  try {
    const url = 'https://www.spglobal.com/spdji/en/indices/equity/sp-500/#overview';
    const { data } = await axios.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    const $ = cheerio.load(data);
    // Use precise selectors for the S&P Global EPS (TTM)
    let eps = null, lastUpdated = null;
    // EPS: Find the row labeled 'Earnings Per Share (TTM)' in the main data table
    $(".index-data-table__body__row").each((i, row) => {
      const label = $(row).find('.index-data-table__body__cell--label').text().trim();
      if (/Earnings Per Share/i.test(label)) {
        const value = $(row).find('.index-data-table__body__cell--value').text().replace(/[$,]/g, '').trim();
        if (value) eps = value;
      }
    });
    // Date: Find the "As of" date in the disclaimer/footer
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
