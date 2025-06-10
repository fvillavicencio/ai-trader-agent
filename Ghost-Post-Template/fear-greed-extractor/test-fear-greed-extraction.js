/**
 * Test script to identify posts with Fear and Greed Index data
 */

const GhostAdminAPI = require('@tryghost/admin-api');
const cheerio = require('cheerio');
require('dotenv').config();

// Get API key from environment variables
const ghostUrl = process.env.GHOST_URL;
const ghostApiKey = process.env.GHOST_API_KEY;

if (!ghostUrl || !ghostApiKey) {
  console.error('Error: Missing Ghost URL or API key');
  console.error('Please set GHOST_URL and GHOST_API_KEY environment variables');
  process.exit(1);
}

// Initialize Ghost Admin API
const api = new GhostAdminAPI({
  url: ghostUrl,
  key: ghostApiKey,
  version: 'v5.0'
});

async function findFearGreedPosts() {
  try {
    console.log('Connecting to Ghost API...');
    console.log(`Ghost URL: ${ghostUrl}`);
    console.log(`API Key ID: ${ghostApiKey.split(':')[0]}`);
    
    // Test connection
    const site = await api.site.read();
    console.log(`Connected to site: ${site.title}`);
    
    // Get total post count
    const meta = await api.posts.browse({limit: 1});
    const totalPosts = meta.meta.pagination.total;
    console.log(`Total posts: ${totalPosts}`);
    
    // Fetch all posts from April 2025 onwards
    console.log('\nFetching posts from April 2025 onwards...');
    
    // We'll use pagination to fetch all posts
    let allPosts = [];
    let page = 1;
    let hasMorePages = true;
    
    while (hasMorePages) {
      console.log(`Fetching page ${page}...`);
      const posts = await api.posts.browse({
        limit: 100,
        page: page,
        include: ['title', 'published_at'],
        order: 'published_at DESC'
      });
      
      if (posts.length === 0) {
        hasMorePages = false;
      } else {
        allPosts = allPosts.concat(posts);
        page++;
        
        // Check if we've reached posts from before April 2025
        const oldestPostDate = new Date(posts[posts.length - 1].published_at);
        if (oldestPostDate < new Date('2025-04-01')) {
          console.log(`Reached posts from before April 2025, stopping pagination`);
          hasMorePages = false;
        }
      }
    }
    
    console.log(`\nFetched ${allPosts.length} posts total`);
    
    // Filter posts by title to find potential Fear and Greed Index posts
    const fearGreedPosts = allPosts.filter(post => 
      post.title.includes('Fear') || 
      post.title.includes('Greed') || 
      post.title.includes('Market Pulse') ||
      post.title.includes('Market Whisper')
    );
    
    // Sort posts by date
    fearGreedPosts.sort((a, b) => new Date(b.published_at) - new Date(a.published_at));
    
    console.log(`Found ${fearGreedPosts.length} posts with "Fear" or "Greed" in the title:`);
    fearGreedPosts.forEach((post, i) => {
      console.log(`${i+1}. ${post.title} (${post.published_at})`);
    });
    
    // Now fetch a few posts with HTML to check for Fear and Greed Index data
    console.log('\nFetching HTML content of recent posts to check for Fear and Greed Index data...');
    const recentPosts = await api.posts.browse({
      limit: 10,
      include: ['html', 'title', 'published_at'],
      formats: ['html'],
      order: 'published_at DESC'
    });
    
    console.log(`\nAnalyzing ${recentPosts.length} recent posts for Fear and Greed Index data:`);
    recentPosts.forEach((post, i) => {
      const $ = cheerio.load(post.html);
      const hasFearGreedText = post.html.includes('Fear and Greed Index');
      const svgCount = $('svg').length;
      const figureCount = $('figure').length;
      
      console.log(`\n${i+1}. ${post.title} (${post.published_at})`);
      console.log(`   - Contains "Fear and Greed Index" text: ${hasFearGreedText}`);
      console.log(`   - SVG elements: ${svgCount}`);
      console.log(`   - Figure elements: ${figureCount}`);
      
      if (hasFearGreedText) {
        // Try to extract numeric values
        const numericMatches = post.html.match(/\b(\d+)\b/g);
        if (numericMatches) {
          console.log(`   - Numeric values found: ${numericMatches.slice(0, 10).join(', ')}${numericMatches.length > 10 ? '...' : ''}`);
        }
      }
    });
    
  } catch (error) {
    console.error('Error:', error.message || error);
  }
}

// Run the function
findFearGreedPosts().catch(error => {
  console.error('Error:', error);
});
