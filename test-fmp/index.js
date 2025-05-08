require('dotenv').config();
const axios = require('axios');

const FMP_API_KEY = process.env.FMP_API_KEY;
const YAHOO_API_KEY = process.env.YAHOO_FINANCE_API_KEY;
const BASE_URL = 'https://financialmodelingprep.com/api/v3';
const symbol = 'AAPL';

async function getFMPQuote() {
  const url = `${BASE_URL}/quote/${symbol}?apikey=${FMP_API_KEY}`;
  const response = await axios.get(url);
  return response.data[0];
}

async function getYahooFinanceData() {
  try {
    // Get quote data from Yahoo Finance API
    const quoteUrl = `https://apidojo-yahoo-finance-v1.p.rapidapi.com/market/v2/get-quotes?region=US&symbols=${symbol}`;
    const fundamentalsUrl = `https://apidojo-yahoo-finance-v1.p.rapidapi.com/stock/get-fundamentals?region=US&symbol=${symbol}&lang=en-US&modules=assetProfile%2CsummaryProfile%2CfundProfile`;

    const [quoteResponse, fundamentalsResponse] = await Promise.all([
      axios.get(quoteUrl, {
        headers: {
          'X-RapidAPI-Key': YAHOO_API_KEY,
          'X-RapidAPI-Host': 'apidojo-yahoo-finance-v1.p.rapidapi.com'
        }
      }),
      axios.get(fundamentalsUrl, {
        headers: {
          'X-RapidAPI-Key': YAHOO_API_KEY,
          'X-RapidAPI-Host': 'apidojo-yahoo-finance-v1.p.rapidapi.com'
        }
      })
    ]);

    const quoteData = quoteResponse.data.quoteResponse.result[0];
    const fundamentalsData = fundamentalsResponse.data.quoteSummary.result[0];

    const latestQuote = {
      regularMarketPrice: quoteData.regularMarketPrice,
      regularMarketChange: quoteData.regularMarketChange,
      regularMarketChangePercent: quoteData.regularMarketChangePercent,
      regularMarketVolume: quoteData.regularMarketVolume,
      postMarketPrice: quoteData.postMarketPrice,
      postMarketChange: quoteData.postMarketChange,
      postMarketChangePercent: quoteData.postMarketChangePercent,
      postMarketVolume: quoteData.postMarketVolume || 0,
      company: fundamentalsData.summaryProfile.longBusinessSummary,
      industry: fundamentalsData.summaryProfile.industry,
      sector: fundamentalsData.summaryProfile.sector
    };

    return latestQuote;
  } catch (error) {
    console.error('Error fetching Yahoo Finance data:', error.message);
    return null;
  }
}

async function main() {
  if (!FMP_API_KEY) {
    console.error('Error: FMP_API_KEY not found in .env file');
    process.exit(1);
  }

  if (!YAHOO_API_KEY) {
    console.error('Error: YAHOO_FINANCE_API_KEY not found in .env file');
    process.exit(1);
  }

  try {
    const [fmpQuote, yahooData] = await Promise.all([
      getFMPQuote(),
      getYahooFinanceData()
    ]);

    console.log('\n=== FMP API Data ===');
    console.log(`Price: $${fmpQuote.price.toFixed(2)}`);
    console.log(`Change: ${fmpQuote.change.toFixed(2)} (${fmpQuote.changesPercentage.toFixed(2)}%)`);
    console.log(`Volume: ${fmpQuote.volume.toLocaleString()}`);
    console.log(`Market Cap: $${(fmpQuote.marketCap / 1e9).toFixed(1)}B`);

    if (yahooData) {
      console.log('\n=== Yahoo Finance Data ===');
      console.log(`Regular Market Price: $${yahooData.regularMarketPrice.toFixed(2)}`);
      console.log(`Regular Market Change: ${yahooData.regularMarketChange.toFixed(2)} (${yahooData.regularMarketChangePercent.toFixed(2)}%)`);
      console.log(`Regular Market Volume: ${yahooData.regularMarketVolume.toLocaleString()}`);
      
      if (yahooData.postMarketPrice) {
        console.log('\n=== After-Hours Data (Yahoo Finance) ===');
        console.log(`After-Hours Price: $${yahooData.postMarketPrice.toFixed(2)}`);
        console.log(`After-Hours Change: ${yahooData.postMarketChange.toFixed(2)} (${yahooData.postMarketChangePercent.toFixed(2)}%)`);
        console.log(`After-Hours Volume: ${yahooData.postMarketVolume.toLocaleString()}`);
      } else {
        console.log('No after-hours data available from Yahoo Finance');
      }

      console.log('\n=== Company Information ===');
      console.log(`Company: ${yahooData.company}`);
      console.log(`Industry: ${yahooData.industry}`);
      console.log(`Sector: ${yahooData.sector}`);

      // Compare FMP and Yahoo Finance API results for after-hours trading data
      if (yahooData.postMarketPrice) {
        console.log('\n=== Comparison of After-Hours Data ===');
        console.log(`FMP Price: $${fmpQuote.price.toFixed(2)}`);
        console.log(`Yahoo Finance After-Hours Price: $${yahooData.postMarketPrice.toFixed(2)}`);
        console.log(`Difference: $${(yahooData.postMarketPrice - fmpQuote.price).toFixed(2)}`);
        console.log(`Percentage Difference: ${(100 * (yahooData.postMarketPrice - fmpQuote.price) / fmpQuote.price).toFixed(2)}%`);
      }
    }

  } catch (error) {
    console.error('Error:', error.message);
    console.error('Full error:', error.response?.data);
    process.exit(1);
  }
}

main();
