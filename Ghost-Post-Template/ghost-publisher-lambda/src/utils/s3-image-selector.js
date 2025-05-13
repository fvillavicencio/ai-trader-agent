/**
 * Enhanced S3 Image Selector
 * 
 * This module selects an appropriate image from S3 for a given title based on its sentiment category and content.
 * It uses a comprehensive list of verified images that we know exist in the S3 bucket.
 * 
 * Features:
 * - Intelligent title-to-image matching based on keywords and sentiment
 * - Fallback mechanisms to ensure valid images are always returned
 * - Caching of verified images to improve performance
 * - Support for title-based image selection
 */

const fs = require('fs');
const path = require('path');

// Define the base S3 URL
const BASE_S3_URL = 'https://market-pulse-daily-title-images.s3.us-east-2.amazonaws.com';

// Default images for each sentiment category (we know these work)
const DEFAULT_IMAGES = {
  bullish: `${BASE_S3_URL}/bullish/greed_is_good/gordon_gekko_wall_street_businessman.jpg`,
  bearish: `${BASE_S3_URL}/bearish/the_correction_is_coming/michael_burry_big_short.jpg`,
  // Use bullish images as fallback for neutral and volatile since we don't have verified images for those sentiments
  neutral: `${BASE_S3_URL}/bullish/trend_is_friend/trend_is_friend_uptrend_chart_finance_1.jpg`,
  volatile: `${BASE_S3_URL}/volatile/the_perfect_storm/the_perfect_storm_converging_hurricanes_1.jpg`
};

// Title keywords that map to specific image categories
const TITLE_KEYWORD_MAP = {
  // Bullish keywords
  'bull': 'bullish',
  'green': 'bullish',
  'up': 'bullish',
  'rally': 'bullish',
  'growth': 'bullish',
  'opportunity': 'bullish',
  'greed': 'bullish',
  'gekko': 'bullish',
  'gordon': 'bullish',
  
  // Bearish keywords
  'bear': 'bearish',
  'red': 'bearish',
  'down': 'bearish',
  'sell': 'bearish',
  'correction': 'bearish',
  'crash': 'bearish',
  'burry': 'bearish',
  'michael': 'bearish',
  
  // Neutral keywords
  'wait': 'neutral',
  'hold': 'neutral',
  'patience': 'neutral',
  'caution': 'neutral',
  'mixed': 'neutral',
  'balance': 'neutral',
  'crossroads': 'neutral',
  
  // Volatile keywords
  'volatility': 'volatile',
  'vix': 'volatile',
  'wild': 'volatile',
  'swing': 'volatile',
  'turbulence': 'volatile',
  'roller': 'volatile',
  'coaster': 'volatile'
};

// Load verified images from JSON file
let verifiedImages = [];
let titleImageMappings = {};

try {
  // Try to load verified images
  const verifiedImagesPath = path.resolve(__dirname, '../../../verified-images.json');
  console.log(`Looking for verified images at: ${verifiedImagesPath}`);
  
  if (fs.existsSync(verifiedImagesPath)) {
    const verifiedImagesData = JSON.parse(fs.readFileSync(verifiedImagesPath, 'utf8'));
    verifiedImages = verifiedImagesData.images || [];
    console.log(`Loaded ${verifiedImages.length} verified images`);
    
    // Try to load title image mappings if available
    const titleMappingsPath = path.resolve(__dirname, '../../../title-image-mappings.json');
    if (fs.existsSync(titleMappingsPath)) {
      titleImageMappings = JSON.parse(fs.readFileSync(titleMappingsPath, 'utf8'));
      console.log(`Loaded title image mappings with ${Object.keys(titleImageMappings.keywords || {}).length} keywords`);
    }
  } else {
    console.warn('Verified images file not found, using default images');
    // Define default verified images if file doesn't exist
    verifiedImages = [
      {
        url: DEFAULT_IMAGES.bullish,
        sentiment: 'bullish',
        category: 'greed_is_good',
        description: 'Gordon Gekko Wall Street businessman'
      },
      {
        url: DEFAULT_IMAGES.bearish,
        sentiment: 'bearish',
        category: 'the_correction_is_coming',
        description: 'Michael Burry Big Short'
      },
      {
        url: DEFAULT_IMAGES.neutral,
        sentiment: 'neutral',
        category: 'mixed_signals',
        description: 'Balanced scale market neutral'
      },
      {
        url: DEFAULT_IMAGES.volatile,
        sentiment: 'volatile',
        category: 'wild_ride',
        description: 'Roller coaster market volatility'
      }
    ];
  }
} catch (error) {
  console.error('Error loading verified images:', error);
  // Define default verified images if there's an error
  verifiedImages = [
    {
      url: DEFAULT_IMAGES.bullish,
      sentiment: 'bullish',
      category: 'greed_is_good',
      description: 'Gordon Gekko Wall Street businessman'
    }
  ];
}

// Organize verified images by sentiment and category for faster lookup
const sentimentMap = {
  bullish: verifiedImages.filter(img => img.sentiment === 'bullish'),
  bearish: verifiedImages.filter(img => img.sentiment === 'bearish'),
  neutral: verifiedImages.filter(img => img.sentiment === 'neutral'),
  volatile: verifiedImages.filter(img => img.sentiment === 'volatile')
};

// Organize images by category for better matching
const categoryMap = {};
verifiedImages.forEach(img => {
  if (img.category) {
    if (!categoryMap[img.category]) {
      categoryMap[img.category] = [];
    }
    categoryMap[img.category].push(img);
  }
});

// Create a keyword map for better title matching
const keywordMap = {};
verifiedImages.forEach(img => {
  if (img.description) {
    const words = img.description.toLowerCase().split(' ');
    words.forEach(word => {
      if (!keywordMap[word]) {
        keywordMap[word] = [];
      }
      keywordMap[word].push(img);
    });
  }
});

// Ensure we have at least one image for each sentiment category
Object.keys(sentimentMap).forEach(sentiment => {
  if (sentimentMap[sentiment].length === 0) {
    // If no images for this sentiment, use the default image for that sentiment
    sentimentMap[sentiment] = [{
      url: DEFAULT_IMAGES[sentiment] || DEFAULT_IMAGES.neutral,
      sentiment: sentiment,
      category: 'default',
      description: 'Default image for ' + sentiment
    }];
  }
});

/**
 * Determine the most appropriate sentiment for a given title
 * @param {string} title - The title to analyze
 * @returns {string} - The most appropriate sentiment (bullish, bearish, neutral, volatile)
 */
function determineSentimentFromTitle(title) {
  if (!title) return 'neutral';
  
  const lowerTitle = title.toLowerCase();
  const words = lowerTitle.split(/\s+/);
  
  // Count sentiment keywords in the title
  const sentimentCounts = {
    bullish: 0,
    bearish: 0,
    neutral: 0,
    volatile: 0
  };
  
  // Check each word against our keyword map
  words.forEach(word => {
    const cleanWord = word.replace(/[^a-z0-9]/g, '');
    if (TITLE_KEYWORD_MAP[cleanWord]) {
      sentimentCounts[TITLE_KEYWORD_MAP[cleanWord]]++;
    }
  });
  
  // Check for specific phrases
  if (lowerTitle.includes('bull') || lowerTitle.includes('green') || lowerTitle.includes('up')) {
    sentimentCounts.bullish += 2;
  }
  if (lowerTitle.includes('bear') || lowerTitle.includes('red') || lowerTitle.includes('down')) {
    sentimentCounts.bearish += 2;
  }
  if (lowerTitle.includes('volatil') || lowerTitle.includes('wild') || lowerTitle.includes('roller')) {
    sentimentCounts.volatile += 2;
  }
  if (lowerTitle.includes('wait') || lowerTitle.includes('patient') || lowerTitle.includes('caution')) {
    sentimentCounts.neutral += 2;
  }
  
  // Find the sentiment with the highest count
  let maxCount = 0;
  let dominantSentiment = 'neutral'; // Default to neutral
  
  Object.keys(sentimentCounts).forEach(sentiment => {
    if (sentimentCounts[sentiment] > maxCount) {
      maxCount = sentimentCounts[sentiment];
      dominantSentiment = sentiment;
    }
  });
  
  return dominantSentiment;
}

/**
 * Get an S3 URL for an image appropriate for the given title
 * @param {string} title - The title to find an image for
 * @param {string} sentiment - The sentiment category (bullish, bearish, neutral, volatile)
 * @returns {object} - Object containing the S3 URL and metadata
 */
function getS3ImageForTitle(title, sentiment = 'neutral') {
  try {
    // If no title provided, use sentiment-based selection
    if (!title) {
      return getRandomS3ImageForSentiment(sentiment);
    }
    
    console.log(`Selecting image for title: "${title}" with provided sentiment: ${sentiment}`);
    
    // Determine the most appropriate sentiment based on the title if not explicitly provided
    const determinedSentiment = sentiment === 'neutral' ? determineSentimentFromTitle(title) : sentiment;
    console.log(`Determined sentiment from title: ${determinedSentiment}`);
    
    // Normalize sentiment to ensure it's one of our supported categories
    const normalizedSentiment = ['bullish', 'bearish', 'neutral', 'volatile'].includes(determinedSentiment) 
      ? determinedSentiment 
      : 'neutral';
    
    // Step 1: Try to find exact keyword matches from the title
    const titleWords = title.toLowerCase().split(/\s+/).map(word => word.replace(/[^a-z0-9]/g, ''));
    let matchedImages = [];
    
    // Check for character-specific keywords in the title
    const characterKeywords = {
      'gekko': 'bullish/greed_is_good/gordon_gekko',
      'gordon': 'bullish/greed_is_good/gordon_gekko',
      'wolf': 'bullish/absolutely_vertical/wolf_of_wall_street',
      'jordan': 'bullish/absolutely_vertical/jordan_belfort',
      'belfort': 'bullish/absolutely_vertical/jordan_belfort',
      'burry': 'bearish/the_correction_is_coming/michael_burry',
      'michael': 'bearish/the_correction_is_coming/michael_burry',
      'buffett': 'bullish/long_term_value/warren_buffett',
      'warren': 'bullish/long_term_value/warren_buffett'
    };
    
    // Check if any character keywords are in the title
    for (const word of titleWords) {
      if (characterKeywords[word]) {
        // Find images that match this character
        const characterMatches = verifiedImages.filter(img => 
          img.url.toLowerCase().includes(characterKeywords[word].toLowerCase())
        );
        
        if (characterMatches.length > 0) {
          console.log(`Found character match for "${word}" in title`);
          matchedImages = characterMatches;
          break;
        }
      }
    }
    
    // Step 2: If no character matches, try keyword matching from title
    if (matchedImages.length === 0) {
      for (const word of titleWords) {
        if (word.length < 3) continue; // Skip very short words
        
        if (keywordMap[word] && keywordMap[word].length > 0) {
          console.log(`Found keyword match for "${word}" in title`);
          matchedImages = keywordMap[word];
          break;
        }
      }
    }
    
    // Step 3: If still no matches, try category matching based on title
    if (matchedImages.length === 0 && titleImageMappings.keywords) {
      for (const word of titleWords) {
        if (word.length < 3) continue; // Skip very short words
        
        if (titleImageMappings.keywords[word] && titleImageMappings.keywords[word].length > 0) {
          console.log(`Found title mapping match for "${word}" in title`);
          const mappedImages = titleImageMappings.keywords[word];
          
          // Convert mapped images to our format
          matchedImages = mappedImages.map(img => ({
            url: img.url,
            sentiment: img.sentiment,
            category: img.category,
            description: img.description
          }));
          break;
        }
      }
    }
    
    // Step 4: If still no matches, use sentiment-based selection
    if (matchedImages.length === 0) {
      console.log(`No keyword matches found, using sentiment-based selection for ${normalizedSentiment}`);
      matchedImages = sentimentMap[normalizedSentiment] || sentimentMap['neutral'];
    }
    
    // If we have multiple matches, select one randomly
    if (matchedImages.length > 1) {
      // Use timestamp for better randomization
      const timestamp = new Date().getTime();
      const randomIndex = Math.floor(Math.random() * matchedImages.length);
      const selectedImage = matchedImages[randomIndex];
      
      console.log(`Selected image: ${selectedImage.url}`);
      
      return {
        url: selectedImage.url,
        localPath: selectedImage.url.split(BASE_S3_URL + '/')[1] || '',
        metadata: {
          sentiment: selectedImage.sentiment || normalizedSentiment,
          category: selectedImage.category || 'default',
          description: selectedImage.description || 'Image for ' + title
        }
      };
    }
    
    // If we only have one match, use it
    if (matchedImages.length === 1) {
      const selectedImage = matchedImages[0];
      
      console.log(`Using single matched image: ${selectedImage.url}`);
      
      return {
        url: selectedImage.url,
        localPath: selectedImage.url.split(BASE_S3_URL + '/')[1] || '',
        metadata: {
          sentiment: selectedImage.sentiment || normalizedSentiment,
          category: selectedImage.category || 'default',
          description: selectedImage.description || 'Image for ' + title
        }
      };
    }
    
    // Last resort fallback - use the default image for the determined sentiment
    console.log(`No images found, using default image for ${normalizedSentiment}`);
    
    return {
      url: DEFAULT_IMAGES[normalizedSentiment],
      localPath: normalizedSentiment + '/default/default_image.jpg',
      metadata: {
        sentiment: normalizedSentiment,
        category: 'default',
        description: 'Default image for ' + normalizedSentiment + ' sentiment'
      }
    };
  } catch (error) {
    console.error('Error getting S3 image for title:', error);
    
    // Return the default image if there's an error
    return {
      url: DEFAULT_IMAGES.neutral,
      localPath: 'neutral/default/default_image.jpg',
      metadata: {
        sentiment: 'neutral',
        category: 'default',
        description: 'Default fallback image'
      }
    };
  }
}

/**
 * Get a random S3 image for a given sentiment category
 * @param {string} sentiment - The sentiment category (bullish, bearish, neutral, volatile)
 * @returns {object} - Object containing the S3 URL and metadata
 */
function getRandomS3ImageForSentiment(sentiment = 'neutral') {
  try {
    // Normalize sentiment to ensure it's one of our supported categories
    const normalizedSentiment = ['bullish', 'bearish', 'neutral', 'volatile'].includes(sentiment) 
      ? sentiment 
      : 'neutral';
    
    console.log(`Getting random image for sentiment: ${normalizedSentiment}`);
    
    // Get images for this sentiment
    const sentimentImages = sentimentMap[normalizedSentiment] || sentimentMap['neutral'];
    
    // If we have multiple images for this sentiment, select one randomly
    if (sentimentImages.length > 1) {
      // Use timestamp for better randomization
      const timestamp = new Date().getTime();
      const randomIndex = Math.floor(Math.random() * sentimentImages.length);
      const selectedImage = sentimentImages[randomIndex];
      
      console.log(`Selected random image for sentiment ${normalizedSentiment}: ${selectedImage.url}`);
      
      return {
        url: selectedImage.url,
        localPath: selectedImage.url.split(BASE_S3_URL + '/')[1] || '',
        metadata: {
          sentiment: selectedImage.sentiment,
          category: selectedImage.category,
          description: selectedImage.description
        }
      };
    }
    
    // If we only have one image for this sentiment, use it
    if (sentimentImages.length === 1) {
      const selectedImage = sentimentImages[0];
      
      console.log(`Using only available image for sentiment ${normalizedSentiment}: ${selectedImage.url}`);
      
      return {
        url: selectedImage.url,
        localPath: selectedImage.url.split(BASE_S3_URL + '/')[1] || '',
        metadata: {
          sentiment: selectedImage.sentiment,
          category: selectedImage.category,
          description: selectedImage.description
        }
      };
    }
    
    // Last resort fallback - use the default image for this sentiment
    console.log(`No images found for sentiment ${normalizedSentiment}, using default image`);
    
    return {
      url: DEFAULT_IMAGES[normalizedSentiment] || DEFAULT_IMAGES.neutral,
      localPath: `${normalizedSentiment}/default/default_image.jpg`,
      metadata: {
        sentiment: normalizedSentiment,
        category: 'default',
        description: `Default image for ${normalizedSentiment} sentiment`
      }
    };
  } catch (error) {
    console.error('Error getting random S3 image for sentiment:', error);
    
    // Return the default image if there's an error
    return {
      url: DEFAULT_IMAGES.neutral,
      localPath: 'neutral/default/default_image.jpg',
      metadata: {
        sentiment: 'neutral',
        category: 'default',
        description: 'Default fallback image'
      }
    };
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
  getImageMetadataFromLocalPath
};
