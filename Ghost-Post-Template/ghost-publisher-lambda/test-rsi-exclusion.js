/**
 * Focused test to verify RSI exclusion when value is "null (Unknown)"
 */

const fs = require('fs');
const path = require('path');

// Import the market indicators module directly
const { addMarketHeader, addRSI } = require('../src/modules/market-indicators');

// Create a simple test function
function testRSIExclusion() {
  console.log('Testing RSI exclusion when value is "null (Unknown)"...');
  
  // Test data with RSI value as "null (Unknown)"
  const testData = {
    marketIndicators: {
      rsi: {
        value: "null (Unknown)",
        source: "Tradier (RSI)",
        sourceUrl: "https://developer.tradier.com/documentation/markets/get-timesales",
        asOf: "May 4, 2025 at 8:19 PM EDT"
      }
    }
  };
  
  // Create a mock mobiledoc object to track what's added
  const mockMobiledoc = {
    sections: [],
    addedContent: []
  };
  
  // Mock the addHTML function that's used by addMarketHeader and addRSI
  const originalAddHTML = global.addHTML;
  global.addHTML = (mobiledoc, html) => {
    mobiledoc.addedContent.push(html);
  };
  
  // Test addMarketHeader
  console.log('Testing addMarketHeader...');
  addMarketHeader(mockMobiledoc, testData);
  
  // Check if RSI is included in the header
  const headerHtml = mockMobiledoc.addedContent[0] || '';
  const headerContainsRSI = headerHtml.includes('RSI:');
  
  console.log('Header HTML contains RSI:', headerContainsRSI);
  if (headerContainsRSI) {
    console.log('❌ TEST FAILED: RSI is still being displayed in the header despite "null (Unknown)" value');
  } else {
    console.log('✅ TEST PASSED: RSI is correctly excluded from the header');
  }
  
  // Clear the added content for the next test
  mockMobiledoc.addedContent = [];
  
  // Test addRSI
  console.log('\nTesting addRSI...');
  addRSI(mockMobiledoc, testData);
  
  // Check if RSI section was added
  const rsiSectionAdded = mockMobiledoc.addedContent.length > 0;
  
  console.log('RSI section was added:', rsiSectionAdded);
  if (rsiSectionAdded) {
    console.log('❌ TEST FAILED: RSI section was added despite "null (Unknown)" value');
    console.log('RSI section content:', mockMobiledoc.addedContent[0]);
  } else {
    console.log('✅ TEST PASSED: RSI section was correctly excluded');
  }
  
  // Restore the original addHTML function
  global.addHTML = originalAddHTML;
  
  // Return overall test result
  return !headerContainsRSI && !rsiSectionAdded;
}

// Run the test
try {
  const testPassed = testRSIExclusion();
  console.log('\nOverall test result:', testPassed ? '✅ PASSED' : '❌ FAILED');
} catch (error) {
  console.error('Test failed with error:', error);
}
