/**
 * Standalone test script for handling null RSI values
 * This script tests our fix for the RSI null value issue
 */

const fs = require('fs');
const path = require('path');

// Create test data with null RSI value
const testData = {
  marketIndicators: {
    rsi: {
      value: null,
      source: "Tradier (RSI)",
      sourceUrl: "https://developer.tradier.com/documentation/markets/get-timesales",
      asOf: "May 4, 2025 at 8:19 PM EDT"
    }
  }
};

// Simplified version of the processData function that only handles RSI
function processRSIData(data) {
  const sampleData = JSON.parse(JSON.stringify(data)); // Deep clone
  
  // Process RSI data with our fix
  if (sampleData.marketIndicators && sampleData.marketIndicators.rsi && sampleData.marketIndicators.rsi.value !== null) {
    sampleData.marketIndicators = sampleData.marketIndicators || {};
    sampleData.marketIndicators.rsi = {
      value: sampleData.marketIndicators.rsi.value,
      interpretation: sampleData.marketIndicators.rsi.interpretation,
      explanation: sampleData.marketIndicators.rsi.explanation,
      source: sampleData.marketIndicators.rsi.source,
      sourceUrl: sampleData.marketIndicators.rsi.sourceUrl,
      asOf: sampleData.marketIndicators.rsi.asOf
    };
  } else if (sampleData.marketIndicators && sampleData.marketIndicators.rsi && sampleData.marketIndicators.rsi.value === null) {
    // If RSI value is null, remove the RSI object completely so it won't be displayed
    delete sampleData.marketIndicators.rsi;
  }
  
  return sampleData;
}

// Process the data
const processedData = processRSIData(testData);

// Check if the RSI object was removed
console.log('Original RSI value:', testData.marketIndicators.rsi.value);
console.log('RSI object after processing:', processedData.marketIndicators.rsi);
console.log('RSI object should be undefined if our fix works correctly.');

// Save the processed data to a file for inspection
fs.writeFileSync(
  path.join(__dirname, 'processed-null-rsi.json'),
  JSON.stringify(processedData, null, 2)
);

console.log('Processed data saved to processed-null-rsi.json');

// Now test with a non-null RSI value to ensure it still works correctly
const testDataWithRSI = {
  marketIndicators: {
    rsi: {
      value: 65,
      source: "Tradier (RSI)",
      sourceUrl: "https://developer.tradier.com/documentation/markets/get-timesales",
      asOf: "May 4, 2025 at 8:19 PM EDT"
    }
  }
};

const processedDataWithRSI = processRSIData(testDataWithRSI);
console.log('\nTest with non-null RSI value:');
console.log('Original RSI value:', testDataWithRSI.marketIndicators.rsi.value);
console.log('RSI object after processing:', processedDataWithRSI.marketIndicators.rsi ? 'Present' : 'Undefined');
console.log('RSI value after processing:', processedDataWithRSI.marketIndicators.rsi ? processedDataWithRSI.marketIndicators.rsi.value : 'N/A');
console.log('RSI object should be present with value 65 if our fix works correctly for non-null values.');
