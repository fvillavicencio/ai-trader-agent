/**
 * Test script for handling null RSI values
 * This script tests our fix for the RSI null value issue
 */

const { processData } = require('./src/index');
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

// Process the data
const processedData = processData(testData);

// Check if the RSI object was removed
console.log('RSI object after processing:', processedData.marketIndicators.rsi);
console.log('RSI object should be undefined if our fix works correctly.');

// Save the processed data to a file for inspection
fs.writeFileSync(
  path.join(__dirname, 'processed-null-rsi.json'),
  JSON.stringify(processedData, null, 2)
);

console.log('Processed data saved to processed-null-rsi.json');
