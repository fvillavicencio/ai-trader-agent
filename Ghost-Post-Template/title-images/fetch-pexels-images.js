#!/usr/bin/env node
/**
 * Fetch images from Pexels API based on search terms in terms.json
 * Creates image-data.json with image URLs and metadata
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');

// Pexels API key
const PEXELS_API_KEY = 'lKLmWCQHEak2DynrfSylBfEPDjFq3gwXq3k9d20x3ORXc4Llit2LgsDa';
const TERMS_FILE = path.join(__dirname, 'terms.json');
const OUTPUT_FILE = path.join(__dirname, 'image-urls.txt');
const JSON_OUTPUT_FILE = path.join(__dirname, 'image-data.json');

// Increased to get more images per category
const IMAGES_PER_TERM = 6;

// Add a delay function to avoid rate limits
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Fetch images from Pexels API
 */
async function fetchImages(query, perPage = IMAGES_PER_TERM) {
  // Add randomness to the search by randomly selecting quality terms
  const qualityTerms = ['professional', 'high quality', 'premium', 'business', 'corporate', 'finance'];
  const randomQualityTerm = qualityTerms[Math.floor(Math.random() * qualityTerms.length)];
  
  // Add a random quality term if not already included
  if (!qualityTerms.some(term => query.includes(term))) {
    query = `${query} ${randomQualityTerm}`;
  }
  
  // Random page number to get different results each time
  const randomPage = Math.floor(Math.random() * 3) + 1;
  
  try {
    // Add filters for high-quality, professional images
    const resp = await axios.get('https://api.pexels.com/v1/search', {
      headers: { Authorization: PEXELS_API_KEY },
      params: { 
        query, 
        per_page: perPage * 5, // Request more to filter from
        page: randomPage, // Random page for more variety
        orientation: 'landscape', 
        size: 'large',
        min_width: 1920, // Higher resolution
        min_height: 1080
      }
    });
    
    // Filter to get the most professional-looking images
    // Sort by highest resolution and most relevant
    const photos = resp.data.photos
      .filter(p => {
        // Filter out images with certain keywords in the description that might indicate non-professional content
        const avoidKeywords = ['cartoon', 'illustration', 'drawing', 'clip art', 'clipart', 'animation'];
        const hasAvoidKeywords = avoidKeywords.some(keyword => 
          (p.alt || '').toLowerCase().includes(keyword));
        return !hasAvoidKeywords;
      })
      .sort((a, b) => {
        // Sort by higher resolution first
        const aRes = a.width * a.height;
        const bRes = b.width * b.height;
        return bRes - aRes;
      });
    
    // Take only the requested number of images
    return photos.slice(0, perPage).map(p => ({
      url: p.src.large,
      photographer: p.photographer,
      photographerUrl: p.photographer_url,
      id: p.id
    }));
  } catch (error) {
    console.error(`Error fetching images for query "${query}":`, error.message);
    return [];
  }
}

/**
 * Process a single query and add results to output
 */
async function processQuery(query, category, outputStream, jsonOutput, usedImageIds, usedImageUrls) {
  try {
    console.log(`Searching "${query}" in ${category}...`);
    
    // Try to get more images to have options after filtering duplicates
    const images = await fetchImages(query, IMAGES_PER_TERM * 5);
    
    // Filter out any images that have already been used in other categories
    const uniqueImages = images.filter(img => {
      // Check if this exact image has been used
      if (usedImageIds.has(img.id)) {
        return false;
      }
      
      // Check for similar image URLs (sometimes Pexels returns similar images with different IDs)
      // Extract the base part of the URL to compare
      const urlBase = img.url.split('?')[0];
      if (usedImageUrls.has(urlBase)) {
        return false;
      }
      
      // This image is unique, mark it as used
      usedImageIds.add(img.id);
      usedImageUrls.add(urlBase);
      return true;
    });
    
    // Shuffle the unique images to add randomness
    const shuffledImages = [...uniqueImages];
    for (let i = shuffledImages.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffledImages[i], shuffledImages[j]] = [shuffledImages[j], shuffledImages[i]];
    }
    
    // Take images after shuffling
    const selectedImages = shuffledImages.slice(0, IMAGES_PER_TERM);
    
    if (selectedImages.length === 0) {
      console.log(`No unique images found for "${query}" in ${category}, trying with more specific query...`);
      // Try with a more specific query by adding 'professional' if not already there
      const enhancedQuery = query.includes('professional') ? query : `${query} professional`;
      const moreImages = await fetchImages(enhancedQuery, IMAGES_PER_TERM * 5);
      
      const moreUniqueImages = moreImages.filter(img => {
        if (usedImageIds.has(img.id)) return false;
        const urlBase = img.url.split('?')[0];
        if (usedImageUrls.has(urlBase)) return false;
        usedImageIds.add(img.id);
        usedImageUrls.add(urlBase);
        return true;
      });
      
      if (moreUniqueImages.length > 0) {
        selectedImages.push(...moreUniqueImages.slice(0, IMAGES_PER_TERM));
      } else {
        console.log(`Still no unique images found for "${query}" in ${category}`);
      }
    }
    
    // Write to output file and add to JSON output
    selectedImages.forEach(img => {
      outputStream.write(`${img.url} (Photo by ${img.photographer})\n`);
      
      if (!jsonOutput[category]) {
        jsonOutput[category] = [];
      }
      
      jsonOutput[category].push({
        url: img.url,
        photographer: img.photographer,
        photographerUrl: img.photographerUrl,
        id: img.id,
        query: query
      });
    });
    
    // Add a small delay to avoid hitting rate limits
    await delay(300);
    
    return selectedImages.length;
  } catch (error) {
    console.error(`Error processing query "${query}" for category "${category}":`, error.message);
    return 0;
  }
}

/**
 * Main function to process all terms and categories
 */
async function main() {
  try {
    // Read terms from file
    const terms = JSON.parse(fs.readFileSync(TERMS_FILE, 'utf8'));
    const outputStream = fs.createWriteStream(OUTPUT_FILE);
    
    // JSON output for more detailed information
    const jsonOutput = {};
    
    // Track image IDs and URLs to prevent duplicates
    const usedImageIds = new Set();
    const usedImageUrls = new Set();
    
    // Track statistics
    let totalCategories = 0;
    let totalQueries = 0;
    let totalImages = 0;
    
    // Process all categories in terms.json
    for (const [categoryKey, categoryValue] of Object.entries(terms)) {
      // Check if this is a nested category or a flat category with an array
      if (Array.isArray(categoryValue)) {
        // This is a flat category like "bullish/trend_is_friend": ["query1", "query2"]
        totalCategories++;
        const category = categoryKey;
        const queries = categoryValue;
        
        outputStream.write(`# ${category}\n`);
        
        // Process each query in this category
        for (const query of queries) {
          totalQueries++;
          const imagesAdded = await processQuery(query, category, outputStream, jsonOutput, usedImageIds, usedImageUrls);
          totalImages += imagesAdded;
        }
      } else {
        // This is a nested category like "bullish": { "subcategory1": [...], "subcategory2": [...] }
        const mainCategory = categoryKey;
        
        // Process each subcategory
        for (const [subCategory, queries] of Object.entries(categoryValue)) {
          totalCategories++;
          const fullCategory = `${mainCategory}/${subCategory}`;
          
          outputStream.write(`# ${fullCategory}\n`);
          
          // Process each query in this subcategory
          for (const query of queries) {
            totalQueries++;
            const imagesAdded = await processQuery(query, fullCategory, outputStream, jsonOutput, usedImageIds, usedImageUrls);
            totalImages += imagesAdded;
          }
        }
      }
      
      outputStream.write('\n');
    }
    
    // Close the output stream
    outputStream.end();
    
    // Write the JSON file
    fs.writeFileSync(JSON_OUTPUT_FILE, JSON.stringify(jsonOutput, null, 2), 'utf8');
    
    console.log(`✅ Done! Processed ${totalCategories} categories, ${totalQueries} queries, and found ${totalImages} unique images.`);
    console.log(`Results saved to ${OUTPUT_FILE} and ${JSON_OUTPUT_FILE}`);
  } catch (error) {
    console.error('Error in main process:', error);
  }
}

// Run the main function
main().catch(console.error);
