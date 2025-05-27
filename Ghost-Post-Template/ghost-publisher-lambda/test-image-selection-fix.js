/**
 * Test Script for Image Selection Logic
 * 
 * This script tests the image selection logic to ensure we're getting valid images
 * and not broken links. It specifically tests the default image fallback mechanism.
 */

// Import the image selector module
const { getS3ImageForTitle } = require('./src/utils/s3-image-selector');

// Test titles with different sentiments
const testTitles = [
  { title: 'Market Rally Continues', sentiment: 'bullish' },
  { title: 'Bears Take Control', sentiment: 'bearish' },
  { title: 'Market Uncertainty Ahead', sentiment: 'neutral' },
  { title: 'Volatility Spikes as Traders React', sentiment: 'volatile' }
];

// Test the image selection logic
async function testImageSelection() {
  console.log('Testing image selection logic...');
  console.log('================================\n');
  
  const results = [];
  
  // Test each title
  for (const test of testTitles) {
    console.log(`Testing title: "${test.title}" (${test.sentiment})`);
    
    try {
      // Get image for the title
      const image = getS3ImageForTitle(test.title, test.sentiment);
      
      // Log the result
      console.log(`  Image URL: ${image.url}`);
      console.log(`  Local Path: ${image.localPath}`);
      console.log(`  Sentiment: ${image.metadata.sentiment}`);
      console.log(`  Category: ${image.metadata.category}`);
      console.log(`  Description: ${image.metadata.description}`);
      console.log('');
      
      // Check if the URL is valid (not undefined or null)
      const isValid = image.url && image.url.startsWith('https://');
      
      results.push({
        title: test.title,
        sentiment: test.sentiment,
        imageUrl: image.url,
        isValid
      });
    } catch (error) {
      console.error(`Error testing title "${test.title}":`, error);
      results.push({
        title: test.title,
        sentiment: test.sentiment,
        imageUrl: null,
        isValid: false,
        error: error.message
      });
    }
  }
  
  // Print summary
  console.log('\nTest Results Summary:');
  console.log('=====================');
  
  let allValid = true;
  
  for (const result of results) {
    const status = result.isValid ? '✅ VALID' : '❌ INVALID';
    console.log(`${status} - "${result.title}" (${result.sentiment}): ${result.imageUrl || 'No image'}`);
    
    if (!result.isValid) {
      allValid = false;
    }
  }
  
  console.log('\nOverall Test Result:', allValid ? '✅ ALL IMAGES VALID' : '❌ SOME IMAGES INVALID');
}

// Run the test
testImageSelection();
