/**
 * Enhanced S3 Bucket Crawler
 * 
 * This script crawls the S3 bucket and creates a comprehensive map of all available images.
 * It organizes them by sentiment and category for easy selection and verifies image accessibility.
 * 
 * Features:
 * - Lists all images in the S3 bucket
 * - Verifies each image's accessibility
 * - Organizes images by sentiment and category
 * - Creates keyword mappings for better title matching
 * - Saves a comprehensive mapping file and verified images list
 */

// Load AWS SDK for S3 only (to avoid dependency issues)
const AWS = { S3: require('aws-sdk/clients/s3') };
const fs = require('fs');
const path = require('path');
const https = require('https');
const { promisify } = require('util');

// Create S3 service object
const s3 = new AWS.S3({
  region: 'us-east-2'  // Update with your bucket's region
});

// Bucket name
const bucketName = 'market-pulse-daily-title-images';

// Base URL for the S3 bucket
const baseS3Url = `https://${bucketName}.s3.us-east-2.amazonaws.com`;

// Output file paths
const outputDir = path.resolve(__dirname);
const outputMapFilePath = path.resolve(outputDir, 's3-image-map.json');
const verifiedImagesPath = path.resolve(outputDir, 'verified-images.json');
const titleMappingsPath = path.resolve(outputDir, 'title-image-mappings.json');

// Sleep function for rate limiting
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Image extensions to filter by
const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];

// Keywords to extract from filenames for better title matching
const keywordCategories = {
  characters: [
    'gordon', 'gekko', 'jordan', 'belfort', 'buffett', 'warren', 'burry', 'michael',
    'trader', 'investor', 'bull', 'bear', 'wolf', 'wall', 'street'
  ],
  concepts: [
    'bull', 'bear', 'market', 'stock', 'trade', 'invest', 'money', 'finance',
    'wall', 'street', 'chart', 'graph', 'trend', 'growth', 'crash', 'boom', 'bust'
  ],
  emotions: [
    'greed', 'fear', 'panic', 'excitement', 'happy', 'sad', 'worried', 'confident',
    'optimistic', 'pessimistic', 'cautious', 'aggressive'
  ]
};

// Verify if an image URL is accessible
async function verifyImageUrl(url) {
  return new Promise((resolve) => {
    https.get(url, (res) => {
      const statusCode = res.statusCode;
      resolve(statusCode >= 200 && statusCode < 300);
      res.resume(); // Consume response data to free up memory
    }).on('error', () => {
      resolve(false);
    });
  });
}

// Main function to crawl the S3 bucket
async function crawlS3Bucket() {
  console.log(`Starting to crawl S3 bucket: ${bucketName}`);
  
  // Initialize the image map
  const imageMap = {
    sentiments: {
      bullish: { categories: {} },
      bearish: { categories: {} },
      neutral: { categories: {} },
      volatile: { categories: {} }
    },
    allImages: [],
    keywordMap: {}
  };
  
  // Initialize title mappings
  const titleMappings = {
    keywords: {},
    sentiments: {}
  };
  
  try {
    // List all objects in the bucket
    const listedObjects = await listAllObjects(bucketName);
    console.log(`Found ${listedObjects.length} objects in the bucket`);
    
    // Filter for image files and organize them
    const imageObjects = listedObjects.filter(obj => {
      const key = obj.Key.toLowerCase();
      return imageExtensions.some(ext => key.endsWith(ext));
    });
    
    console.log(`Found ${imageObjects.length} image objects`);
    
    // Process each image
    console.log('Processing and verifying images...');
    let processedCount = 0;
    
    for (const obj of imageObjects) {
      const key = obj.Key;
      const url = `${baseS3Url}/${key}`;
      
      // Verify image URL is accessible
      const isAccessible = await verifyImageUrl(url);
      
      // Add to all images list
      const imageInfo = {
        key,
        url,
        lastModified: obj.LastModified,
        size: obj.Size,
        isAccessible
      };
      
      imageMap.allImages.push(imageInfo);
      
      // Parse the path to extract sentiment and category
      const pathParts = key.split('/');
      
      if (pathParts.length >= 2) {
        const sentiment = pathParts[0].toLowerCase();
        const category = pathParts[1].toLowerCase();
        
        // Only process if it's one of our known sentiment categories
        if (['bullish', 'bearish', 'neutral', 'volatile'].includes(sentiment)) {
          // Initialize category if it doesn't exist
          if (!imageMap.sentiments[sentiment].categories[category]) {
            imageMap.sentiments[sentiment].categories[category] = [];
          }
          
          // Extract filename without extension
          const filename = path.basename(key);
          const filenameWithoutExt = path.basename(key, path.extname(key));
          const description = filenameWithoutExt.replace(/_/g, ' ');
          
          // Create image info object
          const imageInfo = {
            key,
            url,
            filename,
            description,
            lastModified: obj.LastModified,
            isAccessible
          };
          
          // Add to the appropriate category
          imageMap.sentiments[sentiment].categories[category].push(imageInfo);
          
          // Extract keywords from filename and add to keyword map
          const words = filenameWithoutExt.toLowerCase().split('_');
          
          words.forEach(word => {
            // Add to general keyword map
            if (!imageMap.keywordMap[word]) {
              imageMap.keywordMap[word] = [];
            }
            imageMap.keywordMap[word].push(imageInfo);
            
            // Add to title mappings for better title matching
            if (!titleMappings.keywords[word]) {
              titleMappings.keywords[word] = [];
            }
            titleMappings.keywords[word].push({
              url,
              sentiment,
              category,
              description
            });
          });
          
          // Add to sentiment mappings
          if (!titleMappings.sentiments[sentiment]) {
            titleMappings.sentiments[sentiment] = [];
          }
          titleMappings.sentiments[sentiment].push({
            url,
            category,
            description
          });
        }
      }
      
      // Log progress
      processedCount++;
      if (processedCount % 10 === 0) {
        console.log(`Processed ${processedCount}/${imageObjects.length} images`);
      }
      
      // Rate limit to avoid overwhelming the S3 service
      await sleep(50);
    }
    
    // Add counts to each sentiment and category
    Object.keys(imageMap.sentiments).forEach(sentiment => {
      let sentimentCount = 0;
      
      Object.keys(imageMap.sentiments[sentiment].categories).forEach(category => {
        const categoryImages = imageMap.sentiments[sentiment].categories[category];
        const accessibleImages = categoryImages.filter(img => img.isAccessible);
        
        imageMap.sentiments[sentiment].categories[category] = {
          images: categoryImages,
          accessibleImages: accessibleImages,
          count: categoryImages.length,
          accessibleCount: accessibleImages.length
        };
        sentimentCount += accessibleImages.length;
      });
      
      imageMap.sentiments[sentiment].count = sentimentCount;
    });
    
    // Save the image map to a file
    fs.writeFileSync(outputMapFilePath, JSON.stringify(imageMap, null, 2));
    console.log(`Image map saved to: ${outputMapFilePath}`);
    
    // Save title mappings
    fs.writeFileSync(titleMappingsPath, JSON.stringify(titleMappings, null, 2));
    console.log(`Title mappings saved to: ${titleMappingsPath}`);
    
    // Create a comprehensive verified images list
    const verifiedImages = {
      images: [],
      lastUpdated: new Date().toISOString()
    };
    
    // Add accessible images from each sentiment category to the verified images
    Object.keys(imageMap.sentiments).forEach(sentiment => {
      const categories = imageMap.sentiments[sentiment].categories;
      
      Object.keys(categories).forEach(category => {
        // Only include accessible images
        const accessibleImages = categories[category].accessibleImages;
        
        // Add all accessible images from each category
        accessibleImages.forEach(image => {
          verifiedImages.images.push({
            url: image.url,
            sentiment,
            category,
            description: image.description,
            keywords: image.description.toLowerCase().split(' ')
          });
        });
      });
    });
    
    // Save the verified images to a file
    fs.writeFileSync(verifiedImagesPath, JSON.stringify(verifiedImages, null, 2));
    console.log(`Verified images saved to: ${verifiedImagesPath}`);
    
    // Print some statistics
    console.log('\nImage Statistics:');
    const totalAccessible = imageMap.allImages.filter(img => img.isAccessible).length;
    console.log(`Total images: ${imageMap.allImages.length} (${totalAccessible} accessible)`);
    
    Object.keys(imageMap.sentiments).forEach(sentiment => {
      console.log(`${sentiment}: ${imageMap.sentiments[sentiment].count} accessible images`);
      
      Object.keys(imageMap.sentiments[sentiment].categories).forEach(category => {
        const categoryStats = imageMap.sentiments[sentiment].categories[category];
        console.log(`  - ${category}: ${categoryStats.accessibleCount}/${categoryStats.count} images accessible`);
      });
    });
    
    console.log(`\nVerified images: ${verifiedImages.images.length}`);
    console.log(`Keywords mapped: ${Object.keys(imageMap.keywordMap).length}`);
    
    return {
      imageMap,
      verifiedImages,
      titleMappings
    };
  } catch (error) {
    console.error('Error crawling S3 bucket:', error);
    throw error;
  }
}

// Function to list all objects in the bucket (handles pagination)
async function listAllObjects(bucket, prefix = '') {
  let allObjects = [];
  let continuationToken = null;
  
  do {
    const params = {
      Bucket: bucket,
      Prefix: prefix,
      ContinuationToken: continuationToken
    };
    
    try {
      const data = await s3.listObjectsV2(params).promise();
      allObjects = allObjects.concat(data.Contents || []);
      continuationToken = data.NextContinuationToken;
    } catch (error) {
      console.error('Error listing objects:', error);
      throw error;
    }
  } while (continuationToken);
  
  return allObjects;
}

// Run the crawler
crawlS3Bucket()
  .then(() => {
    console.log('S3 bucket crawling completed successfully');
  })
  .catch(error => {
    console.error('Failed to crawl S3 bucket:', error);
    process.exit(1);
  });
