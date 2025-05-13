/**
 * Generate Verified Images
 * 
 * This script generates a verified-images.json file with only images that actually exist in the S3 bucket.
 */

// Load AWS SDK for S3 only
const AWS = { S3: require('aws-sdk/clients/s3') };
const fs = require('fs');
const path = require('path');
const https = require('https');

// Create S3 service object
const s3 = new AWS.S3({
  region: 'us-east-2'
});

// Bucket name
const bucketName = 'market-pulse-daily-title-images';
const baseS3Url = `https://${bucketName}.s3.us-east-2.amazonaws.com`;

// Output file path
const outputFilePath = path.resolve(__dirname, 'verified-images.json');

// Sleep function for rate limiting
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Check if an image URL is accessible
async function isImageAccessible(url) {
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

// List all objects in the bucket (handles pagination)
async function listAllObjects() {
  let allObjects = [];
  let continuationToken = null;
  
  do {
    const params = {
      Bucket: bucketName,
      ContinuationToken: continuationToken
    };
    
    try {
      const data = await s3.listObjectsV2(params).promise();
      allObjects = allObjects.concat(data.Contents || []);
      continuationToken = data.NextContinuationToken;
      console.log(`Retrieved ${data.Contents ? data.Contents.length : 0} objects. Total so far: ${allObjects.length}`);
    } catch (error) {
      console.error('Error listing objects:', error);
      throw error;
    }
  } while (continuationToken);
  
  return allObjects;
}

// Filter for image files only
function filterImageFiles(objects) {
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
  
  return objects.filter(obj => {
    const key = obj.Key.toLowerCase();
    return imageExtensions.some(ext => key.endsWith(ext));
  });
}

// Main function
async function main() {
  console.log(`Starting to generate verified images list for bucket: ${bucketName}`);
  
  try {
    // List all objects in the bucket
    const allObjects = await listAllObjects();
    console.log(`Found ${allObjects.length} objects in the bucket`);
    
    // Filter for image files
    const imageObjects = filterImageFiles(allObjects);
    console.log(`Found ${imageObjects.length} image objects`);
    
    // Initialize verified images
    const verifiedImages = {
      images: [],
      lastUpdated: new Date().toISOString()
    };
    
    // Default images we know work
    const defaultImages = [
      {
        url: `${baseS3Url}/bullish/greed_is_good/gordon_gekko_wall_street_businessman.jpg`,
        sentiment: 'bullish',
        category: 'greed_is_good',
        description: 'Gordon Gekko Wall Street businessman'
      },
      {
        url: `${baseS3Url}/bearish/the_correction_is_coming/michael_burry_big_short.jpg`,
        sentiment: 'bearish',
        category: 'the_correction_is_coming',
        description: 'Michael Burry Big Short'
      }
    ];
    
    // Add default images to verified images
    verifiedImages.images = [...defaultImages];
    
    // Process each image
    console.log('Verifying images...');
    let processedCount = 0;
    
    for (const obj of imageObjects) {
      const key = obj.Key;
      const url = `${baseS3Url}/${key}`;
      
      // Skip default images
      if (defaultImages.some(img => img.url === url)) {
        continue;
      }
      
      // Check if image is accessible
      const isAccessible = await isImageAccessible(url);
      
      if (isAccessible) {
        // Parse the path to extract sentiment and category
        const pathParts = key.split('/');
        
        if (pathParts.length >= 2) {
          const sentiment = pathParts[0].toLowerCase();
          const category = pathParts[1].toLowerCase();
          
          // Only process if it's one of our known sentiment categories
          if (['bullish', 'bearish', 'neutral', 'volatile'].includes(sentiment)) {
            // Extract filename without extension
            const filename = path.basename(key);
            const filenameWithoutExt = path.basename(key, path.extname(key));
            const description = filenameWithoutExt.replace(/_/g, ' ');
            
            // Add to verified images
            verifiedImages.images.push({
              url,
              sentiment,
              category,
              description
            });
            
            console.log(`✅ Verified: ${url}`);
          }
        }
      } else {
        console.log(`❌ Not accessible: ${url}`);
      }
      
      // Log progress
      processedCount++;
      if (processedCount % 10 === 0) {
        console.log(`Processed ${processedCount}/${imageObjects.length} images`);
      }
      
      // Rate limit to avoid overwhelming the S3 service
      await sleep(50);
    }
    
    // Save verified images to file
    fs.writeFileSync(outputFilePath, JSON.stringify(verifiedImages, null, 2));
    console.log(`Saved ${verifiedImages.images.length} verified images to: ${outputFilePath}`);
    
    // Print some statistics
    console.log('\nVerified Images Statistics:');
    
    // Count by sentiment
    const sentimentCounts = {};
    verifiedImages.images.forEach(img => {
      if (!sentimentCounts[img.sentiment]) {
        sentimentCounts[img.sentiment] = 0;
      }
      sentimentCounts[img.sentiment]++;
    });
    
    Object.keys(sentimentCounts).forEach(sentiment => {
      console.log(`${sentiment}: ${sentimentCounts[sentiment]} images`);
    });
    
    return verifiedImages;
  } catch (error) {
    console.error('Error generating verified images:', error);
    throw error;
  }
}

// Run the main function
main().catch(error => {
  console.error('Error in main function:', error);
});
