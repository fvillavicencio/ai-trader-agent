/**
 * Debug script to test the S3 image selection logic
 */

const fs = require('fs');
const path = require('path');

// Import the S3 image selector
const { getS3ImageForTitle } = require('./src/utils/s3-image-selector');
// Import the title image selector for direct testing
const { getImageForTitle } = require('./src/utils/title-image-selector');

// Test titles with different sentiments
const testTitles = [
  { title: "Greed Is Good: Markets Rally on Strong Earnings", sentiment: "bullish" },
  { title: "The Correction Is Coming: Warning Signs Flashing Red", sentiment: "bearish" },
  { title: "Money Never Sleeps: After-Hours Trading Shows Momentum", sentiment: "bullish" },
  { title: "The Perfect Storm: Multiple Factors Converge for Volatility", sentiment: "volatile" },
  { title: "Patience, Grasshopper: Markets Await Fed Decision", sentiment: "neutral" }
];

// Function to test the image selection logic
function testImageSelection() {
  console.log('Testing image selection logic...\n');
  
  // First, check the S3 config
  const s3ConfigPath = path.resolve(__dirname, '../title-images/s3-config.json');
  if (fs.existsSync(s3ConfigPath)) {
    const s3Config = JSON.parse(fs.readFileSync(s3ConfigPath, 'utf8'));
    console.log('S3 Config:');
    console.log(JSON.stringify(s3Config, null, 2));
    console.log('-----------------------------------');
  } else {
    console.error('S3 config file not found:', s3ConfigPath);
  }
  
  // Check the S3 image mappings
  const mappingsPath = path.resolve(__dirname, '../title-images/s3-image-mappings.json');
  if (fs.existsSync(mappingsPath)) {
    const s3ImageMappings = JSON.parse(fs.readFileSync(mappingsPath, 'utf8'));
    console.log('S3 Image Mappings (sample):');
    const sampleKeys = Object.keys(s3ImageMappings).slice(0, 3);
    sampleKeys.forEach(key => {
      console.log(`${key} => ${s3ImageMappings[key]}`);
    });
    console.log(`... (${Object.keys(s3ImageMappings).length} total mappings)`);
    console.log('-----------------------------------');
  } else {
    console.error('S3 image mappings file not found:', mappingsPath);
  }
  
  // Check the base image directory
  const baseImageDir = path.resolve(__dirname, '../title-images');
  console.log(`Base Image Directory: ${baseImageDir}`);
  if (fs.existsSync(baseImageDir)) {
    const sentimentDirs = fs.readdirSync(baseImageDir, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory() && ['bullish', 'bearish', 'neutral', 'volatile'].includes(dirent.name))
      .map(dirent => dirent.name);
    
    console.log(`Found sentiment directories: ${sentimentDirs.join(', ')}`);
    
    // Check a sample of image folders
    if (sentimentDirs.includes('bullish')) {
      const bullishDir = path.join(baseImageDir, 'bullish');
      const bullishFolders = fs.readdirSync(bullishDir, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name);
      
      console.log(`Sample bullish folders: ${bullishFolders.slice(0, 5).join(', ')}... (${bullishFolders.length} total)`);
    }
    console.log('-----------------------------------');
  } else {
    console.error('Base image directory not found:', baseImageDir);
  }
  
  // Test each title with both the local and S3 image selectors
  testTitles.forEach((test, index) => {
    console.log(`\n[${index + 1}/5] Testing with title: "${test.title}" (${test.sentiment})`);
    
    // Test the local image selector first
    console.log('Testing local image selector:');
    try {
      const localImagePath = getImageForTitle(test.title, test.sentiment);
      console.log(`Local image path: ${localImagePath || 'None found'}`);
      
      if (localImagePath) {
        const fullLocalPath = path.join(baseImageDir, localImagePath);
        console.log(`Full local path: ${fullLocalPath}`);
        console.log(`Path exists: ${fs.existsSync(fullLocalPath)}`);
      }
    } catch (error) {
      console.error('Error with local image selector:', error);
    }
    
    // Now test the S3 image selector
    console.log('\nTesting S3 image selector:');
    try {
      const s3ImageResult = getS3ImageForTitle(test.title, test.sentiment);
      console.log(`S3 image result: ${JSON.stringify(s3ImageResult, null, 2)}`);
    } catch (error) {
      console.error('Error with S3 image selector:', error);
    }
    
    console.log('-----------------------------------');
  });
}

// Run the test
testImageSelection();
