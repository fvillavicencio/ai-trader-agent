import dotenv from 'dotenv';
import { handler } from './lambda.js';

// Load environment variables
dotenv.config();

async function testLambda() {
  console.log('Testing Lambda function locally...');
  
  try {
    // Create a mock event similar to what API Gateway would send
    const mockEvent = {
      httpMethod: 'GET',
      path: '/',
      queryStringParameters: null,
      headers: {},
      body: null,
      isBase64Encoded: false,
      startTime: Date.now()
    };
    
    console.log('Calling Lambda handler...');
    const response = await handler(mockEvent);
    
    console.log('Lambda response status:', response.statusCode);
    
    if (response.statusCode === 200) {
      const responseBody = JSON.parse(response.body);
      
      // Check if forwardEstimates are present
      if (responseBody.forwardEstimates && responseBody.forwardEstimates.length > 0) {
        console.log('\nForward EPS Estimates from Lambda:');
        console.table(responseBody.forwardEstimates.map(est => ({
          Year: est.year,
          'Estimate Date': est.estimateDate,
          'Forward EPS': est.value !== undefined ? est.value : est.eps,
          Source: est.source,
          'Last Updated': est.lastUpdated
        })));
        
        // Calculate implied S&P 500 values using the same approach as the Lambda function
        const currentSPX = responseBody.sp500Index?.price || 5200;
        console.log(`\nImplied S&P 500 values (current: ~${currentSPX}):`);
        
        // S&P Global reports quarterly EPS values, so multiply by 4 to get annual EPS
        const quarterToAnnualMultiplier = 4;
        
        responseBody.forwardEstimates.forEach(est => {
          const epsValue = est.value !== undefined ? est.value : est.eps;
          const year = est.year || (est.estimateDate ? parseInt(est.estimateDate.split('/')[2]) : new Date().getFullYear());
          
          // Convert quarterly EPS to annual EPS
          const annualEps = epsValue * quarterToAnnualMultiplier;
          
          console.log(`\n${year} EPS: $${epsValue.toFixed(2)} (quarterly) → $${annualEps.toFixed(2)} (annual) (Source: ${est.source})`);
          console.log('  PE Multiple | Target Value | % Change');
          console.log('  ------------------------------------');
          [15, 17, 18, 19, 20].forEach(multiple => {
            const target = annualEps * multiple;
            const percentChange = ((target - currentSPX) / currentSPX * 100).toFixed(1);
            console.log(`  ${multiple}x         | $${target.toFixed(2)}      | ${percentChange}%`);
          });
        });
      } else {
        console.log('No forward EPS estimates found in Lambda response');
      }
    } else {
      console.error('Lambda returned error:', response.body);
    }
    
  } catch (error) {
    console.error('Error testing Lambda:', error);
  }
}

testLambda();
