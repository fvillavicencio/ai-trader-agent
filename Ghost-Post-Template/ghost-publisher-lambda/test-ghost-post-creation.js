#!/usr/bin/env node
/**
 * Test script to verify that different Ghost posts get different images
 * This script simulates the actual post creation process
 */

const fs = require('fs');
const path = require('path');
const { getS3ImageForTitle } = require('./src/utils/s3-image-selector');

// Sample post titles with different sentiments
const postTitles = [
  "Market Pulse Daily: Bulls Take Control as Economic Data Strengthens",
  "Market Pulse Daily: Cautious Outlook as Mixed Signals Emerge",
  "Market Pulse Daily: Bears Dominate as Recession Fears Mount",
  "Market Pulse Daily: Volatility Spikes on Geopolitical Tensions"
];

// Create a simple mobiledoc structure for testing
function createMobiledoc(title, imageUrl) {
  return {
    title,
    feature_image: imageUrl,
    mobiledoc: JSON.stringify({
      version: '0.3.1',
      markups: [],
      atoms: [],
      cards: [
        ['html', { html: `<h2>Test post with title: ${title}</h2>` }]
      ],
      sections: [[10, 0]]
    })
  };
}

// Run the test
async function testGhostPostCreation() {
  console.log('Testing image selection for Ghost posts with different titles...\n');
  
  const posts = [];
  const usedImages = new Set();
  
  for (const title of postTitles) {
    console.log(`Creating post with title: "${title}"`);
    
    // Get image for this title
    const image = getS3ImageForTitle(title);
    
    // Extract just the filename from the URL for easier comparison
    const filename = image.url.split('/').pop();
    
    // Create a post with this title and image
    const post = createMobiledoc(title, image.url);
    posts.push({
      title,
      imageUrl: image.url,
      filename,
      post
    });
    
    // Track used images
    usedImages.add(filename);
    
    console.log(`Selected image: ${filename}\n`);
  }
  
  // Check for duplicates
  console.log('\n=== IMAGE DIVERSITY ANALYSIS ===\n');
  console.log(`Total posts created: ${posts.length}`);
  console.log(`Unique images used: ${usedImages.size}`);
  console.log(`Image diversity rate: ${(usedImages.size / posts.length * 100).toFixed(2)}%`);
  
  // Find which titles got the same images
  const imageToTitles = {};
  posts.forEach(post => {
    if (!imageToTitles[post.filename]) {
      imageToTitles[post.filename] = [];
    }
    imageToTitles[post.filename].push(post.title);
  });
  
  if (usedImages.size < posts.length) {
    console.log('\nDuplicate images detected:');
    
    Object.entries(imageToTitles)
      .filter(([_, titles]) => titles.length > 1)
      .forEach(([filename, titles]) => {
        console.log(`- Image ${filename} used for ${titles.length} posts:`);
        titles.forEach(title => console.log(`  • ${title}`));
      });
  } else {
    console.log('\nSuccess! Each post got a unique image.');
  }
  
  // Save results to a file
  fs.writeFileSync(
    path.join(__dirname, 'ghost-post-test-results.json'),
    JSON.stringify(posts, null, 2)
  );
  
  console.log('\nTest results saved to ghost-post-test-results.json');
  
  // Create a simple HTML report to visualize the results
  const htmlReport = `
  <!DOCTYPE html>
  <html>
  <head>
    <title>Ghost Post Image Selection Test</title>
    <style>
      body { font-family: Arial, sans-serif; max-width: 1200px; margin: 0 auto; padding: 20px; }
      h1 { color: #15171A; }
      .post { border: 1px solid #e1e1e1; margin-bottom: 20px; border-radius: 5px; overflow: hidden; }
      .post-header { padding: 15px; background: #f5f5f5; }
      .post-title { margin: 0; color: #15171A; }
      .post-image { width: 100%; height: 300px; object-fit: cover; }
      .post-meta { padding: 15px; color: #738a94; }
      .summary { background: #f5f5f5; padding: 20px; margin-top: 30px; border-radius: 5px; }
      .success { color: green; }
      .warning { color: orange; }
    </style>
  </head>
  <body>
    <h1>Ghost Post Image Selection Test</h1>
    
    <div class="posts">
      ${posts.map(post => `
        <div class="post">
          <div class="post-header">
            <h2 class="post-title">${post.title}</h2>
          </div>
          <img class="post-image" src="${post.imageUrl}" alt="Featured image">
          <div class="post-meta">
            <strong>Image filename:</strong> ${post.filename}
          </div>
        </div>
      `).join('')}
    </div>
    
    <div class="summary">
      <h2>Image Selection Summary</h2>
      <p><strong>Total posts created:</strong> ${posts.length}</p>
      <p><strong>Unique images used:</strong> ${usedImages.size}</p>
      <p><strong>Image diversity rate:</strong> ${(usedImages.size / posts.length * 100).toFixed(2)}%</p>
      
      ${usedImages.size < posts.length ? 
        `<p class="warning"><strong>Warning:</strong> Some images were used multiple times.</p>
         <ul>
           ${Object.entries(imageToTitles)
             .filter(([_, titles]) => titles.length > 1)
             .map(([filename, titles]) => `
               <li>
                 <strong>Image ${filename}</strong> used for ${titles.length} posts:
                 <ul>
                   ${titles.map(title => `<li>${title}</li>`).join('')}
                 </ul>
               </li>
             `).join('')}
         </ul>` 
        : 
        `<p class="success"><strong>Success!</strong> Each post got a unique image.</p>`
      }
    </div>
  </body>
  </html>
  `;
  
  fs.writeFileSync(
    path.join(__dirname, 'ghost-post-test-report.html'),
    htmlReport
  );
  
  console.log('HTML report created: ghost-post-test-report.html');
}

// Run the test
testGhostPostCreation().catch(console.error);
