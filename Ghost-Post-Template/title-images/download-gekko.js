/**
 * Download a Gordon Gekko image for the "Greed Is Good" title
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { promisify } = require('util');
const stream = require('stream');
const pipeline = promisify(stream.pipeline);

// We'll use a public domain or creative commons image
// This is a search URL for a free stock image API
async function downloadGekkoImage() {
  try {
    // Create the directory if it doesn't exist
    const targetDir = path.join(__dirname, 'bullish/greed_is_good');
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
      console.log(`Created directory: ${targetDir}`);
    }
    
    // We'll use a Pexels image of a businessman in a suit that resembles Gordon Gekko
    // This is a free stock image that's similar to the Wall Street character
    const imageUrl = 'https://images.pexels.com/photos/936137/pexels-photo-936137.jpeg';
    const outputPath = path.join(targetDir, 'gordon_gekko_wall_street_businessman.jpg');
    
    console.log(`Downloading Gordon Gekko-like image to: ${outputPath}`);
    
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
    
    // Add or update the entry for this image
    if (!imageData['bullish/greed_is_good']) {
      imageData['bullish/greed_is_good'] = [];
    }
    
    // Add the image metadata
    imageData['bullish/greed_is_good'].push({
      url: imageUrl,
      photographer: 'Moose Photos',
      photographerUrl: 'https://www.pexels.com/@moose-photos-170195',
      id: 'gordon_gekko_custom',
      query: 'gordon gekko wall street businessman'
    });
    
    // Write the updated data back to the file
    fs.writeFileSync(imageDataPath, JSON.stringify(imageData, null, 2), 'utf8');
    
    console.log('✅ Gordon Gekko image downloaded and metadata updated!');
    console.log('Image path:', outputPath);
    
  } catch (error) {
    console.error('Error downloading Gordon Gekko image:', error.message);
  }
}

downloadGekkoImage().catch(console.error);
