// test-api.js
const axios = require('axios');
require('dotenv').config();

async function testAPI() {
  const url = process.env.LAMBDA_SERVICE_URL;
  const apiKey = process.env.LAMBDA_API_KEY;
  try {
    const response = await axios.post(url, {}, {
      headers: apiKey ? { 'x-api-key': apiKey } : {}
    });
    console.log('Status:', response.status);
    console.log('Data:', JSON.stringify(response.data, null, 2));
  } catch (err) {
    if (err.response) {
      console.error('Error response:', err.response.status, err.response.data);
    } else {
      console.error('Error:', err.message);
    }
  }
}

testAPI();
