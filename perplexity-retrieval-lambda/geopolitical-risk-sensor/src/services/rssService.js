/**
 * RSS Service for Geopolitical Risk Sensor
 * Fetches and processes geopolitical news from RSS feeds
 */

const axios = require('axios');
const Parser = require('rss-parser');
const { createLogger } = require('../utils/logger');

const logger = createLogger('geopolitical-risk-sensor');
const parser = new Parser();

// List of geopolitical news RSS feeds
const RSS_FEEDS = [
  // Major global news sources
  'https://www.foreignaffairs.com/rss.xml',
  'https://www.cfr.org/rss.xml',
  'https://www.brookings.edu/feed/',
  'https://www.csis.org/rss.xml',
  'https://feeds.bbci.co.uk/news/world/rss.xml',
  'https://rss.nytimes.com/services/xml/rss/nyt/World.xml',
  'https://www.aljazeera.com/xml/rss/all.xml',
  'https://www.ft.com/world?format=rss',
  'https://www.economist.com/international/rss.xml',
  'https://www.reuters.com/world/rss/',
  'https://foreignpolicy.com/feed/',
  'https://www.wsj.com/xml/rss/3_7085.xml',  // WSJ World News
  'https://www.theguardian.com/world/rss',
  'https://www.france24.com/en/rss',
  'https://www.dw.com/en/top-stories/rss-topthemen/s-9097',  // Deutsche Welle
  'https://www.straitstimes.com/rssfeed/world',  // The Straits Times (Singapore)
  'https://www.thehindu.com/news/international/feeder/default.rss',  // The Hindu (India)
  'https://www.abc.net.au/news/feed/51120/rss.xml',  // ABC News (Australia)
  'https://www.cbc.ca/cmlink/rss-world',  // CBC News (Canada)
  
  // S&P Global feeds
  'https://www.spglobal.com/marketintelligence/en/rss/all-feeds/all-feeds.rss',
  'https://www.spglobal.com/commodityinsights/en/rss/all-feeds/all-feeds.rss',
  'https://www.spglobal.com/ratings/en/rss/all-feeds/all-feeds.rss',
  'https://www.spglobal.com/mobility/en/rss/all-feeds/all-feeds.rss',
  'https://www.spglobal.com/spdji/en/rss/all-feeds/all-feeds.rss',
  'https://www.spglobal.com/marketintelligence/en/news-insights/feed/rss/latest-news-headlines',
  'https://www.spglobal.com/commodityinsights/en/market-insights/feed/rss/latest-news',
  'https://www.spglobal.com/esg/insights/feed/rss/latest-insights',  // S&P Global ESG Insights
  
  // Financial and market sources
  'https://www.cnbc.com/id/100003114/device/rss/rss.html',  // CNBC World News
  'https://www.bloomberg.com/feed/podcast/etf-report',
  'https://www.bloomberg.com/markets/sitemap_news.xml',  // Bloomberg Markets
  'https://www.imf.org/en/News/rss',
  'https://www.worldbank.org/en/news/rss.xml',
  'https://www.wto.org/english/res_e/news_e/news_e.rss',  // World Trade Organization
  'https://www.bis.org/rss/cbspeeches.rss',  // Bank for International Settlements
  'https://www.oecd.org/newsroom/index.xml',  // OECD
  
  // Regional specific feeds - Asia
  'https://www.scmp.com/rss/91/feed',  // South China Morning Post
  'https://asia.nikkei.com/rss/feed/index',  // Nikkei Asia
  'https://www.koreatimes.co.kr/www/rss/rss_202.xml',  // Korea Times
  'https://www.japantimes.co.jp/feed/',  // Japan Times
  'https://timesofindia.indiatimes.com/rssfeeds/296589292.cms',  // Times of India - World
  'https://www.bangkokpost.com/rss/data/topstories.xml',  // Bangkok Post
  
  // Regional specific feeds - Middle East
  'https://www.jpost.com/rss/front-page',  // Jerusalem Post
  'https://www.haaretz.com/cmlink/1.4605045',  // Haaretz
  'https://www.arabnews.com/rss.xml',  // Arab News
  'https://english.alarabiya.net/tools/rss',  // Al Arabiya
  'https://gulfnews.com/rss/world',  // Gulf News
  'https://www.al-monitor.com/rss',  // Al-Monitor
  
  // Regional specific feeds - Europe
  'https://www.rferl.org/api/zrqiteuuipt',  // Radio Free Europe
  'https://www.themoscowtimes.com/rss/news',  // Moscow Times
  'https://www.kyivpost.com/feed',  // Kyiv Post
  'https://www.politico.eu/feed/',  // Politico Europe
  'https://www.euronews.com/rss',  // Euronews
  'https://www.euractiv.com/feed/',  // EurActiv
  
  // Regional specific feeds - Africa
  'https://www.theafricareport.com/feed/',
  'https://allafrica.com/tools/headlines/rdf/latest/headlines.rdf',  // AllAfrica
  'https://www.news24.com/fin24/rss/fin24_international',  // News24 (South Africa)
  'https://www.businesslive.co.za/bd/world/?service=rss',  // Business Day (South Africa)
  
  // Regional specific feeds - Americas
  'https://www.mercopress.com/rss/',  // MercoPress (South America)
  'https://rss.uol.com.br/feed/internacional.xml',  // UOL (Brazil)
  'https://www.eluniversal.com.mx/rss.xml',  // El Universal (Mexico)
  'https://www.buenosairesherald.com/feed',  // Buenos Aires Herald
  
  // Think tanks and research institutions
  'https://carnegieendowment.org/rss/solr/?fa=pubs&maxrows=20',
  'https://www.chathamhouse.org/rss/research',
  'https://www.sipri.org/rss.xml',
  'https://www.iiss.org/rss',  // International Institute for Strategic Studies
  'https://www.rand.org/content/rand/blog.rss',
  'https://www.wilsoncenter.org/rss.xml',  // Wilson Center
  'https://www.heritage.org/rss',  // Heritage Foundation
  'https://www.cato.org/rss/recent-opeds.xml',  // Cato Institute
  'https://www.piie.com/rss.xml',  // Peterson Institute for International Economics
  
  // Specialized topics - Energy and Resources
  'https://oilprice.com/rss/main',  // OilPrice.com
  'https://www.energyintel.com/rss',  // Energy Intelligence
  'https://www.argusmedia.com/en/rss/feed',  // Argus Media
  
  // Specialized topics - Cybersecurity and Technology
  'https://www.cyberscoop.com/feed/',  // CyberScoop
  'https://www.darkreading.com/rss.xml',  // Dark Reading
  'https://www.wired.com/feed/category/security/latest/rss',  // Wired Security
  
  // Specialized topics - Defense and Security
  'https://breakingdefense.com/feed/',  // Breaking Defense
  'https://www.defensenews.com/arc/outboundfeeds/rss/category/global/?outputType=xml',  // Defense News
  'https://www.janes.com/feeds/news',  // Jane's Defense
  
  // Specialized topics - Climate and Environment
  'https://www.climatechangenews.com/feed/',  // Climate Change News
  'https://www.carbonbrief.org/feed',  // Carbon Brief
  
  // Specialized topics - Health and Pandemics
  'https://www.who.int/feeds/entity/news/en/rss.xml',  // World Health Organization
  'https://www.cidrap.umn.edu/news/rss.xml'  // CIDRAP (Center for Infectious Disease Research and Policy)
];

/**
 * Fetch and parse an RSS feed
 * @param {string} url - RSS feed URL
 * @returns {Promise<Array>} - Array of feed items
 */
async function fetchRSSFeed(url) {
  try {
    const feed = await parser.parseURL(url);
    return feed.items || [];
  } catch (error) {
    logger.warn(`Error fetching RSS feed ${url}: ${error.message}`);
    return [];
  }
}

/**
 * Fetch all RSS feeds and extract recent items
 * @param {number} maxDays - Maximum age of items in days
 * @returns {Promise<Array>} - Array of recent RSS items
 */
async function fetchRecentRSSItems(maxDays = 7) {
  try {
    // Calculate cutoff date
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - maxDays);
    
    // Fetch all feeds in parallel
    const feedPromises = RSS_FEEDS.map(url => fetchRSSFeed(url));
    const feedResults = await Promise.all(feedPromises);
    
    // Flatten and filter by date
    let allItems = [];
    feedResults.forEach(items => {
      allItems = allItems.concat(items);
    });
    
    // Filter recent items
    const recentItems = allItems.filter(item => {
      const pubDate = item.pubDate ? new Date(item.pubDate) : new Date();
      return pubDate >= cutoffDate;
    });
    
    logger.info(`RSSService: Found ${recentItems.length} recent RSS items`);
    return recentItems;
  } catch (error) {
    logger.error(`Error fetching RSS feeds: ${error.message}`);
    return [];
  }
}

/**
 * Convert RSS items to geopolitical events
 * @param {Array} rssItems - Array of RSS items
 * @returns {Array} - Array of geopolitical events
 */
function convertRSSItemsToEvents(rssItems) {
  return rssItems.map(item => ({
    id: item.guid || item.link,
    title: item.title,
    description: item.contentSnippet || item.content || '',
    source: item.link,
    publishedDate: item.pubDate || new Date().toISOString(),
    type: 'rss'
  }));
}

/**
 * Get recent geopolitical events from RSS feeds
 * @param {number} maxDays - Maximum age of events in days
 * @returns {Promise<Array>} - Array of geopolitical events
 */
async function getRecentEvents(maxDays = 7) {
  try {
    const rssItems = await fetchRecentRSSItems(maxDays);
    const events = convertRSSItemsToEvents(rssItems);
    logger.info(`Retrieved ${events.length} events from RSSService`);
    return events;
  } catch (error) {
    logger.error(`Error getting recent events from RSS: ${error.message}`);
    return [];
  }
}

module.exports = {
  getRecentEvents,
  fetchRecentRSSItems
};
