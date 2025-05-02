// Test script for yahoo-finance127 RapidAPI endpoint
import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
const RAPIDAPI_HOST = 'yahoo-finance127.p.rapidapi.com';

async function testYahooFinance127() {
  const options = {
    method: 'GET',
    url: `https://${RAPIDAPI_HOST}/stock/v2/get-summary`,
    params: { symbol: 'SPY' },
    headers: {
      'X-RapidAPI-Key': RAPIDAPI_KEY,
      'X-RapidAPI-Host': RAPIDAPI_HOST,
    },
  };
  try {
    const response = await axios.request(options);
    const data = response.data;
    // Try to extract TTM EPS and Forward EPS if available
    const summaryDetail = data.summaryDetail || {};
    const defaultKeyStatistics = data.defaultKeyStatistics || {};
    const financialData = data.financialData || {};
    const epsTTM = defaultKeyStatistics.trailingEps || summaryDetail.trailingEps || financialData.trailingEps;
    const epsForward = defaultKeyStatistics.forwardEps || summaryDetail.forwardEps || financialData.forwardEps;
    const peRatio = summaryDetail.trailingPE || financialData.trailingPE || defaultKeyStatistics.trailingPE;
    console.log('SPY EPS (TTM):', epsTTM);
    console.log('SPY EPS (Forward):', epsForward);
    console.log('SPY PE Ratio:', peRatio);
    console.log('Full response:', JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Error calling yahoo-finance127:', err?.response?.data || err.message);
  }
}

testYahooFinance127();
