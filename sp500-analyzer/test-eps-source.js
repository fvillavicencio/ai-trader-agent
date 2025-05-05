import { getForwardEpsEstimates } from './services/forwardPE.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function testEpsSource() {
  try {
    console.log('Fetching forward EPS estimates to analyze the source data...');
    const forwardEpsEstimates = await getForwardEpsEstimates();
    
    console.log('\nForward EPS Estimates:', JSON.stringify(forwardEpsEstimates, null, 2));
    
    // Check if we're getting quarterly or annual data
    console.log('\nAnalyzing S&P Global data format:');
    
    // If these are quarterly estimates, we'd expect to see 4 consecutive quarters for each year
    // Let's check the Excel parsing code in forwardPE.js to understand how the data is interpreted
    console.log('\nIf multiplied by 4 (assuming quarterly data):');
    forwardEpsEstimates.forEach(est => {
      console.log(`${est.year || est.estimateDate}: $${est.value} × 4 = $${(est.value * 4).toFixed(2)}`);
    });
    
    // Compare with ChatGPT's suggested values
    console.log('\nComparison with ChatGPT suggested annual values:');
    console.log('2025 EPS from S&P Global × 4: $' + (forwardEpsEstimates.find(e => e.year === 2025 || e.estimateDate?.includes('2025'))?.value * 4).toFixed(2));
    console.log('2025 EPS suggested by ChatGPT: $266.37');
    console.log('2026 EPS from S&P Global × 4: $' + (forwardEpsEstimates.find(e => e.year === 2026 || e.estimateDate?.includes('2026'))?.value * 4).toFixed(2));
    console.log('2026 EPS suggested by ChatGPT: $285.00');
  } catch (error) {
    console.error('Error testing EPS source:', error);
  }
}

testEpsSource();
