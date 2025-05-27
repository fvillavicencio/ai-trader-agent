#!/usr/bin/env node
/**
 * Test script to verify that different titles get different images
 * This script simulates multiple Lambda invocations with different titles
 */

const fs = require('fs');
const path = require('path');
const { getS3ImageForTitle } = require('./src/utils/s3-image-selector');

// Test with different titles for each batch to simulate real-world usage
const firstBatchTitles = [
  "Market Rally Continues as Investors Embrace Risk",
  "Bears Take Control as Recession Fears Mount",
  "Volatility Spikes: Wild Ride Ahead for Investors"
];

const secondBatchTitles = [
  "Markets Surge on Positive Economic Data",
  "Recession Fears Grow as Economic Indicators Weaken",
  "Market Volatility Reaches New Highs"
];

// Run the test
async function testImageSelection() {
  console.log('Testing image selection logic with different titles in each batch...\n');
  
  // First batch - simulate first Lambda invocation
  console.log('=== FIRST BATCH (First Lambda invocation) ===\n');
  const firstBatchResults = [];
  
  for (const title of firstBatchTitles) {
    console.log(`Testing title: "${title}"`);
    
    // Get image for this title
    const image = getS3ImageForTitle(title);
    
    // Extract just the filename from the URL for easier comparison
    const filename = image.url.split('/').pop();
    
    firstBatchResults.push({
      title,
      imageUrl: image.url,
      filename
    });
    
    console.log(`Selected image: ${filename}\n`);
  }
  
  // Second batch - simulate second Lambda invocation in same container
  console.log('\n=== SECOND BATCH (Second Lambda invocation) ===\n');
  const secondBatchResults = [];
  
  for (const title of secondBatchTitles) {
    console.log(`Testing title: "${title}"`);
    
    // Get image for this title
    const image = getS3ImageForTitle(title);
    
    // Extract just the filename from the URL for easier comparison
    const filename = image.url.split('/').pop();
    
    secondBatchResults.push({
      title,
      imageUrl: image.url,
      filename
    });
    
    console.log(`Selected image: ${filename}\n`);
  }
  
  // Check for duplicates within each batch
  console.log('\n=== DUPLICATE CHECK WITHIN BATCHES ===\n');
  
  // First batch duplicates
  const firstBatchFilenames = firstBatchResults.map(r => r.filename);
  const firstBatchUnique = new Set(firstBatchFilenames);
  
  console.log('First batch:');
  console.log(`  Total titles: ${firstBatchResults.length}`);
  console.log(`  Unique images: ${firstBatchUnique.size}`);
  console.log(`  Duplicates: ${firstBatchResults.length - firstBatchUnique.size}`);
  
  if (firstBatchResults.length - firstBatchUnique.size > 0) {
    // Find which titles got the same images
    const filenameCount = {};
    firstBatchFilenames.forEach(filename => {
      filenameCount[filename] = (filenameCount[filename] || 0) + 1;
    });
    
    Object.entries(filenameCount)
      .filter(([filename, count]) => count > 1)
      .forEach(([filename, count]) => {
        const titles = firstBatchResults
          .filter(r => r.filename === filename)
          .map(r => r.title);
        
        console.log(`  Image ${filename} used for ${count} titles: ${titles.join(', ')}`);
      });
  }
  
  // Second batch duplicates
  const secondBatchFilenames = secondBatchResults.map(r => r.filename);
  const secondBatchUnique = new Set(secondBatchFilenames);
  
  console.log('\nSecond batch:');
  console.log(`  Total titles: ${secondBatchResults.length}`);
  console.log(`  Unique images: ${secondBatchUnique.size}`);
  console.log(`  Duplicates: ${secondBatchResults.length - secondBatchUnique.size}`);
  
  if (secondBatchResults.length - secondBatchUnique.size > 0) {
    // Find which titles got the same images
    const filenameCount = {};
    secondBatchFilenames.forEach(filename => {
      filenameCount[filename] = (filenameCount[filename] || 0) + 1;
    });
    
    Object.entries(filenameCount)
      .filter(([filename, count]) => count > 1)
      .forEach(([filename, count]) => {
        const titles = secondBatchResults
          .filter(r => r.filename === filename)
          .map(r => r.title);
        
        console.log(`  Image ${filename} used for ${count} titles: ${titles.join(', ')}`);
      });
  }
  
  // Check for duplicates between batches
  console.log('\n=== CROSS-BATCH COMPARISON ===\n');
  
  // Count how many times each image was used across both batches
  const allFilenames = [...firstBatchFilenames, ...secondBatchFilenames];
  const filenameCount = {};
  allFilenames.forEach(filename => {
    filenameCount[filename] = (filenameCount[filename] || 0) + 1;
  });
  
  const duplicates = Object.entries(filenameCount)
    .filter(([filename, count]) => count > 1)
    .map(([filename, count]) => ({ filename, count }));
  
  console.log(`Total unique images used across both batches: ${Object.keys(filenameCount).length}`);
  console.log(`Images used multiple times: ${duplicates.length}`);
  
  if (duplicates.length > 0) {
    console.log('\nImages used in multiple titles:');
    duplicates.forEach(dup => {
      const firstBatchTitlesWithImage = firstBatchResults
        .filter(r => r.filename === dup.filename)
        .map(r => r.title);
      
      const secondBatchTitlesWithImage = secondBatchResults
        .filter(r => r.filename === dup.filename)
        .map(r => r.title);
      
      console.log(`- ${dup.filename} used ${dup.count} times:`);
      
      if (firstBatchTitlesWithImage.length > 0) {
        console.log(`  First batch: ${firstBatchTitlesWithImage.join(', ')}`);
      }
      
      if (secondBatchTitlesWithImage.length > 0) {
        console.log(`  Second batch: ${secondBatchTitlesWithImage.join(', ')}`);
      }
    });
  } else {
    console.log('\nSuccess! Each title got a different image across both batches.');
  }
  
  // Save results to a file
  const allResults = {
    firstBatch: firstBatchResults,
    secondBatch: secondBatchResults,
    uniqueImagesCount: Object.keys(filenameCount).length,
    duplicateImagesCount: duplicates.length
  };
  
  fs.writeFileSync(
    path.join(__dirname, 'different-titles-test-results.json'),
    JSON.stringify(allResults, null, 2)
  );
  
  console.log('\nTest results saved to different-titles-test-results.json');
}

// Run the test
testImageSelection().catch(console.error);
