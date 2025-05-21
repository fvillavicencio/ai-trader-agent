import axios from 'axios';

/**
 * Fetches SPY daily closes for the past N days from Yahoo Finance
 * Returns array of closes (most recent last)
 */
async function fetchSPYCloses(days = 250) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/SPY?interval=1d&range=${days}d`;
  const { data } = await axios.get(url);
  const chart = data.chart && data.chart.result && data.chart.result[0];
  if (!chart) throw new Error('Could not fetch SPY closes from Yahoo Finance');
  const close = chart.indicators.quote[0].close;
  return close;
}

/**
 * Computes the simple moving average for the last N closes
 */
function computeSMA(closes, period) {
  if (closes.length < period) throw new Error('Not enough closes');
  const sum = closes.slice(-period).reduce((a, b) => a + b, 0);
  return sum / period;
}

/**
 * Returns SPY 50-day and 200-day moving averages and latest close
 */
export async function getSPYMovingAverages() {
  const closes = await fetchSPYCloses(250);
  const latest = closes[closes.length - 1];
  const sma50 = computeSMA(closes, 50);
  const sma200 = computeSMA(closes, 200);
  return { latest, sma50, sma200 };
}
