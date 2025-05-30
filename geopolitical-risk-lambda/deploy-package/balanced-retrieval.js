/**
 * Balanced Geopolitical Risk Retrieval Script
 * 
 * This script retrieves geopolitical risks from multiple sources in a balanced way:
 * - Limits to events in the last 48 hours
 * - Balances sources (RSS, Google News, NewsAPI, RapidAPI, Zeihan)
 * - Implements sequential fetching to avoid overwhelming APIs
 * - Handles errors gracefully
 * - Focuses on quality over quantity
 * - Produces a final list of top 50 items
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const Parser = require('rss-parser');
const { createLogger } = require('./utils/logger');
const { similarity } = require('./utils/textUtils');

// Import service modules
const insightSentryService = require('./services/insightSentryService');
const rssService = require('./services/rssService');
const zeihanService = require('./services/zeihanService');

/**
 * Detect topics in text
 * @param {string} text - Text to analyze
 * @returns {Array} - Array of detected topics
 */
function detectTopics(text) {
  if (!text) return [];
  
  const topicKeywords = {
    'tariffs': ['tariff', 'import tax', 'trade barrier', 'customs duty'],
    'trade war': ['trade war', 'trade dispute', 'trade conflict', 'economic conflict'],
    'military conflict': ['war', 'military', 'troops', 'invasion', 'defense'],
    'diplomacy': ['diplomatic', 'negotiation', 'talks', 'summit', 'treaty'],
    'energy': ['oil', 'gas', 'energy', 'petroleum', 'renewable'],
    'nuclear': ['nuclear', 'atomic', 'missile', 'warhead'],
    'terrorism': ['terror', 'terrorist', 'attack', 'extremist'],
    'sanctions': ['sanction', 'embargo', 'restriction', 'ban'],
    'human rights': ['human rights', 'civil liberties', 'freedom', 'oppression'],
    'climate': ['climate', 'environmental', 'carbon', 'emission', 'global warming']
  };
  
  const lowerText = text.toLowerCase();
  const detectedTopics = [];
  
  Object.entries(topicKeywords).forEach(([topic, keywords]) => {
    if (keywords.some(keyword => lowerText.includes(keyword.toLowerCase()))) {
      detectedTopics.push(topic);
    }
  });
  
  return detectedTopics;
}

// Initialize logger
const logger = createLogger('balanced-retrieval');
// In Lambda environment, always use /tmp for data files
const DATA_DIR = process.env.AWS_LAMBDA_FUNCTION_NAME ? '/tmp' : (process.env.DATA_DIR || path.join(__dirname, 'data'));
const RISKS_FILE = path.join(DATA_DIR, 'geopolitical_risks.json');

console.log('INFO', `Balanced retrieval using data directory: ${DATA_DIR}`);

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Configuration
const CONFIG = {
  maxTotalEvents: 50,
  maxAgeHours: 48,
  sourceLimits: {
    rss: 10,
    googleNews: 10,
    newsApi: 15,
    InsightSentry: 15,
    zeihan: 5
  },
  similarityThreshold: 0.65,
  geopoliticalKeywords: [
    'geopolitical', 'international relations', 'foreign policy', 'diplomacy',
    'conflict', 'war', 'military', 'defense', 'security', 'alliance',
    'treaty', 'sanctions', 'trade war', 'nuclear', 'terrorism',
    'intelligence', 'espionage', 'cyber attack', 'sovereignty',
    'territorial dispute', 'border', 'NATO', 'UN', 'EU', 'ASEAN',
    'Russia', 'China', 'United States', 'Iran', 'North Korea',
    'Middle East', 'Ukraine', 'Taiwan', 'South China Sea', 'Gaza',
    'Israel', 'Palestine', 'India', 'Pakistan', 'Africa',
    'economic security', 'supply chain', 'resources', 'energy security',
    'climate change', 'migration', 'refugee crisis', 'human rights',
    'democracy', 'autocracy', 'coup', 'election interference',
    'proxy war', 'insurgency', 'civil war', 'genocide', 'ethnic cleansing',
    // Trade and tariff specific keywords
    'tariff', 'trade dispute', 'protectionism', 'trade deficit', 'trade surplus',
    'WTO', 'import tax', 'export control', 'trade agreement', 'USMCA',
    'trade restriction', 'customs duty', 'trade barrier', 'trade policy',
    'economic nationalism', 'trade negotiation', 'trade deal', 'trade sanction',
    'economic coercion', 'trade dependency', 'supply chain resilience'
  ]
};

// RSS Feeds - Starting with only the most reliable feed that we confirmed works in Lambda
const RSS_FEEDS = [
  // Starting with just BBC World which we confirmed works in our test function
  { name: 'BBC World', url: 'https://feeds.bbci.co.uk/news/world/rss.xml' }
  
  // We'll gradually add these back as we confirm they work
  // { name: 'NY Times World', url: 'https://rss.nytimes.com/services/xml/rss/nyt/World.xml' },
  // { name: 'Reuters World', url: 'https://www.reuters.com/world/rss/' },
  // { name: 'The Guardian World', url: 'https://www.theguardian.com/world/rss' },
  // { name: 'CNBC World News', url: 'https://www.cnbc.com/id/100003114/device/rss/rss.html' },
  // { name: 'Al Jazeera', url: 'https://www.aljazeera.com/xml/rss/all.xml' },
  // { name: 'NPR World', url: 'https://feeds.npr.org/1004/rss.xml' },
  // { name: 'Washington Post World', url: 'https://feeds.washingtonpost.com/rss/world' },
  // { name: 'Financial Times World', url: 'https://www.ft.com/world?format=rss' },
  // { name: 'ABC News International', url: 'https://abcnews.go.com/abcnews/internationalheadlines' }
];

// Google News Feeds
const GOOGLE_NEWS_FEEDS = [
  // Geopolitical topics from major sources
  'https://news.google.com/rss/search?q=geopolitical+risk&hl=en-US&gl=US&ceid=US:en',
  'https://news.google.com/rss/search?q=international+conflict&hl=en-US&gl=US&ceid=US:en',
  'https://news.google.com/rss/search?q=global+security+threat&hl=en-US&gl=US&ceid=US:en',
  
  // Major networks with geopolitical focus
  'https://news.google.com/rss/search?q=site:cnn.com+geopolitical&hl=en-US&gl=US&ceid=US:en',
  'https://news.google.com/rss/search?q=site:foxnews.com+geopolitical&hl=en-US&gl=US&ceid=US:en',
  'https://news.google.com/rss/search?q=site:bbc.com+geopolitical&hl=en-US&gl=US&ceid=US:en',
  
  // Peter Zeihan specific
  'https://news.google.com/rss/search?q=peter+zeihan+geopolitical&hl=en-US&gl=US&ceid=US:en',
  'https://news.google.com/rss/search?q=site:zeihan.com&hl=en-US&gl=US&ceid=US:en',
  
  // Trade and tariff specific searches
  'https://news.google.com/rss/search?q=new+tariffs&hl=en-US&gl=US&ceid=US:en',
  'https://news.google.com/rss/search?q=trade+war+china&hl=en-US&gl=US&ceid=US:en',
  'https://news.google.com/rss/search?q=trade+dispute+geopolitical&hl=en-US&gl=US&ceid=US:en',
  'https://news.google.com/rss/search?q=tariff+impact+global&hl=en-US&gl=US&ceid=US:en'
];

// NewsAPI queries
const NEWS_API_QUERIES = [
  { q: 'geopolitical risk', sources: 'bbc-news,cnn,fox-news,the-wall-street-journal' },
  { q: 'international conflict', sources: 'bbc-news,cnn,fox-news,the-wall-street-journal' },
  { q: 'global security', sources: 'bbc-news,cnn,fox-news,the-wall-street-journal' },
  { q: 'Peter Zeihan', sources: '' },
  // Trade and tariff specific queries
  { q: 'new tariffs trade', sources: 'bbc-news,cnn,fox-news,the-wall-street-journal,bloomberg,financial-times' },
  { q: 'trade war economic', sources: 'bbc-news,cnn,fox-news,the-wall-street-journal,bloomberg,financial-times' },
  { q: 'tariff policy impact', sources: 'bbc-news,cnn,fox-news,the-wall-street-journal,bloomberg,financial-times' }
];

// RapidAPI queries
const RAPID_API_QUERIES = [
  'geopolitical risk analysis',
  'international security threat',
  'global conflict',
  'diplomatic crisis',
  'peter zeihan analysis',
  // Trade and tariff specific queries
  'trade war economic impact',
  'new tariff policy analysis',
  'global trade dispute',
  'tariff retaliation effects',
  'protectionism economic consequences'
];

/**
 * Check if an event is within the time limit
 * @param {string} dateStr - Date string to check
 * @returns {boolean} - True if within limit
 */
function isWithinTimeLimit(dateStr) {
  try {
    const eventDate = new Date(dateStr);
    const now = new Date();
    const hoursDiff = (now - eventDate) / (1000 * 60 * 60);
    return hoursDiff <= CONFIG.maxAgeHours;
  } catch (error) {
    return false; // If date parsing fails, exclude the item
  }
}

/**
 * Check if content is relevant to geopolitical risks
 * @param {string} text - Text to check
 * @returns {boolean} - True if relevant
 */
function isGeopoliticallyRelevant(text) {
  if (!text) return false;
  
  const lowerText = text.toLowerCase();
  return CONFIG.geopoliticalKeywords.some(keyword => 
    lowerText.includes(keyword.toLowerCase())
  );
}

/**
 * Fetch RSS feeds
 * @returns {Promise<Array>} - Array of events
 */
async function fetchRSSFeeds() {
  console.log('INFO: Starting RSS feed retrieval process');
  logger.info('Starting RSS feed retrieval process');
  
  // Create parser with timeout options - using the same approach that worked in our test function
  const parser = new Parser({
    timeout: 10000, // 10 second timeout
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    },
    customFields: {
      item: ['media:content', 'media:thumbnail', 'content:encoded']
    }
  });
  
  const events = [];
  const successfulFeeds = [];
  const failedFeeds = [];
  
  console.log(`INFO: Will attempt to fetch from ${RSS_FEEDS.length} RSS feeds`);
  logger.info(`Will attempt to fetch from ${RSS_FEEDS.length} RSS feeds`);
  
  for (const feed of RSS_FEEDS) {
    try {
      const startTime = Date.now();
      logger.info(`Fetching from ${feed.name} (${feed.url})...`);
      console.log(`INFO: Attempting to fetch from ${feed.name} at URL: ${feed.url}`);
      
      // Use parseURL with a timeout to avoid hanging - same approach as our test function
      console.log(`INFO: Using parseURL for ${feed.url} with 10s timeout`);
      
      // Create a promise that rejects after the timeout
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error(`Timeout fetching ${feed.name} after 10s`)), 10000);
      });
      
      // Race between the RSS parsing and the timeout
      const feedResult = await Promise.race([
        parser.parseURL(feed.url),
        timeoutPromise
      ]);
      
      const fetchTime = Date.now() - startTime;
      console.log(`INFO: Successfully parsed RSS feed from ${feed.name}, found ${feedResult.items.length} items in ${fetchTime}ms`);
      logger.info(`Successfully parsed RSS feed from ${feed.name}, found ${feedResult.items.length} items in ${fetchTime}ms`);
      successfulFeeds.push(feed.name);
      
      // Log some details about the first item for debugging
      if (feedResult.items.length > 0) {
        const firstItem = feedResult.items[0];
        logger.info(`Sample item from ${feed.name}: Title: "${firstItem.title}", Date: ${firstItem.pubDate || firstItem.isoDate}`);
        console.log(`INFO: Sample item from ${feed.name}: "${firstItem.title}"`);
      }
      
      // Process each item in the feed
      const feedEvents = feedResult.items
        .filter(item => {
          const isWithinTime = isWithinTimeLimit(item.pubDate || item.isoDate);
          if (!isWithinTime) {
            console.log(`INFO: Filtered out item from ${feed.name} due to age: ${item.title}`);
          }
          return isWithinTime;
        })
        .filter(item => {
          const content = `${item.title} ${item.contentSnippet || item.content || ''}`;
          const isRelevant = isGeopoliticallyRelevant(content);
          if (!isRelevant) {
            console.log(`INFO: Filtered out item from ${feed.name} due to relevance: ${item.title}`);
          }
          return isRelevant;
        })
        .map(item => ({
          title: item.title,
          description: item.contentSnippet || item.content || '',
          link: item.link,
          publishedDate: item.pubDate || item.isoDate,
          source: feed.name
        }));
      
      events.push(...feedEvents);
      logger.info(`Retrieved ${feedEvents.length} relevant items from ${feed.name}`);
      console.log(`INFO: Successfully processed ${feedEvents.length} relevant items from ${feed.name}`);
      
      // Add a small delay to avoid overwhelming servers
      console.log(`INFO: Adding delay before next RSS feed`);
      await new Promise(resolve => setTimeout(resolve, 500));
      
    } catch (error) {
      console.error(`ERROR: Failed to fetch RSS feed from ${feed.name}: ${error.message}`);
      console.error(`ERROR: Error stack: ${error.stack}`);
      logger.error(`Failed to fetch RSS feed from ${feed.name}: ${error.message}`);
      logger.error(`Error stack: ${error.stack}`);
      failedFeeds.push({ name: feed.name, error: error.message });
    }
  }
  
  // Log summary of RSS feed retrieval
  console.log(`INFO: RSS feed retrieval complete, found ${events.length} relevant events`);
  logger.info(`RSS feed retrieval complete, found ${events.length} relevant events`);
  logger.info(`Successfully retrieved ${successfulFeeds.length}/${RSS_FEEDS.length} feeds: ${successfulFeeds.join(', ')}`);
  
  if (failedFeeds.length > 0) {
    logger.error(`Failed to retrieve ${failedFeeds.length}/${RSS_FEEDS.length} feeds: ${failedFeeds.map(f => f.name).join(', ')}`);
    logger.error(`Failure details: ${JSON.stringify(failedFeeds)}`);
  } else {
    console.log('INFO: All RSS feeds were successfully retrieved');
    logger.info('All RSS feeds were successfully retrieved');
  }
  
  // Deduplicate and limit
  console.log(`INFO: Deduplicating ${events.length} total RSS feed items`);
  const deduplicated = deduplicateEvents(events);
  logger.info(`Retrieved ${deduplicated.length} unique items from RSS feeds`);
  console.log(`INFO: After deduplication, have ${deduplicated.length} unique RSS feed items`);
  
  const result = deduplicated.slice(0, CONFIG.sourceLimits.rss);
  console.log(`INFO: Returning ${result.length} RSS feed items after applying limit`);
  return result;
}

/**
 * Fetch Google News RSS feeds
 * @returns {Promise<Array>} - Array of events
 */
async function fetchGoogleNewsRSS() {
  logger.info('Fetching from Google News RSS...');
  const parser = new Parser();
  const events = [];
  
  for (const feedUrl of GOOGLE_NEWS_FEEDS) {
    try {
      logger.info(`Fetching from Google News feed: ${feedUrl}`);
      
      // Use axios with a shorter timeout instead of direct parser.parseURL
      const response = await axios.get(feedUrl, { 
        timeout: 15000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });
      
      // Parse the RSS content from the response data
      const feedResult = await parser.parseString(response.data);
      logger.info(`Successfully fetched Google News feed from ${feedUrl}`);
      
      const feedEvents = (feedResult.items || []) // Ensure items exists
        .filter(item => isWithinTimeLimit(item.pubDate || item.isoDate))
        .map(item => ({
          title: item.title,
          description: item.contentSnippet || item.content || '',
          link: item.link,
          publishedDate: item.pubDate || item.isoDate,
          source: item.source?.name || 'Google News'
        }));
      
      events.push(...feedEvents);
      logger.info(`Added ${feedEvents.length} events from ${feedUrl}`);
      
      // Add a small delay to avoid overwhelming servers
      await new Promise(resolve => setTimeout(resolve, 1000)); // Increased delay
      
    } catch (error) {
      // More detailed error logging
      if (error.response) {
        logger.error(`Error fetching from Google News feed ${feedUrl}: Status code ${error.response.status}`);
      } else if (error.request) {
        logger.error(`Error fetching from Google News feed ${feedUrl}: ${error.message || 'No response received'}`);
      } else {
        logger.error(`Error fetching from Google News feed ${feedUrl}: ${error.message}`);
      }
    }
  }
  
  // Deduplicate and limit
  const deduplicated = deduplicateEvents(events);
  logger.info(`Retrieved ${deduplicated.length} unique items from Google News`);
  
  return deduplicated.slice(0, CONFIG.sourceLimits.googleNews);
}

/**
 * Fetch from News API
 * @returns {Promise<Array>} - Array of events
 */
async function fetchNewsAPI() {
  logger.info('Fetching from News API...');
  const events = [];
  const apiKey = process.env.NEWS_API_KEY;
  
  if (!apiKey) {
    logger.error('News API key not found in environment variables');
    return [];
  }
  
  for (const query of NEWS_API_QUERIES) {
    try {
      logger.info(`Querying News API with "${query.q}"...`);
      
      const params = {
        apiKey,
        q: query.q,
        language: 'en',
        sortBy: 'publishedAt',
        pageSize: 10
      };
      
      if (query.sources) {
        params.sources = query.sources;
      }
      
      const response = await axios.get('https://newsapi.org/v2/everything', { params });
      
      if (response.data.status === 'ok') {
        const articles = response.data.articles || [];
        
        const queryEvents = articles
          .filter(article => isWithinTimeLimit(article.publishedAt))
          .map(article => ({
            title: article.title,
            description: article.description || '',
            link: article.url,
            publishedDate: article.publishedAt,
            source: article.source?.name || 'News API'
          }));
        
        events.push(...queryEvents);
        logger.info(`Retrieved ${queryEvents.length} items from News API for query "${query.q}"`);
      }
      
      // Add a delay to respect rate limits
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } catch (error) {
      logger.error(`Error fetching from News API: ${error.message}`);
    }
  }
  
  // Deduplicate and limit
  const deduplicated = deduplicateEvents(events);
  logger.info(`Retrieved ${deduplicated.length} unique items from News API`);
  
  return deduplicated.slice(0, CONFIG.sourceLimits.newsApi);
}

/**
 * Fetch from RapidAPI (InsightSentry)
 * @returns {Promise<Array>} - Array of events
 */
async function fetchRapidAPI() {
  logger.info('Fetching from RapidAPI (InsightSentry)...');
  const apiKey = process.env.RAPIDAPI_KEY;
  const host = process.env.RAPIDAPI_HOST || 'insightsentry.p.rapidapi.com';
  const endpoint = process.env.RAPIDAPI_ENDPOINT || 'https://insightsentry.p.rapidapi.com/v2/newsfeed';
  
  if (!apiKey || !host || !endpoint) {
    logger.error('RapidAPI configuration not found in environment variables');
    return [];
  }
  
  try {
    logger.info('Fetching top news from InsightSentry...');
    
    // First fetch the latest news feed with page parameter
    const options = {
      method: 'GET',
      url: endpoint,
      params: { page: '1' },
      headers: {
        'X-RapidAPI-Key': apiKey,
        'X-RapidAPI-Host': host
      }
    };
    
    const response = await axios.request(options);
    
    if (!response.data || !response.data.data || !Array.isArray(response.data.data)) {
      logger.warn('InsightSentry: No news items found in API response');
      return [];
    }
    
    logger.info(`InsightSentry: Retrieved ${response.data.current_items || response.data.data.length} news items`);
    
    // Get all news items
    const newsItems = response.data.data;
    
    // Filter for geopolitical relevance
    const filteredItems = newsItems.filter(item => {
      const title = item.title || '';
      const description = item.description || item.summary || '';
      const content = item.content || '';
      const fullText = `${title} ${description} ${content}`;
      
      return isGeopoliticallyRelevant(fullText);
    });
    
    logger.info(`InsightSentry: Filtered ${filteredItems.length} geopolitically relevant items from ${newsItems.length} total news items`);
    
    // Filter for time limit
    // Check if items have published_at field and convert timestamp to date if needed
    const recentItems = filteredItems.filter(item => {
      let publishDate;
      
      if (item.published_at) {
        // If it's a timestamp (number), convert to date
        if (typeof item.published_at === 'number') {
          publishDate = new Date(item.published_at * 1000); // Convert seconds to milliseconds
        } else {
          publishDate = new Date(item.published_at);
        }
      } else if (item.publishedAt) {
        publishDate = new Date(item.publishedAt);
      } else if (item.published) {
        publishDate = new Date(item.published);
      } else {
        return false; // No date available
      }
      
      // Check if date is valid
      if (isNaN(publishDate.getTime())) {
        return false;
      }
      
      // Check if within time limit
      const now = new Date();
      const hoursDiff = (now - publishDate) / (1000 * 60 * 60);
      
      // For InsightSentry, use a more generous time window (7 days instead of 48 hours)
      return hoursDiff <= 168; // 7 days in hours
    });
    
    logger.info(`InsightSentry: Found ${recentItems.length} recent items within time limit`);
    
    // Convert to our standard event format
    const events = recentItems.map(item => ({
      title: item.title || 'Untitled News Item',
      description: item.summary || item.description || item.content || '',
      link: item.url || '',
      publishedDate: item.published_at || item.publishedAt || item.published || new Date().toISOString(),
      source: item.source_name || item.source || 'InsightSentry',
      sourceUrl: item.url || ''
    }));
    
    // Add a delay to respect rate limits
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Try topic-specific queries if we didn't get enough results
    if (events.length < 5) {
      logger.info('Trying topic-specific queries for InsightSentry...');
      
      const topicEvents = [];
      
      for (const query of RAPID_API_QUERIES) {
        try {
          logger.info(`Querying InsightSentry with "${query}"...`);
          
          const topicOptions = {
            method: 'GET',
            url: endpoint,
            params: { 
              page: '1',
              query: query
            },
            headers: {
              'X-RapidAPI-Key': apiKey,
              'X-RapidAPI-Host': host
            }
          };
          
          const topicResponse = await axios.request(topicOptions);
          
          if (topicResponse.data && topicResponse.data.data && Array.isArray(topicResponse.data.data)) {
            const topicItems = topicResponse.data.data;
            
            const relevantItems = topicItems
              .filter(item => isWithinTimeLimit(item.published_at || item.publishedAt || item.published))
              .filter(item => {
                const title = item.title || '';
                const description = item.description || item.summary || '';
                const content = item.content || '';
                const fullText = `${title} ${description} ${content}`;
                
                return isGeopoliticallyRelevant(fullText);
              })
              .map(item => ({
                title: item.title || 'Untitled News Item',
                description: item.summary || item.description || item.content || '',
                link: item.url || '',
                publishedDate: item.published_at || item.publishedAt || item.published || new Date().toISOString(),
                source: item.source_name || item.source || 'InsightSentry',
                sourceUrl: item.url || ''
              }));
            
            topicEvents.push(...relevantItems);
            logger.info(`Retrieved ${relevantItems.length} relevant items from InsightSentry for query "${query}"`);
          }
          
          // Add a delay to respect rate limits
          await new Promise(resolve => setTimeout(resolve, 1000));
          
        } catch (error) {
          logger.error(`Error fetching from InsightSentry with query ${query}: ${error.message}`);
        }
      }
      
      // Add topic-specific events to main events array
      events.push(...topicEvents);
    }
    
    // Deduplicate and limit
    const deduplicated = deduplicateEvents(events);
    logger.info(`Retrieved ${deduplicated.length} unique items from InsightSentry`);
    
    return deduplicated.slice(0, CONFIG.sourceLimits.InsightSentry);
    
  } catch (error) {
    logger.error(`Error fetching from InsightSentry: ${error.message}`);
    return [];
  }
}

/**
 * Fetch Peter Zeihan content
 * @returns {Promise<Array>} - Array of events
 */
async function fetchZeihanContent() {
  try {
    logger.info('Fetching Peter Zeihan content...');
    const parser = new Parser();
    
    // Try Google News search for Zeihan content
    const searchQueries = ['Peter Zeihan', 'Zeihan geopolitics'];
    let zeihanGoogleNews = [];
    
    for (const query of searchQueries) {
      try {
        const googleNewsUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}`;
        const feed = await parser.parseURL(googleNewsUrl);
        
        const feedEvents = feed.items
          .filter(item => isWithinTimeLimit(item.pubDate || item.isoDate))
          .map(item => ({
            title: item.title,
            description: item.contentSnippet || item.content || '',
            link: item.link,
            publishedDate: item.pubDate || item.isoDate,
            source: 'Google News'
          }));
        
        zeihanGoogleNews.push(...feedEvents);
      } catch (error) {
        logger.error(`Error fetching Zeihan content from Google News: ${error.message}`);
      }
    }
    
    // Add retrieval channel to Google News items
    const zeihanGoogleNewsWithChannel = zeihanGoogleNews.map(item => ({
      ...item,
      retrievalChannel: 'zeihan',
      source: item.source.includes('Peter Zeihan') ? item.source : `Peter Zeihan via ${item.source}`
    }));
    
    // Fetch directly from Zeihan's website
    let zeihanItems = [];
    
    try {
      const zeihanFeed = await parser.parseURL('https://zeihan.com/feed/');
      
      zeihanItems = zeihanFeed.items
        .filter(item => isWithinTimeLimit(item.pubDate || item.isoDate))
        .map(item => ({
          title: item.title,
          description: item.contentSnippet || item.content || '',
          link: item.link,
          publishedDate: item.pubDate || item.isoDate,
          source: 'Peter Zeihan Website',
          author: 'Peter Zeihan',
          type: 'zeihan',
          retrievalChannel: 'zeihan'
        }));
    } catch (feedError) {
      logger.warn(`Error fetching Zeihan RSS feed: ${feedError.message}. Will rely on Google News results.`);
    }
    
    // Validate URLs for Zeihan items
    zeihanItems = zeihanItems.filter(item => {
      try {
        // Validate URL
        new URL(item.link);
        return true;
      } catch (e) {
        logger.debug(`Skipping Zeihan item with invalid URL: ${item.title}`);
        return false;
      }
    });
    
    // Combine sources
    const allZeihanItems = [...zeihanGoogleNewsWithChannel, ...zeihanItems];
    
    // Remove duplicates based on title similarity
    const uniqueZeihanItems = [];
    for (const item of allZeihanItems) {
      const isDuplicate = uniqueZeihanItems.some(uniqueItem => 
        calculateSimilarity(item.title, uniqueItem.title) > CONFIG.similarityThreshold
      );
      
      if (!isDuplicate) {
        uniqueZeihanItems.push(item);
      }
    }
    
    logger.info(`Retrieved ${uniqueZeihanItems.length} unique items from Zeihan sources`);
    return uniqueZeihanItems.slice(0, CONFIG.sourceLimits.zeihan);
  } catch (error) {
    logger.error(`Error fetching Zeihan content: ${error.message}`);
    return [];
  }
}

/**
 * Check if a URL is likely to be valid
 * @param {string} url - URL to check
 * @returns {boolean} - Whether the URL is likely valid
 */
function isLikelyValidUrl(url) {
  // Skip empty URLs
  if (!url) return false;
  
  // Google News URLs are valid but need special handling
  if (url.includes('news.google.com/rss/articles')) {
    return true;
  }
  
  // Basic URL validation
  try {
    const urlObj = new URL(url);
    return ['http:', 'https:'].includes(urlObj.protocol);
  } catch (e) {
    return false;
  }
}

/**
 * Calculate similarity between two strings (for title comparison)
 * @param {string} str1 - First string
 * @param {string} str2 - Second string
 * @returns {number} - Similarity score (0-1)
 */
function calculateSimilarity(str1, str2) {
  if (!str1 || !str2) return 0;
  
  // Normalize strings: lowercase, remove special chars, trim
  const normalize = (str) => str.toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .trim();
  
  const s1 = normalize(str1);
  const s2 = normalize(str2);
  
  // If either string is empty after normalization, return 0
  if (!s1 || !s2) return 0;
  
  // Simple approach: check if one string contains the other
  if (s1.includes(s2) || s2.includes(s1)) {
    return 0.9; // High similarity if one contains the other
  }
  
  // Split into words and count common words
  const words1 = s1.split(/\s+/);
  const words2 = s2.split(/\s+/);
  
  // Count common words
  const commonWords = words1.filter(word => words2.includes(word));
  
  // Calculate Jaccard similarity
  const union = new Set([...words1, ...words2]);
  return commonWords.length / union.size;
}

/**
 * Combine events from multiple sources, remove duplicates and invalid URLs
 * @param {Array} allEvents - Array of events from all sources
 * @returns {Array} - Array of unique events
 */
function combineAndDeduplicate(allEvents) {
  // Create a map to track unique URLs
  const uniqueUrls = new Map();
  const processedEvents = [];
  
  // Sort events by impactLevel potential (premium sources first)
  const sortedEvents = [...allEvents].sort((a, b) => {
    // Prioritize premium sources
    const premiumSources = [
      'Foreign Affairs', 'Brookings Institution', 'CSIS', 
      'Carnegie Endowment', 'Council on Foreign Relations',
      'Peter Zeihan', 'Financial Times', 'The Economist'
    ];
    
    const aIsPremium = premiumSources.some(source => a.source?.includes(source));
    const bIsPremium = premiumSources.some(source => b.source?.includes(source));
    
    if (aIsPremium && !bIsPremium) return -1;
    if (!aIsPremium && bIsPremium) return 1;
    
    // Then prioritize by date (newer first)
    const aDate = new Date(a.publishedDate || 0);
    const bDate = new Date(b.publishedDate || 0);
    return bDate - aDate;
  });
  
  // Process events in priority order
  for (const event of sortedEvents) {
    // Skip events without titles
    if (!event.title) continue;
    
    // Check for duplicate URLs
    if (event.link) {
      // Skip invalid URLs
      if (!isLikelyValidUrl(event.link)) {
        logger.debug(`Skipping event with invalid URL: ${event.title}`);
        continue;
      }
      
      // Skip duplicate URLs
      if (uniqueUrls.has(event.link)) {
        logger.debug(`Skipping duplicate URL: ${event.link}`);
        continue;
      }
      
      // Mark URL as seen
      uniqueUrls.set(event.link, true);
    }
    
    // Check for similar titles (duplicate content)
    let isDuplicate = false;
    for (const processedEvent of processedEvents) {
      const similarity = calculateSimilarity(event.title, processedEvent.title);
      
      // If titles are very similar (>70% similarity), consider it a duplicate
      if (similarity > CONFIG.similarityThreshold) {
        logger.debug(`Skipping similar title: "${event.title}" (${similarity.toFixed(2)} similar to "${processedEvent.title}")`);
        isDuplicate = true;
        break;
      }
    }
    
    // Skip duplicates
    if (isDuplicate) continue;
    
    // Add to processed events
    processedEvents.push(event);
  }
  
  return processedEvents;
}

/**
 * Deduplicate events based on title similarity
 * @param {Array} events - Array of events to deduplicate
 * @returns {Array} - Deduplicated events
 */
function deduplicateEvents(events) {
  const unique = [];
  
  for (const event of events) {
    const isDuplicate = unique.some(uniqueEvent => 
      calculateSimilarity(event.title, uniqueEvent.title) > CONFIG.similarityThreshold
    );
    
    if (!isDuplicate) {
      unique.push(event);
    }
  }
  
  return unique;
}

/**
 * Convert events to risks format
 * @param {Array} events - Array of events
 * @returns {Array} - Array of risks with valid descriptions
 */
function eventsToRisks(events) {
  // First filter out events without descriptions or with empty descriptions
  const validEvents = events.filter(event => {
    // Check for description presence and minimum length
    const hasValidDescription = event.description && 
                               typeof event.description === 'string' && 
                               event.description.trim().length > 10; // Require at least 10 characters
    
    // Check for source URL presence
    const hasSourceUrl = event.link && typeof event.link === 'string' && event.link.trim().length > 0;
    
    // For InsightSentry items, we'll be more lenient if they have a title but no description
    if (event.retrievalChannel === 'InsightSentry' && !hasValidDescription && event.title) {
      // If it's an InsightSentry item with a substantial title, use the title as description
      if (event.title.length > 30) {
        event.description = event.title;
        return true;
      }
    }
    
    return hasValidDescription;
  });
  
  logger.info(`Filtered out ${events.length - validEvents.length} events without valid descriptions`);
  
  return validEvents.map((event, index) => {
    // Calculate impact level based on source reputation and keywords
    let impactLevel = 5; // Default impact
    
    // Adjust based on source reputation
    const premiumSources = [
      'Foreign Affairs', 'Brookings Institution', 'CSIS', 
      'Carnegie Endowment', 'Council on Foreign Relations',
      'Peter Zeihan', 'Financial Times', 'The Economist'
    ];
    
    if (premiumSources.some(source => event.source && event.source.includes(source))) {
      impactLevel += 2;
    }
    
    // Adjust based on keywords in title
    const highImpactKeywords = [
      'war', 'conflict', 'crisis', 'threat', 'nuclear', 
      'attack', 'invasion', 'collapse', 'catastrophe', 'critical',
      // Trade-specific high impact keywords
      'tariff', 'trade war', 'economic sanction', 'trade restriction',
      'supply chain disruption', 'economic coercion', 'trade retaliation'
    ];
    
    if (event.title && highImpactKeywords.some(keyword => 
      event.title.toLowerCase().includes(keyword.toLowerCase())
    )) {
      impactLevel += 1;
    }
    
    // Cap at 10
    impactLevel = Math.min(impactLevel, 10);
    
    return {
      id: `risk-${index + 1}`,
      name: event.title || 'Untitled Risk',
      description: event.description,
      source: event.source || 'Unknown Source',
      sourceUrl: event.link || event.sourceUrl || '',
      publishedDate: event.publishedDate || new Date().toISOString(),
      impactLevel,
      regions: ['Global'], // Default region
      categories: ['geopolitical'],
      retrievalChannel: event.retrievalChannel || 'unknown',
      timestamp: new Date().toISOString()
    };
  });
}

/**
 * Log geopolitical risks (no longer saves to file)
 * @param {Array} risks - Array of geopolitical risk objects
 * @returns {Promise<boolean>} - Success status
 */
async function logRisks(risks) {
  try {
    logger.info(`Retrieved ${risks.length} geopolitical risks`);
    return true;
  } catch (error) {
    logger.error(`Error logging risks: ${error.message}`);
    return false;
  }
}

/**
 * Save geopolitical risks to storage
 * @param {Array} risks - Array of geopolitical risk objects
 * @returns {Promise<boolean>} - Success status
 */
async function saveRisks(risks) {
  try {
    await fs.promises.writeFile(RISKS_FILE, JSON.stringify(risks, null, 2));
    logger.info(`Saved ${risks.length} risks to storage`);
    return true;
  } catch (error) {
    logger.error(`Error saving risks to storage: ${error.message}`);
    return false;
  }
}

/**
 * Main function to retrieve and process geopolitical risks
 * @returns {Promise<Array>} - Array of geopolitical risks
 */
async function retrieveGeopoliticalRisks() {
  try {
    logger.info('Starting balanced geopolitical risk retrieval...');
    
    // Statistics tracking
    const stats = {
      retrieved: {
        rss: 0,
        googleNews: 0,
        newsApi: 0,
        InsightSentry: 0,
        zeihan: 0,
        total: 0
      },
      final: {
        rss: 0,
        googleNews: 0,
        newsApi: 0,
        InsightSentry: 0,
        zeihan: 0,
        total: 0
      },
      sourceBreakdown: {},
      topicBreakdown: {}
    };
    
    // Fetch from RSS feeds only for testing
    const rssEvents = await fetchRSSFeeds();
    // Temporarily comment out other sources for testing
    const googleNewsEvents = []; // await fetchGoogleNewsRSS();
    const newsApiEvents = []; // await fetchNewsAPI();
    const insightSentryEvents = []; // await fetchRapidAPI();
    const zeihanEvents = []; // await fetchZeihanContent();
    
    // Update retrieved stats
    stats.retrieved.rss = rssEvents.length;
    stats.retrieved.googleNews = googleNewsEvents.length;
    stats.retrieved.newsApi = newsApiEvents.length;
    stats.retrieved.InsightSentry = insightSentryEvents.length;
    stats.retrieved.zeihan = zeihanEvents.length;
    stats.retrieved.total = rssEvents.length + googleNewsEvents.length + 
                           newsApiEvents.length + insightSentryEvents.length + zeihanEvents.length;
    
    // Tag events with their source channel
    const taggedRssEvents = rssEvents.map(e => ({ ...e, retrievalChannel: 'rss' }));
    const taggedGoogleNewsEvents = googleNewsEvents.map(e => ({ ...e, retrievalChannel: 'googleNews' }));
    const taggedNewsApiEvents = newsApiEvents.map(e => ({ ...e, retrievalChannel: 'newsApi' }));
    const taggedInsightSentryEvents = insightSentryEvents.map(e => ({ ...e, retrievalChannel: 'InsightSentry' }));
    const taggedZeihanEvents = zeihanEvents.map(e => ({ ...e, retrievalChannel: 'zeihan' }));
    
    // Combine all events
    const allEvents = [
      ...taggedRssEvents,
      ...taggedGoogleNewsEvents,
      ...taggedNewsApiEvents,
      ...taggedInsightSentryEvents,
      ...taggedZeihanEvents
    ];
    
    // Deduplicate across all sources
    const uniqueEvents = deduplicateEvents(allEvents);
    logger.info(`Total unique events across all sources: ${uniqueEvents.length}`);
    
    // Count unique events by channel
    uniqueEvents.forEach(event => {
      stats.final[event.retrievalChannel]++;
      
      // Count by source
      const source = event.source;
      stats.sourceBreakdown[source] = (stats.sourceBreakdown[source] || 0) + 1;
      
      // Count by topic (basic keyword detection)
      const topics = detectTopics(event.title + ' ' + event.description);
      topics.forEach(topic => {
        stats.topicBreakdown[topic] = (stats.topicBreakdown[topic] || 0) + 1;
      });
    });
    stats.final.total = uniqueEvents.length;
    
    // Convert to risks format
    const risks = eventsToRisks(uniqueEvents);
    
    // Sort by impact level (descending) and then by date (most recent first)
    const sortedRisks = risks.sort((a, b) => {
      if (b.impactLevel !== a.impactLevel) {
        return b.impactLevel - a.impactLevel;
      }
      return new Date(b.publishedDate) - new Date(a.publishedDate);
    });
    
    // Take top 50
    const topRisks = sortedRisks.slice(0, CONFIG.maxTotalEvents);

    // Log statistics instead of saving to file
    logger.info(`Retrieved ${topRisks.length} geopolitical risks`);
    
    // Display top 10 risks
    logger.info('Top 10 Geopolitical Risks:');
    topRisks.slice(0, 10).forEach((risk, index) => {
      logger.info(`${index + 1}. ${risk.name} (Impact: ${risk.impactLevel}/10)`);
      logger.info(`   ${risk.description.substring(0, 150)}...`);
      logger.info(`   Source: ${risk.source}`);
      logger.info(`   Published: ${new Date(risk.publishedDate).toLocaleString()}`);
    });
    
    // Display statistics
    logger.info('=== RETRIEVAL STATISTICS ===');
    
    logger.info('Items Retrieved by Channel:');
    logger.info(`  RSS Feeds: ${stats.retrieved.rss}`);
    logger.info(`  Google News: ${stats.retrieved.googleNews}`);
    logger.info(`  News API: ${stats.retrieved.newsApi}`);
    logger.info(`  InsightSentry: ${stats.retrieved.InsightSentry}`);
    logger.info(`  Zeihan: ${stats.retrieved.zeihan}`);
    logger.info(`  Total Retrieved: ${stats.retrieved.total}`);
    
    logger.info('Items in Final List by Channel:');
    logger.info(`  RSS Feeds: ${stats.final.rss}`);
    logger.info(`  Google News: ${stats.final.googleNews}`);
    logger.info(`  News API: ${stats.final.newsApi}`);
    logger.info(`  InsightSentry: ${stats.final.InsightSentry}`);
    logger.info(`  Zeihan: ${stats.final.zeihan}`);
    logger.info(`  Total in Final List: ${stats.final.total}`);
    
    logger.info('Top Sources:');
    const topSources = Object.entries(stats.sourceBreakdown)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
    topSources.forEach(([source, count]) => {
      logger.info(`  ${source}: ${count} items`);
    });
    
    logger.info('Top Topics:');
    const topTopics = Object.entries(stats.topicBreakdown)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
    topTopics.forEach(([topic, count]) => {
      logger.info(`  ${topic}: ${count} items`);
    });
    
    logger.info(`\nRetrieval completed. ${topRisks.length} risks retrieved successfully`);
    
    // Return the top risks
    logger.info('Balanced geopolitical risk retrieval completed successfully');
    return topRisks;
  } catch (error) {
    logger.error(`Error retrieving geopolitical risks: ${error.message}`);
    return [];
  }
}

// Only run the retrieval process if this file is executed directly
if (require.main === module) {
  retrieveGeopoliticalRisks();
}

// Export the functions for use in other modules
module.exports = {
  retrieveGeopoliticalRisks,
  fetchRSSFeeds,
  fetchGoogleNewsRSS,
  fetchNewsAPI,
  fetchRapidAPI,
  fetchZeihanContent,
  eventsToRisks,
  deduplicateEvents
};
