// Test script to verify proper handling of null data
const fs = require('fs');
const path = require('path');

// Mock Google Apps Script environment
global.Logger = {
  log: console.log
};

global.CacheService = {
  getScriptCache: () => ({
    get: () => null,
    put: () => {}
  })
};

global.UrlFetchApp = {
  fetch: (url, options) => {
    console.log(`Mocking fetch to: ${url}`);
    
    // Return failed response for all requests to ensure we test null handling
    return {
      getResponseCode: () => 404,
      getContentText: () => '{}'
    };
  }
};

// Load the KeyMarketIndicators.gs file
const keyMarketIndicatorsPath = path.join(__dirname, '../KeyMarketIndicators.gs');
const keyMarketIndicatorsCode = fs.readFileSync(keyMarketIndicatorsPath, 'utf8');

// Execute the code to define the functions
eval(keyMarketIndicatorsCode);

// Test retrieveFearAndGreedIndex with failed API
console.log("\n===== Testing Fear & Greed Index with Failed API =====");
const fearAndGreedData = retrieveFearAndGreedIndex();
console.log("Fear & Greed Index Result:", fearAndGreedData);

// Test retrieveUpcomingEconomicEvents with failed API
console.log("\n===== Testing Upcoming Economic Events with Failed API =====");
const economicEvents = retrieveUpcomingEconomicEvents();
console.log("Economic Events Result:", economicEvents);

// Test the formatting of key market indicators data with null values
console.log("\n===== Testing Key Market Indicators Formatting with Null Values =====");
const mockData = {
  majorIndices: [
    { name: "S&P 500", price: 4500, percentChange: 0.5, timestamp: new Date() }
  ],
  fearAndGreedIndex: null,
  upcomingEconomicEvents: null,
  treasuryYields: {
    yields: [
      { term: "2-Year", value: 4.2, change: 0.05 },
      { term: "10-Year", value: 4.5, change: -0.02 }
    ],
    timestamp: new Date()
  },
  timestamp: new Date()
};

const formattedText = formatKeyMarketIndicatorsData(mockData);
console.log(formattedText);

// Test retrieveKeyMarketIndicators with failed APIs
console.log("\n===== Testing retrieveKeyMarketIndicators with Failed APIs =====");

// Mock the individual retrieval functions to return minimal data
// This ensures we're testing the main function's ability to handle failures
global.retrieveMajorIndices = () => [{name: "Test Index", price: 100, percentChange: 0.1}];
global.retrieveSectorPerformance = () => [];
global.retrieveVolatilityIndices = () => [];
global.retrieveTreasuryYields = () => ({yields: []});

const keyMarketIndicators = retrieveKeyMarketIndicators();
console.log("Key Market Indicators Result:");
console.log("- Has majorIndices:", keyMarketIndicators.majorIndices.length > 0);
console.log("- Has fearAndGreedIndex:", keyMarketIndicators.fearAndGreedIndex !== null);
console.log("- Has upcomingEconomicEvents:", keyMarketIndicators.upcomingEconomicEvents.length > 0);
console.log("- fromCache:", keyMarketIndicators.fromCache);

console.log("\n===== Test Complete =====");
