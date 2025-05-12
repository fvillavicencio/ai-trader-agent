/**
 * Test script for posting to Ghost with an S3 image as the featured image
 * This script creates a simple test post with an S3 image as the featured image
 */

// Import required modules
const GhostAdminAPI = require('@tryghost/admin-api');
const fs = require('fs');
const path = require('path');

// Load environment variables from .env file
require('dotenv').config({ path: './src/.env' });

// Ghost API configuration - use environment variables if available
const GHOST_URL = process.env.GHOST_URL || 'https://market-pulse-daily.ghost.io';
const GHOST_API_KEY = process.env.GHOST_API_KEY || '67f457a5f41c9900013e1e47:44daf1e666349bde96fad6f9a65979ba1d0b11b161a5c765847218f5bd263b7c';

// S3 image URL for testing
const S3_IMAGE_URL = 'https://market-pulse-daily-title-images.s3.us-east-2.amazonaws.com/bullish/greed_is_good/gordon_gekko_wall_street_businessman.jpg';

// Initialize Ghost API client
const api = new GhostAdminAPI({
  url: GHOST_URL,
  key: GHOST_API_KEY,
  version: 'v5.0'
});

// Create a test post with S3 image as featured image
async function createTestPost() {
  console.log('Creating test post with S3 image as featured image...');
  
  try {
    // Create a simple test post
    const post = await api.posts.add({
      title: '[TEST] S3 Image Integration Test',
      html: `<p>This is a test post to verify S3 image integration.</p>
             <p>S3 Image URL: ${S3_IMAGE_URL}</p>`,
      status: 'draft',
      feature_image: S3_IMAGE_URL,
      feature_image_alt: 'Gordon Gekko from Wall Street',
      feature_image_caption: 'Gordon Gekko character from Wall Street movie',
      tags: [{ name: 'Test' }]
    });
    
    console.log('Test post created successfully!');
    console.log(`Post ID: ${post.id}`);
    console.log(`Post URL: ${post.url}`);
    console.log(`Featured Image: ${post.feature_image}`);
    
    return true;
  } catch (error) {
    console.error('Error creating test post:', error);
    return false;
  }
}

// Run the test
createTestPost()
  .then(success => {
    if (success) {
      console.log('S3 image integration test completed successfully!');
    } else {
      console.error('S3 image integration test failed.');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('Unexpected error:', error);
    process.exit(1);
  });
