/**
 * Direct RSS feed test for AWS Lambda
 * This script tests direct RSS feed retrieval in Lambda environment
 */

const Parser = require('rss-parser');
const AWS = require('aws-sdk');
const s3 = new AWS.S3();

// Create a simple logger
const logger = {
  info: (message) => console.log(`INFO: ${message}`),
  error: (message) => console.error(`ERROR: ${message}`)
};

// Main handler function
exports.handler = async (event) => {
  logger.info('Starting direct RSS feed test');
  
  // Create parser with timeout options
  const parser = new Parser({
    timeout: 10000, // 10 second timeout
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    }
  });
  
  const results = [];
  
  // Test only BBC World which we know works
  const testFeeds = [
    { name: 'BBC World', url: 'https://feeds.bbci.co.uk/news/world/rss.xml' }
  ];
  
  for (const feed of testFeeds) {
    try {
      logger.info(`Attempting to fetch from ${feed.name} at URL: ${feed.url}`);
      const startTime = Date.now();
      
      // Use a Promise.race with explicit timeout to avoid hanging
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error(`Timeout fetching ${feed.name} after 10s`)), 10000);
      });
      
      const feedResult = await Promise.race([
        parser.parseURL(feed.url),
        timeoutPromise
      ]);
      
      const fetchTime = Date.now() - startTime;
      logger.info(`Successfully fetched RSS feed from ${feed.name} in ${fetchTime}ms`);
      logger.info(`Found ${feedResult.items.length} items`);
      
      // Log the first item for debugging
      if (feedResult.items.length > 0) {
        logger.info(`First item: ${JSON.stringify(feedResult.items[0].title)}`);
      }
      
      results.push({
        feed: feed.name,
        success: true,
        itemCount: feedResult.items.length,
        fetchTime,
        firstItemTitle: feedResult.items.length > 0 ? feedResult.items[0].title : null
      });
      
    } catch (error) {
      logger.error(`Failed to fetch RSS feed from ${feed.name}: ${error.message}`);
      logger.error(`Error stack: ${error.stack}`);
      
      results.push({
        feed: feed.name,
        success: false,
        error: error.message
      });
    }
  }
  
  // Return the results directly
  return {
    statusCode: 200,
    body: JSON.stringify({
      message: 'RSS test completed',
      results,
      timestamp: new Date().toISOString()
    }, null, 2)
  };
};
