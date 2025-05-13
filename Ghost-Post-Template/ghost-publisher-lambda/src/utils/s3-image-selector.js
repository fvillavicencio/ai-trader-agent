/**
 * S3 Image Selector
 * 
 * This module selects appropriate images from S3 based on sentiment categories and titles.
 * It uses the image-catalog.js module to manage and select from a comprehensive catalog
 * of available images.
 */

const fs = require('fs');
const path = require('path');
const imageCatalog = require('./image-catalog');

// S3 configuration
const region = process.env.AWS_REGION || 'us-east-2';
const bucketName = process.env.S3_BUCKET || 'market-pulse-daily-title-images';
const baseS3Url = `https://${bucketName}.s3.${region}.amazonaws.com`;

// Title image mappings (for exact title matches)
let titleImageMappings = {};

/**
 * Initialize the image selector
 * This loads all verified images and prepares them for selection
 */
async function initializeImageSelector() {
  console.log('Initializing S3 image selector...');
  
  // Initialize the image catalog
  await imageCatalog.initializeImageCatalog();
  
  // Load title image mappings
  loadTitleImageMappings();
  
  console.log('S3 image selector initialized successfully');
}

/**
 * Load title image mappings from JSON file
 * These are used for exact title matches
 */
function loadTitleImageMappings() {
  try {
    const mappingsPath = path.resolve(__dirname, '../../title-image-mappings.json');
    
    if (fs.existsSync(mappingsPath)) {
      const mappingsData = fs.readFileSync(mappingsPath, 'utf8');
      titleImageMappings = JSON.parse(mappingsData);
      console.log(`Loaded ${Object.keys(titleImageMappings).length} title image mappings`);
    } else {
      console.log('No title image mappings file found, using defaults');
      titleImageMappings = {};
    }
  } catch (error) {
    console.log('Error loading title image mappings:', error);
    titleImageMappings = {};
  }
}

/**
 * Get an S3 image for a title with a specific sentiment
 * @param {string} title - The title to get an image for
 * @param {string} sentiment - The sentiment of the title (bullish, bearish, neutral, volatile)
 * @param {boolean} avoidRecent - Whether to avoid recently used images
 * @returns {Object} - The selected image
 */
function getS3ImageForTitle(title, sentiment = 'neutral', avoidRecent = true) {
  console.log(`Selecting image for title: "${title}" with provided sentiment: ${sentiment}`);
  
  // Determine the sentiment from the title if not provided
  const determinedSentiment = sentiment || determineSentimentFromTitle(title);
  console.log(`Determined sentiment from title: ${determinedSentiment}`);
  
  // Check if we have a specific mapping for this title
  const exactTitleMatch = titleImageMappings[title];
  if (exactTitleMatch) {
    console.log(`Found exact title match: ${exactTitleMatch}`);
    return {
      url: `${baseS3Url}${exactTitleMatch}`,
      localPath: exactTitleMatch,
      metadata: {
        sentiment: determinedSentiment,
        category: 'title_match',
        description: `Exact match for title: ${title}`
      }
    };
  }
  
  // Use the image catalog to select an appropriate image
  try {
    const selectedImage = imageCatalog.getImageForTitle(title, determinedSentiment);
    return selectedImage;
  } catch (error) {
    console.error('Error selecting image from catalog:', error);
    return getFallbackImage(determinedSentiment);
  }
}

/**
 * Determine sentiment from title keywords
 * @param {string} title - The title to analyze
 * @returns {string} - The determined sentiment
 */
function determineSentimentFromTitle(title) {
  const lowerTitle = title.toLowerCase();
  
  // Bullish keywords
  if (lowerTitle.includes('bull') || 
      lowerTitle.includes('rally') || 
      lowerTitle.includes('surge') || 
      lowerTitle.includes('soar') || 
      lowerTitle.includes('jump') || 
      lowerTitle.includes('gain') || 
      lowerTitle.includes('rise') || 
      lowerTitle.includes('up') || 
      lowerTitle.includes('high') || 
      lowerTitle.includes('green')) {
    return 'bullish';
  }
  
  // Bearish keywords
  if (lowerTitle.includes('bear') || 
      lowerTitle.includes('crash') || 
      lowerTitle.includes('fall') || 
      lowerTitle.includes('drop') || 
      lowerTitle.includes('plunge') || 
      lowerTitle.includes('sink') || 
      lowerTitle.includes('down') || 
      lowerTitle.includes('low') || 
      lowerTitle.includes('red')) {
    return 'bearish';
  }
  
  // Volatile keywords
  if (lowerTitle.includes('volatil') || 
      lowerTitle.includes('swing') || 
      lowerTitle.includes('turbulent') || 
      lowerTitle.includes('roller') || 
      lowerTitle.includes('coaster') || 
      lowerTitle.includes('wild') || 
      lowerTitle.includes('storm') || 
      lowerTitle.includes('whiplash')) {
    return 'volatile';
  }
  
  // Default to neutral
  return 'neutral';
}

/**
 * Get a fallback image for a sentiment
 * Only used if the catalog fails to provide an image
 * @param {string} sentiment - The sentiment to get a fallback image for
 * @returns {Object} - The fallback image
 */
function getFallbackImage(sentiment) {
  // Default image paths (used as absolute last resort)
  const DEFAULT_IMAGES = {
    bullish: '/bullish/greed_is_good/gordon_gekko_wall_street_businessman.jpg',
    bearish: '/bearish/bears_in_control/bear_market_chart_10.jpg',
    neutral: '/neutral/just_wait/clock_waiting_room_10.jpg',
    volatile: '/volatile/buckle_up/car_seatbelt_warning_1.jpg'
  };
  
  return {
    url: `${baseS3Url}${DEFAULT_IMAGES[sentiment] || DEFAULT_IMAGES.neutral}`,
    localPath: DEFAULT_IMAGES[sentiment] || DEFAULT_IMAGES.neutral,
    metadata: {
      sentiment: sentiment,
      category: 'default',
      description: `Default image for ${sentiment}`
    }
  };
}

// Export the functions
module.exports = {
  initializeImageSelector,
  getS3ImageForTitle,
  baseS3Url
};
