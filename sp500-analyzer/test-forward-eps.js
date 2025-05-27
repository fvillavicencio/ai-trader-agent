import dotenv from 'dotenv';
import { getForwardEpsEstimates } from './services/forwardPE.js';

// Load environment variables
dotenv.config();

async function testForwardEPS() {
  console.log('Testing forward EPS estimates retrieval...');
  console.log('Alpha Vantage API Key present:', process.env.ALPHA_VANTAGE_API_KEY ? 'Yes' : 'No');
  
  try {
    const startTime = Date.now();
    console.log('Fetching forward EPS estimates...');
    
    const estimates = await getForwardEpsEstimates();
    
    const endTime = Date.now();
    console.log(`Retrieval completed in ${endTime - startTime}ms`);
    
    if (!estimates || estimates.length === 0) {
      console.error('No estimates returned!');
      return;
    }
    
    console.log('Forward EPS Estimates:');
    console.table(estimates.map(est => ({
      Year: est.year,
      'Estimate Date': est.estimateDate,
      'Forward EPS': est.value !== undefined ? est.value : est.eps,
      Source: est.source,
      'Last Updated': est.lastUpdated
    })));
    
    // Calculate implied S&P 500 values
    const currentSPX = 5200; // Approximate current S&P 500 value
    console.log(`\nImplied S&P 500 values (current: ~${currentSPX}):`);
    
    estimates.forEach(est => {
      const epsValue = est.value !== undefined ? est.value : est.eps;
      const year = est.year || (est.estimateDate ? parseInt(est.estimateDate.split('/')[2]) : new Date().getFullYear());
      
      console.log(`\n${year} EPS: $${epsValue.toFixed(2)} (Source: ${est.source})`);
      console.log('  PE Multiple | Target Value | % Change');
      console.log('  ------------------------------------');
      [15, 17, 18, 19, 20].forEach(multiple => {
        const targetValue = epsValue * multiple;
        const percentChange = ((targetValue - currentSPX) / currentSPX * 100).toFixed(1);
        console.log(`  ${multiple}x         | $${targetValue.toFixed(2)}      | ${percentChange}%`);
      });
    });
    
    // Test the output format for the Lambda function
    console.log('\nTesting Lambda function output format:');
    const lambdaCompatibleOutput = estimates.map(est => {
      // Ensure we maintain the same format expected by the Lambda function
      return {
        estimateDate: est.estimateDate,
        value: est.value !== undefined ? est.value : est.eps,
        source: est.source,
        sourceUrl: est.sourceUrl || est.url,
        lastUpdated: est.lastUpdated,
        year: est.year
      };
    });
    console.log(JSON.stringify(lambdaCompatibleOutput, null, 2));
    
  } catch (error) {
    console.error('Error testing forward EPS:', error);
  }
}

testForwardEPS();
