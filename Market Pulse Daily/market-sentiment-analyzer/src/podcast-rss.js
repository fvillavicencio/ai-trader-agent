/**
 * RSS Feed Parser for Market Sentiment Analyzer
 * Handles retrieval and parsing of RSS feeds, including podcast feeds
 */

require('dotenv').config();
const Parser = require('rss-parser');
const axios = require('axios');
const { createLogger } = require('./logger');

// Initialize logger
const logger = createLogger('podcast-rss');

// Initialize RSS parser with custom fields
const parser = new Parser({
  customFields: {
    item: [
      'itunes:duration',
      'itunes:explicit',
      'itunes:subtitle',
      'itunes:summary',
      'itunes:image',
      'itunes:keywords',
      'itunes:episode',
      'itunes:episodeType',
      'enclosure'
    ]
  }
});

/**
 * Fetch and parse an RSS feed
 * @param {string} url - The RSS feed URL
 * @param {number} maxItems - Maximum number of items to return
 * @returns {Promise<Array>} - Array of feed items
 */
async function fetchRssFeed(url, maxItems = 10) {
  try {
    logger.info(`Fetching RSS feed from ${url}`);
    
    // Handle special cases for podcast platforms
    if (url.includes('podcasts.apple.com')) {
      // Apple Podcasts - need to extract the RSS feed URL
      const podcastId = url.match(/id(\d+)/);
      if (podcastId && podcastId[1]) {
        try {
          // Try to get the actual RSS feed URL from the podcast page
          const response = await axios.get(url);
          const match = response.data.match(/https:\/\/feeds\.simplecast\.com\/[\w-]+/);
          if (match) {
            url = match[0];
            logger.info(`Extracted RSS feed URL from Apple Podcasts: ${url}`);
          } else {
            logger.warn(`Could not extract RSS feed URL from Apple Podcasts: ${url}`);
            return [];
          }
        } catch (error) {
          logger.warn(`Error fetching Apple Podcast page: ${error.message}`);
          return [];
        }
      } else {
        logger.warn(`Could not extract podcast ID from Apple Podcasts URL: ${url}`);
        return [];
      }
    } else if (url.includes('spotify.com/show/')) {
      logger.info(`[podcast-rss] Spotify URLs are not directly supported`);
      logger.warn(`[podcast-rss] Please update the configuration to use Apple Podcasts or direct RSS feed URLs instead of Spotify URLs`);
      return [];
    }
    
    // Now parse the RSS feed
    const feed = await parser.parseURL(url);
    
    if (!feed || !feed.items) {
      logger.warn(`No items found in RSS feed from ${url}`);
      return [];
    }
    
    logger.info(`Found ${feed.items.length} items in RSS feed from ${url}`);
    
    // Take only the most recent items up to maxItems
    const items = feed.items.slice(0, maxItems).map(item => {
      // Extract audio URL from enclosure if available
      const audioUrl = item.enclosure ? item.enclosure.url : null;
      
      // Extract duration in seconds if available
      let durationSeconds = null;
      if (item['itunes:duration']) {
        const durationStr = item['itunes:duration'];
        if (durationStr.includes(':')) {
          // Format: HH:MM:SS or MM:SS
          const parts = durationStr.split(':').map(Number);
          if (parts.length === 3) {
            // HH:MM:SS
            durationSeconds = parts[0] * 3600 + parts[1] * 60 + parts[2];
          } else if (parts.length === 2) {
            // MM:SS
            durationSeconds = parts[0] * 60 + parts[1];
          }
        } else {
          // Format: seconds as number
          durationSeconds = parseInt(durationStr, 10);
        }
      }
      
      return {
        title: item.title,
        content: item.content || item['itunes:summary'] || item.contentSnippet || '',
        description: item.contentSnippet || item['itunes:subtitle'] || '',
        link: item.link,
        guid: item.guid || item.id,
        publishedDate: item.pubDate || item.isoDate,
        audioUrl,
        duration_seconds: durationSeconds,
        author: item.creator || item.author || feed.title,
        categories: item.categories || []
      };
    });
    
    return items;
  } catch (error) {
    logger.error(`Error fetching RSS feed from ${url}: ${error.message}`);
    throw error;
  }
}

/**
 * Fetch podcast episode transcript if available
 * @param {string} audioUrl - URL to the audio file
 * @param {string} guid - Unique identifier for the episode
 * @returns {Promise<string|null>} - Transcript text or null if not available
 */
async function fetchPodcastTranscript(audioUrl, guid) {
  // This is a placeholder for actual transcript fetching logic
  // In a real implementation, you might use a transcription service API
  logger.info(`Attempting to fetch transcript for podcast episode ${guid}`);
  
  try {
    // Check if we have a cached transcript
    // Implementation would depend on your caching strategy
    
    // For now, just return null as we don't have actual transcript fetching
    logger.info(`No transcript available for podcast episode ${guid}`);
    return null;
  } catch (error) {
    logger.error(`Error fetching podcast transcript: ${error.message}`);
    return null;
  }
}

module.exports = {
  fetchRssFeed,
  fetchPodcastTranscript
};