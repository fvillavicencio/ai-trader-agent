/**
 * Enhanced RSS feed test for AWS Lambda
 * This script tests direct RSS feed retrieval from multiple sources in Lambda environment
 */

const Parser = require('rss-parser');

// Main handler function
exports.handler = async (event) => {
  console.log('Starting enhanced RSS feed test with multiple sources');
  
  // Create parser with timeout options
  const parser = new Parser({
    timeout: 10000, // 10 second timeout
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    }
  });
  
  // Define all RSS feeds to test
  const RSS_FEEDS = [
    { name: 'BBC World', url: 'https://feeds.bbci.co.uk/news/world/rss.xml' },
    { name: 'NY Times World', url: 'https://rss.nytimes.com/services/xml/rss/nyt/World.xml' },
    { name: 'Reuters World', url: 'https://www.reuters.com/world/rss/' },
    { name: 'The Guardian World', url: 'https://www.theguardian.com/world/rss' },
    { name: 'CNBC World News', url: 'https://www.cnbc.com/id/100003114/device/rss/rss.html' },
    { name: 'Al Jazeera', url: 'https://www.aljazeera.com/xml/rss/all.xml' },
    { name: 'NPR World', url: 'https://feeds.npr.org/1004/rss.xml' },
    { name: 'Washington Post World', url: 'https://feeds.washingtonpost.com/rss/world' },
    { name: 'Financial Times World', url: 'https://www.ft.com/world?format=rss' },
    { name: 'ABC News International', url: 'https://abcnews.go.com/abcnews/internationalheadlines' }
  ];
  
  const results = [];
  const errors = [];
  
  // Process each feed
  for (const feed of RSS_FEEDS) {
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
      
      // Process only geopolitical items (simple filtering)
      const geopoliticalItems = feedResult.items
        .filter(item => {
          const title = item.title?.toLowerCase() || '';
          const content = item.content?.toLowerCase() || '';
          const description = item.contentSnippet?.toLowerCase() || '';
          const keywords = ['war', 'conflict', 'military', 'sanction', 'trade', 'geopolitical', 'security', 'threat', 'crisis'];
          
          return keywords.some(keyword => 
            title.includes(keyword) || 
            content.includes(keyword) || 
            description.includes(keyword)
          );
        })
        .map(item => ({
          title: item.title,
          link: item.link,
          pubDate: item.pubDate || item.isoDate,
          source: feed.name
        }));
      
      console.log(`Found ${geopoliticalItems.length} geopolitical items in ${feed.name}`);
      
      results.push({
        source: feed.name,
        totalItems: feedResult.items.length,
        geopoliticalItems: geopoliticalItems,
        fetchTime
      });
      
    } catch (error) {
      console.error(`Failed to fetch RSS feed from ${feed.name}: ${error.message}`);
      errors.push({
        source: feed.name,
        error: error.message
      });
    }
  }
  
  // Summarize results
  const totalGeopoliticalItems = results.reduce((sum, result) => sum + result.geopoliticalItems.length, 0);
  const successfulFeeds = results.length;
  const failedFeeds = errors.length;
  
  // Flatten all geopolitical items into a single array
  const allGeopoliticalItems = results.flatMap(result => result.geopoliticalItems);
  
  return {
    statusCode: 200,
    body: JSON.stringify({
      message: 'Enhanced RSS test completed',
      summary: {
        totalFeedsAttempted: RSS_FEEDS.length,
        successfulFeeds,
        failedFeeds,
        totalGeopoliticalItems
      },
      feedResults: results.map(result => ({
        source: result.source,
        totalItems: result.totalItems,
        geopoliticalItemsCount: result.geopoliticalItems.length,
        fetchTime: result.fetchTime
      })),
      errors,
      geopoliticalItems: allGeopoliticalItems,
      timestamp: new Date().toISOString()
    }, null, 2)
  };
};
