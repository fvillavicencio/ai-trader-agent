/**
 * Zeihan Service for Geopolitical Risk Sensor
 * Fetches and processes geopolitical analysis from Peter Zeihan's content
 * using Google Search API
 */

const axios = require('axios');
const { createLogger } = require('../utils/logger');

const logger = createLogger('geopolitical-risk-sensor');

// Google Custom Search API configuration
const GOOGLE_SEARCH_API_URL = 'https://www.googleapis.com/customsearch/v1';
const SEARCH_ENGINE_ID = process.env.GOOGLE_SEARCH_ENGINE_ID || '';

/**
 * Search for Peter Zeihan's recent geopolitical analysis
 * @param {string} apiKey - Google API key
 * @param {number} maxResults - Maximum number of results to return
 * @returns {Promise<Array>} - Array of search results
 */
async function searchZeihanAnalysis(apiKey, maxResults = 10) {
  if (!apiKey) {
    logger.warn('Google API key not provided, ZeihanService will not be available');
    return [];
  }

  try {
    const response = await axios.get(GOOGLE_SEARCH_API_URL, {
      params: {
        key: apiKey,
        cx: SEARCH_ENGINE_ID,
        q: 'Peter Zeihan geopolitical analysis',
        num: maxResults,
        dateRestrict: 'd7', // Last 7 days
        sort: 'date'
      }
    });

    if (response.data && response.data.items) {
      logger.info(`ZeihanService: Found ${response.data.items.length} recent items`);
      return response.data.items;
    }

    logger.warn('ZeihanService: No items found in search results');
    return [];
  } catch (error) {
    logger.error(`Error searching Zeihan analysis: ${error.message}`);
    return [];
  }
}

/**
 * Convert Google search results to geopolitical events
 * @param {Array} searchResults - Array of Google search results
 * @returns {Array} - Array of geopolitical events
 */
function convertSearchResultsToEvents(searchResults) {
  return searchResults.map(item => ({
    id: item.link,
    title: item.title,
    description: item.snippet || '',
    source: item.link,
    publishedDate: new Date().toISOString(), // Google doesn't provide exact date
    type: 'zeihan'
  }));
}

/**
 * Get recent geopolitical events from Peter Zeihan's analysis
 * @param {string} apiKey - Google API key
 * @param {number} maxResults - Maximum number of results to return
 * @returns {Promise<Array>} - Array of geopolitical events
 */
async function getRecentEvents(apiKey, maxResults = 10) {
  try {
    const searchResults = await searchZeihanAnalysis(apiKey, maxResults);
    const events = convertSearchResultsToEvents(searchResults);
    logger.info(`Retrieved ${events.length} events from ZeihanService`);
    return events;
  } catch (error) {
    logger.error(`Error getting recent events from Zeihan: ${error.message}`);
    return [];
  }
}

module.exports = {
  getRecentEvents
};
