import { getDirectSP500EPS } from './services/directEPS.js';
import fs from 'fs';

/**
 * Test script to verify the extraction of TTM EPS from the S&P Global spreadsheet
 */
async function testSPGlobalEPS() {
  console.log('Testing S&P Global TTM EPS extraction...');
  
  try {
    // Get the TTM EPS from S&P Global
    console.log('\nAttempting to retrieve TTM EPS from S&P Global spreadsheet...');
    const directEPS = await getDirectSP500EPS();
    
    if (directEPS && directEPS.eps) {
      console.log('\n✅ Successfully retrieved TTM EPS:');
      console.log('------------------------------');
      console.log('EPS Value:', directEPS.eps.toFixed(2));
      console.log('Source:', directEPS.sourceName);
      console.log('Last Updated:', directEPS.lastUpdated);
      console.log('Provider:', directEPS.provider);
      
      if (directEPS.isFreshData) {
        console.log('Data Freshness: Fresh (downloaded from source)');
      } else {
        console.log('Data Freshness: Cached (using local copy)');
      }
      
      // Validate the EPS value against the expected range
      if (directEPS.eps >= 200 && directEPS.eps <= 250) {
        console.log('\n✅ EPS value is within the expected TTM range ($200-$250)');
      } else {
        console.log('\n⚠️ EPS value is outside the expected TTM range ($200-$250)');
        console.log('This might indicate an issue with the data source or extraction logic');
      }
      
      // Calculate valuation targets based on different P/E multiples
      const currentIndex = 5600; // Approximate current S&P 500 value
      
      console.log('\nValuation Targets based on TTM EPS:');
      console.log('----------------------------------');
      console.log(`EPS (TTM): $${directEPS.eps.toFixed(2)}`);
      console.log(`15× P/E Target: $${(directEPS.eps * 15).toFixed(2)}`);
      console.log(`17× P/E Target: $${(directEPS.eps * 17).toFixed(2)}`);
      console.log(`20× P/E Target: $${(directEPS.eps * 20).toFixed(2)}`);
      console.log(`Current S&P 500 Value: $${currentIndex.toFixed(2)}`);
      console.log(`Current P/E: ${(currentIndex / directEPS.eps).toFixed(2)}`);
      
      // Save the result to a file
      fs.writeFileSync('spglobal-eps-result.json', JSON.stringify(directEPS, null, 2));
      console.log('\nResult saved to spglobal-eps-result.json');
    } else {
      console.log('\n❌ Failed to retrieve TTM EPS from S&P Global spreadsheet');
      console.log('This could be due to network issues, changes in the spreadsheet format, or other errors');
    }
  } catch (error) {
    console.error('Error testing S&P Global TTM EPS extraction:', error);
  }
}

// Run the test
testSPGlobalEPS();
