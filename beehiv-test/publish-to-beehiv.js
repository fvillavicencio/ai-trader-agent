/**
 * Market Pulse Daily - Beehiv Publisher
 * 
 * This script publishes the Market Pulse Daily report to Beehiv using their API.
 * It takes the HTML content generated for Ghost and adapts it for Beehiv publishing.
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');

// Load environment variables from .env file
const loadEnv = () => {
  try {
    const envPath = path.join(__dirname, 'src', '.env');
    const envContent = fs.readFileSync(envPath, 'utf8');
    
    // Parse .env file content
    const envVars = {};
    envContent.split('\n').forEach(line => {
      const match = line.match(/^([^=]+)="([^"]+)"$/);
      if (match) {
        envVars[match[1]] = match[2];
      }
    });
    
    return envVars;
  } catch (error) {
    console.error('Error loading .env file:', error);
    return {};
  }
};

/**
 * Determines if the content should be premium based on the time of day
 * Premium content is published before 4:30 PM ET
 * @returns {boolean} - Whether the content should be premium
 */
const isPremiumContent = () => {
  // Get current time in ET
  const now = new Date();
  const timeZone = 'America/New_York'; // ET timezone
  
  // Format the time to get hours and minutes
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour: 'numeric',
    minute: 'numeric',
    hour12: false
  });
  
  const timeString = formatter.format(now);
  const [hour, minute] = timeString.split(':').map(num => parseInt(num, 10));
  
  // Premium content is published before 4:30 PM ET
  return hour < 16 || (hour === 16 && minute < 30);
};

/**
 * Generates an engaging market-related title with a timestamp
 * @returns {string} - The formatted title
 */
const generateEngagingTitle = () => {
  const now = new Date();
  
  // Format time and date
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    hour: 'numeric',
    minute: 'numeric',
    hour12: true
  });
  
  const dateFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });
  
  const time = formatter.format(now);
  const date = dateFormatter.format(now);
  
  // List of market phrases to choose from
  const marketPhrases = [
    "Market Currents", "Market Pulse", "Market Whisper", "Market Musings", "Market Rhythms",
    "Market Beats", "Market Insights", "Market Signals", "Market Watch", "Market Movements"
  ];
  
  // List of emojis to choose from
  const emojis = ["📊", "📈", "📉", "💰", "🔍", "🎯", "💡", "⚡", "💫", "🌟"];
  
  // Randomly select a phrase and emoji
  const phrase = marketPhrases[Math.floor(Math.random() * marketPhrases.length)];
  const emoji = emojis[Math.floor(Math.random() * emojis.length)];
  
  // Return the formatted title
  return `${phrase} ${emoji} - ${date} ${time} ET`;
};

/**
 * Gets the standard tags for Market Pulse Daily posts
 * @returns {Array} - Array of tag strings
 */
const getStandardTags = () => {
  return [
    'Market Insights',
    'Daily Update',
    'Market Pulse'
  ];
};

// Load environment variables
const env = loadEnv();

// Beehiv API configuration
const BEEHIV_API_URL = env.BEEHIV_API_URL || process.env.BEEHIV_API_URL || 'https://api.beehiiv.com/v2';
const BEEHIV_API_KEY = env.BEEHIV_API_KEY || process.env.BEEHIV_API_KEY;
const BEEHIV_PUBLICATION_ID = env.BEEHIV_PUBLICATION_ID || process.env.BEEHIV_PUBLICATION_ID;

// Load the HTML content from the Ghost post
const loadHtmlContent = () => {
  try {
    const htmlPath = path.join(__dirname, 'Latest_Trading_Analysis.html');
    const htmlContent = fs.readFileSync(htmlPath, 'utf8');
    
    // Extract the main content from the HTML (removing header, footer, etc.)
    // This is a simple extraction - you may need to adjust based on your HTML structure
    const contentMatch = htmlContent.match(/<main[^>]*>([\s\S]*?)<\/main>/i);
    if (contentMatch && contentMatch[1]) {
      return contentMatch[1].trim();
    }
    
    // If we can't extract the main content, return the full HTML
    console.warn('Could not extract main content from HTML, using full HTML content');
    return htmlContent;
  } catch (error) {
    console.error('Error loading HTML content:', error);
    process.exit(1);
  }
};

// Load the data JSON to get metadata
const loadData = () => {
  try {
    const dataPath = path.join(__dirname, 'full-dataset.json');
    const rawData = fs.readFileSync(dataPath, 'utf8');
    return JSON.parse(rawData);
  } catch (error) {
    console.error('Error loading data:', error);
    process.exit(1);
  }
};

/**
 * Publishes content to Beehiv using their API
 * @param {Object} postData - The data for the post
 * @returns {Promise} - The API response
 */
const publishToBeehiv = async (postData) => {
  try {
    console.log('Sending request to Beehiv API...');
    
    const response = await axios({
      method: 'POST',
      url: `${BEEHIV_API_URL}/publications/${BEEHIV_PUBLICATION_ID}/posts`,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${BEEHIV_API_KEY}`,
        'Accept': 'application/json'
      },
      data: postData
    });
    
    console.log('Beehiv API response status:', response.status);
    return response.data;
  } catch (error) {
    console.error('Error publishing to Beehiv:');
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      console.error('Response data:', error.response.data);
      console.error('Response status:', error.response.status);
      console.error('Response headers:', error.response.headers);
    } else if (error.request) {
      // The request was made but no response was received
      console.error('No response received:', error.request);
    } else {
      // Something happened in setting up the request that triggered an Error
      console.error('Error message:', error.message);
    }
    throw error;
  }
};

// Main function
const main = async () => {
  try {
    // Check if API key is set
    if (!BEEHIV_API_KEY) {
      console.error('Error: Beehiv API key not set. Please set the BEEHIV_API_KEY environment variable or add it to the .env file.');
      process.exit(1);
    }
    
    // Check if publication ID is set
    if (!BEEHIV_PUBLICATION_ID) {
      console.error('Error: Beehiv Publication ID not set. Please set the BEEHIV_PUBLICATION_ID environment variable or add it to the .env file.');
      process.exit(1);
    }
    
    // Load the HTML content and data
    const htmlContent = loadHtmlContent();
    const data = loadData();
    
    console.log('Publishing post to Beehiv...');
    console.log(`Using Beehiv API URL: ${BEEHIV_API_URL}`);
    
    // Generate an engaging title
    const title = generateEngagingTitle();
    console.log(`Generated title: ${title}`);
    
    // Determine if content should be premium based on time of day
    const premium = isPremiumContent();
    console.log(`Content type: ${premium ? 'Premium (Paid subscribers only)' : 'Standard (All subscribers)'}`);
    
    // Prepare the post data for Beehiv
    const postData = {
      publication_id: BEEHIV_PUBLICATION_ID,
      title: title,
      body_html: htmlContent,
      status: 'draft', // Start as draft to review before publishing
      free: !premium, // Set to true for free content, false for premium
      subtitle: data.decision ? data.decision.summary : 'Market analysis and trading insights',
      thumbnail_url: env.FEATURE_IMAGE_URL || null, // Optional feature image URL
      slug: title.toLowerCase().replace(/[^\w\s]/gi, '').replace(/\s+/g, '-'),
      seo_title: title,
      seo_description: data.decision ? data.decision.summary : 'Market analysis and trading insights',
      tags: getStandardTags()
    };
    
    // Publish to Beehiv
    const response = await publishToBeehiv(postData);
    
    console.log('Post published successfully to Beehiv!');
    console.log(`Post ID: ${response.id}`);
    console.log(`Post URL: ${response.url || 'URL not available'}`);
    
    return response;
  } catch (error) {
    console.error('Error in main function:', error);
    process.exit(1);
  }
};

// Run the main function
main();
