/**
 * Image Catalog
 * 
 * This module maintains a comprehensive catalog of all available images
 * organized by sentiment, category, and other attributes.
 * It provides functions to select images with proper randomization
 * and avoids repetition.
 */

const fs = require('fs');
const path = require('path');
// Only import the S3 service to avoid dependency issues
const AWS = { S3: require('aws-sdk/clients/s3') };

// Initialize the image catalog
let imageCatalog = {
  // Organized by sentiment
  sentiments: {
    bullish: [],
    bearish: [],
    neutral: [],
    volatile: []
  },
  // Organized by category
  categories: {},
  // All images in a flat array
  allImages: [],
  // Track usage statistics
  usage: {
    lastUsed: {},
    usageCount: {}
  },
  // Metadata
  metadata: {
    lastUpdated: null,
    totalCount: 0
  }
};

// Track recently used images to avoid repetition
const recentlyUsedImages = new Set();
const recentlyUsedByCategory = {};
const MAX_RECENT_IMAGES = 50; // Avoid reusing the last 50 images
const MAX_RECENT_PER_CATEGORY = 10; // Avoid reusing the last 10 images per category

// S3 configuration from environment variables
const region = process.env.AWS_REGION || 'us-east-2';
const bucketName = process.env.S3_BUCKET || 'market-pulse-daily-title-images';
const baseS3Url = `https://${bucketName}.s3.${region}.amazonaws.com`;

/**
 * Initialize the image catalog from verified-images.json
 * If the file doesn't exist, scan the S3 bucket directly
 */
async function initializeImageCatalog() {
  console.log('Initializing image catalog...');
  
  // Try to load from verified-images.json first
  const verifiedImagesPath = findVerifiedImagesFile();
  
  if (verifiedImagesPath && fs.existsSync(verifiedImagesPath)) {
    try {
      const verifiedImagesData = fs.readFileSync(verifiedImagesPath, 'utf8');
      const verifiedImagesJson = JSON.parse(verifiedImagesData);
      
      if (verifiedImagesJson.images && verifiedImagesJson.images.length > 0) {
        console.log(`Found ${verifiedImagesJson.images.length} images in verified-images.json`);
        processVerifiedImages(verifiedImagesJson.images);
        return true;
      }
    } catch (error) {
      console.error('Error loading verified images file:', error);
    }
  }
  
  // If we couldn't load from file, scan S3 directly
  console.log('No verified images file found or it was empty, scanning S3 bucket...');
  try {
    const images = await scanS3Bucket();
    if (images.length > 0) {
      processVerifiedImages(images);
      return true;
    }
  } catch (error) {
    console.error('Error scanning S3 bucket:', error);
  }
  
  // If all else fails, use default images
  console.log('Using default images as fallback');
  useDefaultImages();
  return false;
}

/**
 * Find the verified-images.json file
 */
function findVerifiedImagesFile() {
  const possiblePaths = [
    path.resolve(__dirname, '../../../verified-images.json'),
    path.resolve(__dirname, '../../verified-images.json'),
    '/tmp/verified-images.json'
  ];
  
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      console.log(`Found verified images at: ${p}`);
      return p;
    }
  }
  
  return null;
}

/**
 * Process verified images into the catalog
 */
function processVerifiedImages(images) {
  // Reset the catalog
  resetCatalog();
  
  // Process each image
  images.forEach(image => {
    const sentiment = image.sentiment || 'neutral';
    const normalizedSentiment = ['bullish', 'bearish', 'neutral', 'volatile'].includes(sentiment) 
      ? sentiment 
      : 'neutral';
    
    const category = image.category || 'default';
    
    // Add to sentiments
    imageCatalog.sentiments[normalizedSentiment].push(image);
    
    // Add to categories
    if (!imageCatalog.categories[category]) {
      imageCatalog.categories[category] = [];
    }
    imageCatalog.categories[category].push(image);
    
    // Add to all images
    imageCatalog.allImages.push(image);
    
    // Initialize usage tracking
    imageCatalog.usage.lastUsed[image.url] = null;
    imageCatalog.usage.usageCount[image.url] = 0;
  });
  
  // Update metadata
  imageCatalog.metadata.lastUpdated = new Date().toISOString();
  imageCatalog.metadata.totalCount = imageCatalog.allImages.length;
  
  // Log statistics
  logCatalogStatistics();
}

/**
 * Reset the catalog to empty state
 */
function resetCatalog() {
  imageCatalog.sentiments.bullish = [];
  imageCatalog.sentiments.bearish = [];
  imageCatalog.sentiments.neutral = [];
  imageCatalog.sentiments.volatile = [];
  imageCatalog.categories = {};
  imageCatalog.allImages = [];
  imageCatalog.usage.lastUsed = {};
  imageCatalog.usage.usageCount = {};
}

/**
 * Log statistics about the catalog
 */
function logCatalogStatistics() {
  console.log(`Image Catalog Statistics:`);
  console.log(`Total images: ${imageCatalog.metadata.totalCount}`);
  console.log(`Bullish images: ${imageCatalog.sentiments.bullish.length}`);
  console.log(`Bearish images: ${imageCatalog.sentiments.bearish.length}`);
  console.log(`Neutral images: ${imageCatalog.sentiments.neutral.length}`);
  console.log(`Volatile images: ${imageCatalog.sentiments.volatile.length}`);
  console.log(`Categories: ${Object.keys(imageCatalog.categories).length}`);
  
  // Log top 5 categories by image count
  const topCategories = Object.entries(imageCatalog.categories)
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, 5);
  
  console.log('Top 5 categories:');
  topCategories.forEach(([category, images]) => {
    console.log(`  - ${category}: ${images.length} images`);
  });
}

/**
 * Scan the S3 bucket for images
 */
async function scanS3Bucket() {
  const s3 = new AWS.S3({ region });
  const images = [];
  
  try {
    // List all objects in the bucket
    const params = {
      Bucket: bucketName,
      MaxKeys: 1000 // Get up to 1000 objects at a time
    };
    
    let isTruncated = true;
    let continuationToken = null;
    
    while (isTruncated) {
      if (continuationToken) {
        params.ContinuationToken = continuationToken;
      }
      
      const response = await s3.listObjectsV2(params).promise();
      
      // Process objects
      for (const object of response.Contents) {
        const key = object.Key;
        
        // Only process image files
        if (key.match(/\.(jpg|jpeg|png|gif)$/i)) {
          const parts = key.split('/');
          
          // Extract sentiment and category from the path
          if (parts.length >= 2) {
            const sentiment = parts[0];
            const category = parts[1];
            
            // Only add if it's a valid sentiment
            if (['bullish', 'bearish', 'neutral', 'volatile'].includes(sentiment)) {
              const image = {
                url: `${baseS3Url}/${key}`,
                sentiment: sentiment,
                category: category,
                description: key.replace(/\//g, ' ').replace(/\.(jpg|jpeg|png|gif)$/i, '')
              };
              
              images.push(image);
            }
          }
        }
      }
      
      // Check if there are more objects to fetch
      isTruncated = response.IsTruncated;
      if (isTruncated) {
        continuationToken = response.NextContinuationToken;
      }
    }
    
    console.log(`Found ${images.length} images in S3 bucket`);
    
    // Save to verified-images.json for future use
    if (images.length > 0) {
      const verifiedImagesJson = {
        images: images,
        lastUpdated: new Date().toISOString()
      };
      
      try {
        fs.writeFileSync('/tmp/verified-images.json', JSON.stringify(verifiedImagesJson, null, 2));
        console.log(`Saved ${images.length} verified images to /tmp for future use`);
      } catch (error) {
        console.error('Error saving verified images to /tmp:', error);
      }
    }
    
    return images;
  } catch (error) {
    console.error('Error scanning S3 bucket:', error);
    return [];
  }
}

/**
 * Use default images as fallback
 */
function useDefaultImages() {
  // Define default images for each sentiment
  const defaultImages = [
    {
      url: `${baseS3Url}/bullish/greed_is_good/gordon_gekko_wall_street_businessman.jpg`,
      sentiment: 'bullish',
      category: 'greed_is_good',
      description: 'Gordon Gekko Wall Street businessman'
    },
    {
      url: `${baseS3Url}/bearish/bears_in_control/bear_market_chart_10.jpg`,
      sentiment: 'bearish',
      category: 'bears_in_control',
      description: 'Bear market chart'
    },
    {
      url: `${baseS3Url}/neutral/just_wait/clock_waiting_room_10.jpg`,
      sentiment: 'neutral',
      category: 'just_wait',
      description: 'Clock waiting room'
    },
    {
      url: `${baseS3Url}/volatile/buckle_up/car_seatbelt_warning_1.jpg`,
      sentiment: 'volatile',
      category: 'buckle_up',
      description: 'Car seatbelt warning'
    }
  ];
  
  processVerifiedImages(defaultImages);
}

/**
 * Get an image for a title with a specific sentiment
 */
function getImageForTitle(title, sentiment = 'neutral') {
  // Ensure the catalog is initialized
  if (imageCatalog.allImages.length === 0) {
    throw new Error('Image catalog not initialized. Call initializeImageCatalog() first.');
  }
  
  console.log(`Selecting image for title: "${title}" with sentiment: ${sentiment}`);
  
  // Normalize sentiment
  const normalizedSentiment = ['bullish', 'bearish', 'neutral', 'volatile'].includes(sentiment) 
    ? sentiment 
    : 'neutral';
  
  // Get available images for this sentiment
  const availableImages = imageCatalog.sentiments[normalizedSentiment];
  
  if (!availableImages || availableImages.length === 0) {
    console.log(`No images found for sentiment: ${normalizedSentiment}, using fallback`);
    return getFallbackImage(normalizedSentiment);
  }
  
  console.log(`Found ${availableImages.length} images for sentiment: ${normalizedSentiment}`);
  
  // Step 1: Try to find images by title keywords
  const matchedByTitle = findImagesByTitleKeywords(title, availableImages);
  if (matchedByTitle.length > 0) {
    return selectImageFromCandidates(matchedByTitle, title);
  }
  
  // Step 2: Try to find images by category
  const matchedByCategory = findImagesByCategory(title, availableImages);
  if (matchedByCategory.length > 0) {
    return selectImageFromCandidates(matchedByCategory, title);
  }
  
  // Step 3: Use all available images for this sentiment
  return selectImageFromCandidates(availableImages, title);
}

/**
 * Find images that match keywords in the title
 */
function findImagesByTitleKeywords(title, availableImages) {
  const titleWords = title.toLowerCase().split(/\s+/).map(word => word.replace(/[^a-z0-9]/g, ''));
  const matches = [];
  
  // Character-specific keywords
  const characterKeywords = {
    'gekko': 'gordon_gekko',
    'gordon': 'gordon_gekko',
    'wolf': 'wolf_of_wall_street',
    'jordan': 'jordan_belfort',
    'belfort': 'jordan_belfort',
    'burry': 'michael_burry',
    'michael': 'michael_burry',
    'buffett': 'warren_buffett',
    'warren': 'warren_buffett'
  };
  
  // Check for character keywords
  for (const word of titleWords) {
    if (characterKeywords[word]) {
      const characterMatches = availableImages.filter(img => 
        img.url.toLowerCase().includes(characterKeywords[word].toLowerCase())
      );
      
      if (characterMatches.length > 0) {
        console.log(`Found character match for "${word}" in title`);
        return characterMatches;
      }
    }
  }
  
  // Check for general keywords in the title
  for (const word of titleWords) {
    if (word.length < 3) continue; // Skip very short words
    
    const wordMatches = availableImages.filter(img => 
      img.description.toLowerCase().includes(word.toLowerCase()) ||
      img.category.toLowerCase().includes(word.toLowerCase())
    );
    
    if (wordMatches.length > 0) {
      console.log(`Found keyword match for "${word}" in title`);
      return wordMatches;
    }
  }
  
  return matches;
}

/**
 * Find images by category based on title
 */
function findImagesByCategory(title, availableImages) {
  // Map title keywords to categories
  const titleToCategory = {
    'wait': 'just_wait',
    'patience': 'just_wait',
    'bull': 'bulls_charge',
    'bear': 'bears_in_control',
    'crash': 'market_crash',
    'rally': 'market_rally',
    'volatile': 'buckle_up',
    'storm': 'the_perfect_storm',
    'roller': 'rollercoaster_day',
    'coaster': 'rollercoaster_day',
    'mixed': 'mixed_signals',
    'signal': 'mixed_signals',
    'greed': 'greed_is_good',
    'fear': 'fear_and_greed'
  };
  
  const titleWords = title.toLowerCase().split(/\s+/).map(word => word.replace(/[^a-z0-9]/g, ''));
  
  for (const word of titleWords) {
    if (titleToCategory[word]) {
      const category = titleToCategory[word];
      const categoryMatches = availableImages.filter(img => 
        img.category.toLowerCase() === category.toLowerCase()
      );
      
      if (categoryMatches.length > 0) {
        console.log(`Found category match for "${word}" -> "${category}"`);
        return categoryMatches;
      }
    }
  }
  
  return [];
}

/**
 * Select an image from a list of candidates
 */
function selectImageFromCandidates(candidates, title) {
  // Get the category of each candidate image
  const categorizedCandidates = {};
  
  candidates.forEach(img => {
    const category = img.category || 'default';
    if (!categorizedCandidates[category]) {
      categorizedCandidates[category] = [];
    }
    categorizedCandidates[category].push(img);
  });
  
  // Initialize category tracking if needed
  Object.keys(categorizedCandidates).forEach(category => {
    if (!recentlyUsedByCategory[category]) {
      recentlyUsedByCategory[category] = new Set();
    }
  });
  
  // Try to find a category that hasn't been used recently
  const availableCategories = Object.keys(categorizedCandidates).filter(
    category => recentlyUsedByCategory[category].size < categorizedCandidates[category].length
  );
  
  let selectedCategory;
  let selectedImage;
  
  if (availableCategories.length > 0) {
    // Randomly select from available categories
    const randomCategoryIndex = Math.floor(Math.random() * availableCategories.length);
    selectedCategory = availableCategories[randomCategoryIndex];
    console.log(`Selected category: ${selectedCategory} which has images not recently used`);
    
    // Get images from this category that haven't been used recently
    const categoryImages = categorizedCandidates[selectedCategory];
    const notRecentlyUsedInCategory = categoryImages.filter(
      img => !recentlyUsedByCategory[selectedCategory].has(img.url)
    );
    
    // Select a random image from the not recently used ones in this category
    const randomIndex = Math.floor(Math.random() * notRecentlyUsedInCategory.length);
    selectedImage = notRecentlyUsedInCategory[randomIndex];
    console.log(`Selected image not recently used from category ${selectedCategory}: ${selectedImage.url}`);
  } else {
    // If all categories have been exhausted, select the least recently used image overall
    const notRecentlyUsed = candidates.filter(img => !recentlyUsedImages.has(img.url));
    
    if (notRecentlyUsed.length > 0) {
      // Select a random image from the not recently used ones
      const randomIndex = Math.floor(Math.random() * notRecentlyUsed.length);
      selectedImage = notRecentlyUsed[randomIndex];
      selectedCategory = selectedImage.category || 'default';
      console.log(`Selected image not recently used overall: ${selectedImage.url}`);
    } else {
      // If all images have been recently used, select the least recently used one
      candidates.sort((a, b) => {
        const aLastUsed = imageCatalog.usage.lastUsed[a.url] || 0;
        const bLastUsed = imageCatalog.usage.lastUsed[b.url] || 0;
        return aLastUsed - bLastUsed;
      });
      
      selectedImage = candidates[0];
      selectedCategory = selectedImage.category || 'default';
      console.log(`All images recently used, selected least recently used: ${selectedImage.url}`);
    }
  }
  
  // Update usage tracking
  imageCatalog.usage.lastUsed[selectedImage.url] = Date.now();
  imageCatalog.usage.usageCount[selectedImage.url] = (imageCatalog.usage.usageCount[selectedImage.url] || 0) + 1;
  
  // Add to recently used sets
  recentlyUsedImages.add(selectedImage.url);
  if (selectedCategory) {
    if (!recentlyUsedByCategory[selectedCategory]) {
      recentlyUsedByCategory[selectedCategory] = new Set();
    }
    recentlyUsedByCategory[selectedCategory].add(selectedImage.url);
  }
  
  // Limit the size of recently used sets
  if (recentlyUsedImages.size > MAX_RECENT_IMAGES) {
    const firstItem = Array.from(recentlyUsedImages)[0];
    recentlyUsedImages.delete(firstItem);
  }
  
  if (selectedCategory && recentlyUsedByCategory[selectedCategory].size > MAX_RECENT_PER_CATEGORY) {
    const firstItem = Array.from(recentlyUsedByCategory[selectedCategory])[0];
    recentlyUsedByCategory[selectedCategory].delete(firstItem);
  }
  
  console.log(`Selected image: ${selectedImage.url}`);
  
  return {
    url: selectedImage.url,
    localPath: selectedImage.url.replace(baseS3Url + '/', ''),
    metadata: {
      sentiment: selectedImage.sentiment,
      category: selectedImage.category,
      description: selectedImage.description
    }
  };
}

/**
 * Get a fallback image for a sentiment
 */
function getFallbackImage(sentiment) {
  // Use environment variables if available
  const envVarName = `DEFAULT_${sentiment.toUpperCase()}_IMAGE`;
  if (process.env[envVarName]) {
    return {
      url: process.env[envVarName],
      localPath: process.env[envVarName].replace(baseS3Url + '/', ''),
      metadata: {
        sentiment: sentiment,
        category: 'default',
        description: `Default ${sentiment} image from environment variable`
      }
    };
  }
  
  // Otherwise use hardcoded defaults as absolute last resort
  const defaults = {
    bullish: `${baseS3Url}/bullish/greed_is_good/gordon_gekko_wall_street_businessman.jpg`,
    bearish: `${baseS3Url}/bearish/bears_in_control/bear_market_chart_10.jpg`,
    neutral: `${baseS3Url}/neutral/just_wait/clock_waiting_room_10.jpg`,
    volatile: `${baseS3Url}/volatile/buckle_up/car_seatbelt_warning_1.jpg`
  };
  
  return {
    url: defaults[sentiment] || defaults.neutral,
    localPath: defaults[sentiment].replace(baseS3Url + '/', '') || 'neutral/just_wait/clock_waiting_room_10.jpg',
    metadata: {
      sentiment: sentiment,
      category: 'default',
      description: `Default ${sentiment} image`
    }
  };
}

// Export the functions
module.exports = {
  initializeImageCatalog,
  getImageForTitle,
  imageCatalog
};
