/**
 * Test script for S3 image selector
 * 
 * This script tests the S3 image selector to ensure it correctly selects
 * images from S3 for different titles and sentiments.
 */

// Import the S3 image selector
const { getS3ImageForTitle } = require('./ghost-publisher-lambda/src/utils/s3-image-selector');

// Test titles with different sentiments
const testCases = [
  { title: "Greed Is Good", sentiment: "bullish" },
  { title: "The Correction Is Coming", sentiment: "bearish" },
  { title: "Long Term Value", sentiment: "bullish" },
  { title: "Absolutely Vertical", sentiment: "bullish" },
  { title: "The Perfect Storm", sentiment: "volatile" }
];

// Run the tests
async function runTests() {
  console.log("Testing S3 Image Selector\n");
  console.log("=".repeat(50));
  
  for (const testCase of testCases) {
    console.log(`\nTest Case: "${testCase.title}" (${testCase.sentiment})`);
    console.log("-".repeat(50));
    
    try {
      const s3ImageData = getS3ImageForTitle(testCase.title, testCase.sentiment);
      
      if (s3ImageData && s3ImageData.url) {
        console.log("✅ Success!");
        console.log(`S3 URL: ${s3ImageData.url}`);
        console.log(`Local Path: ${s3ImageData.localPath}`);
        console.log(`Attribution: ${s3ImageData.metadata.attribution || 'None'}`);
      } else {
        console.log("❌ Failed to get S3 image");
        console.log("S3 Image Data:", s3ImageData);
      }
    } catch (error) {
      console.error("❌ Error:", error.message);
    }
    
    console.log("-".repeat(50));
  }
  
  console.log("\nTest completed!");
}

// Run the tests
runTests();
