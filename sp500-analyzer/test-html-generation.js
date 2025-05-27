import dotenv from 'dotenv';
import { getForwardEpsEstimates } from './services/forwardPE.js';

// Helper functions since they're not exported from index.js
function formatTimestamp(timestamp) {
  if (!timestamp) return '';
  return timestamp;
}

function formatUSD(value) {
  if (isNaN(value)) return '';
  return '$' + value;
}

// Load environment variables
dotenv.config();

async function testForwardEpsCalculations() {
  console.log('Testing forward EPS estimates and S&P 500 target calculations...');
  
  try {
    // Get forward EPS estimates
    console.log('Fetching forward EPS estimates...');
    const forwardEpsEstimates = await getForwardEpsEstimates();
    
    console.log('\nForward EPS Estimates:');
    console.table(forwardEpsEstimates.map(est => ({
      Year: est.year,
      'Estimate Date': est.estimateDate,
      'Forward EPS': est.value,
      Source: est.source,
      'Source URL': est.sourceUrl
    })));
    
    // Calculate and display the implied S&P 500 values manually
    console.log('\nCalculated implied S&P 500 values:');
    const multiples = [15, 17, 18, 19, 20];
    const currentIndex = 5672.86; // Current S&P 500 level
    const scalingFactor = 5; // Same as in htmlForwardPETable
    
    forwardEpsEstimates.forEach(est => {
      const epsValue = est.value;
      console.log(`\n${est.year} EPS: $${epsValue.toFixed(2)} (Source: ${est.source})`);
      console.log('  PE Multiple | Target Value | % Change');
      console.log('  ------------------------------------');
      multiples.forEach(multiple => {
        const target = epsValue * multiple * scalingFactor;
        const percentChange = ((target - currentIndex) / currentIndex * 100).toFixed(1);
        console.log(`  ${multiple}x         | $${target.toFixed(2)}      | ${percentChange}%`);
      });
    });
    
  } catch (error) {
    console.error('Error testing forward EPS calculations:', error);
  }
}

testForwardEpsCalculations();
