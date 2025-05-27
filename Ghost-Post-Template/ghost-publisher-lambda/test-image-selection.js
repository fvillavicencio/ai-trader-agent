/**
 * Enhanced Test Script for Image Selection in the Ghost Publisher Lambda
 * This script tests the improved image selection logic with various titles and sentiments
 */

// Import the required modules
const { getS3ImageForTitle } = require('./src/utils/s3-image-selector');
const imageCatalog = require('./src/utils/image-catalog');

// Initialize the image catalog before testing
async function initialize() {
  console.log('Initializing image catalog for testing...');
  await imageCatalog.initializeImageCatalog();
  console.log('Image catalog initialized successfully');
}

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
async function runTests() {
  // First initialize the catalog
  await initialize();
  
  console.log('=== TESTING ENHANCED IMAGE SELECTION ===');
  console.log('Testing with the updated logic that includes time-based and title-based factors');
  
  // Track selected images to check for duplicates
  const selectedImages = new Set();
  const imageResults = [];
  
  // Test with specific titles for each sentiment
  for (const sentiment of Object.keys(testTitles)) {
    console.log(`\n\n== TESTING ${sentiment.toUpperCase()} TITLES ==`);
    
    for (const title of testTitles[sentiment]) {
      const result = testImageSelection(title, sentiment);
      if (result) {
        selectedImages.add(result.url);
        imageResults.push({
          title,
          sentiment,
          imageUrl: result.url,
          category: result.metadata.category
        });
      }
      
      // Add a small delay between tests to ensure time component changes
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  }

  // Test with mixed sentiment and title
  console.log('\n\n== TESTING MIXED SENTIMENT AND TITLE ==');
  const mixedResult1 = testImageSelection('Bulls On Parade', 'bearish'); // Bullish title with bearish sentiment
  const mixedResult2 = testImageSelection('The Correction Is Coming', 'bullish'); // Bearish title with bullish sentiment
  
  if (mixedResult1) selectedImages.add(mixedResult1.url);
  if (mixedResult2) selectedImages.add(mixedResult2.url);
  
  // Test with random sentiment detection from title
  console.log('\n\n== TESTING SENTIMENT DETECTION FROM TITLE ==');
  const titlesForSentimentDetection = [
    'Markets Rally as Fed Signals Rate Cut',
    'Stocks Plunge on Recession Fears',
    'Investors Cautious Ahead of Earnings',
    'Wild Swings Continue as VIX Spikes'
  ];
  
  for (const title of titlesForSentimentDetection) {
    const result = testImageSelection(title, null); // Pass null to force sentiment detection
    if (result) selectedImages.add(result.url);
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  
  // Test the same title multiple times to see if we get different images
  console.log('\n\n== TESTING SAME TITLE MULTIPLE TIMES ==');
  const sameTitle = 'Market Analysis for Today';
  const sameTitleResults = [];
  
  for (let i = 0; i < 5; i++) {
    console.log(`\nTest #${i+1} with title: "${sameTitle}"`);
    const result = testImageSelection(sameTitle, 'neutral');
    if (result) {
      sameTitleResults.push(result.url);
    }
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  // Check for duplicates with the same title
  const uniqueSameTitleImages = new Set(sameTitleResults);
  console.log(`\nSame title test results: ${sameTitleResults.length} tests, ${uniqueSameTitleImages.size} unique images`);
  if (uniqueSameTitleImages.size < sameTitleResults.length) {
    console.log('WARNING: Same title produced duplicate images despite our improvements');
  } else {
    console.log('SUCCESS: Same title produced different images each time!');
  }
  
  // Summary of all tests
  console.log('\n=== TEST SUMMARY ===');
  console.log(`Total tests run: ${imageResults.length + 2 + titlesForSentimentDetection.length + sameTitleResults.length}`);
  console.log(`Unique images selected: ${selectedImages.size}`);
  console.log(`Duplicate rate: ${100 - (selectedImages.size / (imageResults.length + 2 + titlesForSentimentDetection.length + sameTitleResults.length) * 100).toFixed(2)}%`);
  
  console.log('\n=== TEST COMPLETE ===');
}

// Run the tests
runTests().catch(error => {
  console.error('Error running tests:', error);
});
