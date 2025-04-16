import axios from 'axios';

/**
 * Fetches the latest S&P 500 index price and timestamp from Yahoo Finance (symbol: ^GSPC)
 * Returns: { price, lastUpdated, sourceName, sourceUrl }
 */
export async function getSP500IndexPrice() {
  const url = 'https://query1.finance.yahoo.com/v8/finance/chart/%5EGSPC?interval=1d&range=5d';
  const { data } = await axios.get(url);
  const chart = data.chart && data.chart.result && data.chart.result[0];
  if (!chart) throw new Error('Could not fetch S&P 500 price from Yahoo Finance');
  const close = chart.indicators.quote[0].close;
  const timestamp = chart.timestamp;
  if (!close || !timestamp) throw new Error('No price/timestamp data');
  const latestIdx = close.length - 1;
  return {
    price: close[latestIdx],
    lastUpdated: new Date(timestamp[latestIdx] * 1000).toISOString(),
    sourceName: 'Yahoo Finance',
    sourceUrl: 'https://finance.yahoo.com/quote/%5EGSPC/'
  };
}
