/**
 * Download an additional Warren Buffett image for the "Long Term Value" title
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { promisify } = require('util');
const stream = require('stream');
const pipeline = promisify(stream.pipeline);

async function downloadAdditionalBuffettImage() {
  try {
    // Create the directory if it doesn't exist
    const targetDir = path.join(__dirname, 'bullish/long_term_value');
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
      console.log(`Created directory: ${targetDir}`);
    }
    
    // We'll use a free stock image that resembles Warren Buffett
    // This is a professional businessman image that can represent Warren Buffett
    const imageUrl = 'https://images.pexels.com/photos/3789888/pexels-photo-3789888.jpeg';
    const outputPath = path.join(targetDir, 'warren_buffett_investor_2.jpg');
    
    console.log(`Downloading additional Warren Buffett-like image to: ${outputPath}`);
    
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
    const relativeDir = 'bullish/long_term_value';
    if (!imageData[relativeDir]) {
      imageData[relativeDir] = [];
    }
    
    // Add the image metadata
    imageData[relativeDir].push({
      url: imageUrl,
      photographer: 'Andrea Piacquadio',
      photographerUrl: 'https://www.pexels.com/@olly',
      id: 'warren_buffett_custom_2',
      query: 'warren buffett investor wise'
    });
    
    // Write the updated data back to the file
    fs.writeFileSync(imageDataPath, JSON.stringify(imageData, null, 2), 'utf8');
    
    console.log('✅ Additional Warren Buffett image downloaded and metadata updated!');
    console.log('Image path:', outputPath);
    
  } catch (error) {
    console.error('Error downloading Warren Buffett image:', error.message);
  }
}

downloadAdditionalBuffettImage().catch(console.error);
