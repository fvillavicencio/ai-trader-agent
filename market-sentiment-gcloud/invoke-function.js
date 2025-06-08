require('dotenv').config();
const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');

const API_KEY = process.env.MARKET_SENTIMENT_API_KEY;
const FUNCTION_URL = 'https://us-central1-peppy-cosmos-461901-k8.cloudfunctions.net/marketSentimentAPI';
const OUTPUT_FILE = path.join(__dirname, 'market-sentiment-output.json');

async function invokeMarketSentimentAPI(query) {
  if (!API_KEY) {
    console.error('Error: MARKET_SENTIMENT_API_KEY is not defined in your .env file.');
    process.exit(1);
  }

  const url = `${FUNCTION_URL}?query=${encodeURIComponent(query)}`;

  console.log(`Invoking function with query: "${query}"`);
  console.log(`URL: ${url}`);

  try {
    const response = await axios.get(url, {
      headers: {
        'x-api-key': API_KEY
      },
      timeout: 70000 // 70 seconds timeout, matching your curl command
    });

    console.log('Function invoked successfully.');
    console.log('Response Status:', response.status);
    if (response.data && response.data.overallSentiment) {
      console.log('Overall Sentiment from response:', response.data.overallSentiment);
    } else {
      console.log('Overall Sentiment not found, logging first 100 chars of data:', String(response.data).substring(0,100));
    }
    try {
      await fs.writeFile(OUTPUT_FILE, JSON.stringify(response.data, null, 2));
      console.log(`Response saved to ${OUTPUT_FILE}`);
    } catch (writeError) {
      console.error(`Error saving response to file: ${writeError.message}`);
    }

    return response.data;

  } catch (error) {
    console.error('Error invoking function:');
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      console.error('Status:', error.response.status);
      console.error('Headers:', JSON.stringify(error.response.headers, null, 2));
      console.error('Data:', JSON.stringify(error.response.data, null, 2));
    } else if (error.request) {
      // The request was made but no response was received
      console.error('Request Error:', error.request);
      console.error('Message:', error.message);
    } else {
      // Something happened in setting up the request that triggered an Error
      console.error('Error Message:', error.message);
    }
    console.error('Config:', JSON.stringify(error.config, null, 2));
    process.exit(1);
  }
}

// Get query from command line arguments, or use a default
const queryArg = process.argv[2];
const queryToUse = queryArg || 'latest market trends';

// IIFE to ensure the main async operation completes before the script exits.
(async () => {
  try {
    await invokeMarketSentimentAPI(queryToUse);
  } catch (error) {
    // This catch block will likely not be reached if invokeMarketSentimentAPI
    // handles its own errors and calls process.exit(1).
    // It's a safety net for unhandled rejections from invokeMarketSentimentAPI
    // or other errors within this async IIFE.
    console.error('Unhandled error in script execution wrapper:', error.message);
    // Ensure process exits with error if not already handled by invokeMarketSentimentAPI
    if (process.exitCode === undefined || process.exitCode === 0) {
        process.exitCode = 1;
    }
  }
})().catch(err => {
  console.error('CRITICAL: Unhandled promise rejection or error at top level:', err);
  if (process.exitCode === undefined || process.exitCode === 0) {
      process.exitCode = 1;
  }
});
