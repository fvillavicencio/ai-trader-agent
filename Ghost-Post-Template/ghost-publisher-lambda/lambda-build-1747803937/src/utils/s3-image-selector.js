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
  console.log(`IMAGE SELECTION START - Selecting image for title: "${title}" with provided sentiment: ${sentiment}`);
  console.log(`IMAGE SELECTION CONFIG - Avoid recent: ${avoidRecent}, Current time: ${new Date().toISOString()}`);
  
  // Determine the sentiment from the title if not provided
  const determinedSentiment = sentiment || determineSentimentFromTitle(title);
  console.log(`Determined sentiment from title: ${determinedSentiment}`);
  
  // Get the last used image from /tmp if it exists
  let lastUsedImage = null;
  try {
    if (fs.existsSync('/tmp/last-used-image.json')) {
      const lastUsedData = JSON.parse(fs.readFileSync('/tmp/last-used-image.json', 'utf8'));
      lastUsedImage = lastUsedData.url;
      console.log(`LAST USED IMAGE - Found in /tmp: ${lastUsedImage}`);
      console.log(`LAST USED IMAGE - Timestamp: ${lastUsedData.timestamp || 'not recorded'}`);
    } else {
      console.log('LAST USED IMAGE - No last-used-image.json file found in /tmp');
    }
  } catch (error) {
    console.warn('Error reading last used image:', error.message);
  }
  
  // Check if we have a specific mapping for this title
  const exactTitleMatch = titleImageMappings[title];
  if (exactTitleMatch) {
    const matchUrl = `${baseS3Url}${exactTitleMatch}`;
    console.log(`Found exact title match: ${matchUrl}`);
    
    // Save this as the last used image
    saveLastUsedImage(matchUrl);
    console.log(`EXACT MATCH SELECTED - Using exact title match: ${matchUrl}`);
    
    return {
      url: matchUrl,
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
    // Get all available images for this sentiment
    console.log(`CATALOG SELECTION - Requesting all images for sentiment: ${determinedSentiment}`);
    const allImages = imageCatalog.getAllImagesForSentiment(determinedSentiment);
    
    if (!allImages || allImages.length === 0) {
      console.log(`CATALOG SELECTION FAILURE - No images found for sentiment: ${determinedSentiment}`);
      // Fallback to default image
      const fallbackImage = getFallbackImage(determinedSentiment);
      saveLastUsedImage(fallbackImage.url);
      return fallbackImage;
    }
    
    console.log(`CATALOG SELECTION - Found ${allImages.length} images for sentiment: ${determinedSentiment}`);
    
    // Filter out the last used image if we have more than one option
    let availableImages = allImages;
    if (lastUsedImage && allImages.length > 1 && avoidRecent) {
      availableImages = allImages.filter(img => img.url !== lastUsedImage);
      console.log(`CATALOG SELECTION - Filtered out last used image, now have ${availableImages.length} options`);
    }
    
    // Use a combination of time and title hash for selection
    const now = new Date();
    const timeComponent = now.getHours() * 10000 + now.getMinutes() * 100 + now.getSeconds() + now.getMilliseconds();
    
    // Create a hash from the title
    let titleHash = 0;
    for (let i = 0; i < title.length; i++) {
      titleHash = ((titleHash << 5) - titleHash) + title.charCodeAt(i);
      titleHash = titleHash & titleHash; // Convert to 32bit integer
    }
    titleHash = Math.abs(titleHash);
    
    // Combine time and title factors
    const selectionFactor = (timeComponent + titleHash) % availableImages.length;
    
    console.log(`SELECTION FACTORS - Time component: ${timeComponent}, Title hash: ${titleHash}`);
    console.log(`SELECTION FACTORS - Combined factor: ${selectionFactor} (mod ${availableImages.length})`);
    
    // Select an image based on the combined factor
    const selectedImage = availableImages[selectionFactor];
    
    console.log(`CATALOG SELECTION SUCCESS - Selected image: ${selectedImage.url}`);
    console.log(`CATALOG SELECTION METADATA - Index: ${selectionFactor}, Total options: ${availableImages.length}`);
    
    // Check if this is the same as the last used image
    if (lastUsedImage === selectedImage.url) {
      console.warn(`WARNING: Selected image is the same as last used image despite avoidance: ${selectedImage.url}`);
    }
    
    // Save this as the last used image
    saveLastUsedImage(selectedImage.url);
    
    return selectedImage;
  } catch (error) {
    console.error('Error selecting image from catalog:', error);
    const fallbackImage = getFallbackImage(determinedSentiment);
    saveLastUsedImage(fallbackImage.url);
    return fallbackImage;
  }
}

/**
 * Save the last used image URL to a file in /tmp
 * @param {string} url - The URL of the last used image
 */
function saveLastUsedImage(url) {
  try {
    const lastUsedData = {
      url: url,
      timestamp: new Date().toISOString()
    };
    
    fs.writeFileSync('/tmp/last-used-image.json', JSON.stringify(lastUsedData, null, 2));
    console.log(`LAST USED IMAGE SAVED - URL: ${url}`);
    console.log(`LAST USED IMAGE SAVED - Timestamp: ${lastUsedData.timestamp}`);
    
    // Also try to save to S3 for more persistent storage
    try {
      const AWS = { S3: require('aws-sdk/clients/s3') };
      const s3 = new AWS.S3({ region });
      
      s3.putObject({
        Bucket: bucketName,
        Key: 'last-used-image.json',
        Body: JSON.stringify(lastUsedData, null, 2),
        ContentType: 'application/json'
      }).promise()
        .then(() => console.log('Successfully saved last used image to S3'))
        .catch(err => console.warn('Failed to save last used image to S3:', err.message));
    } catch (error) {
      console.warn('Error saving last used image to S3:', error.message);
    }
  } catch (error) {
    console.warn('Error saving last used image:', error.message);
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
  
  // Get the image path based on sentiment
  const imagePath = DEFAULT_IMAGES[sentiment] || DEFAULT_IMAGES.neutral;
  
  // Ensure the URL is properly formatted
  // Make sure we don't have double slashes between the base URL and the path
  const url = imagePath.startsWith('/') 
    ? `${baseS3Url}${imagePath}` 
    : `${baseS3Url}/${imagePath}`;
  
  console.log(`Fallback image selected: ${url}`);
  
  return {
    url: url,
    localPath: imagePath,
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
  determineSentimentFromTitle,
  getFallbackImage,
  saveLastUsedImage
};
