#!/usr/bin/env node
/**
 * Download images from the URLs in image-data.json
 * and save them to appropriate category folders
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { promisify } = require('util');
const stream = require('stream');
const pipeline = promisify(stream.pipeline);

const IMAGE_DATA_FILE = path.join(__dirname, 'image-data.json');
const BASE_DIR = path.join(__dirname, 'downloaded-images');

// Create a delay function to avoid overwhelming the server
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

async function downloadImage(url, outputPath) {
  try {
    const response = await axios({
      method: 'GET',
      url: url,
      responseType: 'stream'
    });
    
    // Create directory if it doesn't exist
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    await pipeline(response.data, fs.createWriteStream(outputPath));
    return true;
  } catch (error) {
    console.error(`Error downloading ${url}:`, error.message);
    return false;
  }
}

async function main() {
  // Read the image data
  const imageData = JSON.parse(fs.readFileSync(IMAGE_DATA_FILE, 'utf8'));
  
  // Track statistics
  let totalImages = 0;
  let downloadedImages = 0;
  
  // Create the base directory if it doesn't exist
  if (!fs.existsSync(BASE_DIR)) {
    fs.mkdirSync(BASE_DIR, { recursive: true });
    console.log(`Created base directory: ${BASE_DIR}`);
  }
  
  // Process each category
  for (const [category, images] of Object.entries(imageData)) {
    // Create the category directory if it doesn't exist
    const categoryParts = category.split('/');
    const categoryDir = path.join(BASE_DIR, ...categoryParts);
    
    if (!fs.existsSync(categoryDir)) {
      fs.mkdirSync(categoryDir, { recursive: true });
      console.log(`Created directory: ${categoryDir}`);
    }
    
    // Download each image in the category
    for (let i = 0; i < images.length; i++) {
      const image = images[i];
      totalImages++;
      
      // Create a filename based on the category, query and index
      const querySlug = image.query.replace(/\s+/g, '_').toLowerCase();
      const filename = `${querySlug}_${i+1}.jpg`;
      const outputPath = path.join(categoryDir, filename);
      
      console.log(`Downloading (${totalImages}/${Object.values(imageData).flat().length}): ${filename}`);
      
      const success = await downloadImage(image.url, outputPath);
      if (success) {
        downloadedImages++;
        console.log(`✓ Downloaded: ${filename}`);
      }
      
      // Add a small delay to avoid overwhelming the server
      await delay(100);
    }
  }
  
  console.log(`\n✅ Download complete! Downloaded ${downloadedImages} of ${totalImages} images.`);
  console.log(`Images are organized in category folders under: ${BASE_DIR}`);
}

main().catch(console.error);
