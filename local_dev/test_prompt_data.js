// Test script to verify Fear & Greed Index and upcoming economic events data
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
    
    // Mock Fear & Greed Index response
    if (url.includes('fearandgreed')) {
      return {
        getResponseCode: () => 200,
        getContentText: () => JSON.stringify({
          fear_and_greed: {
            score: 42,
            rating: "Fear",
            previous_week: 38,
            previous_month: 45,
            previous_year: 55
          }
        })
      };
    }
    
    return {
      getResponseCode: () => 200,
      getContentText: () => '{}'
    };
  }
};

// Load the KeyMarketIndicators.gs file
const keyMarketIndicatorsPath = path.join(__dirname, '../KeyMarketIndicators.gs');
const keyMarketIndicatorsCode = fs.readFileSync(keyMarketIndicatorsPath, 'utf8');

// Execute the code to define the functions
eval(keyMarketIndicatorsCode);

// Test retrieveFearAndGreedIndex
console.log("\n===== Testing Fear & Greed Index =====");
const fearAndGreedData = retrieveFearAndGreedIndex();
console.log("Fear & Greed Index Value:", fearAndGreedData.currentValue);
console.log("Fear & Greed Index Rating:", fearAndGreedData.rating);
console.log("Fear & Greed Index Source:", fearAndGreedData.source);

// Test retrieveUpcomingEconomicEvents
console.log("\n===== Testing Upcoming Economic Events =====");
const economicEvents = retrieveUpcomingEconomicEvents();
console.log(`Retrieved ${economicEvents.length} economic events`);
economicEvents.forEach((event, index) => {
  console.log(`Event ${index + 1}:`);
  console.log(`  Name: ${event.name}`);
  console.log(`  Date: ${event.date instanceof Date ? event.date.toISOString().split('T')[0] : event.date}`);
  console.log(`  Importance: ${event.importance}`);
});

// Test the formatting of key market indicators data
console.log("\n===== Testing Key Market Indicators Formatting =====");
const mockData = {
  majorIndices: [
    { name: "S&P 500", price: 4500, percentChange: 0.5, timestamp: new Date() }
  ],
  fearAndGreedIndex: fearAndGreedData,
  upcomingEconomicEvents: economicEvents,
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

console.log("\n===== Test Complete =====");
