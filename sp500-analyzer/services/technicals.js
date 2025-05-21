import axios from 'axios';

const TRADIER_BASE_URL = 'https://api.tradier.com/v1/markets/history';

/**
 * Fetches SPY daily closes for the past N days from Tradier
 * @param {number} days Number of days (default 20)
 * @returns {Promise<number[]>} Array of closing prices (most recent last)
 */
async function fetchSPYCloses(days = 20) {
  const TRADIER_API_KEY = process.env.TRADIER_API_KEY;
  if (!TRADIER_API_KEY) throw new Error('TRADIER_API_KEY is not set in .env');
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - days * 1.5); // pad for weekends/holidays
  const params = {
    symbol: 'SPY',
    interval: 'daily',
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10)
  };
  const response = await axios.get(TRADIER_BASE_URL, {
    params,
    headers: {
      Authorization: `Bearer ${TRADIER_API_KEY}`,
      Accept: 'application/json'
    }
  });
  const history = response.data && response.data.history && response.data.history.day;
  if (!history || !Array.isArray(history) || history.length < days) throw new Error('Not enough price data for RSI');
  // Sort by date ascending
  const closes = history.map(d => d.close).slice(-days);
  return closes;
}

/**
 * Computes the 14-day RSI from an array of closes
 * @param {number[]} closes
 * @returns {number} RSI value
 */
function computeRSI(closes) {
  if (closes.length < 15) throw new Error('Need at least 15 closes for RSI');
  let gains = 0, losses = 0;
  for (let i = closes.length - 14; i < closes.length; i++) {
    const change = closes[i] - closes[i - 1];
    if (change > 0) gains += change; else losses -= change;
  }
  const avgGain = gains / 14;
  const avgLoss = losses / 14;
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - (100 / (1 + rs));
}

/**
 * Returns a short interpretation of the market path (RSI-based)
 */
export async function getMarketPath() {
  try {
    const closes = await fetchSPYCloses(15);
    const rsi = computeRSI(closes);
    const now = new Date().toISOString();
    let value;
    if (rsi > 70) value = `Overbought (RSI=${rsi.toFixed(1)}) - Path: Down`;
    else if (rsi < 30) value = `Oversold (RSI=${rsi.toFixed(1)}) - Path: Up`;
    else value = `Neutral (RSI=${rsi.toFixed(1)})`;
    return {
      value,
      rsi,
      sourceName: 'Tradier (RSI)',
      sourceUrl: 'https://developer.tradier.com/documentation/markets/get-timesales',
      lastUpdated: now
    };
  } catch (err) {
    console.error('[getMarketPath] Error:', err);
    return { 
      value: `Could not determine market path: ${err.message}`,
      rsi: null,
      sourceName: 'Tradier (RSI)',
      sourceUrl: 'https://developer.tradier.com/documentation/markets/get-timesales',
      lastUpdated: new Date().toISOString() 
    };
  }
}
