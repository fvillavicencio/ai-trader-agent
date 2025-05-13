#!/usr/bin/env node
/**
 * Cleanup downloaded images folder to save storage space
 * Keeps only one image per category folder
 */

const fs = require('fs');
const path = require('path');

const BASE_DIR = path.join(__dirname, 'downloaded-images');

/**
 * Get all subdirectories in a directory
 */
function getSubdirectories(dir) {
  return fs.readdirSync(dir, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => path.join(dir, dirent.name));
}

/**
 * Get all image files in a directory
 */
function getImageFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true })
    .filter(dirent => dirent.isFile() && ['.jpg', '.jpeg', '.png', '.gif'].includes(path.extname(dirent.name).toLowerCase()))
    .map(dirent => path.join(dir, dirent.name));
}

/**
 * Cleanup a directory, keeping only one image file
 */
function cleanupDirectory(dir) {
  const imageFiles = getImageFiles(dir);
  
  if (imageFiles.length <= 1) {
    console.log(`${dir}: Already has 1 or fewer images, skipping.`);
    return 0;
  }
  
  // Keep the first image, delete the rest
  const fileToKeep = imageFiles[0];
  const filesToDelete = imageFiles.slice(1);
  
  console.log(`${dir}: Keeping ${path.basename(fileToKeep)}, deleting ${filesToDelete.length} other images.`);
  
  let deletedCount = 0;
  for (const file of filesToDelete) {
    try {
      fs.unlinkSync(file);
      deletedCount++;
    } catch (error) {
      console.error(`Error deleting ${file}: ${error.message}`);
    }
  }
  
  return deletedCount;
}

/**
 * Main function to cleanup all image directories
 */
function cleanupDownloadedImages() {
  if (!fs.existsSync(BASE_DIR)) {
    console.error(`Base directory ${BASE_DIR} does not exist.`);
    return;
  }
  
  console.log(`Starting cleanup of ${BASE_DIR}...`);
  
  // Get all sentiment directories (bullish, bearish, etc.)
  const sentimentDirs = getSubdirectories(BASE_DIR);
  let totalDeleted = 0;
  let totalDirectories = 0;
  
  // Process each sentiment directory
  for (const sentimentDir of sentimentDirs) {
    console.log(`Processing sentiment directory: ${path.basename(sentimentDir)}`);
    
    // Get all category directories within this sentiment
    const categoryDirs = getSubdirectories(sentimentDir);
    
    // Process each category directory
    for (const categoryDir of categoryDirs) {
      totalDirectories++;
      totalDeleted += cleanupDirectory(categoryDir);
    }
  }
  
  console.log(`
Cleanup complete!
- Total directories processed: ${totalDirectories}
- Total images deleted: ${totalDeleted}
- Approximate space saved: ${(totalDeleted * 0.5).toFixed(2)} MB (estimated at 500KB per image)
  `);
}

// Run the cleanup
cleanupDownloadedImages();
