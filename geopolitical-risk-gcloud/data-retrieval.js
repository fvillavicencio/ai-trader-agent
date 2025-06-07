require('dotenv').config();
const fs = require('fs'); // May not be used extensively in GCF context for file writing
const path = require('path'); // May not be used extensively
const axios = require('axios');
const Parser = require('rss-parser');
const { similarity } = require('./utils'); // Assuming utils.js is in the same directory

// Basic logger replacement for GCF context
const logger = {
  info: (message) => console.log(`INFO: ${message}`),
  warn: (message) => console.warn(`WARN: ${message}`),
  error: (message) => console.error(`ERROR: ${message}`),
  debug: (message) => console.log(`DEBUG: ${message}`), // Adjust log level visibility in GCF
};

// Configuration (adapted from balanced-retrieval.js)
// File-based storage parts might be omitted or rethought for GCF
const CONFIG = {
  similarityThreshold: 0.75, // Adjusted from original 0.7, can be fine-tuned
  premiumSources: [
    'Foreign Affairs', 'Brookings Institution', 'CSIS',
    'Carnegie Endowment', 'Council on Foreign Relations',
    'Peter Zeihan', 'Financial Times', 'The Economist',
    'Stratfor', 'Reuters', 'Associated Press', 'Bloomberg'
  ],
  maxTotalEvents: 50, // This will be the target for combined sources
  maxAgeHours: 48,
  sourceLimits: { // Per-source limits if we fetch them individually then combine
    rss: 10,
    googleNews: 10,
    newsApi: 15,
    InsightSentry: 15, // Placeholder for RapidAPI if used
    zeihan: 5
  },
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
    'tariff', 'trade dispute', 'protectionism', 'trade deficit', 'trade surplus',
    'WTO', 'import tax', 'export control', 'trade agreement', 'USMCA',
    'trade restriction', 'customs duty', 'trade barrier', 'trade policy',
    'economic nationalism', 'trade negotiation', 'trade deal', 'trade sanction',
    'economic coercion', 'trade dependency', 'supply chain resilience'
  ]
};

// RapidAPI queries (for InsightSentry)
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

// NewsAPI queries
const NEWS_API_QUERIES = [
  { q: 'geopolitical risk', sources: 'bbc-news,cnn,fox-news,the-wall-street-journal' },
  { q: 'international conflict', sources: 'bbc-news,cnn,fox-news,the-wall-street-journal' },
  { q: 'global security', sources: 'bbc-news,cnn,fox-news,the-wall-street-journal' },
  { q: 'Peter Zeihan', sources: '' }, // Search across all sources for Peter Zeihan
  // Trade and tariff specific queries
  { q: 'new tariffs trade', sources: 'bbc-news,cnn,fox-news,the-wall-street-journal,bloomberg,financial-times' },
  { q: 'trade war economic', sources: 'bbc-news,cnn,fox-news,the-wall-street-journal,bloomberg,financial-times' },
  { q: 'tariff policy impact', sources: 'bbc-news,cnn,fox-news,the-wall-street-journal,bloomberg,financial-times' }
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

// RSS Feeds - Premium geopolitical sources
const RSS_FEEDS = [
  { url: 'https://www.foreignaffairs.com/rss.xml', name: 'Foreign Affairs' },
  { url: 'https://www.brookings.edu/feed/', name: 'Brookings Institution' },
  { url: 'https://www.csis.org/analysis/feed', name: 'CSIS' },
  { url: 'https://carnegieendowment.org/rss/solr/?fa=pubs&maxrows=10', name: 'Carnegie Endowment' },
  { url: 'https://www.cfr.org/rss.xml', name: 'Council on Foreign Relations' },
  { url: 'https://rss.cnn.com/rss/cnn_world.rss', name: 'CNN World' },
  { url: 'https://moxie.foxnews.com/google-publisher/world.xml', name: 'Fox News World' },
  { url: 'https://feeds.bbci.co.uk/news/world/rss.xml', name: 'BBC World' },
  { url: 'https://www.aljazeera.com/xml/rss/all.xml', name: 'Al Jazeera' },
  { url: 'https://rss.nytimes.com/services/xml/rss/nyt/World.xml', name: 'New York Times World' }
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
    logger.warn(`Failed to parse date: ${dateStr}`);
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
  logger.info('Fetching from RSS feeds...');
  const parser = new Parser();
  const allEvents = [];
  let fetchedCount = 0;

  for (const feedConfig of RSS_FEEDS) {
    if (fetchedCount >= CONFIG.sourceLimits.rss) break;
    try {
      logger.debug(`Fetching RSS feed: ${feedConfig.name} (${feedConfig.url})`);
      const feed = await parser.parseURL(feedConfig.url);
      logger.debug(`Fetched ${feed.items.length} items from ${feedConfig.name}`);
      
      for (const item of feed.items) {
        if (fetchedCount >= CONFIG.sourceLimits.rss) break;
        const pubDate = item.pubDate || item.isoDate || item.date;
        if (pubDate && isWithinTimeLimit(pubDate)) {
          const content = item.contentSnippet || item.content || item.summary || item.title || '';
          const title = item.title || '';
          if (isGeopoliticallyRelevant(title + ' ' + content)) {
            allEvents.push({
              title: item.title,
              link: item.link,
              pubDate: pubDate,
              content: content,
              source: feedConfig.name,
              sourceType: 'RSS'
            });
            fetchedCount++;
          }
        }
      }
    } catch (error) {
      logger.warn(`Failed to fetch or parse RSS feed ${feedConfig.name}: ${error.message}`);
    }
  }
  logger.info(`Fetched ${allEvents.length} relevant events from RSS feeds.`);
  return allEvents;
}

// Placeholder for the main orchestrating function
/**
 * Fetch Google News RSS feeds
 * @returns {Promise<Array>} - Array of events
 */
async function fetchGoogleNewsRSS() {
  logger.info('Fetching from Google News RSS feeds...');
  const parser = new Parser();
  const allEvents = [];
  let fetchedCount = 0;

  for (const feedUrl of GOOGLE_NEWS_FEEDS) {
    if (fetchedCount >= CONFIG.sourceLimits.googleNews) break;
    try {
      // Attempt to create a more descriptive name for logging
      let feedName = 'Google News Search';
      try {
        const urlParams = new URL(feedUrl).searchParams;
        const query = urlParams.get('q');
        const site = urlParams.get('site'); // Though 'site:' is part of q
        if (query) {
          feedName = `Google News: ${query}`;
        } else if (site) {
            feedName = `Google News site: ${site}`;
        }
      } catch (e) { /* Use default name if URL parsing fails for name */ }

      logger.debug(`Fetching Google News feed: ${feedName} (${feedUrl})`);
      const feed = await parser.parseURL(feedUrl);
      logger.debug(`Fetched ${feed.items.length} items from ${feedName}`);
      
      for (const item of feed.items) {
        if (fetchedCount >= CONFIG.sourceLimits.googleNews) break;
        const pubDate = item.pubDate || item.isoDate || item.date;
        if (pubDate && isWithinTimeLimit(pubDate)) {
          const content = item.contentSnippet || item.content || item.summary || item.title || '';
          const title = item.title || '';
          if (isGeopoliticallyRelevant(title + ' ' + content)) {
            allEvents.push({
              title: item.title,
              link: item.link,
              pubDate: pubDate,
              content: content,
              source: feedName, // Use the derived feedName
              sourceType: 'GoogleNews'
            });
            fetchedCount++;
          }
        }
      }
    } catch (error) {
      logger.warn(`Failed to fetch or parse Google News feed ${feedUrl}: ${error.message}`);
    }
  }
  logger.info(`Fetched ${allEvents.length} relevant events from Google News.`);
  return allEvents;
}

/**
 * Fetch from News API
 * @returns {Promise<Array>} - Array of events
 */
async function fetchNewsAPI() {
  logger.info('Fetching from NewsAPI...');
  const apiKey = process.env.NEWS_API_KEY;
  if (!apiKey) {
    logger.warn('NEWS_API_KEY is not set. Skipping NewsAPI fetch.');
    return [];
  }

  const allEvents = [];
  let fetchedCount = 0;
  const twoDaysAgo = new Date();
  twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
  const fromDate = twoDaysAgo.toISOString().split('T')[0]; // YYYY-MM-DD

  for (const queryConfig of NEWS_API_QUERIES) {
    if (fetchedCount >= CONFIG.sourceLimits.newsApi) break;
    try {
      const params = {
        q: queryConfig.q,
        apiKey: apiKey,
        language: 'en',
        sortBy: 'relevancy', // or 'publishedAt'
        pageSize: Math.min(20, CONFIG.sourceLimits.newsApi - fetchedCount), // Fetch a bit more to filter, but respect overall limit
        from: fromDate,
      };
      if (queryConfig.sources) {
        params.sources = queryConfig.sources;
      }

      logger.debug(`Fetching NewsAPI for query: "${queryConfig.q}", sources: "${queryConfig.sources || 'all'}"`);
      const response = await axios.get('https://newsapi.org/v2/everything', { params });
      
      if (response.data && response.data.articles) {
        logger.debug(`Fetched ${response.data.articles.length} articles for query "${queryConfig.q}"`);
        for (const article of response.data.articles) {
          if (fetchedCount >= CONFIG.sourceLimits.newsApi) break;
          if (article.publishedAt && isWithinTimeLimit(article.publishedAt)) {
            const content = article.description || article.content || article.title || '';
            const title = article.title || '';
            // NewsAPI already filters by keyword, but an additional check can be useful
            if (isGeopoliticallyRelevant(title + ' ' + content)) {
              allEvents.push({
                title: article.title,
                link: article.url,
                pubDate: article.publishedAt,
                content: content,
                source: article.source.name || 'NewsAPI',
                sourceType: 'NewsAPI'
              });
              fetchedCount++;
            }
          }
        }
      }
    } catch (error) {
      if (error.response) {
        logger.warn(`Failed to fetch from NewsAPI for query "${queryConfig.q}": ${error.response.status} - ${JSON.stringify(error.response.data)}`);
      } else {
        logger.warn(`Failed to fetch from NewsAPI for query "${queryConfig.q}": ${error.message}`);
      }
    }
  }
  logger.info(`Fetched ${allEvents.length} relevant events from NewsAPI.`);
  return allEvents;
}

// Deduplicate events based on title similarity
function deduplicateEvents(events) {
  const uniqueEvents = [];
  const titles = new Set(); // For quick exact title check

  for (const event of events) {
    if (!event || !event.title) continue;

    // Normalize title for comparison
    const normalizedTitle = event.title.toLowerCase().trim();

    let isDuplicate = false;
    if (titles.has(normalizedTitle)) { // Quick check for exact duplicates
        isDuplicate = true;
    } else {
        for (const uniqueEvent of uniqueEvents) {
            if (similarity(normalizedTitle, uniqueEvent.title.toLowerCase().trim()) > CONFIG.similarityThreshold) {
                isDuplicate = true;
                break;
            }
        }
    }

    if (!isDuplicate) {
      uniqueEvents.push(event);
      titles.add(normalizedTitle);
    }
  }
  return uniqueEvents;
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
    logger.warn('RapidAPI configuration (RAPIDAPI_KEY, RAPIDAPI_HOST, RAPIDAPI_ENDPOINT) not found. Skipping InsightSentry fetch.');
    return [];
  }
  
  let allRapidEvents = [];

  try {
    logger.debug('Fetching top news from InsightSentry...');
    const options = {
      method: 'GET',
      url: endpoint,
      params: { page: '1' }, // Assuming 'page' is a valid param for general feed
      headers: {
        'X-RapidAPI-Key': apiKey,
        'X-RapidAPI-Host': host
      }
    };
    
    const response = await axios.request(options);
    
    if (response.data && response.data.data && Array.isArray(response.data.data)) {
      logger.debug(`InsightSentry (general feed): Retrieved ${response.data.current_items || response.data.data.length} news items`);
      const newsItems = response.data.data;
      const relevantItems = newsItems
        .filter(item => {
          const pubDate = item.published_at || item.publishedAt || item.published;
          return pubDate && isWithinTimeLimit(typeof pubDate === 'number' ? new Date(pubDate * 1000).toISOString() : pubDate);
        })
        .filter(item => {
          const title = item.title || '';
          const description = item.description || item.summary || '';
          const content = item.content || '';
          return isGeopoliticallyRelevant(`${title} ${description} ${content}`);
        })
        .map(item => {
          let sourceName = item.source || '';
          const sourceUrl = item.link || item.url || '';
          if (!sourceName || sourceName.toLowerCase() === 'insightsentry' || sourceName.toLowerCase() === 'rapidapi') {
            sourceName = item.source_name || (sourceUrl ? new URL(sourceUrl).hostname.replace(/^www\./, '') : 'Unknown Source');
          }
          return {
            title: item.title || 'Untitled News Item',
            link: sourceUrl,
            pubDate: item.published_at || item.publishedAt || item.published,
            content: item.summary || item.description || item.content || '',
            source: sourceName,
            sourceType: 'InsightSentry'
          };
        });
      allRapidEvents.push(...relevantItems);
    }
    await new Promise(resolve => setTimeout(resolve, 1000)); // Rate limit

    // Topic-specific queries
    if (allRapidEvents.length < CONFIG.sourceLimits.InsightSentry / 2) { // Fetch more if initial fetch is low
      logger.debug('Trying topic-specific queries for InsightSentry...');
      for (const query of RAPID_API_QUERIES) {
        if (allRapidEvents.length >= CONFIG.sourceLimits.InsightSentry) break;
        try {
          logger.debug(`Querying InsightSentry with "${query}"...`);
          const topicOptions = {
            method: 'GET',
            url: endpoint, // Assuming same endpoint for queries
            params: { query: query, page: '1' }, // Adjust params as per API docs
            headers: { 'X-RapidAPI-Key': apiKey, 'X-RapidAPI-Host': host }
          };
          const topicResponse = await axios.request(topicOptions);
          if (topicResponse.data && topicResponse.data.data && Array.isArray(topicResponse.data.data)) {
            const topicItems = topicResponse.data.data;
            const relevantTopicItems = topicItems
              .filter(item => {
                const pubDate = item.published_at || item.publishedAt || item.published;
                return pubDate && isWithinTimeLimit(typeof pubDate === 'number' ? new Date(pubDate * 1000).toISOString() : pubDate);
              })
              .filter(item => {
                const title = item.title || '';
                const description = item.description || item.summary || '';
                const content = item.content || '';
                return isGeopoliticallyRelevant(`${title} ${description} ${content}`);
              })
              .map(item => {
                let sourceName = item.source || '';
                const sourceUrl = item.link || item.url || '';
                if (!sourceName || sourceName.toLowerCase() === 'insightsentry' || sourceName.toLowerCase() === 'rapidapi') {
                  sourceName = item.source_name || (sourceUrl ? new URL(sourceUrl).hostname.replace(/^www\./, '') : 'Unknown Source');
                }
                return {
                  title: item.title || 'Untitled News Item',
                  link: sourceUrl,
                  pubDate: item.published_at || item.publishedAt || item.published,
                  content: item.summary || item.description || item.content || '',
                  source: sourceName,
                  sourceType: 'InsightSentryQuery'
                };
              });
            allRapidEvents.push(...relevantTopicItems);
          }
          await new Promise(resolve => setTimeout(resolve, 1000)); // Rate limit
        } catch (err) {
          logger.warn(`Error fetching InsightSentry (query: ${query}): ${err.message}`);
        }
      }
    }
  } catch (error) {
    logger.warn(`Error fetching from InsightSentry (main): ${error.message}`);
  }
  
  const deduplicated = deduplicateEvents(allRapidEvents);
  logger.info(`Fetched ${deduplicated.length} relevant events from InsightSentry (RapidAPI).`);
  return deduplicated.slice(0, CONFIG.sourceLimits.InsightSentry);
}

/**
 * Fetch Peter Zeihan content
 * @returns {Promise<Array>} - Array of events
 */
/**
 * Check if a URL is likely to be valid.
 * Google News URLs are handled as special cases if needed for redirection later,
 * but for now, basic http/https validation is fine.
 * @param {string} url - URL to check
 * @returns {boolean} - Whether the URL is likely valid
 */
function isLikelyValidUrl(url) {
  if (!url) return false;
  // Basic URL validation
  try {
    const urlObj = new URL(url);
    return ['http:', 'https:'].includes(urlObj.protocol);
  } catch (e) {
    logger.debug(`Invalid URL format: ${url}`);
    return false;
  }
}

/**
 * Combine events from all sources, apply global deduplication, and filter.
 * @param {Array} allEvents - Array of events from all sources
 * @returns {Array} - Array of unique, filtered events
 */
function globalDeduplicateAndFilter(allEvents) {
  logger.info(`Starting global deduplication and filtering for ${allEvents.length} events.`);
  const uniqueUrls = new Map();
  const processedEvents = [];

  // Sort events: premium sources first, then by date (newer first)
  const sortedEvents = [...allEvents].sort((a, b) => {
    const aIsPremium = CONFIG.premiumSources.some(source => a.source?.toLowerCase().includes(source.toLowerCase()));
    const bIsPremium = CONFIG.premiumSources.some(source => b.source?.toLowerCase().includes(source.toLowerCase()));

    if (aIsPremium && !bIsPremium) return -1;
    if (!aIsPremium && bIsPremium) return 1;

    const aDate = new Date(a.pubDate || 0);
    const bDate = new Date(b.pubDate || 0);
    return bDate - aDate; // Sort by date descending (newer first)
  });

  for (const event of sortedEvents) {
    if (!event || !event.title || !event.link) {
        logger.debug(`Skipping event with missing title or link: ${JSON.stringify(event)}`);
        continue;
    }

    if (!isLikelyValidUrl(event.link)) {
      logger.debug(`Skipping event with invalid URL: ${event.title} (${event.link})`);
      continue;
    }

    // Normalize link for URL deduplication (e.g., remove query params if desired, or trailing slashes)
    // For now, exact match after basic validation
    const normalizedLink = event.link;
    if (uniqueUrls.has(normalizedLink)) {
      logger.debug(`Skipping duplicate URL: ${event.link}`);
      continue;
    }

    let isTitleDuplicate = false;
    for (const processedEvent of processedEvents) {
      if (similarity(event.title, processedEvent.title) > CONFIG.similarityThreshold) {
        logger.debug(`Skipping similar title: "${event.title}" (similar to "${processedEvent.title}")`);
        isTitleDuplicate = true;
        break;
      }
    }

    if (isTitleDuplicate) continue;

    uniqueUrls.set(normalizedLink, true);
    processedEvents.push(event);
  }
  logger.info(`Finished global deduplication. ${processedEvents.length} unique events remaining.`);
  return processedEvents;
}

async function fetchZeihanContent() {
  logger.info('Fetching Peter Zeihan content...');
  const parser = new Parser();
  const allZeihanItems = [];
  let fetchedCount = 0;

  // Try Google News search for Zeihan content
  const searchQueries = ['Peter Zeihan', 'Zeihan geopolitics'];
  for (const query of searchQueries) {
    if (fetchedCount >= CONFIG.sourceLimits.zeihan) break;
    try {
      const googleNewsUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-US&gl=US&ceid=US:en`;
      logger.debug(`Fetching Zeihan content from Google News: ${query}`);
      const feed = await parser.parseURL(googleNewsUrl);
      for (const item of feed.items) {
        if (fetchedCount >= CONFIG.sourceLimits.zeihan) break;
        const pubDate = item.pubDate || item.isoDate;
        if (pubDate && isWithinTimeLimit(pubDate)) {
          const content = item.contentSnippet || item.content || item.summary || item.title || '';
          const title = item.title || '';
          // Zeihan content is inherently relevant, but a light check is fine
          if (isGeopoliticallyRelevant(title + ' ' + content) || title.toLowerCase().includes('zeihan')) {
            allZeihanItems.push({
              title: item.title,
              link: item.link,
              pubDate: pubDate,
              content: content,
              source: item.source && item.source.includes('Peter Zeihan') ? item.source : `Peter Zeihan via ${item.source || 'Google News'}`,
              sourceType: 'ZeihanGoogleNews'
            });
            fetchedCount++;
          }
        }
      }
    } catch (error) {
      logger.warn(`Error fetching Zeihan content from Google News for query "${query}": ${error.message}`);
    }
  }

  // Fetch directly from Zeihan's website RSS feed
  if (fetchedCount < CONFIG.sourceLimits.zeihan) {
    try {
      logger.debug('Fetching Zeihan content from zeihan.com RSS feed...');
      const zeihanFeed = await parser.parseURL('https://zeihan.com/feed/');
      for (const item of zeihanFeed.items) {
        if (fetchedCount >= CONFIG.sourceLimits.zeihan) break;
        const pubDate = item.pubDate || item.isoDate;
        if (pubDate && isWithinTimeLimit(pubDate)) {
          allZeihanItems.push({
            title: item.title,
            link: item.link,
            pubDate: pubDate,
            content: item.contentSnippet || item.content || item.summary || item.title || '',
            source: 'Peter Zeihan Website',
            sourceType: 'ZeihanRSS'
          });
          fetchedCount++;
        }
      }
    } catch (feedError) {
      logger.warn(`Error fetching Zeihan RSS feed: ${feedError.message}.`);
    }
  }
  
  const uniqueZeihanItems = deduplicateEvents(allZeihanItems);
  logger.info(`Fetched ${uniqueZeihanItems.length} relevant events from Zeihan sources.`);
  return uniqueZeihanItems.slice(0, CONFIG.sourceLimits.zeihan);
}

// Placeholder for the main orchestrating function
async function fetchAndProcessSourceData() {
  logger.info('Starting data retrieval from all sources...');
  const rssEvents = await fetchRSSFeeds();
  const googleNewsEvents = await fetchGoogleNewsRSS();
  const newsApiEvents = await fetchNewsAPI();
  const rapidApiEvents = await fetchRapidAPI();
  const zeihanEvents = await fetchZeihanContent();
  // More sources will be added here

  // For now, just combine and return (or format as a string)
  // In the future, deduplication and more processing will happen here
  const allRawEvents = [
    ...rssEvents, 
    ...googleNewsEvents, 
    ...newsApiEvents, 
    ...rapidApiEvents, 
    ...zeihanEvents
    /*, ...otherSourceEvents*/
  ];
  
  logger.info(`Total raw events fetched before global deduplication: ${allRawEvents.length}`);

  // Apply global deduplication and filtering
  const uniqueAndValidEvents = globalDeduplicateAndFilter(allRawEvents);
  
  // Format the final unique events
  const formattedEvents = uniqueAndValidEvents.map(event => ({
    title: event.title || 'Untitled Event',
    content: event.content || event.description || '', // Ensure content is populated
    source: event.source || 'Unknown Source',
    link: event.link || '',
    publishedDate: event.pubDate || new Date().toISOString(), // Ensure publishedDate is present
    sourceType: event.sourceType || 'general'
  }));

  logger.info(`Total formatted events after global processing: ${formattedEvents.length}`);
  return formattedEvents; 
}

module.exports = {
  fetchAndProcessSourceData,
  // Potentially export individual fetchers if needed elsewhere, or for testing
  fetchRSSFeeds,
  fetchGoogleNewsRSS,
  fetchNewsAPI,
  fetchRapidAPI,
  fetchZeihanContent
};
