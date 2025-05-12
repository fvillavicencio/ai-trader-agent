/**
 * Test script to verify Warren Buffett images are working correctly
 */

const path = require('path');
const fs = require('fs');
const { getImageForTitle } = require('./ghost-publisher-lambda/src/utils/title-image-selector');

// Run multiple tests to see both Warren Buffett images
async function runTests() {
  console.log("Testing Warren Buffett images for 'Long Term Value' title\n");
  
  const title = "Long Term Value - Market Pulse Daily";
  const sentiment = "bullish";
  
  // Run 10 tests to see the distribution of images
  for (let i = 0; i < 10; i++) {
    console.log(`Test run #${i+1}:`);
    
    // Get image for this title
    const imagePath = getImageForTitle(title, sentiment);
    console.log(`Selected image: ${imagePath}`);
    
    // Check if this is a Warren Buffett image
    const isBuffettImage = 
      imagePath.includes('buffett') || 
      imagePath.includes('warren') || 
      imagePath.includes('investor');
    
    if (isBuffettImage) {
      console.log('✅ Successfully using Warren Buffett image!');
    } else {
      console.log('❌ Not using a Warren Buffett image');
    }
    
    console.log('-----------------------------------');
  }
  
  console.log("All tests completed!");
}

// Run the tests
runTests().catch(console.error);
