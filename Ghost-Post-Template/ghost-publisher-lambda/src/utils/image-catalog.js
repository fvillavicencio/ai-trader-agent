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
// Import only the S3 service to avoid dependency issues
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
 * Save recently used images to a file in /tmp
 * This helps persist the recently used images between Lambda invocations
 */
function saveRecentlyUsedImages() {
  const recentlyUsedData = {
    lastUpdated: new Date().toISOString(),
    recentlyUsedImages: Array.from(recentlyUsedImages),
    recentlyUsedByCategory: {}
  };
  
  // Convert Sets to Arrays for JSON serialization
  Object.keys(recentlyUsedByCategory).forEach(category => {
    recentlyUsedData.recentlyUsedByCategory[category] = Array.from(recentlyUsedByCategory[category]);
  });
  
  // Save to /tmp which persists for a short time between Lambda invocations
  fs.writeFileSync('/tmp/recently-used-images.json', JSON.stringify(recentlyUsedData, null, 2));
  console.log(`Saved recently used images data to /tmp/recently-used-images.json`);
  console.log(`RECENTLY USED - Total images in tracking: ${recentlyUsedImages.size}`);
  console.log(`RECENTLY USED - Last 5 images: ${Array.from(recentlyUsedImages).slice(-5).join(', ')}`);
  
  // Also save to S3 if possible
  try {
    // Only import the S3 service to avoid dependency issues
    const AWS = { S3: require('aws-sdk/clients/s3') };
    const s3 = new AWS.S3({ region });
    
    s3.putObject({
      Bucket: bucketName,
      Key: 'recently-used-images.json',
      Body: JSON.stringify(recentlyUsedData, null, 2),
      ContentType: 'application/json'
    }).promise()
      .then(() => console.log('Successfully saved recently used images to S3'))
      .catch(err => console.warn('Failed to save recently used images to S3:', err.message));
  } catch (error) {
    console.warn('Error saving recently used images to S3:', error.message);
  }
}

/**
 * Load recently used images from file
 * This helps persist the recently used images between Lambda invocations
 */
function loadRecentlyUsedImages() {
  // Try to load from /tmp first (for short-lived persistence)
  try {
    if (fs.existsSync('/tmp/recently-used-images.json')) {
      const data = JSON.parse(fs.readFileSync('/tmp/recently-used-images.json', 'utf8'));
      console.log(`Loaded recently used images from /tmp, last updated: ${data.lastUpdated}`);
      console.log(`RECENTLY USED LOAD - File exists in /tmp with ${data.recentlyUsedImages.length} images`);
      
      // Convert Arrays back to Sets
      recentlyUsedImages.clear();
      data.recentlyUsedImages.forEach(url => recentlyUsedImages.add(url));
      
      Object.keys(data.recentlyUsedByCategory).forEach(category => {
        if (!recentlyUsedByCategory[category]) {
          recentlyUsedByCategory[category] = new Set();
        }
        data.recentlyUsedByCategory[category].forEach(url => {
          recentlyUsedByCategory[category].add(url);
        });
      });
      
      console.log(`Loaded ${recentlyUsedImages.size} recently used images and ${Object.keys(recentlyUsedByCategory).length} categories`);
      return true;
    }
  } catch (error) {
    console.warn('Error loading recently used images from /tmp:', error.message);
  }
  
  // If not in /tmp, try to load from S3
  try {
    // Only import the S3 service to avoid dependency issues
    const AWS = { S3: require('aws-sdk/clients/s3') };
    const s3 = new AWS.S3({ region });
    
    s3.getObject({
      Bucket: bucketName,
      Key: 'recently-used-images.json'
    }).promise()
      .then(response => {
        try {
          const data = JSON.parse(response.Body.toString());
          console.log(`Loaded recently used images from S3, last updated: ${data.lastUpdated}`);
          
          // Convert Arrays back to Sets
          recentlyUsedImages.clear();
          data.recentlyUsedImages.forEach(url => recentlyUsedImages.add(url));
          
          Object.keys(data.recentlyUsedByCategory).forEach(category => {
            if (!recentlyUsedByCategory[category]) {
              recentlyUsedByCategory[category] = new Set();
            }
            data.recentlyUsedByCategory[category].forEach(url => {
              recentlyUsedByCategory[category].add(url);
            });
          });
          
          console.log(`Loaded ${recentlyUsedImages.size} recently used images and ${Object.keys(recentlyUsedByCategory).length} categories from S3`);
          
          // Save to /tmp for faster access next time
          fs.writeFileSync('/tmp/recently-used-images.json', JSON.stringify(data, null, 2));
        } catch (parseError) {
          console.warn('Error parsing recently used images from S3:', parseError.message);
        }
      })
      .catch(err => {
        if (err.code !== 'NoSuchKey') {
          console.warn('Error loading recently used images from S3:', err.message);
        }
      });
  } catch (error) {
    console.warn('Error accessing S3 for recently used images:', error.message);
  }
  
  return false;
}

/**
 * Initialize the image catalog from verified-images.json
 * If the file doesn't exist, scan the S3 bucket directly
 */
async function initializeImageCatalog() {
  console.log('Initializing image catalog...');
  
  // Try to load recently used images first
  loadRecentlyUsedImages();
  
  // Try to load from verified-images.json first
  const verifiedImagesPath = findVerifiedImagesFile();
  
  if (verifiedImagesPath && fs.existsSync(verifiedImagesPath)) {
    try {
      console.log(`Loading verified images from: ${verifiedImagesPath}`);
      const verifiedImagesData = fs.readFileSync(verifiedImagesPath, 'utf8');
      console.log(`Verified images file size: ${verifiedImagesData.length} bytes`);
      
      const verifiedImagesJson = JSON.parse(verifiedImagesData);
      
      if (verifiedImagesJson.images && verifiedImagesJson.images.length > 0) {
        console.log(`Found ${verifiedImagesJson.images.length} images in verified-images.json`);
        processVerifiedImages(verifiedImagesJson.images);
        return true;
      } else {
        console.warn('Verified images file exists but contains no images or has invalid format');
      }
    } catch (error) {
      console.error('Error loading verified images file:', error);
      console.error('Error details:', error.stack);
    }
  } else {
    console.log('No verified images file found at paths:', findAllPossibleVerifiedImagesPaths());
  }
  
  // If we couldn't load from file, scan S3 directly
  console.log('No verified images file found or it was empty, scanning S3 bucket...');
  try {
    const images = await scanS3Bucket();
    if (images && images.length > 0) {
      console.log(`Successfully scanned S3 bucket and found ${images.length} images`);
      processVerifiedImages(images);
      return true;
    } else {
      console.warn('S3 bucket scan completed but found no images');
    }
  } catch (error) {
    console.error('Error scanning S3 bucket:', error);
    console.error('Error details:', error.stack);
  }
  
  // If all else fails, use default images
  console.log('Using default images as fallback');
  useDefaultImages();
  return false;
}

/**
 * Find all possible paths for verified-images.json for debugging
 */
function findAllPossibleVerifiedImagesPaths() {
  const possiblePaths = [
    path.resolve(__dirname, '../../../verified-images.json'),
    path.resolve(__dirname, '../../verified-images.json'),
    '/tmp/verified-images.json',
    path.resolve(__dirname, '../../../ghost-publisher-lambda/verified-images.json'),
    path.resolve(__dirname, '../../ghost-publisher-lambda/verified-images.json'),
    path.resolve(process.cwd(), 'verified-images.json')
  ];
  
  return possiblePaths.map(p => ({ path: p, exists: fs.existsSync(p) }));
}

/**
 * Find the verified-images.json file
 */
function findVerifiedImagesFile() {
  // Expanded list of possible paths to look for the verified-images.json file
  const possiblePaths = [
    path.resolve(__dirname, '../../../verified-images.json'),
    path.resolve(__dirname, '../../verified-images.json'),
    path.resolve(__dirname, '../../../ghost-publisher-lambda/verified-images.json'),
    path.resolve(process.cwd(), 'verified-images.json'),
    '/tmp/verified-images.json'
  ];
  
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      console.log(`Found verified images at: ${p}`);
      return p;
    }
  }
  
  console.log('Could not find verified-images.json in any of the expected locations');
  console.log('Searched paths:', possiblePaths);
  
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
  console.log(`Scanning S3 bucket: ${bucketName} in region: ${region}`);
  
  try {
    // Initialize S3 client with Lambda's IAM role credentials
    const s3 = new AWS.S3({ region });
    
    const images = [];
    
    // First, try to download the verified-images.json file from S3 if it exists
    try {
      console.log('Attempting to download verified-images.json directly from S3...');
      const jsonFileParams = {
        Bucket: bucketName,
        Key: 'verified-images.json'
      };
      
      const jsonFileResponse = await s3.getObject(jsonFileParams).promise();
      if (jsonFileResponse && jsonFileResponse.Body) {
        const jsonContent = jsonFileResponse.Body.toString('utf-8');
        try {
          const parsedJson = JSON.parse(jsonContent);
          if (parsedJson && parsedJson.images && parsedJson.images.length > 0) {
            console.log(`Successfully downloaded verified-images.json from S3 with ${parsedJson.images.length} images`);
            // Save to local file for future use
            try {
              fs.writeFileSync('/tmp/verified-images.json', jsonContent);
              console.log('Saved verified-images.json to /tmp for future use');
            } catch (saveError) {
              console.warn('Could not save verified-images.json to /tmp:', saveError);
            }
            return parsedJson.images;
          }
        } catch (parseError) {
          console.error('Error parsing verified-images.json from S3:', parseError);
        }
      }
    } catch (jsonError) {
      console.log('Could not download verified-images.json directly from S3:', jsonError.message);
      console.log('Falling back to listing all objects in the bucket...');
    }
  
    // If we couldn't get the JSON file directly, list all objects in the bucket
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
    console.log('Image catalog is empty, attempting to initialize it now...');
    try {
      // Try to initialize synchronously using the verified-images.json file
      const verifiedImagesPath = findVerifiedImagesFile();
      if (verifiedImagesPath && fs.existsSync(verifiedImagesPath)) {
        try {
          const verifiedImagesData = fs.readFileSync(verifiedImagesPath, 'utf8');
          const verifiedImagesJson = JSON.parse(verifiedImagesData);
          
          if (verifiedImagesJson.images && verifiedImagesJson.images.length > 0) {
            console.log(`Found ${verifiedImagesJson.images.length} images in verified-images.json`);
            processVerifiedImages(verifiedImagesJson.images);
          } else {
            throw new Error('Verified images file exists but contains no images');
          }
        } catch (error) {
          console.error('Error loading verified images file:', error);
          throw new Error('Failed to initialize image catalog: ' + error.message);
        }
      } else {
        throw new Error('Verified images file not found');
      }
    } catch (initError) {
      console.error('Failed to initialize image catalog:', initError);
      return getFallbackImage(sentiment);
    }
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
  
  // Log the first few images to help with debugging
  if (availableImages.length > 0) {
    console.log('Sample available images:');
    availableImages.slice(0, 3).forEach(img => {
      console.log(` - ${img.url} (${img.category})`);
    });
  }
  
  // Step 1: Try to find images by title keywords
  const matchedByTitle = findImagesByTitleKeywords(title, availableImages);
  if (matchedByTitle.length > 0) {
    console.log(`Found ${matchedByTitle.length} images matching title keywords`);
    return selectImageFromCandidates(matchedByTitle, title);
  }
  
  // Step 2: Try to find images by category
  const matchedByCategory = findImagesByCategory(title, availableImages);
  if (matchedByCategory.length > 0) {
    console.log(`Found ${matchedByCategory.length} images matching category`);
    return selectImageFromCandidates(matchedByCategory, title);
  }
  
  // Step 3: Use all available images for this sentiment
  console.log(`Using all ${availableImages.length} images for sentiment: ${normalizedSentiment}`);
  return selectImageFromCandidates(availableImages, title);
}

/**
 * Find images by title keywords
 */
function findImagesByTitleKeywords(title, availableImages) {
  const titleWords = title.toLowerCase().split(/\s+/);
  const significantWords = titleWords.filter(word => 
    word.length > 3 && !commonWords.includes(word)
  );
  
  // Log significant words for debugging
  console.log('Significant words from title:', significantWords);
  
  // Create a scoring system for images based on keyword matches
  const scoredImages = availableImages.map(image => {
    let score = 0;
    const matchedKeywords = [];
    
    // Check for character matches in the image URL
    for (const word of titleWords) {
      if (characterKeywords[word] && image.url.toLowerCase().includes(characterKeywords[word].toLowerCase())) {
        score += 5; // Higher score for character matches
        matchedKeywords.push(`character:${word}`);
      }
    }
    
    // Check for matches in description and category
    for (const word of titleWords) {
      if (word.length < 3) continue; // Skip very short words
      
      if (image.description && image.description.toLowerCase().includes(word.toLowerCase())) {
        score += 3;
        matchedKeywords.push(`desc:${word}`);
      }
      
      if (image.category && image.category.toLowerCase().includes(word.toLowerCase())) {
        score += 4;
        matchedKeywords.push(`cat:${word}`);
      }
      
      // Check keywords array if it exists
      if (image.keywords && Array.isArray(image.keywords)) {
        for (const keyword of image.keywords) {
          if (keyword.toLowerCase().includes(word.toLowerCase()) || 
              word.toLowerCase().includes(keyword.toLowerCase())) {
            score += 2;
            matchedKeywords.push(`kw:${keyword}`);
          }
        }
      }
    }
    
    // Log matches for debugging
    if (score > 0) {
      console.log(`Image ${image.url} matched keywords: ${matchedKeywords.join(', ')} with score ${score}`);
    }
    
    return { image, score, matchedKeywords };
  });
  
  // Filter images with a score > 0 and sort by score (highest first)
  const matchedImages = scoredImages
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .map(item => item.image);
  
  if (matchedImages.length > 0) {
    console.log(`Found ${matchedImages.length} images with keyword matches, top score: ${scoredImages[0]?.score}`);
  }
  
  return matchedImages;
}

/**
 * Find images by category based on title
 */
function findImagesByCategory(title, availableImages) {
  // Get all categories from available images to avoid hardcoding
  const allCategories = new Set();
  availableImages.forEach(img => {
    if (img.category) {
      allCategories.add(img.category.toLowerCase());
    }
  });
  
  console.log(`Available image categories: ${Array.from(allCategories).join(', ')}`);
  
  const titleWords = title.toLowerCase().split(/\s+/).map(word => word.replace(/[^a-z0-9]/g, ''));
  
  // Create a scoring system for images based on category relevance
  const scoredImages = availableImages.map(image => {
    let score = 0;
    const matchedCategories = [];
    
    if (!image.category) return { image, score: 0, matchedCategories: [] };
    
    const imageCategory = image.category.toLowerCase();
    
    // Check for direct category matches
    for (const word of titleWords) {
      if (word.length < 3) continue; // Skip very short words
      
      // Check if the word appears in the category name
      if (imageCategory.includes(word)) {
        score += 3;
        matchedCategories.push(`direct:${word}`);
      }
      
      // Check for semantic matches (e.g., 'bull' matches 'bullish')
      if (word === 'bull' && (imageCategory.includes('bull') || imageCategory.includes('up') || imageCategory.includes('rally'))) {
        score += 2;
        matchedCategories.push(`semantic:bullish`);
      } else if (word === 'bear' && (imageCategory.includes('bear') || imageCategory.includes('down') || imageCategory.includes('crash'))) {
        score += 2;
        matchedCategories.push(`semantic:bearish`);
      } else if ((word === 'volatile' || word === 'volatility') && (imageCategory.includes('volatile') || imageCategory.includes('roller') || imageCategory.includes('storm'))) {
        score += 2;
        matchedCategories.push(`semantic:volatile`);
      }
    }
    
    // Check for sentiment in title
    if (title.toLowerCase().includes('up') && imageCategory.includes('bull')) {
      score += 1;
      matchedCategories.push('sentiment:bullish');
    } else if (title.toLowerCase().includes('down') && imageCategory.includes('bear')) {
      score += 1;
      matchedCategories.push('sentiment:bearish');
    }
    
    // Log matches for debugging
    if (score > 0) {
      console.log(`Image ${image.url} matched categories: ${matchedCategories.join(', ')} with score ${score}`);
    }
    
    return { image, score, matchedCategories };
  });
  
  // Filter images with a score > 0 and sort by score (highest first)
  const matchedImages = scoredImages
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .map(item => item.image);
  
  if (matchedImages.length > 0) {
    console.log(`Found ${matchedImages.length} images with category matches, top score: ${scoredImages.find(i => i.score > 0)?.score}`);
  }
  
  return matchedImages;
}

/**
 * Select an image from a list of candidates
 */
function selectImageFromCandidates(candidates, title) {
  if (!candidates || candidates.length === 0) {
    console.error('No candidate images provided');
    return null;
  }
  
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
  
  // Get the current date to introduce time-based variation
  const now = new Date();
  const dayOfYear = Math.floor((now - new Date(now.getFullYear(), 0, 0)) / (1000 * 60 * 60 * 24));
  const hourOfDay = now.getHours();
  const minuteOfHour = now.getMinutes();
  const secondOfMinute = now.getSeconds();
  
  // Create a more granular time factor using all time components
  // This ensures more variation between Lambda invocations even if they happen within the same hour
  const timeVariationFactor = dayOfYear * 10000 + hourOfDay * 100 + minuteOfHour + secondOfMinute;
  
  // Add title-based hash to further vary selection
  const titleHash = hashString(title);
  
  // Combine time and title factors
  const selectionFactor = (timeVariationFactor + titleHash) % 10000;
  
  // Log detailed selection factors for debugging
  console.log(`SELECTION DEBUG - Title: "${title}"`);
  console.log(`SELECTION DEBUG - Title hash: ${titleHash}`);
  console.log(`SELECTION DEBUG - Time factor: ${timeVariationFactor}`);
  console.log(`SELECTION DEBUG - Combined factor: ${selectionFactor}`);
  
  // Add time-based factors to the selection process
  console.log(`Using time factors for image selection: day ${dayOfYear}, hour ${hourOfDay}, minute ${minuteOfHour}, second ${secondOfMinute}`);
  console.log(`Combined selection factor: ${selectionFactor} (time: ${timeVariationFactor}, title hash: ${titleHash})`);
  
  // Add timestamp to the log for debugging
  console.log(`Selection timestamp: ${now.toISOString()}`);

  
  // Try to find a category that hasn't been used recently
  const availableCategories = Object.keys(categorizedCandidates).filter(
    category => recentlyUsedByCategory[category].size < categorizedCandidates[category].length
  );
  
  let selectedCategory;
  let selectedImage;
  
  if (availableCategories.length > 0) {
    // Use combined selection factor to influence category selection
    const categoryIndex = selectionFactor % availableCategories.length;
    selectedCategory = availableCategories[categoryIndex];
    console.log(`Selected category using combined selection factor (${selectionFactor}): ${selectedCategory}`);
    
    // Get images from this category that haven't been used recently
    const categoryImages = categorizedCandidates[selectedCategory];
    const notRecentlyUsedInCategory = categoryImages.filter(
      img => !recentlyUsedByCategory[selectedCategory].has(img.url)
    );
    
    if (notRecentlyUsedInCategory.length === 0) {
      // If all images in this category have been used recently, use all images
      console.log(`All images in category ${selectedCategory} have been used recently, using all images in category`);
      notRecentlyUsedInCategory.push(...categoryImages);
    }
    
    // Use a different part of the selection factor for image selection
    // Shift the bits to get a different number
    const imageSelectionFactor = Math.floor(selectionFactor / availableCategories.length);
    const imageIndex = imageSelectionFactor % notRecentlyUsedInCategory.length;
    selectedImage = notRecentlyUsedInCategory[imageIndex];
    console.log(`Selected image using combined selection factor (${imageSelectionFactor}): ${selectedImage.url}`);
  } else {
    // If all categories have been exhausted, select the least recently used image overall
    const notRecentlyUsed = candidates.filter(img => !recentlyUsedImages.has(img.url));
    
    if (notRecentlyUsed.length > 0) {
      // Use combined selection factor for image selection
      const imageIndex = selectionFactor % notRecentlyUsed.length;
      selectedImage = notRecentlyUsed[imageIndex];
      selectedCategory = selectedImage.category || 'default';
      console.log(`Selected image using combined selection factor (${selectionFactor}): ${selectedImage.url}`);
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
  
  console.log(`IMAGE SELECTION RESULT - Selected image: ${selectedImage.url}`);
  console.log(`IMAGE SELECTION RESULT - From category: ${selectedCategory}`);
  console.log(`IMAGE SELECTION RESULT - Based on selection factor: ${selectionFactor}`);
  console.log(`IMAGE SELECTION RESULT - Recently used images count: ${recentlyUsedImages.size}`);
  
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
  
  // Save the recently used images to a file in /tmp
  // This will persist for a short time between Lambda invocations if they happen close together
  try {
    saveRecentlyUsedImages();
  } catch (error) {
    console.warn('Error saving recently used images:', error);
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

// Default fallback images for each sentiment category
const DEFAULT_IMAGES = {
  bullish: [
    '/bullish/greed_is_good/gordon_gekko_wall_street_businessman.jpg',
    '/bullish/to_the_moon/rocket_launch_1.jpg',
    '/bullish/bulls_on_parade/bull_statue_wall_street_1.jpg'
  ],
  bearish: [
    '/bearish/bears_in_control/bear_market_chart_10.jpg',
    '/bearish/the_correction_is_coming/michael_burry_big_short.jpg',
    '/bearish/sell_now/red_arrow_down_chart.jpg'
  ],
  neutral: [
    '/neutral/just_wait/clock_waiting_room_10.jpg',
    '/neutral/mixed_signals/traffic_light_yellow.jpg',
    '/neutral/proceed_with_caution/yellow_caution_sign.jpg'
  ],
  volatile: [
    '/volatile/buckle_up/car_seatbelt_warning_1.jpg',
    '/volatile/roller_coaster/market_rollercoaster.jpg',
    '/volatile/wild_ride/stormy_seas_ship.jpg'
  ]
};

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
        category: 'environment',
        description: `Environment variable image for ${sentiment}`
      }
    };
  }
  
  // Get a random image from the appropriate sentiment category
  const imageOptions = DEFAULT_IMAGES[sentiment] || DEFAULT_IMAGES.neutral;
  const randomIndex = Math.floor(Math.random() * imageOptions.length);
  const selectedImagePath = imageOptions[randomIndex];
  
  console.log(`Selected fallback image for ${sentiment} sentiment: ${selectedImagePath}`);
  
  // Ensure the URL is properly formatted with the S3 bucket URL
  const fullUrl = selectedImagePath.startsWith('http') 
    ? selectedImagePath 
    : `${baseS3Url}${selectedImagePath}`;
  
  return {
    url: fullUrl,
    localPath: selectedImagePath,
    metadata: {
      sentiment: sentiment,
      category: 'default',
      description: `Default image for ${sentiment}`
    }
  };
}

/**
 * Get all images for a specific sentiment
 * @param {string} sentiment - The sentiment to get images for
 * @returns {Array} - Array of image objects
 */
function getAllImagesForSentiment(sentiment = 'neutral') {
  // Ensure the catalog is initialized
  if (imageCatalog.allImages.length === 0) {
    console.log('Image catalog is empty, attempting to initialize it now...');
    try {
      // Try to initialize synchronously using the verified-images.json file
      const verifiedImagesPath = findVerifiedImagesFile();
      if (verifiedImagesPath && fs.existsSync(verifiedImagesPath)) {
        try {
          const verifiedImagesData = fs.readFileSync(verifiedImagesPath, 'utf8');
          const verifiedImagesJson = JSON.parse(verifiedImagesData);
          
          if (verifiedImagesJson.images && verifiedImagesJson.images.length > 0) {
            console.log(`Found ${verifiedImagesJson.images.length} images in verified-images.json`);
            processVerifiedImages(verifiedImagesJson.images);
          } else {
            throw new Error('Verified images file exists but contains no images');
          }
        } catch (error) {
          console.error('Error loading verified images file:', error);
          return [];
        }
      } else {
        throw new Error('Verified images file not found');
      }
    } catch (initError) {
      console.error('Failed to initialize image catalog:', initError);
      return [];
    }
  }
  
  // Normalize sentiment
  const normalizedSentiment = ['bullish', 'bearish', 'neutral', 'volatile'].includes(sentiment) 
    ? sentiment 
    : 'neutral';
  
  // Get available images for this sentiment
  const availableImages = imageCatalog.sentiments[normalizedSentiment];
  
  if (!availableImages || availableImages.length === 0) {
    console.log(`No images found for sentiment: ${normalizedSentiment}`);
    return [];
  }
  
  console.log(`Found ${availableImages.length} images for sentiment: ${normalizedSentiment}`);
  return availableImages;
}

/**
 * Hash a string to a number
 * @param {string} str - The string to hash
 * @returns {number} - A numeric hash value
 */
function hashString(str) {
  if (!str || typeof str !== 'string') {
    console.error(`Invalid string provided to hashString: ${str}`);
    return 0;
  }
  
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  
  // Make sure the hash is positive
  return Math.abs(hash);
}

// Export the functions
module.exports = {
  initializeImageCatalog,
  getImageForTitle,
  getFallbackImage,
  getAllImagesForSentiment,
  resetCatalog,
  saveRecentlyUsedImages,
  loadRecentlyUsedImages
};
