/**
 * Insight Sentry Service for Geopolitical Risk Sensor
 * Retrieves top 100 news feeds from InsightSentry RapidAPI service
 */

const axios = require('axios');
const { createLogger } = require('../utils/logger');

const logger = createLogger('geopolitical-risk-sensor');

// InsightSentry RapidAPI configuration
const RAPIDAPI_HOST = process.env.RAPIDAPI_HOST || 'insightsentry.p.rapidapi.com';
const RAPIDAPI_ENDPOINT = process.env.RAPIDAPI_ENDPOINT || 'https://insightsentry.p.rapidapi.com/v2/newsfeed/latest';

/**
 * Fetch top news from InsightSentry RapidAPI
 * @param {string} apiKey - RapidAPI key
 * @param {number} limit - Maximum number of news items to retrieve (default: 100)
 * @returns {Promise<Array>} - Array of news items
 */
async function fetchTopNews(apiKey, limit = 100) {
  if (!apiKey) {
    logger.warn('RapidAPI key not provided, InsightSentryService will not be available');
    return [];
  }

  try {
    const response = await axios.get(RAPIDAPI_ENDPOINT, {
      headers: {
        'x-rapidapi-key': apiKey,
        'x-rapidapi-host': RAPIDAPI_HOST
      }
    });

    if (response.data && response.data.data && Array.isArray(response.data.data)) {
      logger.info(`InsightSentryService: Retrieved ${response.data.current_items} news items from InsightSentry`);
      return response.data.data.slice(0, limit);
    }

    logger.warn('InsightSentryService: No news items found in API response');
    return [];
  } catch (error) {
    logger.error(`Error fetching news from InsightSentry: ${error.message}`);
    return [];
  }
}

/**
 * Filter news items for geopolitical relevance
 * @param {Array} newsItems - Array of news items from RapidAPI
 * @returns {Array} - Filtered array of geopolitically relevant news items
 */
function filterGeopoliticalNews(newsItems) {
  // Keywords that indicate geopolitical relevance by category
  const geopoliticalKeywords = {
    // Conflict and security
    conflict: ['war', 'conflict', 'military', 'invasion', 'attack', 'bombing', 'terrorism', 'insurgency', 
              'rebellion', 'civil war', 'coup', 'uprising', 'revolution', 'violence', 'hostage', 'hostilities'],
    
    // Diplomatic relations
    diplomatic: ['sanctions', 'treaty', 'diplomacy', 'diplomatic', 'alliance', 'summit', 'bilateral', 
                'multilateral', 'foreign policy', 'foreign minister', 'ambassador', 'embassy', 'consulate'],
    
    // International organizations
    organizations: ['NATO', 'UN', 'United Nations', 'EU', 'European Union', 'ASEAN', 'African Union', 'OPEC', 
                  'IMF', 'World Bank', 'WTO', 'G7', 'G20', 'Security Council', 'BRICS'],
    
    // Trade and economics
    economics: ['trade war', 'economic sanctions', 'embargo', 'tariff', 'trade dispute', 'trade agreement', 
              'economic crisis', 'currency', 'devaluation', 'default', 'debt crisis', 'supply chain'],
    
    // Territorial issues
    territorial: ['border', 'territorial', 'sovereignty', 'annexation', 'disputed territory', 'maritime dispute', 
                'exclusive economic zone', 'airspace violation', 'territorial waters'],
    
    // Government and politics
    politics: ['regime', 'government', 'election', 'political', 'president', 'prime minister', 'parliament', 
              'congress', 'democracy', 'authoritarian', 'dictatorship', 'autocracy', 'corruption'],
    
    // Civil unrest
    unrest: ['protest', 'demonstration', 'riot', 'civil unrest', 'strike', 'labor dispute', 'dissent', 
            'opposition', 'crackdown', 'human rights', 'censorship', 'repression'],
    
    // Resources and energy
    resources: ['resource', 'energy', 'oil', 'gas', 'pipeline', 'LNG', 'petroleum', 'minerals', 'rare earth', 
              'water rights', 'energy security', 'OPEC', 'production cut', 'strategic reserve'],
    
    // Strategic and intelligence
    strategic: ['strategic', 'intelligence', 'espionage', 'spy', 'surveillance', 'reconnaissance', 
              'classified', 'leak', 'whistleblower', 'national security'],
    
    // Cybersecurity
    cyber: ['cyber attack', 'hacking', 'data breach', 'ransomware', 'malware', 'phishing', 'cyber warfare', 
          'cyber espionage', 'critical infrastructure', 'digital security'],
    
    // Nuclear and WMD
    nuclear: ['nuclear', 'missile', 'ballistic', 'ICBM', 'warhead', 'proliferation', 'arms control', 
            'disarmament', 'weapons of mass destruction', 'WMD', 'enrichment', 'uranium'],
    
    // Migration and refugees
    migration: ['refugee', 'migration', 'asylum', 'immigrant', 'displacement', 'border crisis', 'humanitarian crisis'],
    
    // Climate and environment
    climate: ['climate change', 'global warming', 'emissions', 'carbon', 'environmental policy', 'Paris Agreement', 
            'climate accord', 'pollution', 'environmental disaster']
  };

  // Flatten all keywords into a single array
  const allKeywords = Object.values(geopoliticalKeywords).flat();
  
  // Create a regex pattern for efficient matching
  const pattern = new RegExp(allKeywords.join('|'), 'i');

  // Filter news items that match geopolitical keywords in title or description
  const filteredItems = newsItems.filter(item => {
    const title = item.title || '';
    const description = item.description || '';
    const content = item.content || '';
    
    return pattern.test(title) || pattern.test(description) || pattern.test(content);
  });
  
  // Add category tags to each item based on the keywords they contain
  return filteredItems.map(item => {
    const title = item.title || '';
    const description = item.description || '';
    const content = item.content || '';
    const fullText = `${title} ${description} ${content}`;
    
    const categories = [];
    for (const [category, keywords] of Object.entries(geopoliticalKeywords)) {
      if (keywords.some(keyword => fullText.toLowerCase().includes(keyword.toLowerCase()))) {
        categories.push(category);
      }
    }
    
    return {
      ...item,
      geopoliticalCategories: categories
    };
  });
}

/**
 * Extract valid URL from news item
 * @param {Object} item - News item from InsightSentry
 * @returns {string} - Valid URL or empty string
 */
function extractValidUrl(item) {
  // If no URL is provided, try to construct one from the source domain
  if (!item.url && item.source) {
    // Extract domain from source and construct a base URL
    const sourceLower = item.source.toLowerCase();
    
    // Map of known news sources to their domains
    const knownSources = {
      'bbc': 'https://www.bbc.com/news/',
      'cnn': 'https://www.cnn.com/',
      'fox': 'https://www.foxnews.com/world/',
      'reuters': 'https://www.reuters.com/',
      'bloomberg': 'https://www.bloomberg.com/',
      'nyt': 'https://www.nytimes.com/',
      'wsj': 'https://www.wsj.com/',
      'washingtonpost': 'https://www.washingtonpost.com/',
      'ft': 'https://www.ft.com/',
      'economist': 'https://www.economist.com/',
      'aljazeera': 'https://www.aljazeera.com/',
      'guardian': 'https://www.theguardian.com/'
    };
    
    // Check if the source matches any known domains
    for (const [key, domain] of Object.entries(knownSources)) {
      if (sourceLower.includes(key)) {
        return domain;
      }
    }
    
    // If no match, try to construct a URL from the source name
    if (!sourceLower.includes('http')) {
      // Remove spaces and special characters, convert to lowercase
      const domainName = sourceLower
        .replace(/[^a-z0-9]/gi, '')
        .toLowerCase();
      
      // Return a constructed URL
      return `https://www.${domainName}.com/`;
    }
  }
  
  // If URL is provided, validate it
  if (item.url) {
    try {
      // Check if it's a valid URL
      new URL(item.url);
      return item.url;
    } catch (e) {
      // If not a valid URL, try to fix it
      if (!item.url.startsWith('http')) {
        // Try adding https:// prefix
        try {
          new URL(`https://${item.url}`);
          return `https://${item.url}`;
        } catch (e) {
          // If still not valid, return empty string
          return '';
        }
      }
    }
  }
  
  return '';
}

/**
 * Convert news items to geopolitical events
 * @param {Array} newsItems - Array of news items
 * @returns {Array} - Array of geopolitical events
 */
function convertNewsToEvents(newsItems) {
  return newsItems.map(item => {
    // Extract a valid URL from the link field
    const validUrl = item.link || '';
    
    // Determine the source name
    let sourceName = item.source || 'Unknown Source';
    
    // If the source looks like a URL, extract just the domain part
    if (sourceName.includes('http') || sourceName.includes('.com')) {
      try {
        const urlObj = new URL(sourceName.startsWith('http') ? sourceName : `https://${sourceName}`);
        sourceName = urlObj.hostname.replace('www.', '');
      } catch (e) {
        // If parsing fails, keep the original source
      }
    }
    
    // Extract content from the appropriate fields based on the API response structure
    // The API can return content in either 'content' field or have it embedded in the title
    let description = '';
    if (item.content) {
      description = item.content;
    } else if (item.summary) {
      description = item.summary;
    } else if (item.title && item.title.length > 20) {
      // If there's no content but the title is substantial, use it as a fallback
      description = `${item.title}`;
    }
    
    return {
      id: item.id || `insight-sentry-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`,
      title: item.title || 'Untitled News Item',
      description: description,
      source: sourceName,
      link: validUrl, // Use the link directly from the API response
      publishedDate: item.published_at || new Date().toISOString(),
      type: 'insight-sentry',
      author: item.author || 'Unknown',
      imageUrl: item.image_url || '',
      sourceId: item.source || 'unknown',
      retrievalChannel: 'InsightSentry', // Changed from 'rapidApi' to 'InsightSentry'
      sentiment: item.sentiment,
      categories: item.categories || [],
      entities: item.related_symbols || []
    };
  });
}

/**
 * Get recent geopolitical events from RapidAPI news
 * @param {string} apiKey - RapidAPI key
 * @param {number} limit - Maximum number of news items to retrieve
 * @returns {Promise<Array>} - Array of geopolitical events
 */
async function getRecentEvents(apiKey, limit = 100) {
  try {
    // Fetch news from RapidAPI
    const newsItems = await fetchTopNews(apiKey, limit);
    
    // Filter for geopolitical relevance
    const geopoliticalNews = filterGeopoliticalNews(newsItems);
    logger.info(`InsightSentryService: Filtered ${geopoliticalNews.length} geopolitically relevant items from ${newsItems.length} total news items`);
    
    // Convert to standard event format
    const events = convertNewsToEvents(geopoliticalNews);
    
    logger.info(`Retrieved ${events.length} events from InsightSentryService`);
    return events;
  } catch (error) {
    logger.error(`Error getting recent events from InsightSentryService: ${error.message}`);
    return [];
  }
}

/**
 * Get news for specific geopolitical topics - Not supported by InsightSentry API
 * This is a placeholder function that returns an empty array
 * @param {string} apiKey - RapidAPI key
 * @param {Array} topics - Array of topics to search for
 * @param {number} limit - Maximum number of news items per topic
 * @returns {Promise<Array>} - Empty array as this functionality is not supported
 */
async function getTopicSpecificNews(apiKey, topics = ['russia', 'china', 'middle east', 'europe'], limit = 25) {
  logger.warn('Topic-specific news search is not supported by the InsightSentry API');
  return [];
}

module.exports = {
  getRecentEvents,
  getTopicSpecificNews,
  fetchTopNews
};
