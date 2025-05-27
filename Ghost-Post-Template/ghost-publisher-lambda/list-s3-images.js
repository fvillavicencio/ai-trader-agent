/**
 * S3 Image Mapper
 * 
 * This script lists all images in the S3 bucket and creates a mapping file
 * that can be used by the Lambda function to select images.
 */

const AWS = require('aws-sdk');
const fs = require('fs');
const path = require('path');

// Configure AWS SDK
const region = 'us-east-2';
const bucketName = 'market-pulse-daily-title-images';

// Initialize S3 client
const s3 = new AWS.S3({ region });

// Output file paths
const outputPath = path.resolve(__dirname, 'title-images/s3-image-mappings.json');
const verifiedImagesPath = path.resolve(__dirname, 'title-images/verified-images.json');

// List all objects in the bucket
async function listAllObjects() {
  console.log(`Listing all objects in bucket: ${bucketName}`);
  
  let allObjects = [];
  let continuationToken = null;
  
  do {
    const params = {
      Bucket: bucketName,
      MaxKeys: 1000,
      ContinuationToken: continuationToken
    };
    
    try {
      const response = await s3.listObjectsV2(params).promise();
      
      if (response.Contents) {
        allObjects = allObjects.concat(response.Contents);
      }
      
      continuationToken = response.NextContinuationToken;
      console.log(`Retrieved ${response.Contents ? response.Contents.length : 0} objects. Total so far: ${allObjects.length}`);
    } catch (error) {
      console.error('Error listing objects:', error);
      break;
    }
  } while (continuationToken);
  
  return allObjects;
}

// Filter for image files only
function filterImageFiles(objects) {
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
  
  return objects.filter(obj => {
    const key = obj.Key;
    return imageExtensions.some(ext => key.toLowerCase().endsWith(ext));
  });
}

// Group images by sentiment and subfolder
function groupImagesBySentiment(images) {
  const sentiments = ['bullish', 'bearish', 'neutral', 'volatile'];
  const groupedImages = {};
  
  sentiments.forEach(sentiment => {
    groupedImages[sentiment] = [];
  });
  
  // Add an "other" category for images that don't match any sentiment
  groupedImages.other = [];
  
  images.forEach(image => {
    const key = image.Key;
    let matched = false;
    
    for (const sentiment of sentiments) {
      if (key.startsWith(sentiment + '/')) {
        groupedImages[sentiment].push(key);
        matched = true;
        break;
      }
    }
    
    if (!matched) {
      groupedImages.other.push(key);
    }
  });
  
  return groupedImages;
}

// Create a mapping of image paths to S3 URLs
function createImageMappings(images) {
  const mappings = {};
  
  images.forEach(image => {
    const key = image.Key;
    mappings[key] = `https://${bucketName}.s3.${region}.amazonaws.com/${key}`;
  });
  
  return mappings;
}

// Verify images by checking if they exist and are accessible
async function verifyImages(imageUrls) {
  console.log(`Verifying ${imageUrls.length} images...`);
  
  const verifiedImages = {
    verified: [],
    failed: []
  };
  
  // Batch the verification to avoid overwhelming the network
  const batchSize = 10;
  const batches = [];
  
  for (let i = 0; i < imageUrls.length; i += batchSize) {
    batches.push(imageUrls.slice(i, i + batchSize));
  }
  
  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    console.log(`Verifying batch ${i + 1}/${batches.length} (${batch.length} images)`);
    
    const promises = batch.map(async (url) => {
      try {
        const params = {
          Bucket: bucketName,
          Key: url.split(`${bucketName}.s3.${region}.amazonaws.com/`)[1]
        };
        
        await s3.headObject(params).promise();
        return { url, status: 'verified' };
      } catch (error) {
        return { url, status: 'failed', error: error.message };
      }
    });
    
    const results = await Promise.all(promises);
    
    results.forEach(result => {
      if (result.status === 'verified') {
        verifiedImages.verified.push(result.url);
      } else {
        verifiedImages.failed.push(result);
      }
    });
  }
  
  return verifiedImages;
}

// Main function
async function main() {
  try {
    console.log('Starting S3 image mapping...');
    
    // List all objects
    const allObjects = await listAllObjects();
    console.log(`Found ${allObjects.length} total objects in the bucket`);
    
    // Filter for image files
    const imageFiles = filterImageFiles(allObjects);
    console.log(`Found ${imageFiles.length} image files`);
    
    // Group images by sentiment
    const groupedImages = groupImagesBySentiment(imageFiles);
    console.log('Grouped images by sentiment:');
    Object.keys(groupedImages).forEach(sentiment => {
      console.log(`  ${sentiment}: ${groupedImages[sentiment].length} images`);
    });
    
    // Create image mappings
    const imageMappings = createImageMappings(imageFiles);
    console.log(`Created mappings for ${Object.keys(imageMappings).length} images`);
    
    // Write mappings to file
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    fs.writeFileSync(outputPath, JSON.stringify(imageMappings, null, 2));
    console.log(`Saved image mappings to ${outputPath}`);
    
    // Verify a sample of images (first 5 from each sentiment)
    const sampleImages = [];
    Object.keys(groupedImages).forEach(sentiment => {
      const images = groupedImages[sentiment].slice(0, 5);
      images.forEach(image => {
        sampleImages.push(imageMappings[image]);
      });
    });
    
    console.log(`Verifying a sample of ${sampleImages.length} images...`);
    const verifiedImages = await verifyImages(sampleImages);
    
    fs.writeFileSync(verifiedImagesPath, JSON.stringify(verifiedImages, null, 2));
    console.log(`Saved verified images to ${verifiedImagesPath}`);
    
    console.log('Image mapping complete!');
    console.log(`Verified: ${verifiedImages.verified.length} images`);
    console.log(`Failed: ${verifiedImages.failed.length} images`);
    
    // Print some known good images for each sentiment
    console.log('\nKnown good images for each sentiment:');
    Object.keys(groupedImages).forEach(sentiment => {
      if (sentiment !== 'other' && groupedImages[sentiment].length > 0) {
        const goodImages = groupedImages[sentiment]
          .filter(image => verifiedImages.verified.includes(imageMappings[image]))
          .slice(0, 3);
        
        if (goodImages.length > 0) {
          console.log(`\n${sentiment.toUpperCase()}:`);
          goodImages.forEach(image => {
            console.log(`  ${imageMappings[image]}`);
          });
        }
      }
    });
    
  } catch (error) {
    console.error('Error in main function:', error);
  }
}

// Run the main function
main();
