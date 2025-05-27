/**
 * Test script to check feasibility of scraping S&P 500 Forward EPS from YCharts.
 * Usage:
 *   1. npm install axios cheerio
 *   2. node scripts/test-ycharts-forward-eps.js
 */

import axios from 'axios';
import * as cheerio from 'cheerio';

const YCHARTS_URL = 'https://ycharts.com/indicators/sp_500_earnings_per_share_forward_estimate';

async function fetchYChartsForwardEPS() {
  try {
    const { data } = await axios.get(YCHARTS_URL, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      timeout: 20000,
    });
    const $ = cheerio.load(data);
    // Try to find the most recent value in the indicator summary panel
    let eps = null, date = null;
    // Try the main indicator value (often in .key-stat-title + .key-stat-info)
    const stat = $('.key-stat-title:contains("Forward Estimate")').closest('.key-stat-container');
    if (stat.length) {
      eps = stat.find('.key-stat-info').first().text().replace(/[$,]/g, '').trim();
      date = stat.find('.key-stat-date').first().text().trim();
    }
    // Fallback: try to find value in the historical data table
    if (!eps) {
      const table = $('#historical-data-table');
      if (table.length) {
        const row = table.find('tbody tr').first();
        eps = row.find('td').eq(1).text().replace(/[$,]/g, '').trim();
        date = row.find('td').eq(0).text().trim();
      }
    }
    if (!eps) throw new Error('Could not find Forward EPS value on YCharts');
    return { eps, date };
  } catch (err) {
    throw new Error(`YCharts scrape failed: ${err.message}`);
  }
}

(async () => {
  try {
    const { eps, date } = await fetchYChartsForwardEPS();
    console.log(`YCharts S&P 500 Forward EPS: $${eps} (as of ${date})`);
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
})();
