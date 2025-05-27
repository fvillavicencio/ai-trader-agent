#!/usr/bin/env node
/**
 * Test script to verify that different titles get different images in a real-world scenario
 * This script simulates multiple Lambda invocations in the same container
 */

const fs = require('fs');
const path = require('path');
const { getS3ImageForTitle } = require('./src/utils/s3-image-selector');

// Test titles with different sentiments
const testTitles = [
  "Market Rally Continues as Investors Embrace Risk",
  "Wait And See: Markets Pause Ahead of Fed Decision",
  "Proceed With Caution: Mixed Signals in Economic Data",
  "Bears Take Control as Recession Fears Mount",
  "Volatility Spikes: Wild Ride Ahead for Investors"
];

// Run the test
async function testImageSelection() {
  console.log('Testing image selection logic with multiple titles in the same process...\n');
  
  // First batch - simulate first Lambda invocation
  console.log('=== FIRST BATCH (First Lambda invocation) ===\n');
  const firstBatchResults = [];
  
  for (const title of testTitles) {
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
  
  for (const title of testTitles) {
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
  
  // Compare results between batches
  console.log('\n=== COMPARISON BETWEEN BATCHES ===\n');
  
  let sameImageCount = 0;
  let differentImageCount = 0;
  
  for (let i = 0; i < testTitles.length; i++) {
    const title = testTitles[i];
    const firstImage = firstBatchResults[i].filename;
    const secondImage = secondBatchResults[i].filename;
    
    console.log(`Title: "${title}"`);
    console.log(`  First batch image: ${firstImage}`);
    console.log(`  Second batch image: ${secondImage}`);
    
    if (firstImage === secondImage) {
      console.log(`  SAME IMAGE USED ❌`);
      sameImageCount++;
    } else {
      console.log(`  DIFFERENT IMAGES USED ✅`);
      differentImageCount++;
    }
    console.log('');
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
  
  // Second batch duplicates
  const secondBatchFilenames = secondBatchResults.map(r => r.filename);
  const secondBatchUnique = new Set(secondBatchFilenames);
  
  console.log('\nSecond batch:');
  console.log(`  Total titles: ${secondBatchResults.length}`);
  console.log(`  Unique images: ${secondBatchUnique.size}`);
  console.log(`  Duplicates: ${secondBatchResults.length - secondBatchUnique.size}`);
  
  // Final results
  console.log('\n=== FINAL RESULTS ===');
  console.log(`Titles that got different images between batches: ${differentImageCount} / ${testTitles.length} (${(differentImageCount/testTitles.length*100).toFixed(2)}%)`);
  console.log(`Titles that got the same image in both batches: ${sameImageCount} / ${testTitles.length} (${(sameImageCount/testTitles.length*100).toFixed(2)}%)`);
  
  // Save results to a file
  const allResults = {
    firstBatch: firstBatchResults,
    secondBatch: secondBatchResults,
    comparison: {
      differentImageCount,
      sameImageCount,
      percentDifferent: (differentImageCount/testTitles.length*100).toFixed(2)
    }
  };
  
  fs.writeFileSync(
    path.join(__dirname, 'real-world-test-results.json'),
    JSON.stringify(allResults, null, 2)
  );
  
  console.log('\nTest results saved to real-world-test-results.json');
}

// Run the test
testImageSelection().catch(console.error);
