/**
 * Script to check the feature images of recent Ghost posts
 */

const GhostAdminAPI = require('@tryghost/admin-api');
require('dotenv').config();

// Ghost API credentials
const ghostUrl = process.env.GHOST_URL || 'https://market-pulse-daily.ghost.io';
const ghostApiKey = process.env.GHOST_API_KEY || '67f457a5f41c9900013e1e47:44daf1e666349bde96fad6f9a65979ba1d0b11b161a5c765847218f5bd263b7c';

// Initialize Ghost Admin API
const api = new GhostAdminAPI({
  url: ghostUrl,
  key: ghostApiKey,
  version: 'v5.0'
});

// Function to get recent posts
async function getRecentPosts() {
  try {
    console.log('Fetching recent posts from Ghost...');
    
    // Get the 10 most recent posts
    const posts = await api.posts.browse({
      limit: 10,
      include: ['feature_image', 'title', 'url'],
      order: 'published_at DESC'
    });
    
    console.log(`Found ${posts.length} recent posts\n`);
    
    // Display post information
    posts.forEach((post, index) => {
      console.log(`Post ${index + 1}: ${post.title}`);
      console.log(`URL: ${post.url}`);
      console.log(`Feature Image: ${post.feature_image || 'No feature image'}`);
      console.log('-----------------------------------');
    });
    
    return posts;
  } catch (error) {
    console.error('Error fetching posts:', error);
    return [];
  }
}

// Run the function
getRecentPosts();
