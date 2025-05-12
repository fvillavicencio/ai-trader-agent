/**
 * Test script for Ghost Publisher with S3 Images
 * 
 * This script tests the Ghost publisher's ability to select S3 images
 * and set them as featured images in Ghost posts.
 */

// Load environment variables from test.env file
require('dotenv').config({ path: './test.env' });

// Import required modules
const GhostAdminAPI = require('@tryghost/admin-api');
const fs = require('fs');
const path = require('path');

// Import the S3 image selector
const { getS3ImageForTitle } = require('./ghost-publisher-lambda/src/utils/s3-image-selector');

// Import the title generator
const { generateEngagingTitle } = require('./ghost-publisher-lambda/index');

// Sample data for testing
let sampleData;
try {
  const dataPath = path.resolve(__dirname, './market_pulse_data.json');
  sampleData = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
} catch (error) {
  console.error('Error loading sample data:', error);
  process.exit(1);
}

// Initialize Ghost API client
const api = new GhostAdminAPI({
  url: process.env.GHOST_URL,
  key: process.env.GHOST_API_KEY,
  version: 'v5.0'
});

// Test the Ghost publisher with S3 images
async function testGhostPublisherWithS3() {
  console.log("Testing Ghost Publisher with S3 Images\n");
  console.log("=".repeat(70));
  
  try {
    // Generate a title for the test post
    const title = generateEngagingTitle(sampleData);
    console.log(`Generated title: "${title}"`);
    
    // Determine sentiment from the data
    let sentiment = 'neutral';
    if (sampleData.decision && sampleData.decision.action) {
      if (sampleData.decision.action.includes('Buy')) {
        sentiment = 'bullish';
      } else if (sampleData.decision.action.includes('Sell')) {
        sentiment = 'bearish';
      }
      
      // Check for volatility
      if (sampleData.keyMarketIndicators && 
          sampleData.keyMarketIndicators.volatilityIndices && 
          sampleData.keyMarketIndicators.volatilityIndices.vix) {
        const vixValue = parseFloat(sampleData.keyMarketIndicators.volatilityIndices.vix.value);
        if (vixValue > 25) {
          sentiment = 'volatile';
        }
      }
    }
    console.log(`Determined sentiment: ${sentiment}`);
    
    // Get S3 image for the title
    const s3ImageData = getS3ImageForTitle(title, sentiment);
    
    if (!s3ImageData || !s3ImageData.url) {
      throw new Error('Failed to get S3 image for title');
    }
    
    console.log(`Selected S3 image: ${s3ImageData.url}`);
    console.log(`Image attribution: ${s3ImageData.metadata.attribution || 'None'}`);
    
    // Create a simple test post in Ghost
    console.log("\nCreating test post in Ghost...");
    
    const postData = {
      title: `[TEST] ${title}`,
      html: `<p>This is a test post to verify S3 image integration.</p>
             <p>Sentiment: ${sentiment}</p>
             <p>S3 Image URL: ${s3ImageData.url}</p>`,
      status: 'draft', // Set to draft to avoid publishing test posts
      feature_image: s3ImageData.url,
      feature_image_alt: title,
      feature_image_caption: s3ImageData.metadata ? s3ImageData.metadata.attribution : 'Market Pulse Daily',
      tags: [{ name: 'Test' }]
    };
    
    // Create the post in Ghost
    const post = await api.posts.add(postData);
    
    console.log(`\n✅ Test post created successfully!`);
    console.log(`Post ID: ${post.id}`);
    console.log(`Post URL: ${post.url}`);
    console.log(`Featured Image: ${post.feature_image}`);
    
    console.log("\nTest completed successfully!");
    
  } catch (error) {
    console.error("\n❌ Test failed:", error);
  }
}

// Run the test
testGhostPublisherWithS3();
