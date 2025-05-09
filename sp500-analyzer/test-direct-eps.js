import { getDirectSP500EPS, estimateSP500EPS } from './services/directEPS.js';

/**
 * Test the direct S&P 500 EPS retrieval functionality
 */
async function testDirectEPS() {
  console.log('Testing direct S&P 500 EPS retrieval...');
  
  try {
    // Get direct EPS from authoritative sources
    console.log('\nAttempting to retrieve direct S&P 500 EPS from authoritative sources...');
    const directEPS = await getDirectSP500EPS();
    
    if (directEPS && directEPS.eps) {
      console.log('\n✅ Successfully retrieved direct S&P 500 EPS:');
      console.log('---------------------------------------------');
      console.log('EPS Value:', directEPS.eps);
      console.log('Source:', directEPS.sourceName);
      console.log('Source URL:', directEPS.sourceUrl);
      console.log('Last Updated:', directEPS.lastUpdated);
      console.log('Provider:', directEPS.provider);
      
      // Get current S&P 500 index value for validation
      const spxValue = 5668.12; // Using a hardcoded value for testing
      const epsToIndexRatio = directEPS.eps / spxValue;
      
      console.log('\nEPS Validation:');
      console.log('---------------');
      console.log('S&P 500 Index Value:', spxValue);
      console.log('EPS/Index Ratio:', (epsToIndexRatio * 100).toFixed(2) + '%');
      
      if (epsToIndexRatio >= 0.01 && epsToIndexRatio <= 0.1) {
        console.log('✅ EPS value is within reasonable range (1-10% of index)');
      } else {
        console.log('❌ EPS value is outside reasonable range (1-10% of index)');
      }
    } else {
      console.log('\n❌ Failed to retrieve direct S&P 500 EPS.');
      
      // Test the estimation function as a fallback
      console.log('\nTesting EPS estimation as fallback...');
      const spxValue = 5668.12;
      const pe = 24.63;
      
      const estimatedEPS = await estimateSP500EPS(spxValue, pe);
      
      if (estimatedEPS && estimatedEPS.eps) {
        console.log('\n✅ Successfully estimated S&P 500 EPS:');
        console.log('-------------------------------------');
        console.log('Estimated EPS Value:', estimatedEPS.eps);
        console.log('Source:', estimatedEPS.sourceName);
        console.log('Is Estimate:', estimatedEPS.isEstimate ? 'Yes' : 'No');
        
        const epsToIndexRatio = estimatedEPS.eps / spxValue;
        
        console.log('\nEPS Validation:');
        console.log('---------------');
        console.log('S&P 500 Index Value:', spxValue);
        console.log('EPS/Index Ratio:', (epsToIndexRatio * 100).toFixed(2) + '%');
        
        if (epsToIndexRatio >= 0.01 && epsToIndexRatio <= 0.1) {
          console.log('✅ Estimated EPS value is within reasonable range (1-10% of index)');
        } else {
          console.log('❌ Estimated EPS value is outside reasonable range (1-10% of index)');
        }
      } else {
        console.log('\n❌ Failed to estimate S&P 500 EPS.');
      }
    }
  } catch (error) {
    console.error('Error testing direct EPS retrieval:', error);
  }
}

// Run the test
testDirectEPS();
