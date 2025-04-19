// test-api.js
const axios = require('axios');
const dotenv = require('dotenv');
dotenv.config();

const LAMBDA_SERVICE_URL = process.env.LAMBDA_SERVICE_URL;
const LAMBDA_API_KEY = process.env.LAMBDA_API_KEY;

if (!LAMBDA_SERVICE_URL) {
  console.error('LAMBDA_SERVICE_URL is not set in .env');
  process.exit(1);
}

const headers = {};
if (LAMBDA_API_KEY) {
  headers['x-api-key'] = LAMBDA_API_KEY;
}

async function testLambda() {
  try {
    const response = await axios.post(LAMBDA_SERVICE_URL, {
      action: 'analyzeSP500'
    }, { headers });
    console.log('Lambda Response:', JSON.stringify(response.data, null, 2));
  } catch (error) {
    if (error.response) {
      console.error('Lambda Error:', error.response.status, error.response.data);
    } else {
      console.error('Request Error:', error.message);
    }
  }
}

testLambda();
