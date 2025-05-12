/**
 * Test script for title image integration
 * 
 * This script tests the title image selection and integration with the HTML generator
 */

const fs = require('fs');
const path = require('path');
const { getImageForTitle, getImageMetadata } = require('./ghost-publisher-lambda/src/utils/title-image-selector');
const { generateStandaloneHTML } = require('./ghost-publisher-lambda/src/utils/html-generator');

// Test data
const testTitles = [
  { title: "Greed Is Good - Market Pulse Daily", sentiment: "bullish" },
  { title: "The Correction Is Coming - Market Pulse Daily", sentiment: "bearish" },
  { title: "Mixed Signals - Market Pulse Daily", sentiment: "neutral" },
  { title: "Fasten Your Seatbelts - Market Pulse Daily", sentiment: "volatile" }
];

// Create test directory if it doesn't exist
const testDir = path.join(__dirname, 'test-output');
if (!fs.existsSync(testDir)) {
  fs.mkdirSync(testDir);
}

// Test each title
testTitles.forEach(({ title, sentiment }) => {
  console.log(`Testing title: "${title}" with sentiment: ${sentiment}`);
  
  // Get image for title
  const titleImagePath = getImageForTitle(title, sentiment);
  if (!titleImagePath) {
    console.error(`No image found for title: ${title}`);
    return;
  }
  
  console.log(`Selected image: ${titleImagePath}`);
  
  // Get image metadata
  const metadata = getImageMetadata(titleImagePath);
  console.log('Image metadata:', metadata);
  
  // Create a simple mobiledoc structure for testing
  const mobiledoc = {
    sections: [
      [1, "p", [
        [0, [], 0, `This is a test for the ${sentiment} sentiment title: ${title}`]
      ]],
      [1, "p", [
        [0, [], 0, "The image should be displayed above this text."]
      ]]
    ]
  };
  
  // Generate HTML with the title image
  const html = generateStandaloneHTML({}, mobiledoc, title, sentiment, titleImagePath);
  
  // Save the HTML to a file
  const outputFile = path.join(testDir, `${sentiment}-title-test.html`);
  fs.writeFileSync(outputFile, html);
  
  console.log(`Generated HTML saved to: ${outputFile}`);
  console.log('-----------------------------------');
});

console.log('All tests completed!');
