// test-lambda-client.js
// Simple Node.js client to test your deployed Lambda service

import fetch from 'node-fetch';
import dotenv from 'dotenv';
dotenv.config();

const url = process.env.LAMBDA_SERVICE_URL;
const apiKey = process.env.LAMBDA_API_KEY;

async function testLambda(mode = null) {
  try {
    // Append mode=test to URL if requested
    let testUrl = url;
    if (mode === 'test') {
      // Add mode=test as query param, handling existing query params
      testUrl += url.includes('?') ? '&mode=test' : '?mode=test';
    }
    const response = await fetch(testUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey
      }
    });
    const data = await response.json();
    console.log(`Lambda response${mode ? ' (mode=' + mode + ')' : ''}:`, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Error calling Lambda:', err);
  }
}

// Run normal test
testLambda();
// Run diagnostic test mode
testLambda('test');
