/**
 * Scan S3 Bucket for Images
 * 
 * This script scans the S3 bucket for all images and updates the verified-images.json file
 * with the complete list of images found.
 */

// Import only the S3 client to avoid dependency issues
const AWS = { S3: require('aws-sdk/clients/s3') };
const fs = require('fs');
const path = require('path');

// S3 configuration
const region = process.env.AWS_REGION || 'us-east-2';
const bucketName = process.env.S3_BUCKET || 'market-pulse-daily-title-images';
const baseS3Url = `https://${bucketName}.s3.${region}.amazonaws.com`;

// Initialize S3 client
const s3 = new AWS.S3({ region });

// Function to scan the S3 bucket
async function scanS3Bucket() {
  console.log(`Scanning S3 bucket: ${bucketName} in region: ${region}`);
  
  try {
    const images = [];
    let continuationToken = null;
    
    do {
      // List objects in the bucket
      const params = {
        Bucket: bucketName,
        MaxKeys: 1000
      };
      
      if (continuationToken) {
        params.ContinuationToken = continuationToken;
      }
      
      const response = await s3.listObjectsV2(params).promise();
      
      // Process each object
      for (const item of response.Contents) {
        const key = item.Key;
        
        // Skip non-image files
        if (!key.match(/\.(jpg|jpeg|png|gif)$/i)) {
          continue;
        }
        
        // Extract sentiment and category from path
        const pathParts = key.split('/');
        
        if (pathParts.length >= 2) {
          const sentiment = pathParts[0];
          const category = pathParts[1];
          
          // Create image object
          const image = {
            url: `${baseS3Url}/${key}`,
            localPath: `/${key}`,
            sentiment: sentiment,
            category: category,
            description: key.replace(/\.[^/.]+$/, "").split('/').pop().replace(/_/g, ' ')
          };
          
          // Add keywords based on filename
          const filename = path.basename(key, path.extname(key));
          image.keywords = filename.split('_').filter(word => word.length > 2);
          
          images.push(image);
        }
      }
      
      // Check if there are more objects to fetch
      continuationToken = response.NextContinuationToken;
      console.log(`Processed ${images.length} images so far...`);
      
    } while (continuationToken);
    
    console.log(`Found ${images.length} images in S3 bucket`);
    
    // Group images by sentiment for stats
    const sentimentCounts = {};
    images.forEach(img => {
      if (!sentimentCounts[img.sentiment]) {
        sentimentCounts[img.sentiment] = 0;
      }
      sentimentCounts[img.sentiment]++;
    });
    
    console.log('Image counts by sentiment:');
    Object.keys(sentimentCounts).forEach(sentiment => {
      console.log(`- ${sentiment}: ${sentimentCounts[sentiment]} images`);
    });
    
    // Save to verified-images.json
    const verifiedImagesData = {
      lastUpdated: new Date().toISOString(),
      totalCount: images.length,
      images: images
    };
    
    fs.writeFileSync('verified-images.json', JSON.stringify(verifiedImagesData, null, 2));
    console.log('Updated verified-images.json with all images from S3');
    
    return images;
  } catch (error) {
    console.error('Error scanning S3 bucket:', error);
    throw error;
  }
}

// Run the scan
scanS3Bucket()
  .then(() => console.log('Scan completed successfully'))
  .catch(err => console.error('Scan failed:', err));
