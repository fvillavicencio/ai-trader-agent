/**
 * S3 Image Selector
 * 
 * This module selects an appropriate image from S3 for a given title based on its sentiment category.
 * It uses the same mapping logic as the local image selector but returns S3 URLs.
 */

const fs = require('fs');
const path = require('path');

// Load S3 configuration from JSON file
let s3Config = {};
try {
  const configPath = path.resolve(__dirname, '../../../title-images/s3-config.json');
  if (fs.existsSync(configPath)) {
    s3Config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  }
} catch (error) {
  console.error('Error loading S3 config:', error);
}

// Load image mappings from JSON file
let s3ImageMappings = {};
try {
  const mappingsPath = path.resolve(__dirname, '../../../title-images/s3-image-mappings.json');
  if (fs.existsSync(mappingsPath)) {
    s3ImageMappings = JSON.parse(fs.readFileSync(mappingsPath, 'utf8'));
  }
} catch (error) {
  console.error('Error loading S3 image mappings:', error);
}

// Import the local image selector for consistent mapping logic
const { getImageForTitle: getLocalImagePath } = require('./title-image-selector');

// Sentiment folder mappings for fallback selection
const sentimentFolders = {
  bullish: ["bullish/bulls_on_parade", "bullish/green_across_board", "bullish/to_the_moon"],
  bearish: ["bearish/bears_in_control", "bearish/the_correction_is_coming", "bearish/winter_is_coming"],
  neutral: ["neutral/mixed_signals", "neutral/the_waiting_game", "neutral/the_crossroads"],
  volatile: ["volatile/wild_ride", "volatile/the_perfect_storm", "volatile/market_whiplash"]
};

/**
 * Get an S3 URL for an image appropriate for the given title
 * @param {string} title - The title to find an image for
 * @param {string} sentiment - The sentiment category (bullish, bearish, neutral, volatile)
 * @returns {object} - Object containing the S3 URL and metadata
 */
function getS3ImageForTitle(title, sentiment = 'neutral') {
  try {
    // Use the local image selector to get the relative path
    const localImagePath = getLocalImagePath(title, sentiment);
    
    if (!localImagePath) {
      console.warn('No local image path found for title:', title);
      // Try to find a random image from the sentiment category
      return getRandomS3ImageForSentiment(sentiment);
    }
    
    // Check if we have this image in our S3 mappings
    const s3Url = s3ImageMappings[localImagePath];
    
    if (s3Url) {
      // Return the S3 URL and metadata
      return {
        url: s3Url,
        localPath: localImagePath,
        metadata: getImageMetadataFromLocalPath(localImagePath)
      };
    }
    
    // If no mapping found, construct the S3 URL based on the local path
    const constructedS3Url = `${s3Config.baseUrl || ''}/${localImagePath}`;
    
    return {
      url: constructedS3Url,
      localPath: localImagePath,
      metadata: getImageMetadataFromLocalPath(localImagePath)
    };
  } catch (error) {
    console.error('Error getting S3 image for title:', error);
    // Try to find a random image from the sentiment category as a fallback
    return getRandomS3ImageForSentiment(sentiment);
  }
}

/**
 * Get a random S3 image for a given sentiment category
 * @param {string} sentiment - The sentiment category (bullish, bearish, neutral, volatile)
 * @returns {object} - Object containing the S3 URL and metadata
 */
function getRandomS3ImageForSentiment(sentiment = 'neutral') {
  try {
    // Get all images for this sentiment category from the mappings
    const sentimentImages = Object.keys(s3ImageMappings).filter(path => 
      path.startsWith(sentiment + '/') || 
      // Also include images from subdirectories
      Object.keys(sentimentFolders || {}).some(key => 
        key === sentiment && sentimentFolders[key].some(folder => 
          path.startsWith(folder + '/')
        )
      )
    );
    
    if (sentimentImages.length > 0) {
      // Select a random image from the sentiment category
      const randomImagePath = sentimentImages[Math.floor(Math.random() * sentimentImages.length)];
      const s3Url = s3ImageMappings[randomImagePath] || `${s3Config.baseUrl || ''}/${randomImagePath}`;
      
      console.log(`Selected random image for sentiment ${sentiment}: ${randomImagePath}`);
      
      return {
        url: s3Url,
        localPath: randomImagePath,
        metadata: getImageMetadataFromLocalPath(randomImagePath)
      };
    }
    
    // If no images found for this sentiment, try any sentiment
    const allImages = Object.keys(s3ImageMappings);
    if (allImages.length > 0) {
      const randomImagePath = allImages[Math.floor(Math.random() * allImages.length)];
      const s3Url = s3ImageMappings[randomImagePath] || `${s3Config.baseUrl || ''}/${randomImagePath}`;
      
      console.log(`Selected random image from all available: ${randomImagePath}`);
      
      return {
        url: s3Url,
        localPath: randomImagePath,
        metadata: getImageMetadataFromLocalPath(randomImagePath)
      };
    }
    
    console.warn('No S3 images found in mappings');
    return null;
  } catch (error) {
    console.error('Error getting random S3 image:', error);
    return null;
  }
}

/**
 * Get image metadata from the local path
 * @param {string} localPath - The local path to the image
 * @returns {object} - Image metadata
 */
function getImageMetadataFromLocalPath(localPath) {
  try {
    // Try to load the image-data.json file
    const imageDataPath = path.resolve(__dirname, '../../../title-images/image-data.json');
    
    if (!fs.existsSync(imageDataPath)) {
      return {
        path: localPath,
        attribution: 'Photos provided by Pexels'
      };
    }
    
    const imageData = JSON.parse(fs.readFileSync(imageDataPath, 'utf8'));
    
    // Extract the directory path from the local path
    const dirPath = path.dirname(localPath);
    
    // Check if we have metadata for this directory
    if (imageData[dirPath]) {
      // Find the metadata for this specific image
      const fileName = path.basename(localPath);
      const imageMetadata = imageData[dirPath].find(item => 
        item.url && item.url.includes(fileName) || 
        (item.id && fileName.includes(item.id))
      );
      
      if (imageMetadata) {
        return {
          path: localPath,
          attribution: `Photo by ${imageMetadata.photographer || 'Unknown'}`,
          photographerUrl: imageMetadata.photographerUrl || '',
          source: 'Pexels'
        };
      }
    }
    
    // Default metadata if nothing specific is found
    return {
      path: localPath,
      attribution: 'Photos provided by Pexels'
    };
  } catch (error) {
    console.error('Error getting image metadata:', error);
    return {
      path: localPath,
      attribution: 'Photos provided by Pexels'
    };
  }
}

module.exports = {
  getS3ImageForTitle,
  getRandomS3ImageForSentiment,
  getImageMetadataFromLocalPath,
  s3Config
};
