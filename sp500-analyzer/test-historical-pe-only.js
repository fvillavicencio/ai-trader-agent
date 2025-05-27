import { getHistoricalPERatios } from './services/historicalPE.js';

/**
 * Test script to verify the historical P/E data retrieval and formatting
 */
async function testHistoricalPE() {
  console.log('Testing historical P/E data retrieval...');
  
  try {
    // Get historical P/E data
    console.log('\nFetching historical P/E ratios from multpl.com...');
    const historicalPE = await getHistoricalPERatios();
    
    if (historicalPE && historicalPE.data && historicalPE.data.length > 0) {
      console.log('\n✅ Successfully retrieved historical P/E data:');
      console.log('---------------------------------------------');
      console.log('Raw Data:', historicalPE.data.slice(0, 5), '...');
      console.log('Years:', historicalPE.years.slice(0, 5), '...');
      
      if (historicalPE.formattedData) {
        console.log('\nFormatted Data (first 5 entries):');
        console.log('----------------------------------');
        historicalPE.formattedData.slice(0, 5).forEach(item => {
          console.log(`Year: ${item.year}, P/E: ${item.value}`);
        });
      } else {
        console.log('\n❌ No formatted data available');
      }
      
      console.log('\nSummary Statistics:');
      console.log('------------------');
      console.log('Current P/E:', historicalPE.current);
      console.log('5-Year Average P/E:', historicalPE.fiveYearAvg);
      console.log('10-Year Average P/E:', historicalPE.tenYearAvg);
      console.log('Source:', historicalPE.source);
      console.log('Source URL:', historicalPE.sourceUrl);
      console.log('Last Updated:', historicalPE.lastUpdated);
      
      // Save the historical P/E data to a file for inspection
      const fs = await import('fs');
      fs.writeFileSync('historical-pe-result.json', JSON.stringify(historicalPE, null, 2));
      console.log('\nFull result saved to historical-pe-result.json');
    } else {
      console.log('\n❌ Failed to retrieve historical P/E data');
    }
  } catch (error) {
    console.error('Error testing historical P/E data retrieval:', error);
  }
}

// Run the test
testHistoricalPE();
