import dotenv from 'dotenv';
import axios from 'axios';

// Load environment variables
dotenv.config();

async function testDeployedLambda() {
  console.log('Testing deployed Lambda function...');
  
  try {
    // Get the Lambda service URL and API key from environment variables
    const serviceUrl = process.env.LAMBDA_SERVICE_URL;
    const apiKey = process.env.LAMBDA_API_KEY;
    
    if (!serviceUrl || !apiKey) {
      throw new Error('Missing LAMBDA_SERVICE_URL or LAMBDA_API_KEY in .env file');
    }
    
    console.log(`Calling Lambda service at: ${serviceUrl}`);
    
    // Call the Lambda function
    console.log('Making request to:', serviceUrl);
    const response = await axios.post(serviceUrl, {}, {
      headers: {
        'x-api-key': apiKey
      }
    });
    
    if (response.status !== 200) {
      throw new Error(`Lambda service error: ${response.status} - ${response.statusText}`);
    }
    
    // Log raw response
    console.log('Raw response:', response.data);

    // Handle the nested response structure
    const lambdaResponse = response.data;
    console.log('\nLambda response status code:', lambdaResponse.statusCode);
    
    // Parse the body which is a JSON string
    const data = JSON.parse(lambdaResponse.body);
    
    console.log('\nParsed response keys:', Object.keys(data));
    
    // Check if forwardEstimates are present
    if (data.forwardEstimates && Array.isArray(data.forwardEstimates)) {
      console.log('\nForward EPS Estimates from deployed Lambda:');
      console.table(data.forwardEstimates.map(est => ({
        Year: est.year,
        'Estimate Date': est.estimateDate,
        'Forward EPS': est.eps || est.value,
        Source: est.source,
        'Last Updated': est.lastUpdated
      })));
      
      // Calculate implied S&P 500 values
      const currentSPX = data.sp500Index?.price || 5200;
      console.log(`\nImplied S&P 500 values (current: ~${currentSPX}):`);
      
      data.forwardEstimates.forEach(est => {
        const epsValue = est.eps || est.value;
        const year = est.year || (est.estimateDate ? parseInt(est.estimateDate.split('/')[2]) : new Date().getFullYear());
        
        console.log(`\n${year} EPS: $${epsValue.toFixed(2)} (Source: ${est.source})`);
        console.log('  PE Multiple | Target Value | % Change');
        console.log('  ------------------------------------');
        [15, 17, 18, 19, 20].forEach(multiple => {
          const target = epsValue * multiple;
          const percentChange = ((target - currentSPX) / currentSPX * 100).toFixed(1);
          console.log(`  ${multiple}x         | $${target.toFixed(2)}      | ${percentChange}%`);
        });
      });
    } else {
      console.log('No forward EPS estimates found in Lambda response');
    }
    
  } catch (error) {
    console.error('Error testing deployed Lambda:', error);
  }
}

testDeployedLambda();
