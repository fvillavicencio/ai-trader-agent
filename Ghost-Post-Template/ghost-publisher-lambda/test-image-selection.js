/**
 * Enhanced Test Script for Image Selection in the Ghost Publisher Lambda
 * This script tests the improved image selection logic with various titles and sentiments
 */

// Import the actual image selector module
const { getS3ImageForTitle } = require('./src/utils/s3-image-selector');

// Test titles for each sentiment category
const testTitles = {
  bullish: [
    'Greed Is Good: Market Momentum Continues',
    'Bulls On Parade: Tech Stocks Lead the Way',
    'The Show Goes On: Markets Hit New Highs',
    'Gordon Gekko Would Be Proud: Wall Street Celebrates',
    'Warren Buffett Says Buy Now'
  ],
  bearish: [
    'The Correction Is Coming: Warning Signs Flash Red',
    'Bears In Control: Markets Tumble on Fed News',
    'Michael Burry Predicts Market Crash',
    'Winter Is Coming: Prepare for Downside',
    'Sell It All Today: Analysts Warn of Recession'
  ],
  neutral: [
    'The Crossroads: Markets at a Decision Point',
    'Mixed Signals: Investors Wait for Clarity',
    'Patience, Grasshopper: The Market Will Reveal Itself',
    'Time Will Tell: Economic Data Remains Mixed',
    'Nobody Knows: Experts Divided on Market Direction'
  ],
  volatile: [
    'Turbulence Ahead: Volatility Spikes on Global News',
    'Fasten Your Seatbelts: VIX Hits New Highs',
    'The Perfect Storm: Multiple Factors Drive Volatility',
    'Market Whiplash: Traders Struggle with Swings',
    'Wild Ride: Markets Swing on Uncertainty'
  ]
};

/**
 * Test image selection with a specific title and sentiment
 */
function testImageSelection(title, sentiment) {
  console.log(`\n=== Testing image selection for title: "${title}" with sentiment: ${sentiment} ===`);
  
  try {
    // Get image using our enhanced selector
    const imageResult = getS3ImageForTitle(title, sentiment);
    
    console.log(`Selected image URL: ${imageResult.url}`);
    console.log(`Image sentiment: ${imageResult.metadata.sentiment}`);
    console.log(`Image category: ${imageResult.metadata.category}`);
    console.log(`Image description: ${imageResult.metadata.description}`);
    
    return imageResult;
  } catch (error) {
    console.error('Error in test:', error);
    return null;
  }
}

// Run tests for all sentiment categories and titles
console.log('=== TESTING ENHANCED IMAGE SELECTION ===');

// Test with specific titles for each sentiment
Object.keys(testTitles).forEach(sentiment => {
  console.log(`\n\n== TESTING ${sentiment.toUpperCase()} TITLES ==`);
  
  testTitles[sentiment].forEach(title => {
    testImageSelection(title, sentiment);
  });
});

// Test with mixed sentiment and title
console.log('\n\n== TESTING MIXED SENTIMENT AND TITLE ==');
testImageSelection('Bulls On Parade', 'bearish'); // Bullish title with bearish sentiment
testImageSelection('The Correction Is Coming', 'bullish'); // Bearish title with bullish sentiment

// Test with random sentiment selection based on title
console.log('\n\n== TESTING SENTIMENT DETECTION FROM TITLE ==');
const titlesForSentimentDetection = [
  'Markets Rally as Fed Signals Rate Cut',
  'Stocks Plunge on Recession Fears',
  'Investors Cautious Ahead of Earnings',
  'Wild Swings Continue as VIX Spikes'
];

titlesForSentimentDetection.forEach(title => {
  testImageSelection(title, 'neutral'); // Use neutral so it will detect from title
});

console.log('\n=== TEST COMPLETE ===');
