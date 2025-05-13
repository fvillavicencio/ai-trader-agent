#!/usr/bin/env node
/**
 * Update the verified-images.json file with new images uploaded to S3
 * This script combines the existing verified images with newly uploaded ones
 */

const fs = require('fs');
const path = require('path');
const { S3Client, ListObjectsV2Command, HeadObjectCommand } = require('@aws-sdk/client-s3');

// Configuration
const S3_BUCKET = 'market-pulse-daily-title-images';
const AWS_REGION = 'us-east-2';
const BASE_S3_URL = `https://${S3_BUCKET}.s3.${AWS_REGION}.amazonaws.com`;
const VERIFIED_IMAGES_FILE = path.join(__dirname, 'verified-images.json');
const S3_MAPPINGS_FILE = path.join(__dirname, '..', 'title-images', 's3-image-mappings.json');

// Initialize S3 client
const s3Client = new S3Client({ region: AWS_REGION });

/**
 * Verify that an S3 object exists and is accessible
 */
async function verifyS3Object(key) {
  try {
    await s3Client.send(new HeadObjectCommand({
      Bucket: S3_BUCKET,
      Key: key
    }));
    return true;
  } catch (error) {
    console.error(`Error verifying S3 object ${key}:`, error.message);
    return false;
  }
}

/**
 * List all objects in the S3 bucket
 */
async function listAllS3Objects() {
  const allObjects = [];
  let continuationToken = undefined;
  
  do {
    const command = new ListObjectsV2Command({
      Bucket: S3_BUCKET,
      ContinuationToken: continuationToken
    });
    
    const response = await s3Client.send(command);
    
    if (response.Contents) {
      allObjects.push(...response.Contents);
    }
    
    continuationToken = response.NextContinuationToken;
  } while (continuationToken);
  
  return allObjects;
}

/**
 * Organize images by sentiment and category
 */
function organizeImagesByCategory(images) {
  const organized = {
    bullish: {},
    bearish: {},
    neutral: {},
    volatile: {}
  };
  
  for (const image of images) {
    const key = image.Key;
    const parts = key.split('/');
    
    if (parts.length >= 2) {
      const sentiment = parts[0];
      const category = parts[1];
      
      if (organized[sentiment]) {
        if (!organized[sentiment][category]) {
          organized[sentiment][category] = [];
        }
        
        organized[sentiment][category].push(`${BASE_S3_URL}/${key}`);
      }
    }
  }
  
  return organized;
}

/**
 * Main function to update verified images
 */
async function updateVerifiedImages() {
  console.log('Starting to update verified images...');
  
  // Load existing verified images if available
  let existingVerifiedImages = {};
  if (fs.existsSync(VERIFIED_IMAGES_FILE)) {
    try {
      existingVerifiedImages = JSON.parse(fs.readFileSync(VERIFIED_IMAGES_FILE, 'utf8'));
      console.log('Loaded existing verified images.');
    } catch (error) {
      console.error('Error loading existing verified images:', error.message);
    }
  }
  
  // Load S3 mappings if available
  let s3Mappings = {};
  if (fs.existsSync(S3_MAPPINGS_FILE)) {
    try {
      s3Mappings = JSON.parse(fs.readFileSync(S3_MAPPINGS_FILE, 'utf8'));
      console.log(`Loaded ${Object.keys(s3Mappings).length} S3 mappings.`);
    } catch (error) {
      console.error('Error loading S3 mappings:', error.message);
    }
  }
  
  // List all objects in the S3 bucket
  console.log('Listing all objects in the S3 bucket...');
  const allObjects = await listAllS3Objects();
  console.log(`Found ${allObjects.length} objects in the S3 bucket.`);
  
  // Verify each object
  console.log('Verifying S3 objects...');
  const verifiedObjects = [];
  
  for (let i = 0; i < allObjects.length; i++) {
    const object = allObjects[i];
    console.log(`Verifying object ${i+1}/${allObjects.length}: ${object.Key}`);
    
    const isVerified = await verifyS3Object(object.Key);
    if (isVerified) {
      verifiedObjects.push(object);
    }
  }
  
  console.log(`Verified ${verifiedObjects.length} objects out of ${allObjects.length}.`);
  
  // Organize images by category
  const organizedImages = organizeImagesByCategory(verifiedObjects);
  
  // Merge with existing verified images
  const mergedImages = { ...existingVerifiedImages };
  
  for (const [sentiment, categories] of Object.entries(organizedImages)) {
    if (!mergedImages[sentiment]) {
      mergedImages[sentiment] = {};
    }
    
    for (const [category, images] of Object.entries(categories)) {
      if (!mergedImages[sentiment][category]) {
        mergedImages[sentiment][category] = [];
      }
      
      // Add new images, avoiding duplicates
      for (const image of images) {
        if (!mergedImages[sentiment][category].includes(image)) {
          mergedImages[sentiment][category].push(image);
        }
      }
    }
  }
  
  // Save the updated verified images
  fs.writeFileSync(VERIFIED_IMAGES_FILE, JSON.stringify(mergedImages, null, 2), 'utf8');
  
  console.log('Updated verified-images.json successfully!');
  
  // Print statistics
  let totalImages = 0;
  for (const sentiment of Object.keys(mergedImages)) {
    let sentimentCount = 0;
    for (const category of Object.keys(mergedImages[sentiment])) {
      sentimentCount += mergedImages[sentiment][category].length;
    }
    console.log(`- ${sentiment}: ${sentimentCount} images`);
    totalImages += sentimentCount;
  }
  
  console.log(`Total verified images: ${totalImages}`);
}

// Run the update process
updateVerifiedImages().catch(error => {
  console.error('Update process failed:', error);
});
