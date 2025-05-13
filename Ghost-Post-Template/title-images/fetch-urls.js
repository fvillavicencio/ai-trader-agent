#!/usr/bin/env node
/**
 * Fetch ~10 images per search term from Pexels API,
 * and write direct URLs into image-urls.txt under category headers.
 */

const fs    = require('fs');
const path  = require('path');
const axios = require('axios');

// Pexels API key
const PEXELS_API_KEY = 'lKLmWCQHEak2DynrfSylBfEPDjFq3gwXq3k9d20x3ORXc4Llit2LgsDa';
const TERMS_FILE     = path.join(__dirname, 'terms.json');
const OUTPUT_FILE    = path.join(__dirname, 'image-urls.txt');

// How many images per term to pull
const IMAGES_PER_TERM = 6; // Increased to get more images per category

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
  
  // Add filters for high-quality, professional images
  const resp = await axios.get('https://api.pexels.com/v1/search', {
    headers: { Authorization: PEXELS_API_KEY },
    params:  { 
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
}

async function main() {
  const terms = JSON.parse(fs.readFileSync(TERMS_FILE, 'utf8'));
  const out   = fs.createWriteStream(OUTPUT_FILE);
  
  // Also create a JSON file with more detailed information
  const jsonOutput = {};
  
  // Keep track of all image IDs to prevent duplicates
  const usedImageIds = new Set();
  // Keep track of all image URLs to prevent similar images
  const usedImageUrls = new Set();

  // Process all categories in terms.json
  for (const [categoryKey, categoryValue] of Object.entries(terms)) {
    // Check if this is a nested category or a flat category with an array
    if (Array.isArray(categoryValue)) {
      // This is a flat category like "bullish/trend_is_friend": ["query1", "query2"]
      const category = categoryKey;
      const queries = categoryValue;
      
      // Create category in output
      if (!jsonOutput[category]) {
        jsonOutput[category] = [];
      }
      out.write(`# ${category}\n`);
      
      // Process each query in this category
      for (const q of queries) {
        console.log(`Searching "${q}" in ${category}...`);
        await processQuery(q, category, out, jsonOutput, usedImageIds, usedImageUrls);
      }
    } else {
      // This is a nested category like "bullish": { "subcategory1": [...], "subcategory2": [...] }
      const mainCategory = categoryKey;
      
      // Process each subcategory
      for (const [subCategory, queries] of Object.entries(categoryValue)) {
        const fullCategory = `${mainCategory}/${subCategory}`;
        
        // Create category in output
        if (!jsonOutput[fullCategory]) {
          jsonOutput[fullCategory] = [];
        }
        out.write(`# ${fullCategory}\n`);
        
        // Process each query in this subcategory
        for (const q of queries) {
          console.log(`Searching "${q}" in ${fullCategory}...`);
          await processQuery(q, fullCategory, out, jsonOutput, usedImageIds, usedImageUrls);
        }
      }
    }
    
    out.write('\n');
  }

  out.end();
  
  // Write the JSON file
  fs.writeFileSync(
    path.join(__dirname, 'image-data.json'), 
    JSON.stringify(jsonOutput, null, 2), 
    'utf8'
  );
  
  console.log(`✅ Done! See ${OUTPUT_FILE} and image-data.json`);
}

// Helper function to process a single query
async function processQuery(q, category, out, jsonOutput, usedImageIds, usedImageUrls) {
  try {
    // Try to get more images to have options after filtering duplicates
    const images = await fetchImages(q, IMAGES_PER_TERM * 5);
    
    // Filter out any images that have already been used in other categories
    const uniqueImages = images.filter(img => {
      // Check if this exact image has been used
      if (usedImageIds.has(img.id)) {
        return false;
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
          console.log(`No unique images found for "${q}" in ${category}, trying with more specific query...`);
          // Try with a more specific query by adding 'professional' if not already there
          const enhancedQuery = q.includes('professional') ? q : `${q} professional`;
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
            selectedImages.push(moreUniqueImages[0]);
          } else {
            console.log(`Still no unique images found for "${q}" in ${category}`);
          }
        }
        
        selectedImages.forEach(img => {
          out.write(`${img.url} (Photo by ${img.photographer})\n`);
          jsonOutput[category].push({
            url: img.url,
            photographer: img.photographer,
            photographerUrl: img.photographerUrl,
            id: img.id,
            query: q
          });
        });
        
        // Add a small delay to avoid hitting rate limits
        await new Promise(resolve => setTimeout(resolve, 300));
      } catch (err) {
        console.error(`Error fetching "${q}":`, err.message);
      }
    }
    out.write('\n');
  }

  out.end();
  
  // Write the JSON file
  fs.writeFileSync(
    path.join(__dirname, 'image-data.json'), 
    JSON.stringify(jsonOutput, null, 2), 
    'utf8'
  );
  
  console.log(`✅ Done! See ${OUTPUT_FILE} and image-data.json`);
}

main().catch(console.error);
