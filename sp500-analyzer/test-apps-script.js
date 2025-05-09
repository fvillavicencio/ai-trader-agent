import dotenv from 'dotenv';
import axios from 'axios';

// Load environment variables
dotenv.config();

async function testAppsScriptFlow() {
  console.log('Testing SP500Analyzer Apps Script flow...');
  
  try {
    // Get the Lambda service URL and API key from environment variables
    const serviceUrl = process.env.LAMBDA_SERVICE_URL;
    const apiKey = process.env.LAMBDA_API_KEY;
    
    if (!serviceUrl || !apiKey) {
      throw new Error('Missing LAMBDA_SERVICE_URL or LAMBDA_API_KEY in .env file');
    }
    
    console.log(`Calling Lambda service at: ${serviceUrl}`);
    
    // Make the request exactly as Apps Script does
    const response = await axios.post(serviceUrl, {}, {
      headers: {
        'x-api-key': apiKey
      }
    });
    
    console.log('\n=== Raw JSON ===');
    console.log(JSON.stringify(response.data, null, 2));

    // Try parsing the response like Apps Script does
    let parsedData;
    try {
      if (typeof response.data === 'string') {
        parsedData = JSON.parse(response.data);
      } else if (response.data.body) {
        parsedData = JSON.parse(response.data.body);
      } else {
        parsedData = response.data;
      }
      
      console.log('\n=== Parsed Data Keys ===');
      console.log(Object.keys(parsedData));
      
      // Check specific data points
      if (parsedData.forwardEstimates) {
        console.log('\n=== Forward Estimates ===');
        console.table(parsedData.forwardEstimates);
      }
      
      if (parsedData.sp500Index) {
        console.log('\n=== S&P 500 Index ===');
        console.log(parsedData.sp500Index);
      }
      
    } catch (parseError) {
      console.error('Failed to parse response:', parseError);
      console.log('Raw response data:', response.data);
    }
    
  } catch (err) {
    console.error('Error:', err.message);
    if (err.response) {
      console.error('Response data:', err.response.data);
      console.error('Response status:', err.response.status);
    }
  }
}

testAppsScriptFlow();
