import { getDirectSP500EPS, estimateSP500EPS } from './services/directEPS.js';
import { getSP500Earnings } from './services/earnings.js';
import fs from 'fs';

/**
 * Test script to verify the correct handling of TTM EPS values
 */
async function testTTMEPS() {
  console.log('Testing TTM EPS handling for S&P 500...');
  
  try {
    // First, get the direct EPS value
    console.log('\nAttempting to retrieve direct S&P 500 EPS...');
    const directEPS = await getDirectSP500EPS();
    
    if (directEPS && directEPS.eps) {
      console.log('\n✅ Successfully retrieved direct S&P 500 EPS:');
      console.log('---------------------------------------------');
      console.log('EPS Value:', directEPS.eps.toFixed(2));
      console.log('Source:', directEPS.sourceName);
      
      if (directEPS.isAdjusted) {
        console.log('Adjustment Method:', directEPS.adjustmentMethod);
      }
      
      // Validate the EPS value against the expected range
      if (directEPS.eps >= 200 && directEPS.eps <= 250) {
        console.log('\n✅ EPS value is within the expected TTM range ($200-$250)');
      } else {
        console.log('\n⚠️ EPS value is outside the expected TTM range ($200-$250)');
        console.log('This might indicate an issue with the data source or conversion logic');
      }
      
      // Save the direct EPS result to a file
      fs.writeFileSync('direct-eps-result.json', JSON.stringify(directEPS, null, 2));
      console.log('\nDirect EPS result saved to direct-eps-result.json');
    } else {
      console.log('\n❌ Failed to retrieve direct S&P 500 EPS');
    }
    
    // Now test the full earnings function
    console.log('\nTesting the full getSP500Earnings function...');
    const earnings = await getSP500Earnings();
    
    if (earnings && earnings.eps) {
      console.log('\n✅ Successfully retrieved S&P 500 earnings:');
      console.log('------------------------------------------');
      console.log('EPS Value:', earnings.eps.toFixed(2));
      console.log('P/E Ratio:', earnings.pe.toFixed(2));
      console.log('Source:', earnings.sourceName);
      
      // Validate the EPS value against the expected range
      if (earnings.eps >= 200 && earnings.eps <= 250) {
        console.log('\n✅ EPS value is within the expected TTM range ($200-$250)');
      } else {
        console.log('\n⚠️ EPS value is outside the expected TTM range ($200-$250)');
        console.log('This might indicate an issue with the data source or conversion logic');
      }
      
      // Calculate valuation targets based on different P/E multiples
      const currentIndex = 5600; // Approximate current S&P 500 value
      
      console.log('\nValuation Targets based on TTM EPS:');
      console.log('----------------------------------');
      console.log(`EPS (TTM): $${earnings.eps.toFixed(2)}`);
      console.log(`15× P/E Target: $${(earnings.eps * 15).toFixed(2)}`);
      console.log(`17× P/E Target: $${(earnings.eps * 17).toFixed(2)}`);
      console.log(`20× P/E Target: $${(earnings.eps * 20).toFixed(2)}`);
      console.log(`Current S&P 500 Value: $${currentIndex.toFixed(2)}`);
      console.log(`Current P/E: ${(currentIndex / earnings.eps).toFixed(2)}`);
      
      // Save the earnings result to a file
      fs.writeFileSync('earnings-result.json', JSON.stringify(earnings, null, 2));
      console.log('\nEarnings result saved to earnings-result.json');
    } else {
      console.log('\n❌ Failed to retrieve S&P 500 earnings');
    }
    
    // Test the estimation function with a quarterly EPS value
    console.log('\nTesting EPS estimation with a quarterly value...');
    const quarterlyEPS = 57.69;
    const pe = 24.5;
    const indexValue = 5600;
    
    const estimatedEPS = await estimateSP500EPS(indexValue, pe);
    
    if (estimatedEPS && estimatedEPS.eps) {
      console.log('\n✅ Successfully estimated S&P 500 EPS:');
      console.log('-------------------------------------');
      console.log('Estimated EPS Value:', estimatedEPS.eps.toFixed(2));
      console.log('Source:', estimatedEPS.sourceName);
      
      if (estimatedEPS.adjustmentMethod) {
        console.log('Adjustment Method:', estimatedEPS.adjustmentMethod);
      }
      
      // Validate the estimated EPS value against the expected range
      if (estimatedEPS.eps >= 200 && estimatedEPS.eps <= 250) {
        console.log('\n✅ Estimated EPS value is within the expected TTM range ($200-$250)');
      } else {
        console.log('\n⚠️ Estimated EPS value is outside the expected TTM range ($200-$250)');
        console.log('This might indicate an issue with the estimation logic');
      }
      
      // Save the estimated EPS result to a file
      fs.writeFileSync('estimated-eps-result.json', JSON.stringify(estimatedEPS, null, 2));
      console.log('\nEstimated EPS result saved to estimated-eps-result.json');
    } else {
      console.log('\n❌ Failed to estimate S&P 500 EPS');
    }
  } catch (error) {
    console.error('Error testing TTM EPS handling:', error);
  }
}

// Run the test
testTTMEPS();
