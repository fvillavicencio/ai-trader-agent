/**
 * Script to analyze post content and identify Fear and Greed Index data patterns
 */

const GhostAdminAPI = require('@tryghost/admin-api');
const cheerio = require('cheerio');
const fs = require('fs');
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

async function analyzePostContent() {
  try {
    console.log('Connecting to Ghost API...');
    console.log(`Ghost URL: ${ghostUrl}`);
    console.log(`API Key ID: ${ghostApiKey.split(':')[0]}`);
    
    // Test connection
    const site = await api.site.read();
    console.log(`Connected to site: ${site.title}`);
    
    // Get most recent posts
    console.log('\nFetching recent posts to analyze content patterns...');
    const recentPosts = await api.posts.browse({
      limit: 10,
      include: ['html', 'title', 'published_at'],
      formats: ['html'],
      order: 'published_at DESC'
    });
    
    console.log(`\nAnalyzing ${recentPosts.length} recent posts:`);
    
    // Create a directory for sample content if it doesn't exist
    const sampleDir = './sample-content';
    if (!fs.existsSync(sampleDir)) {
      fs.mkdirSync(sampleDir);
    }
    
    // Analyze each post
    for (let i = 0; i < recentPosts.length; i++) {
      const post = recentPosts[i];
      const $ = cheerio.load(post.html);
      
      console.log(`\n${i+1}. ${post.title} (${post.published_at})`);
      
      // Check for Fear and Greed Index mentions
      const hasFearGreedText = post.html.includes('Fear and Greed Index');
      console.log(`   - Contains "Fear and Greed Index" text: ${hasFearGreedText}`);
      
      if (hasFearGreedText) {
        // Save the post content to a file for detailed analysis
        const filename = `${sampleDir}/post_${i+1}_${post.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.html`;
        fs.writeFileSync(filename, post.html);
        console.log(`   - Saved post content to ${filename}`);
        
        // Extract paragraphs containing Fear and Greed Index
        const paragraphs = $('p').filter((_, el) => $(el).text().includes('Fear and Greed Index')).map((_, el) => $(el).text()).get();
        console.log(`   - Paragraphs with Fear and Greed Index: ${paragraphs.length}`);
        paragraphs.forEach((p, idx) => {
          console.log(`     [${idx+1}] ${p.substring(0, 100)}...`);
        });
        
        // Look for numeric values near Fear and Greed Index mentions
        const fearGreedRegex = /Fear and Greed Index[:\s]+(is\s+at\s+)?(\d+)/i;
        const fearGreedMatch = post.html.match(fearGreedRegex);
        
        if (fearGreedMatch && fearGreedMatch[2]) {
          const indexValue = parseInt(fearGreedMatch[2], 10);
          console.log(`   - Found Fear and Greed Index value: ${indexValue}`);
        } else {
          console.log('   - No direct Fear and Greed Index value found in text');
        }
        
        // Check for SVG elements
        const svgElements = $('svg');
        console.log(`   - SVG elements: ${svgElements.length}`);
        
        // Check for figure elements
        const figureElements = $('figure');
        console.log(`   - Figure elements: ${figureElements.length}`);
        
        // Look for tables that might contain Fear and Greed data
        const tables = $('table');
        console.log(`   - Table elements: ${tables.length}`);
        
        // Check for specific patterns in the HTML that might indicate Fear and Greed data
        const patterns = [
          'previous day',
          'previous week',
          'previous month',
          'one week ago',
          'one month ago'
        ];
        
        patterns.forEach(pattern => {
          const hasPattern = post.html.includes(pattern);
          console.log(`   - Contains "${pattern}": ${hasPattern}`);
        });
      }
    }
    
  } catch (error) {
    console.error('Error:', error.message || error);
  }
}

// Run the analysis
analyzePostContent().catch(error => {
  console.error('Error:', error);
});
