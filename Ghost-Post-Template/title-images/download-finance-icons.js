/**
 * Download images of famous financial figures for Market Pulse Daily
 * - Jordan Belfort (Wolf of Wall Street) - for "Absolutely Vertical" title
 * - Warren Buffett - for "Long Term Value" title
 * - Michael Burry (The Big Short) - for "The Correction Is Coming" title
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { promisify } = require('util');
const stream = require('stream');
const pipeline = promisify(stream.pipeline);

// Function to create directory if it doesn't exist
const ensureDirectoryExists = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    console.log(`Created directory: ${dirPath}`);
  }
};

// Function to download an image and update metadata
async function downloadImage(imageUrl, targetDir, filename, metadata) {
  try {
    ensureDirectoryExists(targetDir);
    
    const outputPath = path.join(targetDir, filename);
    console.log(`Downloading image to: ${outputPath}`);
    
    const response = await axios({
      method: 'GET',
      url: imageUrl,
      responseType: 'stream'
    });
    
    await pipeline(response.data, fs.createWriteStream(outputPath));
    
    // Add metadata to the image-data.json file
    const imageDataPath = path.join(__dirname, 'image-data.json');
    let imageData = {};
    
    if (fs.existsSync(imageDataPath)) {
      imageData = JSON.parse(fs.readFileSync(imageDataPath, 'utf8'));
    }
    
    // Add or update the entry for this directory
    const relativeDir = path.relative(__dirname, targetDir);
    if (!imageData[relativeDir]) {
      imageData[relativeDir] = [];
    }
    
    // Add the image metadata
    imageData[relativeDir].push(metadata);
    
    // Write the updated data back to the file
    fs.writeFileSync(imageDataPath, JSON.stringify(imageData, null, 2), 'utf8');
    
    console.log(`✅ Image downloaded and metadata updated for: ${filename}`);
    return outputPath;
  } catch (error) {
    console.error(`Error downloading image ${filename}:`, error.message);
    return null;
  }
}

async function downloadAllImages() {
  try {
    // 1. Jordan Belfort (Wolf of Wall Street) - for "Absolutely Vertical" title
    const wolfDir = path.join(__dirname, 'bullish/absolutely_vertical');
    await downloadImage(
      'https://images.pexels.com/photos/936137/pexels-photo-936137.jpeg',
      wolfDir,
      'jordan_belfort_wolf_of_wall_street.jpg',
      {
        url: 'https://images.pexels.com/photos/936137/pexels-photo-936137.jpeg',
        photographer: 'Moose Photos',
        photographerUrl: 'https://www.pexels.com/@moose-photos-170195',
        id: 'wolf_of_wall_street_custom',
        query: 'wolf of wall street businessman'
      }
    );
    
    // 2. Warren Buffett - for "Long Term Value" title
    // First, create the directory if it doesn't exist
    const buffettDir = path.join(__dirname, 'bullish/long_term_value');
    ensureDirectoryExists(buffettDir);
    
    await downloadImage(
      'https://images.pexels.com/photos/7821485/pexels-photo-7821485.jpeg',
      buffettDir,
      'warren_buffett_investor.jpg',
      {
        url: 'https://images.pexels.com/photos/7821485/pexels-photo-7821485.jpeg',
        photographer: 'Tima Miroshnichenko',
        photographerUrl: 'https://www.pexels.com/@tima-miroshnichenko',
        id: 'warren_buffett_custom',
        query: 'warren buffett investor'
      }
    );
    
    // 3. Michael Burry (The Big Short) - for "The Correction Is Coming" title
    const burryDir = path.join(__dirname, 'bearish/the_correction_is_coming');
    await downloadImage(
      'https://images.pexels.com/photos/6801648/pexels-photo-6801648.jpeg',
      burryDir,
      'michael_burry_big_short.jpg',
      {
        url: 'https://images.pexels.com/photos/6801648/pexels-photo-6801648.jpeg',
        photographer: 'Tima Miroshnichenko',
        photographerUrl: 'https://www.pexels.com/@tima-miroshnichenko',
        id: 'michael_burry_custom',
        query: 'big short market crash'
      }
    );
    
    console.log('All financial icon images downloaded successfully!');
  } catch (error) {
    console.error('Error in download process:', error.message);
  }
}

downloadAllImages().catch(console.error);
