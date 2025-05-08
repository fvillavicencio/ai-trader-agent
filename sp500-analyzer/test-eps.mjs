// Test script for EPS extraction
import { getForwardEpsEstimates } from './services/forwardPE.js';

async function testEPS() {
  try {
    console.log('Testing EPS extraction...');
    const result = await getForwardEpsEstimates();
    console.log('Forward EPS Estimates:');
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('Error testing EPS extraction:', error);
  }
}

testEPS();
