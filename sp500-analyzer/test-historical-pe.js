import { analyzeSP500 } from './analyzeSP500.js';

/**
 * Test the enhanced S&P 500 analyzer with historical P/E data
 */
async function testHistoricalPE() {
  console.log('Testing enhanced S&P 500 analyzer with historical P/E data...');
  
  try {
    // Run the analyzer
    const result = await analyzeSP500();
    
    // Check if the historical P/E data is present
    if (result.historicalPE) {
      console.log('\n✅ Historical P/E data successfully added to the response!');
      console.log('\nHistorical P/E Data:');
      console.log('---------------------');
      console.log('Data:', result.historicalPE.data);
      console.log('Years:', result.historicalPE.years);
      console.log('Source:', result.historicalPE.source);
      console.log('Source URL:', result.historicalPE.sourceUrl);
      console.log('Last Updated:', result.historicalPE.lastUpdated);
    } else {
      console.log('\n❌ Historical P/E data not found in the response.');
    }
    
    // Check if the EPS TTM value is reasonable
    if (result.earnings && result.earnings.eps) {
      const eps = result.earnings.eps;
      const price = result.sp500Index.price;
      const epsToIndexRatio = eps / price;
      
      console.log('\nEPS TTM Validation:');
      console.log('------------------');
      console.log('EPS TTM:', eps);
      console.log('S&P 500 Index:', price);
      console.log('EPS/Index Ratio:', (epsToIndexRatio * 100).toFixed(2) + '%');
      
      if (epsToIndexRatio >= 0.01 && epsToIndexRatio <= 0.1) {
        console.log('✅ EPS TTM value is within reasonable range (1-10% of index)');
      } else {
        console.log('❌ EPS TTM value is outside reasonable range (1-10% of index)');
      }
    }
    
    // Check if the existing structure is preserved
    console.log('\nVerifying existing structure is preserved:');
    console.log('---------------------------------------');
    const expectedKeys = [
      'sp500Index', 'trailingPE', 'forwardEstimates', 'marketPath', 
      'movingAverages', 'etfHoldings', 'earnings', 'dataFreshness'
    ];
    
    const missingKeys = expectedKeys.filter(key => !(key in result));
    
    if (missingKeys.length === 0) {
      console.log('✅ All existing properties are preserved');
    } else {
      console.log('❌ Missing properties:', missingKeys.join(', '));
    }
    
    // Save the full result to a file for inspection
    const fs = await import('fs');
    fs.writeFileSync('test-result.json', JSON.stringify(result, null, 2));
    console.log('\nFull result saved to test-result.json');
    
  } catch (error) {
    console.error('Error testing enhanced S&P 500 analyzer:', error);
  }
}

// Run the test
testHistoricalPE();
