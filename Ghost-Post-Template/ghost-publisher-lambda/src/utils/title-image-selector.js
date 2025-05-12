/**
 * Title Image Selector
 * 
 * This module selects an appropriate image for a given title based on its sentiment category.
 * It maps titles to specific image folders and provides functions to get image paths.
 */

const fs = require('fs');
const path = require('path');

// Base directory for title images
const BASE_IMAGE_DIR = process.env.TITLE_IMAGES_DIR || path.resolve(__dirname, '../../../title-images');

// Map title prefixes to their respective image folders
const titleToFolderMap = {
  // Bullish titles
  "Greed Is Good": "bullish/greed_is_good",
  "Blue Horseshoe Loves This Market": "bullish/blue_horseshoe",
  "Money Never Sleeps": "bullish/money_never_sleeps",
  "Lunch Is For Wimps": "bullish/lunch_is_for_wimps",
  "Absolutely Vertical": "bullish/absolutely_vertical",
  "Rookie Numbers": "bullish/rookie_numbers",
  "Buy The Dip": "bullish/buy_the_dip",
  "The Show Goes On": "bullish/the_show_goes_on",
  "I'm Jacked! Jacked To The Tits!": "bullish/opportunity_lifetime",
  "Opportunity Of A Lifetime": "bullish/opportunity_lifetime",
  "It's Time To Get Rich": "bullish/opportunity_lifetime",
  "The Upside Looks Tasty": "bullish/opportunity_lifetime",
  "Bulls On Parade": "bullish/bulls_on_parade",
  "Green Across The Board": "bullish/green_across_board",
  "To The Moon": "bullish/to_the_moon",
  "Diamond Hands": "bullish/diamond_hands",
  "The Trend Is Your Friend": "bullish/trend_is_friend",
  
  // Bearish titles
  "The Correction Is Coming": "bearish/the_correction_is_coming",
  "The Party's Over": "bearish/the_partys_over",
  "The Bubble Has Popped": "bearish/the_bubble_has_popped",
  "The House Of Cards": "bearish/the_house_of_cards",
  "Sell It All Today": "bearish/sell_it_all_today",
  "The Music Stopped": "bearish/the_music_stopped",
  "Bears In Control": "bearish/bears_in_control",
  "Blood In The Streets": "bearish/blood_in_streets",
  "Catching Falling Knives": "bearish/falling_knives",
  "Dead Cat Bounce": "bearish/dead_cat_bounce",
  "Winter Is Coming": "bearish/winter_is_coming",
  "The Bubble Has Burst": "bearish/bubble_burst",
  
  // Neutral titles
  "Patience, Grasshopper": "neutral/patience_grasshopper",
  "The Details Are Fuzzy": "neutral/the_details_fuzzy",
  "Just Wait": "neutral/just_wait",
  "Nobody Knows": "neutral/nobody_knows",
  "The Waiting Game": "neutral/the_waiting_game",
  "Proceed With Caution": "neutral/proceed_with_caution",
  "Mixed Signals": "neutral/mixed_signals",
  "Stuck In The Middle": "neutral/stuck_in_middle",
  "Walking The Tightrope": "neutral/walking_the_tightrope",
  "The Crossroads": "neutral/the_crossroads",
  "Time Will Tell": "neutral/time_will_tell",
  
  // Volatility titles
  "Turbulence Ahead": "volatile/turbulence_ahead",
  "Fasten Your Seatbelts": "volatile/fasten_seatbelts",
  "Wild Ride": "volatile/wild_ride",
  "The Casino Is Open": "volatile/casino_is_open",
  "Rollercoaster Day": "volatile/rollercoaster_day",
  "Market Whiplash": "volatile/market_whiplash",
  "The Perfect Storm": "volatile/the_perfect_storm",
  "Lightning In A Bottle": "volatile/lightning_bottle",
  "Buckle Up": "volatile/buckle_up",
  "Fear And Greed": "volatile/fear_and_greed"
};

// Fallback folders for each sentiment category
const sentimentFolders = {
  bullish: ["bullish/bulls_on_parade", "bullish/green_across_board", "bullish/to_the_moon"],
  bearish: ["bearish/bears_in_control", "bearish/the_correction_is_coming", "bearish/winter_is_coming"],
  neutral: ["neutral/mixed_signals", "neutral/the_waiting_game", "neutral/the_crossroads"],
  volatile: ["volatile/wild_ride", "volatile/the_perfect_storm", "volatile/market_whiplash"]
};

/**
 * Get a random image path for a specific title
 * @param {string} title - The title to find an image for
 * @param {string} sentiment - The sentiment category (bullish, bearish, neutral, volatile)
 * @returns {string} - Path to an appropriate image
 */
function getImageForTitle(title, sentiment = 'neutral') {
  try {
    // Check for special character-themed images for certain titles
    // This is done dynamically without hardcoding specific paths
    
    // Define a mapping of title keywords to potential character image folders and keywords
    const characterImageMapping = [
      {
        titleKeywords: ['Greed', 'Greed Is Good'],
        folderPath: 'bullish/greed_is_good',
        imageKeywords: ['gordon', 'gekko', 'wall_street_businessman']
      },
      {
        titleKeywords: ['Wolf', 'Wall Street', 'Absolutely Vertical'],
        folderPath: 'bullish/absolutely_vertical',
        imageKeywords: ['jordan', 'belfort', 'wolf_of_wall_street']
      },
      {
        titleKeywords: ['Value', 'Long Term', 'Buffett'],
        folderPath: 'bullish/long_term_value',
        imageKeywords: ['warren', 'buffett', 'investor']
      },
      {
        titleKeywords: ['Correction', 'Short', 'Crash', 'Bear Market'],
        folderPath: 'bearish/the_correction_is_coming',
        imageKeywords: ['michael', 'burry', 'big_short']
      }
    ];
    
    // Find a matching mapping based on the title
    for (const mapping of characterImageMapping) {
      // Check if any of the title keywords are in the title
      const matchesTitle = mapping.titleKeywords.some(keyword => 
        title.toLowerCase().includes(keyword.toLowerCase())
      );
      
      if (matchesTitle) {
        const folderPath = path.join(BASE_IMAGE_DIR, mapping.folderPath);
        
        if (fs.existsSync(folderPath)) {
          try {
            // Get all images in the directory
            const files = fs.readdirSync(folderPath)
              .filter(file => file.endsWith('.jpg') || file.endsWith('.png'));
            
            // Look for character images matching the keywords
            const characterImages = files.filter(file => {
              const lowerFile = file.toLowerCase();
              return mapping.imageKeywords.some(keyword => 
                lowerFile.includes(keyword.toLowerCase())
              );
            });
            
            // If we found character images and random chance is favorable (75%)
            if (characterImages.length > 0 && Math.random() < 0.75) {
              // Select a random character image
              const selectedImage = characterImages[Math.floor(Math.random() * characterImages.length)];
              const relativePath = path.join(mapping.folderPath, selectedImage);
              console.log(`Using finance character image for "${title}" title: ${relativePath}`);
              return relativePath;
            }
          } catch (error) {
            console.error(`Error finding character images in ${folderPath}:`, error);
            // Continue with normal image selection
          }
        }
      }
    }
    
    let folderPath;
    
    // First, try to find a specific folder for this title
    for (const [titlePrefix, folder] of Object.entries(titleToFolderMap)) {
      if (title.startsWith(titlePrefix)) {
        folderPath = folder;
        break;
      }
    }
    
    // If no specific folder found, use a fallback based on sentiment
    if (!folderPath && sentimentFolders[sentiment]) {
      const fallbackFolders = sentimentFolders[sentiment];
      folderPath = fallbackFolders[Math.floor(Math.random() * fallbackFolders.length)];
    }
    
    // If still no folder, use a general fallback
    if (!folderPath) {
      folderPath = sentimentFolders.neutral[0];
    }
    
    // Get all images in the folder
    const fullFolderPath = path.join(BASE_IMAGE_DIR, folderPath);
    if (!fs.existsSync(fullFolderPath)) {
      console.warn(`Image folder not found: ${fullFolderPath}. Trying to find an alternative folder.`);
      
      // Try to find any folder in the same sentiment category
      const sentimentDir = path.join(BASE_IMAGE_DIR, sentiment);
      if (fs.existsSync(sentimentDir)) {
        const availableFolders = fs.readdirSync(sentimentDir, { withFileTypes: true })
          .filter(dirent => dirent.isDirectory())
          .map(dirent => `${sentiment}/${dirent.name}`);
          
        if (availableFolders.length > 0) {
          // Choose a random folder from the same sentiment
          folderPath = availableFolders[Math.floor(Math.random() * availableFolders.length)];
          console.log(`Using alternative folder: ${folderPath}`);
          return getImageFromFolder(folderPath);
        }
      }
      
      // If still no folder, try any sentiment
      const sentiments = ['bullish', 'bearish', 'neutral', 'volatile'];
      for (const s of sentiments) {
        if (s === sentiment) continue; // Already tried this one
        
        const sentimentDir = path.join(BASE_IMAGE_DIR, s);
        if (fs.existsSync(sentimentDir)) {
          const availableFolders = fs.readdirSync(sentimentDir, { withFileTypes: true })
            .filter(dirent => dirent.isDirectory())
            .map(dirent => `${s}/${dirent.name}`);
            
          if (availableFolders.length > 0) {
            // Choose a random folder from another sentiment
            folderPath = availableFolders[Math.floor(Math.random() * availableFolders.length)];
            console.log(`Using alternative sentiment folder: ${folderPath}`);
            return getImageFromFolder(folderPath);
          }
        }
      }
      
      return null;
    }
    
    return getImageFromFolder(folderPath);
  } catch (error) {
    console.error('Error selecting image:', error);
    return null;
  }
}

/**
 * Helper function to get a random image from a folder
 * @param {string} folderPath - Relative path to the folder
 * @returns {string} - Path to a random image in the folder
 */
function getImageFromFolder(folderPath) {
  try {
    const fullFolderPath = path.join(BASE_IMAGE_DIR, folderPath);
    
    if (!fs.existsSync(fullFolderPath)) {
      console.warn(`Folder does not exist: ${fullFolderPath}`);
      return findAnyAvailableImage();
    }
    
    const images = fs.readdirSync(fullFolderPath)
      .filter(file => file.endsWith('.jpg') || file.endsWith('.png'));
    
    if (images.length === 0) {
      console.warn(`No images found in folder: ${fullFolderPath}`);
      return findAnyAvailableImage();
    }
    
    // Select a random image
    const selectedImage = images[Math.floor(Math.random() * images.length)];
    return path.join(folderPath, selectedImage);
  } catch (error) {
    console.error('Error getting image from folder:', error);
    return findAnyAvailableImage();
  }
}

/**
 * Find any available image in the title-images directory
 * @returns {string} - Path to an available image or null if none found
 */
function findAnyAvailableImage() {
  try {
    // Check each sentiment category
    const sentiments = ['bullish', 'bearish', 'neutral', 'volatile'];
    
    // First try to find any folder with images
    for (const sentiment of sentiments) {
      const sentimentDir = path.join(BASE_IMAGE_DIR, sentiment);
      if (!fs.existsSync(sentimentDir)) continue;
      
      const folders = fs.readdirSync(sentimentDir, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name);
      
      for (const folder of folders) {
        const folderPath = path.join(sentiment, folder);
        const fullFolderPath = path.join(BASE_IMAGE_DIR, folderPath);
        
        const images = fs.readdirSync(fullFolderPath)
          .filter(file => file.endsWith('.jpg') || file.endsWith('.png'));
        
        if (images.length > 0) {
          const selectedImage = images[Math.floor(Math.random() * images.length)];
          console.log(`Found fallback image in: ${folderPath}`);
          return path.join(folderPath, selectedImage);
        }
      }
    }
    
    // If we get here, we couldn't find any images
    console.error('No images found in any folder');
    return null;
  } catch (error) {
    console.error('Error finding any available image:', error);
    return null;
  }
}

/**
 * Get image metadata including photographer attribution
 * @param {string} imagePath - Relative path to the image
 * @returns {object} - Image metadata including attribution
 */
function getImageMetadata(imagePath) {
  try {
    // Try to load the image-data.json file
    const dataFilePath = path.join(BASE_IMAGE_DIR, 'image-data.json');
    if (!fs.existsSync(dataFilePath)) {
      return { 
        path: imagePath,
        attribution: 'Photos provided by Pexels'
      };
    }
    
    const imageData = JSON.parse(fs.readFileSync(dataFilePath, 'utf8'));
    const folderPath = path.dirname(imagePath);
    const fileName = path.basename(imagePath);
    
    // Find matching image data
    if (imageData[folderPath]) {
      // Extract the query part from the filename
      const fileNameParts = fileName.split('_');
      const queryPart = fileNameParts.slice(1, -1).join('_');
      
      // Find images with matching query
      const matchingImages = imageData[folderPath].filter(img => 
        fileName.includes(img.query.replace(/\s+/g, '_'))
      );
      
      if (matchingImages.length > 0) {
        // Use the first matching image
        const img = matchingImages[0];
        return {
          path: imagePath,
          attribution: `Photo by ${img.photographer}`,
          photographerUrl: img.photographerUrl,
          source: 'Pexels'
        };
      }
    }
    
    // Fallback if no specific match found
    return { 
      path: imagePath,
      attribution: 'Photos provided by Pexels'
    };
  } catch (error) {
    console.error('Error getting image metadata:', error);
    return { 
      path: imagePath,
      attribution: 'Photos provided by Pexels'
    };
  }
}

module.exports = {
  getImageForTitle,
  getImageMetadata,
  BASE_IMAGE_DIR
};
