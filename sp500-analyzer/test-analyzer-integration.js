import { analyzeSP500 } from './analyzeSP500.js';
import { getHistoricalPERatios } from './services/historicalPE.js';
import fs from 'fs';

/**
 * Test script to verify the integration of historical P/E data with the analyzer
 */
async function testAnalyzerIntegration() {
  console.log('Testing integration of historical P/E data with the S&P 500 analyzer...');
  
  try {
    // First, get the historical P/E data directly
    console.log('\nFetching historical P/E ratios from multpl.com...');
    const historicalPE = await getHistoricalPERatios();
    
    if (historicalPE && historicalPE.data && historicalPE.data.length > 0) {
      console.log('\n✅ Successfully retrieved historical P/E data');
      console.log('Current P/E:', historicalPE.current);
      console.log('5-Year Average P/E:', historicalPE.fiveYearAvg);
      console.log('10-Year Average P/E:', historicalPE.tenYearAvg);
      
      // Save the historical P/E data to a file for comparison
      fs.writeFileSync('historical-pe-direct.json', JSON.stringify(historicalPE, null, 2));
      console.log('\nHistorical P/E data saved to historical-pe-direct.json');
      
      // Now run the full analyzer
      console.log('\nRunning the full S&P 500 analyzer...');
      const analyzerResult = await analyzeSP500();
      
      // Save the full analyzer result to a file
      fs.writeFileSync('analyzer-result.json', JSON.stringify(analyzerResult, null, 2));
      console.log('\nFull analyzer result saved to analyzer-result.json');
      
      // Check if the historical P/E data is properly included in the analyzer result
      if (analyzerResult.historicalPE) {
        console.log('\n✅ Historical P/E data is included in the analyzer result');
        console.log('Current P/E from analyzer:', analyzerResult.historicalPE.current);
        console.log('5-Year Average P/E from analyzer:', analyzerResult.historicalPE.fiveYearAvg);
        console.log('10-Year Average P/E from analyzer:', analyzerResult.historicalPE.tenYearAvg);
        
        // Compare the direct historical P/E data with the one in the analyzer result
        const directData = JSON.stringify(historicalPE);
        const analyzerData = JSON.stringify(analyzerResult.historicalPE);
        
        if (directData === analyzerData) {
          console.log('\n✅ The historical P/E data in the analyzer result matches the direct data');
        } else {
          console.log('\n⚠️ The historical P/E data in the analyzer result differs from the direct data');
          console.log('This is expected if additional processing is done in the analyzer');
        }
      } else {
        console.log('\n❌ Historical P/E data is NOT included in the analyzer result');
      }
    } else {
      console.log('\n❌ Failed to retrieve historical P/E data');
    }
  } catch (error) {
    console.error('Error testing analyzer integration:', error);
  }
}

// Run the test
testAnalyzerIntegration();
