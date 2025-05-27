/**
 * Test script to verify all financial icon images are working correctly
 */

const path = require('path');
const fs = require('fs');
const { getImageForTitle } = require('./ghost-publisher-lambda/src/utils/title-image-selector');

// Test titles that should trigger our financial icon images
const testTitles = [
  { title: "Greed Is Good - Market Pulse Daily", sentiment: "bullish" },  // Gordon Gekko
  { title: "Absolutely Vertical - Market Pulse Daily", sentiment: "bullish" },  // Jordan Belfort (Wolf of Wall Street)
  { title: "Long Term Value - Market Pulse Daily", sentiment: "bullish" },  // Warren Buffett
  { title: "The Correction Is Coming - Market Pulse Daily", sentiment: "bearish" }  // Michael Burry (The Big Short)
];

// Run tests for each title
async function runTests() {
  console.log("Testing financial icon images for Market Pulse Daily\n");
  
  for (const { title, sentiment } of testTitles) {
    console.log(`Testing title: "${title}" with sentiment: ${sentiment}`);
    
    // Get image for this title
    const imagePath = getImageForTitle(title, sentiment);
    console.log(`Selected image: ${imagePath}`);
    
    // Check if this is one of our financial icon images
    const isFinancialIcon = 
      imagePath.includes('gekko') || 
      imagePath.includes('gordon') || 
      imagePath.includes('belfort') || 
      imagePath.includes('wolf') || 
      imagePath.includes('buffett') || 
      imagePath.includes('burry') || 
      imagePath.includes('big_short');
    
    if (isFinancialIcon) {
      console.log('✅ Successfully using financial icon image!');
    }
    
    console.log('-----------------------------------');
  }
  
  console.log("All tests completed!");
}

// Run the tests
runTests().catch(console.error);
