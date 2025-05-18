/**
 * Geopolitical Risk Sensor Service
 * Orchestrates the process of detecting, analyzing, and persisting geopolitical risks
 * 
 * This service collects news from multiple sources, filters for geopolitical topics,
 * uses OpenAI to analyze and group items into 5-6 geopolitical risks, and maintains
 * a curated list in the JSON file.
 */
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const logger = require('../utils/logger');
const PerplexityService = require('./perplexityService');
const GeminiService = require('./geminiService');
const StorageService = require('./storageService');
const ZeihanService = require('./zeihanService');
const RSSService = require('./rssService');
const InsightSentryService = require('./insightSentryService');
const config = require('../../config/default');

class SensorService {
  constructor(perplexityApiKey, googleApiKey, geminiApiKey, searchEngineId) {
    if (!perplexityApiKey) {
      throw new Error('Perplexity API key is required');
    }
    this.perplexityService = new PerplexityService(perplexityApiKey);
    this.storageService = new StorageService();
    // Initialize ZeihanService if Google API key is provided
    this.zeihanService = null;
    if (googleApiKey) {
      this.zeihanService = new ZeihanService(googleApiKey);
      logger.info('ZeihanService initialized with Google Custom Search');
    } else {
      logger.warn('Google API key not provided, ZeihanService will not be available');
    }
    // Initialize RSSService
    this.rssService = new RSSService();
    // Initialize InsightSentryService
    this.insightSentryService = new InsightSentryService();
    // Initialize Gemini service if API key is provided
    this.geminiService = null;
    if (geminiApiKey && searchEngineId) {
      this.geminiService = new GeminiService(geminiApiKey, searchEngineId);
      logger.info('Gemini service initialized with Google Custom Search');
    } else {
      logger.warn('Gemini API key or Search Engine ID not provided, fallback source will not be available');
    }
    this.isRunning = false;
    this.lastRunTime = null;
  }
  
  /**
   * Run a complete sensor cycle to detect and analyze geopolitical risks
   * @returns {Promise<Object>} The updated geopolitical risks data
   */
  async runSensorCycle() {
    if (this.isRunning) {
      logger.warn('Sensor cycle already running, skipping this request');
      return null;
    }
    
    this.isRunning = true;
    logger.info('Starting geopolitical risk sensor cycle');
    
    try {
      // Step 1: Load current geopolitical risks from the JSON file
      logger.info('Loading current risks from storage');
      const dataFilePath = path.resolve(__dirname, '../../../data/geopolitical_risks_curated.json');
      let currentRisks = { risks: [] };
      
      try {
        if (fs.existsSync(dataFilePath)) {
          const fileContent = fs.readFileSync(dataFilePath, 'utf8');
          currentRisks = JSON.parse(fileContent);
          logger.info(`Loaded ${currentRisks.risks.length} existing risks from storage`);
        } else {
          logger.warn(`Data file not found at ${dataFilePath}, will create a new one`);
        }
      } catch (error) {
        logger.error(`Error loading risks from file: ${error.message}`);
      }
      
      // Step 2: Collect recent news and insights from all sources in parallel
      logger.info('Collecting recent news from multiple sources');
      let allItems = [];
      
      // 2.1 Get events from RSS feeds (last 5 days)
      const rssItems = await this.rssService.fetchRecentRSSItems(5); // Last 5 days
      if (rssItems && rssItems.length > 0) {
        logger.info(`Retrieved ${rssItems.length} items from RSS feeds`);
        const taggedRssItems = rssItems.map(item => ({
          name: item.title,
          description: item.contentSnippet || item.content || '',
          source: item.creator || item.author || new URL(item.link).hostname,
          url: item.link,
          lastUpdated: item.pubDate ? new Date(item.pubDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
          retrievalChannel: 'RSS'
        }));
        allItems = allItems.concat(taggedRssItems);
      }
      
      // 2.2 Get events from InsightSentry (last 10 items)
      if (process.env.RAPIDAPI_KEY) {
        const insightItems = await this.insightSentryService.fetchTopNews(process.env.RAPIDAPI_KEY, 10);
        if (insightItems && insightItems.length > 0) {
          logger.info(`Retrieved ${insightItems.length} items from InsightSentry`);
          const filteredItems = this.insightSentryService.filterGeopoliticalNews(insightItems);
          const taggedInsightItems = filteredItems.map(item => ({
            name: item.title,
            description: item.description || item.summary || '',
            source: item.source_name || 'InsightSentry',
            url: item.url,
            lastUpdated: item.published_at ? new Date(item.published_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
            retrievalChannel: 'InsightSentry',
            geopoliticalCategories: item.geopoliticalCategories || []
          }));
          allItems = allItems.concat(taggedInsightItems);
        }
      }
      
      // 2.3 Get events from Gemini search
      if (this.geminiService) {
        const geminiData = await this.geminiService.getGeopoliticalRisks();
        if (geminiData && geminiData.risks && geminiData.risks.length > 0) {
          logger.info(`Retrieved ${geminiData.risks.length} items from Gemini search`);
          const taggedGeminiItems = geminiData.risks.map(risk => ({
            name: risk.name,
            description: risk.description,
            region: risk.region,
            impactLevel: typeof risk.impactLevel === 'number' ? risk.impactLevel : parseFloat(risk.impactLevel) || 5,
            marketImpact: risk.marketImpact,
            source: risk.source,
            url: risk.url || risk.sourceUrl,
            lastUpdated: risk.lastUpdated || new Date().toISOString().split('T')[0],
            retrievalChannel: 'Gemini'
          }));
          allItems = allItems.concat(taggedGeminiItems);
        }
      }
      
      // 2.4 Get events from Zeihan sources
      if (this.zeihanService) {
        const zeihanItems = await this.zeihanService.getRecentZeihanPosts(10);
        if (zeihanItems && zeihanItems.length > 0) {
          logger.info(`Retrieved ${zeihanItems.length} items from Zeihan sources`);
          const taggedZeihanItems = zeihanItems.map(item => ({
            name: item.title,
            description: item.description || item.content || '',
            source: 'Peter Zeihan',
            url: item.link,
            lastUpdated: item.pubDate ? new Date(item.pubDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
            retrievalChannel: 'Zeihan'
          }));
          allItems = allItems.concat(taggedZeihanItems);
        }
      }
      // Step 3: Filter and validate items
      logger.info(`Processing a total of ${allItems.length} aggregated items`);
      
      // Filter out items without proper titles, descriptions, or URLs
      const validItems = allItems.filter(item => {
        const hasName = item.name || item.title;
        const hasDescription = item.description && item.description.length > 20;
        const hasUrl = item.url && item.url.startsWith('http');
        
        if (!hasName) {
          logger.debug('Skipping item with missing name/title');
          return false;
        }
        
        if (!hasDescription) {
          logger.debug(`Skipping item with insufficient description: ${item.name || item.title}`);
          return false;
        }
        
        if (!hasUrl) {
          logger.debug(`Skipping item with missing or invalid URL: ${item.name || item.title}`);
          return false;
        }
        
        return true;
      });
      
      logger.info(`Filtered down to ${validItems.length} valid items with proper titles, descriptions, and URLs`);
      
      // Step 4: Stack rank the items based on freshness, source reputation, and relevance
      const rankedItems = this.rankItems(validItems);
      
      // Take the top 24-30 items for analysis
      const topItems = rankedItems.slice(0, 30);
      logger.info(`Selected top ${topItems.length} items for OpenAI analysis`);
      
      // Step 5: Invoke OpenAI to analyze and group items into 5-6 geopolitical risks
      let analyzedRisks = [];
      if (topItems.length > 0) {
        // Construct the OpenAI prompt
        const itemsJson = JSON.stringify(topItems, null, 2);
        const openAIPrompt = `You are Peter Zeihan, a renowned geopolitical strategist known for your insightful analysis of global events and their impact on markets. I'm providing you with a collection of recent news items related to geopolitical developments.

Your task is to analyze these items and identify the 5-6 most significant geopolitical risks currently facing global markets. For each risk:

1. Group related news items together
2. Provide a concise name for the risk
3. Categorize the type of risk (e.g., Conflict, Trade, Monetary Policy, Regulatory, Political, etc.)
4. Describe the risk in one clear sentence
5. Specify the affected region(s)
6. Rate the impact level on a scale of 1-10 (with 10 being most severe)
7. Analyze the market impact in 3-4 sentences, being specific about affected sectors and assets
8. Include relevant source information from the provided news items

Here are the news items to analyze (in JSON format):

${itemsJson}

Respond with a valid JSON object containing an array of risks with the following structure for each risk:
{
  "type": "Risk Category",
  "name": "Brief Risk Name",
  "description": "One-sentence description of the risk",
  "region": "Affected Region",
  "impactLevel": 7.5,
  "marketImpact": "Detailed market impact analysis with specific sectors and assets affected",
  "source": "Primary Source Name",
  "url": "https://source-url.com",
  "lastUpdated": "YYYY-MM-DD"
}

Only include risks that are substantiated by the provided news items. Do not invent information not present in the source material. Preserve the original source URLs exactly as provided.`;
        
        // Call OpenAI using the same parameters as in sendPromptToOpenAI
        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey) {
          logger.error('OpenAI API key not provided');
        } else {
          try {
            logger.info('Calling OpenAI to analyze geopolitical risks');
            const response = await axios.post(
              'https://api.openai.com/v1/chat/completions',
              {
                model: 'gpt-4o',
                messages: [
                  {
                    role: 'system',
                    content: 'You are a professional financial analyst specializing in market analysis and trading recommendations. Please provide your analysis in valid JSON format.'
                  },
                  {
                    role: 'user',
                    content: openAIPrompt
                  }
                ],
                temperature: 0.3,
                max_tokens: 4000
              },
              {
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${apiKey}`
                },
                timeout: 120000 // 2 minutes
              }
            );
            
            // Extract and parse the response
            if (response.data && response.data.choices && response.data.choices[0] && response.data.choices[0].message) {
              const content = response.data.choices[0].message.content;
              
              // Try to parse the JSON content
              try {
                // First try direct parsing
                analyzedRisks = JSON.parse(content);
                
                // If the response is an object with a 'risks' property, extract that
                if (analyzedRisks.risks && Array.isArray(analyzedRisks.risks)) {
                  analyzedRisks = analyzedRisks.risks;
                }
              } catch (e) {
                // Try to extract JSON from within markdown/code block if present
                const match = content.match(/```(?:json)?([\s\S]*?)```/);
                if (match && match[1]) {
                  try {
                    const extracted = JSON.parse(match[1].trim());
                    if (extracted.risks && Array.isArray(extracted.risks)) {
                      analyzedRisks = extracted.risks;
                    } else {
                      analyzedRisks = extracted;
                    }
                  } catch (e2) {
                    logger.error(`Error parsing JSON from code block: ${e2.message}`);
                  }
                } else {
                  logger.error(`Failed to extract JSON from OpenAI response: ${e.message}`);
                }
              }
              
              logger.info(`Successfully processed ${analyzedRisks.length} geopolitical risks from OpenAI`);
            } else {
              logger.error('Invalid response structure from OpenAI');
            }
          } catch (error) {
            logger.error(`Error calling OpenAI: ${error.message}`);
          }
        }
      }
      // Step 6: Process the analyzed risks and update the storage
      if (analyzedRisks.length === 0) {
        logger.warn('No geopolitical risks were successfully analyzed');
        this.isRunning = false;
        return currentRisks;
      }
      
      logger.info(`Successfully analyzed ${analyzedRisks.length} geopolitical risks`);
      
      // Validate the analyzed risks
      const validRisks = analyzedRisks.filter(risk => {
        const hasType = risk.type && typeof risk.type === 'string';
        const hasName = risk.name && typeof risk.name === 'string';
        const hasDescription = risk.description && typeof risk.description === 'string';
        const hasRegion = risk.region && typeof risk.region === 'string';
        const hasImpactLevel = risk.impactLevel && !isNaN(parseFloat(risk.impactLevel));
        const hasMarketImpact = risk.marketImpact && typeof risk.marketImpact === 'string';
        const hasSource = risk.source && typeof risk.source === 'string';
        const hasUrl = risk.url && typeof risk.url === 'string' && risk.url.startsWith('http');
        
        return hasType && hasName && hasDescription && hasRegion && hasImpactLevel && hasMarketImpact && hasSource && hasUrl;
      });
      
      if (validRisks.length < analyzedRisks.length) {
        logger.warn(`Filtered out ${analyzedRisks.length - validRisks.length} invalid risks`);
      }
      
      // Step 7: Create a new geopolitical risks object with the current date
      const today = new Date().toISOString().split('T')[0];
      
      // Calculate the overall risk index based on the average of impact levels
      const totalImpact = validRisks.reduce((sum, risk) => sum + parseFloat(risk.impactLevel), 0);
      const avgImpact = validRisks.length > 0 ? totalImpact / validRisks.length : 0;
      const riskIndex = Math.round(avgImpact * 10); // Scale to 0-100
      
      const newGeopoliticalRisks = {
        geopoliticalRiskIndex: riskIndex,
        risks: validRisks,
        summary: `Analysis of current geopolitical risks affecting global markets as of ${today}.`,
        source: "Geopolitical Risk Sensor",
        sourceUrl: "https://geopolitical-risk-sensor.ai",
        lastUpdated: today
      };
      
      // Step 8: Combine with existing risks and save to the JSON file
      logger.info('Combining with existing risks and saving to storage');
      
      // Add the new risks to the beginning of the list
      let combinedRisks = [];
      if (currentRisks && currentRisks.risks && Array.isArray(currentRisks.risks)) {
        // Add the existing risks after the new ones
        combinedRisks = [...validRisks, ...currentRisks.risks];
      } else {
        combinedRisks = validRisks;
      }
      
      // Remove duplicates based on name and type
      const uniqueRisks = [];
      const riskKeys = new Set();
      
      for (const risk of combinedRisks) {
        const key = `${risk.type}-${risk.name}`;
        if (!riskKeys.has(key)) {
          riskKeys.add(key);
          uniqueRisks.push(risk);
        }
      }
      
      // Limit to a reasonable number (keep the most recent 20)
      const trimmedRisks = uniqueRisks.slice(0, 20);
      
      // Create the final object to save
      const finalGeopoliticalRisks = {
        geopoliticalRiskIndex: riskIndex,
        risks: trimmedRisks,
        summary: `Analysis of current geopolitical risks affecting global markets as of ${today}.`,
        source: "Geopolitical Risk Sensor",
        sourceUrl: "https://geopolitical-risk-sensor.ai",
        lastUpdated: today
      };
      
      // Save to the JSON file
      try {
        // Ensure the data directory exists
        const dataDir = path.dirname(dataFilePath);
        if (!fs.existsSync(dataDir)) {
          fs.mkdirSync(dataDir, { recursive: true });
        }
        
        // Write the file
        fs.writeFileSync(dataFilePath, JSON.stringify(finalGeopoliticalRisks, null, 2), 'utf8');
        logger.info(`Successfully saved ${trimmedRisks.length} geopolitical risks to ${dataFilePath}`);
      } catch (error) {
        logger.error(`Error saving geopolitical risks to file: ${error.message}`);
      }
      
      // Update last run time
      this.lastRunTime = new Date();
      logger.info('Geopolitical risk sensor cycle completed successfully');
      
      this.isRunning = false;
      return finalGeopoliticalRisks;
    } catch (error) {
      logger.error('Error in sensor cycle', { error });
      this.isRunning = false;
      throw error;
    }
  }
  
  /**
   * Rank items based on freshness, source reputation, and relevance
   * @param {Array<Object>} items - The items to rank
   * @returns {Array<Object>} Ranked items
   */
  rankItems(items) {
    if (!items || items.length === 0) {
      return [];
    }
    
    // Define keywords that indicate high-priority geopolitical events by category
    const highPriorityKeywords = {
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
      
      // Resources and energy
      resources: ['resource', 'energy', 'oil', 'gas', 'pipeline', 'LNG', 'petroleum', 'minerals', 'rare earth', 
                'water rights', 'energy security', 'OPEC', 'production cut', 'strategic reserve'],
      
      // Strategic and intelligence
      strategic: ['strategic', 'intelligence', 'espionage', 'spy', 'surveillance', 'reconnaissance', 
                'classified', 'leak', 'whistleblower', 'national security'],
      
      // Nuclear and WMD
      nuclear: ['nuclear', 'missile', 'ballistic', 'ICBM', 'warhead', 'proliferation', 'arms control', 
              'disarmament', 'weapons of mass destruction', 'WMD', 'enrichment', 'uranium']
    };
    
    // Flatten all keywords into a single array
    const allKeywords = Object.values(highPriorityKeywords).flat();
    
    // Define highly reputable sources
    const reputableSources = [
      'reuters', 'bloomberg', 'ft', 'financial times', 'wsj', 'wall street journal', 'bbc', 'cnn', 
      'nyt', 'new york times', 'economist', 's&p global', 'ap', 'associated press', 'al jazeera', 
      'npr', 'guardian', 'washington post', 'foreign affairs', 'foreign policy', 'brookings', 
      'cfr', 'rand', 'chatham house', 'iiss', 'carnegie', 'peterson institute', 'world bank', 
      'imf', 'wto', 'oecd', 'bis', 'moody', 'fitch', 'goldman sachs', 'jpmorgan', 'morgan stanley'
    ];
    
    // Score each item based on various factors
    const scoredItems = items.map(item => {
      let score = 0;
      const title = (item.name || item.title || '').toLowerCase();
      const description = (item.description || '').toLowerCase();
      const source = (item.source || '').toLowerCase();
      const url = (item.url || '').toLowerCase();
      
      // 1. Score based on freshness (up to 30 points)
      const itemDate = item.lastUpdated ? new Date(item.lastUpdated) : new Date();
      const now = new Date();
      const daysDiff = Math.floor((now - itemDate) / (1000 * 60 * 60 * 24));
      
      if (daysDiff <= 1) { // Today or yesterday
        score += 30;
      } else if (daysDiff <= 2) { // 2 days ago
        score += 25;
      } else if (daysDiff <= 3) { // 3 days ago
        score += 20;
      } else if (daysDiff <= 5) { // Within 5 days
        score += 15;
      } else if (daysDiff <= 7) { // Within a week
        score += 10;
      }
      
      // 2. Score based on source reputation (up to 25 points)
      if (reputableSources.some(s => source.includes(s))) {
        score += 25;
      } else if (url.includes('.gov') || url.includes('.edu') || url.includes('.org')) {
        score += 15; // Trusted domains
      } else if (!url.includes('blog') && !url.includes('opinion')) {
        score += 5; // Not opinion/blog content
      }
      
      // 3. Score based on retrieval channel (up to 15 points)
      const channel = (item.retrievalChannel || '').toLowerCase();
      if (channel === 'rss') {
        score += 15; // RSS feeds are typically from established sources
      } else if (channel === 'insightsentry') {
        score += 10; // InsightSentry has already been filtered for relevance
      } else if (channel === 'zeihan') {
        score += 15; // Peter Zeihan content is highly relevant
      } else if (channel === 'gemini') {
        score += 5; // Gemini search results
      }
      
      // 4. Score based on high-priority keywords in title (up to 15 points)
      let keywordScore = 0;
      for (const keyword of allKeywords) {
        if (title.includes(keyword)) {
          keywordScore += 3;
          if (keywordScore >= 15) break;
        }
      }
      score += Math.min(keywordScore, 15);
      
      // 5. Score based on high-priority keywords in description (up to 10 points)
      keywordScore = 0;
      for (const keyword of allKeywords) {
        if (description.includes(keyword)) {
          keywordScore += 2;
          if (keywordScore >= 10) break;
        }
      }
      score += Math.min(keywordScore, 10);
      
      // 6. Score based on impact level if available (up to 10 points)
      if (item.impactLevel && !isNaN(parseFloat(item.impactLevel))) {
        const impact = parseFloat(item.impactLevel);
        score += Math.min(impact, 10);
      }
      
      return { ...item, score };
    });
    
    // Sort by score in descending order
    return scoredItems.sort((a, b) => b.score - a.score);
  }
  
  /**
   * Get the current geopolitical risks without running a sensor cycle
   * @returns {Promise<Object>} The current geopolitical risks data
   */
  async getCurrentRisks() {
    try {
      const risks = await this.storageService.loadCurrentRisks();
      return risks;
    } catch (error) {
      logger.error('Error getting current risks', { error });
      throw error;
    }
  }
  
  /**
   * Get the status of the sensor
   * @returns {Object} The sensor status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      lastRunTime: this.lastRunTime ? this.lastRunTime.toISOString() : null,
      nextScheduledRun: this.lastRunTime ? 
        new Date(this.lastRunTime.getTime() + config.runInterval).toISOString() : 
        new Date(Date.now() + config.runInterval).toISOString()
    };
  }
}

module.exports = SensorService;
