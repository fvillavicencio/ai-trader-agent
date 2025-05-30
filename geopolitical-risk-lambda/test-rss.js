const Parser = require('rss-parser');
const AWS = require('aws-sdk');
const s3 = new AWS.S3();

// Simple test function to check RSS feed retrieval in Lambda
exports.handler = async (event) => {
  console.log('Starting RSS test function');
  
  // Create parser with timeout options
  const parser = new Parser({
    timeout: 10000, // 10 second timeout
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    }
  });
  
  const results = [];
  
  // Test feeds - one reliable feed that should work
  const testFeeds = [
    { name: 'BBC World', url: 'https://feeds.bbci.co.uk/news/world/rss.xml' }
  ];
  
  for (const feed of testFeeds) {
    try {
      console.log(`Attempting to fetch from ${feed.name} at URL: ${feed.url}`);
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
      console.log(`Successfully fetched RSS feed from ${feed.name} in ${fetchTime}ms`);
      console.log(`Found ${feedResult.items.length} items`);
      
      // Log the first item for debugging
      if (feedResult.items.length > 0) {
        console.log(`First item: ${JSON.stringify(feedResult.items[0].title)}`);
      }
      
      results.push({
        feed: feed.name,
        success: true,
        itemCount: feedResult.items.length,
        fetchTime
      });
      
    } catch (error) {
      console.error(`Failed to fetch RSS feed from ${feed.name}: ${error.message}`);
      console.error(`Error stack: ${error.stack}`);
      
      results.push({
        feed: feed.name,
        success: false,
        error: error.message
      });
    }
  }
  
  // Save results to S3 for inspection
  try {
    await s3.putObject({
      Bucket: 'market-pulse-daily',
      Key: 'rss-test-results.json',
      Body: JSON.stringify(results, null, 2),
      ContentType: 'application/json'
    }).promise();
    console.log('Saved test results to S3');
  } catch (error) {
    console.error(`Failed to save results to S3: ${error.message}`);
  }
  
  return {
    statusCode: 200,
    body: JSON.stringify({
      message: 'RSS test completed',
      results
    })
  };
};
