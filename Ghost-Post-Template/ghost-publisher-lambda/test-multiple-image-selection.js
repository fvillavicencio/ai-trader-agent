#!/usr/bin/env node
/**
 * Test script to verify that different titles get different images
 * This script generates multiple test posts with different titles and sentiments
 * to ensure the image selection logic is working correctly
 */

const fs = require('fs');
const path = require('path');
const { getS3ImageForTitle } = require('./src/utils/s3-image-selector');

// Test titles with different sentiments
const testTitles = [
  { title: "Market Rally Continues as Investors Embrace Risk", sentiment: "bullish" },
  { title: "Wait And See: Markets Pause Ahead of Fed Decision", sentiment: "neutral" },
  { title: "Proceed With Caution: Mixed Signals in Economic Data", sentiment: "neutral" },
  { title: "Bears Take Control as Recession Fears Mount", sentiment: "bearish" },
  { title: "Volatility Spikes: Wild Ride Ahead for Investors", sentiment: "volatile" },
  { title: "The Perfect Storm: Multiple Risk Factors Converge", sentiment: "volatile" },
  { title: "Gordon Gekko Would Be Proud: Greed Returns to Wall Street", sentiment: "bullish" },
  { title: "Michael Burry Warns of Bubble About to Burst", sentiment: "bearish" },
  { title: "Warren Buffett's Long-Term Value Approach Pays Off", sentiment: "bullish" },
  { title: "Jordan Belfort Style Trading Returns to Markets", sentiment: "bullish" }
];

// Run the test
async function testImageSelection() {
  console.log('Testing image selection logic with multiple titles...\n');
  
  // Run multiple iterations to test the "avoid recently used" logic
  const iterations = 3;
  const allResults = [];
  
  for (let i = 0; i < iterations; i++) {
    console.log(`\n=== ITERATION ${i + 1} ===\n`);
    
    const iterationResults = [];
    
    for (const test of testTitles) {
      console.log(`Testing title: "${test.title}" with sentiment: ${test.sentiment}`);
      
      // Get image for this title
      const image = getS3ImageForTitle(test.title, test.sentiment);
      
      // Extract just the filename from the URL for easier comparison
      const filename = image.url.split('/').pop();
      
      iterationResults.push({
        iteration: i + 1,
        title: test.title,
        sentiment: test.sentiment,
        imageUrl: image.url,
        filename
      });
      
      console.log(`Selected image: ${filename}\n`);
    }
    
    allResults.push(...iterationResults);
    
    // Analyze results for this iteration
    const filenameCount = {};
    iterationResults.forEach(result => {
      if (!filenameCount[result.filename]) {
        filenameCount[result.filename] = 0;
      }
      filenameCount[result.filename]++;
    });
    
    const duplicates = Object.entries(filenameCount)
      .filter(([filename, count]) => count > 1)
      .map(([filename, count]) => ({ filename, count }));
    
    console.log(`\n--- ITERATION ${i + 1} RESULTS ---`);
    console.log(`Total titles tested: ${iterationResults.length}`);
    console.log(`Unique images selected: ${Object.keys(filenameCount).length}`);
    console.log(`Duplicate images: ${duplicates.length}`);
    
    if (duplicates.length > 0) {
      console.log('\nDuplicate images found:');
      duplicates.forEach(dup => {
        console.log(`- ${dup.filename} used ${dup.count} times`);
        
        // Show which titles got the same image
        const titlesWithImage = iterationResults
          .filter(r => r.filename === dup.filename)
          .map(r => r.title);
        
        console.log(`  Used for titles: ${titlesWithImage.join(', ')}`);
      });
    } else {
      console.log('\nSuccess! Each title in this iteration got a different image.');
    }
  }
  
  // Analyze across iterations to see if images are being varied
  console.log('\n=== CROSS-ITERATION ANALYSIS ===');
  
  // Group by title and check if the same title gets different images across iterations
  const titleGroups = {};
  allResults.forEach(result => {
    if (!titleGroups[result.title]) {
      titleGroups[result.title] = [];
    }
    titleGroups[result.title].push({
      iteration: result.iteration,
      filename: result.filename
    });
  });
  
  // Check how many titles got different images across iterations
  let titlesWithDifferentImages = 0;
  let titlesWithSameImage = 0;
  
  Object.entries(titleGroups).forEach(([title, occurrences]) => {
    const uniqueImages = new Set(occurrences.map(o => o.filename));
    console.log(`Title: "${title}"`);
    console.log(`  Images across iterations: ${occurrences.map(o => `Iteration ${o.iteration}: ${o.filename}`).join(', ')}`);
    console.log(`  Unique images used: ${uniqueImages.size} / ${occurrences.length}`);
    
    if (uniqueImages.size === occurrences.length) {
      titlesWithDifferentImages++;
    } else {
      titlesWithSameImage++;
    }
  });
  
  console.log('\n--- FINAL RESULTS ---');
  console.log(`Titles that got different images across all iterations: ${titlesWithDifferentImages}`);
  console.log(`Titles that got the same image in at least two iterations: ${titlesWithSameImage}`);
  console.log(`Image diversity rate: ${(titlesWithDifferentImages / Object.keys(titleGroups).length * 100).toFixed(2)}%`);
  
  // Save results to a file
  fs.writeFileSync(
    path.join(__dirname, 'image-selection-test-results.json'),
    JSON.stringify(allResults, null, 2)
  );
  
  console.log('\nTest results saved to image-selection-test-results.json');
}

// Run the test
testImageSelection().catch(console.error);
