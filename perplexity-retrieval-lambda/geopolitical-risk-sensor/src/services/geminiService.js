/**
 * Gemini Service for Geopolitical Risk Sensor
 * Uses Google's Gemini API to search for geopolitical news and insights
 */

const axios = require('axios');
const { createLogger } = require('../utils/logger');

const logger = createLogger('geopolitical-risk-sensor');

/**
 * Service for retrieving geopolitical insights using Google's Gemini API
 */
class GeminiService {
  /**
   * Create a new GeminiService instance
   * @param {string} apiKey - Gemini API key
   * @param {string} searchEngineId - Google Custom Search Engine ID
   */
  constructor(apiKey, searchEngineId) {
    if (!apiKey) {
      throw new Error('Gemini API key is required');
    }
    if (!searchEngineId) {
      throw new Error('Search Engine ID is required');
    }
    this.apiKey = apiKey;
    this.searchEngineId = searchEngineId;
  }

  /**
   * Get geopolitical risks using Gemini API
   * @returns {Promise<Object>} Geopolitical risks data
   */
  async getGeopoliticalRisks() {
    try {
      logger.info('Retrieving geopolitical risks using Gemini API');
      
      // In test mode, return sample data
      if (process.env.TEST_MODE === 'true') {
        logger.info('Running in test mode, returning sample data');
        return this.getSampleData();
      }
      
      // Perform Google search for recent geopolitical news
      const searchResults = await this.performGoogleSearch('recent geopolitical risks affecting markets');
      
      if (!searchResults || !searchResults.items || searchResults.items.length === 0) {
        logger.warn('No search results found');
        return { risks: [] };
      }
      
      // Process search results into risk format
      const risks = searchResults.items.map(item => ({
        type: 'News',
        name: item.title,
        description: item.snippet,
        region: this.extractRegion(item.title, item.snippet),
        impactLevel: this.estimateImpactLevel(item.title, item.snippet),
        marketImpact: 'Market impact not available from search results',
        source: item.displayLink || new URL(item.link).hostname,
        url: item.link,
        lastUpdated: new Date().toISOString().split('T')[0]
      }));
      
      logger.info(`Retrieved ${risks.length} geopolitical risks from Gemini API`);
      return { risks };
    } catch (error) {
      logger.error(`Error retrieving geopolitical risks from Gemini API: ${error.message}`);
      return { risks: [] };
    }
  }

  /**
   * Perform a Google search using the Custom Search API
   * @param {string} query - Search query
   * @returns {Promise<Object>} Search results
   */
  async performGoogleSearch(query) {
    try {
      const response = await axios.get('https://www.googleapis.com/customsearch/v1', {
        params: {
          key: this.apiKey,
          cx: this.searchEngineId,
          q: query,
          dateRestrict: 'd7', // Last 7 days
          num: 10 // Number of results
        }
      });
      
      return response.data;
    } catch (error) {
      logger.error(`Error performing Google search: ${error.message}`);
      return null;
    }
  }

  /**
   * Extract region from title and snippet
   * @param {string} title - Search result title
   * @param {string} snippet - Search result snippet
   * @returns {string} Extracted region or 'Global'
   */
  extractRegion(title, snippet) {
    const regions = [
      'United States', 'China', 'Russia', 'Europe', 'Middle East', 'Asia', 
      'Africa', 'Latin America', 'Ukraine', 'Israel', 'Iran', 'North Korea',
      'Japan', 'India', 'UK', 'Germany', 'France', 'Brazil', 'Canada', 'Australia'
    ];
    
    const fullText = `${title} ${snippet}`.toLowerCase();
    
    for (const region of regions) {
      if (fullText.includes(region.toLowerCase())) {
        return region;
      }
    }
    
    return 'Global';
  }

  /**
   * Estimate impact level based on title and snippet
   * @param {string} title - Search result title
   * @param {string} snippet - Search result snippet
   * @returns {number} Estimated impact level (1-10)
   */
  estimateImpactLevel(title, snippet) {
    const fullText = `${title} ${snippet}`.toLowerCase();
    
    // High impact keywords
    const highImpactKeywords = [
      'war', 'crisis', 'conflict', 'invasion', 'attack', 'missile', 'nuclear',
      'catastrophic', 'critical', 'severe', 'major', 'significant'
    ];
    
    // Medium impact keywords
    const mediumImpactKeywords = [
      'tension', 'dispute', 'sanction', 'tariff', 'protest', 'unrest',
      'concern', 'risk', 'threat', 'challenge', 'issue'
    ];
    
    // Count keyword occurrences
    let highImpactCount = 0;
    let mediumImpactCount = 0;
    
    for (const keyword of highImpactKeywords) {
      if (fullText.includes(keyword)) {
        highImpactCount++;
      }
    }
    
    for (const keyword of mediumImpactKeywords) {
      if (fullText.includes(keyword)) {
        mediumImpactCount++;
      }
    }
    
    // Calculate impact level (1-10)
    const baseImpact = 5; // Default medium impact
    const highImpactBonus = Math.min(highImpactCount * 1.5, 4); // Max +4 from high impact
    const mediumImpactBonus = Math.min(mediumImpactCount * 0.5, 1); // Max +1 from medium impact
    
    return Math.min(Math.round(baseImpact + highImpactBonus + mediumImpactBonus), 10);
  }

  /**
   * Get sample geopolitical risks data for testing
   * @returns {Object} Sample geopolitical risks data
   */
  getSampleData() {
    return {
      risks: [
        {
          type: 'Conflict',
          name: 'Middle East Tensions Escalate',
          description: 'Recent military exchanges have intensified, with reports of increased missile strikes and potential ground operations.',
          region: 'Middle East',
          impactLevel: 7.5,
          marketImpact: 'Energy sector stocks up 2.8%, defense contractors seeing 1.5% gains, while travel and tourism stocks down 1.9%.',
          source: 'Financial Times',
          url: 'https://www.ft.com/content/middle-east-conflict-markets',
          lastUpdated: '2025-05-15'
        },
        {
          type: 'Trade',
          name: 'EU-China Trade Tensions',
          description: 'The European Union has imposed new tariffs on Chinese electric vehicles, citing unfair subsidies.',
          region: 'Global',
          impactLevel: 6.8,
          marketImpact: 'European automakers saw mixed reactions with luxury brands falling 3.2% on fears of Chinese retaliation.',
          source: 'Bloomberg',
          url: 'https://www.bloomberg.com/news/articles/eu-china-trade-tensions',
          lastUpdated: '2025-05-14'
        },
        {
          type: 'Monetary Policy',
          name: 'Federal Reserve Signals Delayed Rate Cuts',
          description: 'The Federal Reserve has indicated it may delay previously anticipated interest rate cuts due to persistent inflation data.',
          region: 'United States',
          impactLevel: 8.2,
          marketImpact: 'Treasury yields jumped with the 10-year rising 15 basis points. Banking stocks fell 2.1%.',
          source: 'Wall Street Journal',
          url: 'https://www.wsj.com/articles/fed-signals-rate-cut-delay',
          lastUpdated: '2025-05-16'
        }
      ]
    };
  }
}

module.exports = GeminiService;
