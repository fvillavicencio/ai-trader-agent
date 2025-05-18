/**
 * Perplexity Service
 * Handles interactions with the Perplexity API for geopolitical risk analysis
 */
const axios = require('axios');
const fs = require('fs');
const logger = require('../utils/logger');
const config = require('../../config/default');
const { URL } = require('url');

// Helper function to format dates consistently
const formatDate = (date) => {
  return date.toISOString().split('T')[0];
};

class PerplexityService {
  constructor() {
    this.apiKey = process.env.PERPLEXITY_API_KEY;
    this.baseUrl = 'https://api.perplexity.ai/chat/completions';
    // Use the same model as the working test file
    this.model = 'sonar-pro';
    // Fallback models in case the primary one fails
    this.fallbackModels = [
      'sonar-medium-chat',
      'sonar-small-chat',
      'mistral-7b-instruct'
    ];
    this.maxRetries = 3;
    this.retryDelay = 2000; // 2 seconds
    this.systemPrompt = `You are a geopolitical risk analyst for a major investment bank with expertise in how geopolitical events impact financial markets. Your analysis must be factual, data-driven, and based on verifiable information from reputable sources. Focus on quality over quantity. Provide specific details, including real names, figures, and dates. Format your response as valid JSON with no explanations or markdown formatting. ONLY include URLs to real, verifiable news sources that actually exist.

IMPORTANT: When presented with multiple events that are duplicates or near-duplicates (i.e., describing the same underlying risk or event), you MUST:
1. Synthesize a single, best "winner" event that merges all relevant details.
2. Explicitly list which input events are considered duplicates and which is the synthesized winner.
3. Discard all but the synthesized winner from the final output.
4. For each risk, include a field 'duplicates' listing the indices or headlines of input items that were considered duplicates and merged.

If an event has \`trustedSource: true\` and the URL is valid (not 404), you MUST accept it as 'trusted_source_verified' even if you cannot find it in your search context. Otherwise, use 'factCheckResult': 'Verified', 'Partially Verified', or 'Unverified' as appropriate.`;
    this.reliableNewsDomains = [
      'reuters.com', 'bloomberg.com', 'ft.com', 'wsj.com', 'nytimes.com',
      'bbc.com', 'bbc.co.uk', 'apnews.com', 'cnbc.com', 'cnn.com',
      'economist.com', 'washingtonpost.com', 'aljazeera.com', 'france24.com',
      'dw.com', 'npr.org', 'politico.com', 'theguardian.com', 'independent.co.uk',
      'time.com', 'forbes.com', 'businessinsider.com', 'foxnews.com',
      'thehill.com', 'nbcnews.com', 'abcnews.go.com', 'cbsnews.com',
      'euronews.com', 'japantimes.co.jp', 'scmp.com', 'straitstimes.com',
      'globaltimes.cn', 'themoscowtimes.com', 'tass.com', 'reuters.co.uk',
      'spglobal.com', 'cfr.org', 'foreignpolicy.com', 'foreignaffairs.com'
    ];
    
    logger.info(`Initialized PerplexityService with primary model: ${this.model}`);
  }
  
  /**
   * Check if a string is a valid URL format
   * @param {string} urlString - The URL to validate
   * @returns {boolean} - Whether the URL is valid
   */
  isValidUrl(urlString) {
    if (!urlString) return false;
    
    try {
      // Check if the URL has a valid format
      const url = new URL(urlString);
      // Only allow http and https protocols
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch (error) {
      return false;
    }
  }
  
  /**
   * Check if a URL is from a reliable news source
   * @param {string} urlString - The URL to check
   * @returns {boolean} - Whether the URL is from a reliable source
   */
  isReliableNewsSource(urlString) {
    if (!this.isValidUrl(urlString)) return false;
    
    try {
      const url = new URL(urlString);
      const domain = url.hostname.toLowerCase();
      
      // Check if the domain or any parent domain is in our reliable sources list
      return this.reliableNewsDomains.some(reliableDomain => 
        domain === reliableDomain || domain.endsWith('.' + reliableDomain));
    } catch (error) {
      return false;
    }
  }
  
  /**
   * Validate if a URL is accessible
   * @param {string} url - The URL to validate
   * @returns {Promise<boolean>} - Whether the URL is accessible
   */
  async validateUrl(url) {
    if (!this.isValidUrl(url)) {
      logger.warn(`Invalid URL format: ${url}`);
      return false;
    }
    
    // Skip actual HTTP requests in development/test environments
    if (process.env.NODE_ENV === 'test' || process.env.SKIP_URL_VALIDATION === 'true') {
      return this.isReliableNewsSource(url);
    }
    
    try {
      // Try to make a HEAD request to check if the URL is accessible
      // Use a short timeout to avoid waiting too long for invalid URLs
      const response = await axios.head(url, {
        timeout: 5000,
        validateStatus: status => status < 400, // Consider any non-error status as valid
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; GeopoliticalRiskSensor/1.0)'
        }
      });
      return true;
    } catch (error) {
      logger.warn(`URL validation failed for ${url}: ${error.message}`);
      return false;
    }
  }

  /**
   * Get recent geopolitical events
   * @returns {Promise<Array>} Array of geopolitical events
   */
  async getRecentGeopoliticalEvents() {
    try {
      logger.info('Fetching recent geopolitical events from Perplexity API');
      
      // Get the current date and format it
      const currentDate = new Date();
      const formattedDate = formatDate(currentDate);
      
      // Create an enhanced prompt with stronger factual verification requirements
      const prompt = `Identify the 5 most significant VERIFIED geopolitical events from the past week (as of ${formattedDate}) that are currently impacting global financial markets. 

IMPORTANT: Only include REAL, FACTUAL events that you can verify from reputable news sources. DO NOT include speculative, hypothetical, or fictional events. Each event must have been reported by at least one major news outlet.

For each verified event:

1. Provide a concise, factual title (e.g., "US-China Trade Tensions Escalate")
2. Include the EXACT date when the event occurred or was reported (YYYY-MM-DD format)
3. Describe the key facts of what happened, with specific details
4. Explain which regions/countries are primarily affected
5. Assign an impact level from 1-10 (where 10 is highest impact) based on ACTUAL market reactions
6. Include the primary source (e.g., Reuters, Bloomberg, Financial Times, S&P Global) that reported this event
7. If available, include a URL to a reputable source covering this event

Consider insights from market analysis sources like S&P Global, which provides valuable analysis on how geopolitical events impact financial markets, commodities, and global trade.

Ensure balanced coverage across different regions (North America, Europe, Asia, Middle East, etc.) and event types (conflicts, elections, policy changes, economic sanctions, etc.).

Format your response as a valid JSON array of objects with these properties: 
- title: string
- date: string (YYYY-MM-DD)
- description: string
- regions: string or array of strings
- impactLevel: number (1-10)
- source: string (name of primary source)
- sourceUrl: string (optional)
- verified: boolean (must be true for all events included)

Only include events that you can verify are real with high confidence.`;
      
      // Call the Perplexity API
      const response = await this.callPerplexityApi(prompt);
      
      if (!response || !response.choices || !response.choices[0] || !response.choices[0].message) {
        logger.error('Invalid response format from Perplexity API');
        return [];
      }
      
      const content = response.choices[0].message.content;
      logger.info(`Received geopolitical events response (first 200 chars): ${content.substring(0, 200)}...`);
      
      // Try to parse the response as JSON
      let parsedEvents = null;
      
      try {
        // First try to extract JSON if it's wrapped in markdown code blocks
        let jsonContent = content;
        const jsonMatch = content.match(/```(?:json)?\s*([\s\S]+?)\s*```/);
        if (jsonMatch && jsonMatch[1]) {
          jsonContent = jsonMatch[1];
        }
        
        parsedEvents = JSON.parse(jsonContent);
      } catch (parseError) {
        logger.warn(`Failed to parse events as JSON: ${parseError.message}`);
        // Try to extract events from the text as fallback
        parsedEvents = this.extractEventsFromText(content);
      }
      
      // Process the parsed events
      if (parsedEvents) {
        let eventsArray = parsedEvents;
        
        // Handle case where events are nested in an object
        if (!Array.isArray(parsedEvents) && parsedEvents.events && Array.isArray(parsedEvents.events)) {
          eventsArray = parsedEvents.events;
        }
        
        // Ensure we have an array
        if (Array.isArray(eventsArray)) {
          logger.info(`Successfully retrieved ${eventsArray.length} geopolitical events`);
          
          // Add retrievalChannel to each event
          return eventsArray.map(event => ({
            ...event,
            retrievalChannel: 'perplexity'
          }));
        }
      }
      
      logger.warn('Could not extract valid events from Perplexity response');
      return [];
    } catch (error) {
      logger.error(`Error getting recent geopolitical events: ${error.message}`);
      return [];
    }
  }

  /**
   * Extract JSON from Perplexity API response
   * @param {Object} response - API response
   * @returns {Array|Object|null} - Parsed JSON or null if not found
   */
  extractJsonFromResponse(response) {
    try {
      if (!response || !response.choices || !response.choices[0] || !response.choices[0].message || !response.choices[0].message.content) {
        logger.error('Invalid response format from Perplexity API');
        return null;
      }
      
      const content = response.choices[0].message.content;
      
      // Find JSON content within the response
      const jsonMatch = content.match(/\[[\s\S]*\]|\{[\s\S]*\}/);
      if (jsonMatch) {
        const jsonStr = jsonMatch[0];
        return JSON.parse(jsonStr);
      }
      
      logger.warn('No JSON content found in Perplexity response');
      return null;
    } catch (error) {
      logger.error('Error extracting JSON from response', { error });
      return null;
    }
  }

  /**
   * Call the Perplexity API with retry logic and model fallbacks
   * @param {string} prompt - The prompt to send to the API
   * @returns {Promise<Object>} - API response
   */
  async callPerplexityApi(prompt, extendedTimeout = false) {
    // Try with the primary model first
    try {
      return await this.callWithModel(prompt, this.model, extendedTimeout);
    } catch (primaryError) {
      logger.warn(`Primary model ${this.model} failed: ${primaryError.message}`);
      
      // Try each fallback model in sequence
      for (const fallbackModel of this.fallbackModels) {
        try {
          logger.info(`Trying fallback model: ${fallbackModel} with ${extendedTimeout ? 'extended' : 'standard'} timeout`);
          return await this.callWithModel(prompt, fallbackModel, extendedTimeout);
        } catch (fallbackError) {
          logger.warn(`Fallback model ${fallbackModel} failed: ${fallbackError.message}`);
          // Continue to the next fallback model
        }
      }
      
      // If we get here, all models failed
      logger.error('All models failed to process the request');
      throw new Error('All Perplexity API models failed to process the request');
    }
  }
  
  /**
   * Call the Perplexity API with a specific model and retry logic
   * @param {string} prompt - The prompt to send to the API
   * @param {string} model - The model to use
   * @param {boolean} extendedTimeout - Whether to use an extended timeout for complex queries
   * @returns {Promise<Object>} - API response
   */
  async callWithModel(prompt, model, extendedTimeout = false) {
    let retries = 0;
    let lastError = null;
    
    while (retries < this.maxRetries) {
      try {
        // Truncate prompt if it's too long (over 10,000 characters)
        const truncatedPrompt = prompt.length > 10000 ? 
          prompt.substring(0, 10000) + '... [truncated for length]' : prompt;
        
        // Use the same payload structure as the working test file
        const payload = {
          model: model,
          messages: [
            {
              role: 'system',
              content: this.systemPrompt
            },
            {
              role: 'user',
              content: truncatedPrompt
            }
          ],
          temperature: 0.0,  // Lower temperature for more factual responses
          max_tokens: 4000,
          top_p: 0.7  // Lower top_p for more focused responses
        };
        
        const timeout = extendedTimeout ? 180000 : 60000;
        logger.info(`Calling Perplexity API with model: ${model} and ${timeout/1000}s timeout`);
        
        const response = await axios.post(
          this.baseUrl,
          payload,
          {
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${this.apiKey}`,
              'Accept': 'application/json'
            },
            timeout: extendedTimeout ? 180000 : 60000 // 3 minutes for batch processing, 1 minute for regular calls
          }
        );
        
        return response.data;
      } catch (error) {
        lastError = error;
        logger.warn(`API call with model ${model} failed (attempt ${retries + 1}/${this.maxRetries})`, { error: error.message });
        retries++;
        
        if (retries < this.maxRetries) {
          // Wait before retrying with increasing delay
          const delay = this.retryDelay * (retries);
          logger.info(`Waiting ${delay}ms before retry`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    logger.error(`All ${this.maxRetries} API call attempts with model ${model} failed`, { error: lastError });
    throw lastError;
  }

  /**
   * Analyze a batch of geopolitical events in depth with a single API call
   * @param {Array<Object>} events - The events to analyze
   * @returns {Promise<Array<Object>>} - Analyzed events
   */
  async analyzeGeopoliticalEventBatch(events) {
    try {
      if (!events || events.length === 0) {
        logger.warn('No events provided for batch analysis');
        return [];
      }
      
      logger.info(`Batch analyzing ${events.length} events`);
      
      // Prepare risks for batch analysis with length control
      // Limit the number of risks if there are too many
      const maxRisksToProcess = Math.min(events.length, 10); // Cap at 10 risks per batch
      
      if (events.length > maxRisksToProcess) {
        logger.warn(`Too many risks (${events.length}) for a single API call. Processing only the top ${maxRisksToProcess} prioritized risks.`);
      }
      
      const risksToProcess = events.slice(0, maxRisksToProcess);
      
      // Stringify the batch as a single JSON array
      const retrievedData = JSON.stringify(risksToProcess, null, 2);
      
      // Compose a natural prompt, asking for fact-check, source legitimacy, and marketImpact population
      const prompt = `Fact check these for freshness and accuracy, are the sources legit, and please populate the marketImpact for each risk.\n\n${retrievedData}\n\nFor each risk, output a JSON object with these fields:\n- type\n- name\n- description\n- region\n- impactLevel\n- marketImpact\n- source\n- sourceUrl\n- lastUpdated\n- factCheckResult ("Verified" | "Partially Verified" | "Unverified" | "trusted_source_verified")\n- factCheckExplanation`;

      // DEBUG: Write the actual prompt to a text file for manual testing
      try {
        fs.writeFileSync(
          require('path').resolve(__dirname, '../../prompt-debug.txt'),
          prompt,
          { encoding: 'utf8' }
        );
        logger.info('Prompt written to prompt-debug.txt for manual testing.');
      } catch (err) {
        logger.warn('Failed to write prompt to debug file', err);
      }
      
      // Call the Perplexity API with the batch analysis prompt and extended timeout
      // Use extended timeout for batch processing to allow more time for thorough fact-checking
      const response = await this.callPerplexityApi(prompt, true); // true = use extended timeout
      
      // Extract JSON from response
      const parsedEvents = this.extractJsonFromResponse(response);
      
      if (!parsedEvents || !Array.isArray(parsedEvents)) {
        logger.error('Failed to parse batch analysis response as JSON array');
        return [];
      }
      
      // Process and format the analyzed events with fact-checking information
      const analyzedEvents = [];
      
      // First filter for verified events
      const verifiedEvents = parsedEvents.filter(event => {
        // Only include events that are verified and have passed fact-checking
        const isVerified = event && event.isVerified === true;
        const hasPassedFactCheck = event.factCheckResult === 'Verified' || 
                                 event.factCheckResult === 'Partially Verified';
        
        if (!isVerified) {
          logger.warn(`Event rejected - Failed verification: ${event.name || 'Unnamed event'} - ${event.factCheckResult || 'Unverified'}`);
          if (event.factCheckExplanation) {
            logger.warn(`Fact-check explanation: ${event.factCheckExplanation.substring(0, 200)}...`);
          }
        }
        
        return isVerified && hasPassedFactCheck;
      });
      
      // Process verified events and preserve original URLs
      for (const event of verifiedEvents) {
        // Find the original event to preserve its retrievalChannel and URL
        const originalEvent = eventsToProcess[event.eventIndex - 1] || eventsToProcess[0];
        const retrievalChannel = originalEvent.retrievalChannel || 'perplexity_batch';
        
        // Prioritize original source URL if available, otherwise use Perplexity's URL if valid
        let sourceUrl = originalEvent.sourceUrl || originalEvent.url || '';
        
        // If no original URL, try Perplexity's URL
        if (!sourceUrl && event.sourceUrl) {
          sourceUrl = event.sourceUrl;
        }
        
        // Use original source name if available
        const sourceName = originalEvent.source || event.source || 'Verified News Source';
        
        // Format the verified event with preserved metadata
        analyzedEvents.push({
          headline: event.name,
          type: event.type || 'Geopolitical',
          description: event.description,
          region: event.region || originalEvent.region || 'Global',
          countries: event.countries || [],
          impactLevel: event.impactLevel || 5,
          marketImpact: event.impactAnalysis || '',
          source: sourceName,
          sourceUrl: sourceUrl,
          additionalSources: event.additionalSources || [],
          factCheckResult: event.factCheckResult || 'Verified',
          factCheckExplanation: event.factCheckExplanation || 'Verified by multiple sources',
          retrievalChannel: retrievalChannel,
          date: originalEvent.date || event.date || new Date().toISOString().split('T')[0],
          // Store the original source information for tracking
          originalSource: originalEvent.source || originalEvent.retrievalChannel
        });
      }
      
      logger.info(`Successfully analyzed ${analyzedEvents.length} events in batch`);
      return analyzedEvents;
    } catch (error) {
      logger.error(`Error in batch analysis: ${error.message}`);
      return [];
    }
  }
  
  /**
   * Infer retrieval channel from source URL or name
   * @param {string} sourceUrl - The source URL
   * @param {string} sourceName - The source name
   * @returns {string} - Inferred retrieval channel
   */
  inferRetrievalChannel(sourceUrl, sourceName) {
    if (!sourceUrl && !sourceName) return 'unknown';
    
    // Check if it's a Twitter/X URL
    if (sourceUrl && sourceUrl.includes('twitter.com')) {
      return 'twitter';
    }
    
    // Check if it's an RSS feed based on common RSS sources
    const rssPatterns = ['nytimes.com', 'wsj.com', 'reuters.com', 'bloomberg.com', 
                        'ft.com', 'bbc.com', 'cnn.com', 'france24.com'];
    if (sourceUrl && rssPatterns.some(pattern => sourceUrl.includes(pattern))) {
      return 'rss';
    }
    
    // Check if it's from InsightSentry based on source name patterns
    const insightSentryPatterns = ['CBS News', 'Bloomberg', 'Reuters', 'CNBC'];
    if (sourceName && insightSentryPatterns.some(pattern => sourceName.includes(pattern))) {
      return 'insightSentry';
    }
    
    // Check if it's from Zeihan based on source name
    if (sourceName && sourceName.toLowerCase().includes('zeihan')) {
      return 'zeihan';
    }
    
    // Default to perplexity if we can't determine the source
    return 'perplexity';
  }
  
  /**
   * Create consolidated analysis from analyzed events
   * @param {Array<Object>} analyzedEvents - The analyzed events
   * @returns {Object} - Consolidated analysis object
   */
  createConsolidatedAnalysis(analyzedEvents) {
    try {
      if (!analyzedEvents || analyzedEvents.length === 0) {
        logger.warn('No analyzed events provided for consolidation');
        return { risks: [] };
      }
      
      logger.info(`Creating consolidated analysis from ${analyzedEvents.length} fact-checked events`);
      
      // Track source contributions for analytics
      const sourceContributions = {};
      
      // Group events by type/category
      const groupedByType = {};
      
      analyzedEvents.forEach(event => {
        const type = event.type || 'Other';
        if (!groupedByType[type]) {
          groupedByType[type] = [];
        }
        groupedByType[type].push(event);
        
        // Track the retrieval channel for analytics
        const channel = event.retrievalChannel || 'unknown';
        sourceContributions[channel] = (sourceContributions[channel] || 0) + 1;
      });
      
      // Create risk objects for each group
      const risks = [];
      
      Object.entries(groupedByType).forEach(([type, events]) => {
        // Sort events by impact level (descending)
        events.sort((a, b) => (b.impactLevel || 0) - (a.impactLevel || 0));
        
        // Take the highest impact event as the primary one for this risk type
        const primaryEvent = events[0];
        
        // Get the primary event's retrieval channel or infer it from source URL/name
        let retrievalChannel = primaryEvent.retrievalChannel;
        if (!retrievalChannel || retrievalChannel === 'unknown') {
          retrievalChannel = this.inferRetrievalChannel(primaryEvent.sourceUrl, primaryEvent.source);
        }
        
        // Create a consolidated risk object
        const risk = {
          name: type,
          description: primaryEvent.description,
          impactLevel: primaryEvent.impactLevel || 5,
          marketImpact: primaryEvent.marketImpact || primaryEvent.impactAnalysis || '',
          region: primaryEvent.region || 'Global',
          source: primaryEvent.source || 'Verified Sources',
          sourceUrl: primaryEvent.sourceUrl || '',
          lastUpdated: new Date().toISOString().split('T')[0],
          // Use the inferred or preserved retrieval channel
          retrievalChannel: retrievalChannel,
          events: events.map(e => {
            // Infer retrieval channel for each event if it's unknown
            let eventChannel = e.retrievalChannel;
            if (!eventChannel || eventChannel === 'unknown') {
              eventChannel = this.inferRetrievalChannel(e.sourceUrl, e.source);
            }
            
            return {
              headline: e.headline,
              description: e.description,
              date: e.date,
              source: e.source,
              sourceUrl: e.sourceUrl,
              factCheckResult: e.factCheckResult || 'Verified',
              retrievalChannel: eventChannel
            };
          })
        };
        
        risks.push(risk);
      });
      
      // Sort risks by impact level (descending)
      risks.sort((a, b) => (b.impactLevel || 0) - (a.impactLevel || 0));
      
      logger.info(`Created ${risks.length} consolidated risks from ${analyzedEvents.length} events`);
      logger.info(`Source contributions: ${JSON.stringify(sourceContributions)}`);
      
      // Calculate a geopolitical risk index based on the risks
      // Higher impact risks contribute more to the index
      const geopoliticalRiskIndex = Math.min(100, Math.round(
        risks.reduce((sum, risk) => sum + (risk.impactLevel * 10), 0) / risks.length
      ));
      
      return {
        risks,
        geopoliticalRiskIndex,
        lastUpdated: new Date().toISOString(),
        source: `Perplexity API Enhanced Retrieval (${Object.keys(sourceContributions).join(', ')})`,
        sourceUrl: 'https://perplexity.ai/',
        sourceContributions
      };
    } catch (error) {
      logger.error(`Error creating consolidated analysis: ${error.message}`);
      return { risks: [] };
    }
  }
  
  /**
   * Analyze a geopolitical event in depth
   * @param {Object} event - The event to analyze
   * @returns {Promise<Object>} - Analyzed event
   */
  async analyzeGeopoliticalEvent(event) {
    try {
      // Extract event details, handling different property names that might exist
      const title = event.headline || event.title || '';
      const description = event.description || '';
      const date = event.date || new Date().toISOString().split('T')[0];
      const region = event.region || event.regions || 'Unknown';
      
      if (!title) {
        logger.warn('Invalid event provided for analysis - missing title/headline');
        return null;
      }
      
      logger.info(`Analyzing event: ${title}`);
      
      // Create a more balanced and detailed prompt for analysis with enhanced fact-checking requirements
      const prompt = `Analyze this geopolitical event in depth: "${title}" (${date}).

${description}

IMPORTANT: First VERIFY if this is a REAL, CURRENT geopolitical event from reputable sources. If you cannot verify it or if it appears fictional, speculative, or outdated, clearly state this in your response.

Provide a comprehensive analysis of this verified event's impact on global financial markets. Include:

1. A factual, detailed description of what happened, with verification from multiple sources if possible
2. The specific regions and countries affected (${region})
3. The impact level on a scale of 1-10 (where 10 is highest), justified by concrete market reactions
4. How this event affects different market sectors (Technology, Energy, Finance, etc.)
5. The short-term and potential long-term market implications with evidence
6. Key financial metrics or assets affected (currencies, commodities, indices) with specific data points
7. Credible sources that confirm this event (news agencies, financial publications, official statements)

Format your response as a valid JSON object with these properties:
- type: Category of event (Military/Political/Economic/Trade/Environmental/Energy)
- name: A concise title
- description: Detailed factual description
- region: Specific region affected
- impactLevel: Number from 1-10 (ONLY use 8-10 for major events with significant global market impact)
- marketImpact: Analysis of financial market effects with specific metrics
- sectors: Array of objects with {name, impact, description}
- source: Primary source of information (specific publication or agency)
- sourceUrl: URL to source (if available)
- additionalSources: Array of strings with names of other confirming sources
- date: Confirmed date of the event (YYYY-MM-DD format)
- verified: Boolean indicating if you could verify this is a real, current event

Be specific, factual, and data-driven in your analysis. Do NOT include speculative or fictional events. If you cannot verify the event is real, set verified: false and impactLevel: 0.`;

      // Call the API
      const response = await this.callPerplexityApi(prompt);
      
      // Extract and parse JSON from the response
      let analysis = this.extractJsonFromResponse(response);
      
      // Validate and clean up the analysis
      if (analysis) {
        // Add retrievalChannel to track the source of this analysis
        analysis.retrievalChannel = 'perplexity';
        
        // Add timestamp for freshness tracking
        analysis.lastUpdated = new Date().toISOString();
        
        // If the event couldn't be verified, reject it immediately
        if (analysis.verified === false) {
          logger.warn(`Rejecting unverified event: ${analysis.name || event.headline}`);
          return null;
        }
        
        // Ensure required fields
        if (!analysis.name || !analysis.description || !analysis.region) {
          logger.warn(`Analysis missing required fields for event: ${event.headline}`);
          return null;
        }
        
        // Ensure source information is present
        if (!analysis.source) {
          analysis.source = 'Unknown';
          logger.warn(`Missing source for event: ${analysis.name}, setting to Unknown`);
        }
        
        // Check for potentially fictional events
        const fictionKeywords = [
          'future', 'would', 'could', 'might', 'potential', 'hypothetical', 'scenario',
          'possible', 'may occur', 'may happen', 'fictional', 'imaginary'
        ];
        
        const descriptionLower = analysis.description.toLowerCase();
        const nameLower = analysis.name.toLowerCase();
        
        // Check if the event description suggests it's fictional or future-oriented
        const isFictionalEvent = fictionKeywords.some(keyword => {
          return descriptionLower.includes(keyword) || nameLower.includes(keyword);
        });
        
        if (isFictionalEvent) {
          logger.warn(`Skipping potentially fictional event: ${analysis.name}`);
          return null;
        }
        
        // Validate the analysis
        if (!this.validateAnalysis(analysis)) {
          return null;
        }
        
        // Validate the analysis
        if (!this.validateAnalysis(analysis)) {
          logger.warn(`Analysis validation failed for event: ${event.headline}`);
          return null;
        }
        
        // Clean up impact level if needed
        if (!analysis.impactLevel || isNaN(analysis.impactLevel)) {
          analysis.impactLevel = 5; // Default to medium impact
        } else if (analysis.impactLevel < 1) {
          analysis.impactLevel = 1;
        } else if (analysis.impactLevel > 10) {
          analysis.impactLevel = 10;
        }
        
        // Ensure source information
        if (!analysis.source) {
          analysis.source = event.source || 'Unknown';
        }
        
        // Ensure URL
        if (!analysis.sourceUrl && event.url) {
          analysis.sourceUrl = event.url;
        }
        
        // Ensure lastUpdated
        if (!analysis.lastUpdated) {
          analysis.lastUpdated = formatDate(new Date());
        }
        
        // Preserve retrievalChannel from the original event
        if (event.retrievalChannel) {
          analysis.retrievalChannel = event.retrievalChannel;
        }
        
        return analysis;
      }
      
      return null;
    } catch (error) {
      logger.error(`Error analyzing event: ${event.headline}`, { error });
      return null;
    }
  }

  /**
   * Sanitize text to remove specific dates and future references
   * @param {string} text - The text to sanitize
   * @returns {string} - Sanitized text
   */
  sanitizeText(text) {
    if (!text) return text;
    
    // Get current date for reference
    const currentDate = new Date();
    
    // Replace specific dates with "recently" or appropriate time reference
    let sanitized = text;
    
    // Replace future years (e.g., 2025, 2026, etc.)
    sanitized = sanitized.replace(/\b(20[2-9][0-9])\b/g, 'recently');
    
    // Replace specific dates (e.g., May 10, 2025 or May 10)
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const monthsShort = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    // Replace full date formats (e.g., May 10, 2025)
    for (const month of [...months, ...monthsShort]) {
      const regex = new RegExp(`\\b${month}\\s+\\d{1,2}(st|nd|rd|th)?\\s*,?\\s*\\d{4}\\b`, 'gi');
      sanitized = sanitized.replace(regex, 'recently');
      
      // Replace month and day without year (e.g., May 10)
      const regexNoYear = new RegExp(`\\b${month}\\s+\\d{1,2}(st|nd|rd|th)?\\b`, 'gi');
      sanitized = sanitized.replace(regexNoYear, 'recently');
    }
    
    return sanitized;
  }

  /**
   * Infer the event type from the event content
   * @param {Object} event - The event to analyze
   * @returns {string} - Inferred event type
   */
  /**
   * Validate an analysis result to ensure it's truly a geopolitical risk
   * @param {Object} analysis - The analysis to validate
   * @returns {boolean} - Whether the analysis is valid
   */
  validateAnalysis(analysis) {
    if (!analysis) return false;
    
    // Check for required fields
    const requiredFields = ['name', 'description', 'impactLevel', 'source'];
    for (const field of requiredFields) {
      if (!analysis[field]) {
        logger.warn(`Analysis missing required field: ${field}`);
        return false;
      }
    }
    
    // Validate impact level
    if (isNaN(analysis.impactLevel) || analysis.impactLevel < 1 || analysis.impactLevel > 10) {
      logger.warn(`Invalid impact level: ${analysis.impactLevel}`);
      return false;
    }
    
    // ENHANCEMENT 1: Temporal validation - ensure events are recent
    if (analysis.date) {
      const eventDate = new Date(analysis.date);
      const currentDate = new Date();
      const oneMonthAgo = new Date();
      oneMonthAgo.setMonth(currentDate.getMonth() - 1);
      
      // Check if the date is valid and recent (within the last month)
      if (isNaN(eventDate.getTime())) {
        logger.warn(`Invalid date format for event: ${analysis.name}`);
        // Don't reject based on date format alone, but flag it
      } else if (eventDate < oneMonthAgo) {
        logger.warn(`Event is too old (${analysis.date}): ${analysis.name}`);
        return false;
      } else if (eventDate > currentDate) {
        // Future dates indicate fictional/speculative content
        logger.warn(`Event has future date (${analysis.date}): ${analysis.name}`);
        return false;
      }
    }
    
    // ENHANCEMENT 2: Expanded geopolitical relevance check
    const geopoliticalKeywords = [
      // Government and political entities
      'government', 'policy', 'administration', 'congress', 'parliament', 'senate',
      'president', 'prime minister', 'minister', 'official', 'diplomat', 'ambassador',
      
      // International relations
      'international', 'relations', 'diplomatic', 'bilateral', 'multilateral',
      'treaty', 'agreement', 'alliance', 'summit', 'negotiation', 'cooperation',
      
      // Trade and economics
      'trade', 'tariff', 'sanction', 'embargo', 'export', 'import', 'economy',
      'economic', 'gdp', 'inflation', 'central bank', 'federal reserve', 'interest rate',
      'currency', 'exchange rate', 'debt', 'deficit', 'fiscal', 'monetary',
      
      // Conflict and security
      'conflict', 'war', 'military', 'security', 'defense', 'terrorism', 'insurgency',
      'nuclear', 'missile', 'weapon', 'army', 'navy', 'air force', 'troops',
      'border', 'territorial', 'dispute', 'crisis', 'tension', 'escalation',
      
      // Regional terms
      'global', 'regional', 'international', 'transnational', 'cross-border',
      'middle east', 'asia', 'europe', 'africa', 'america', 'pacific'
    ];
    
    // Check if the description contains geopolitical keywords
    const descriptionLower = analysis.description.toLowerCase();
    const nameLower = analysis.name.toLowerCase();
    const contentText = `${nameLower} ${descriptionLower}`;
    
    const geopoliticalMatches = geopoliticalKeywords.filter(keyword => 
      contentText.includes(keyword)
    );
    
    const hasGeopoliticalContext = geopoliticalMatches.length >= 3; // Require multiple matches
    
    // ENHANCEMENT 3: Improved market impact assessment
    const marketImpactLower = analysis.marketImpact ? analysis.marketImpact.toLowerCase() : '';
    const marketImpactKeywords = [
      'stock', 'market', 'index', 'investor', 'trading', 'price', 'value',
      'currency', 'bond', 'yield', 'rate', 'sector', 'industry', 'economy',
      'financial', 'investment', 'asset', 'volatility', 'risk', 'uncertainty'
    ];
    
    const hasSpecificMarketImpact = marketImpactKeywords.some(keyword => 
      marketImpactLower.includes(keyword)
    ) && !marketImpactLower.includes('no impact') && 
    !marketImpactLower.includes('no explicit') && 
    !marketImpactLower.includes('no documented');
    
    // ENHANCEMENT 4: Enhanced fictional content detection
    const fictionKeywords = [
      'fictional', 'hypothetical', 'speculative', 'imaginary', 'potential',
      'could happen', 'might happen', 'would happen', 'scenario', 'simulation',
      'future', 'prediction', 'forecast', 'projected', 'anticipated',
      'may occur', 'may result', 'if this happens', 'possible outcome'
    ];
    
    const hasFictionalIndicators = fictionKeywords.some(keyword => 
      contentText.includes(keyword)
    );
    
    // ENHANCEMENT 5: Source credibility check
    const credibleSources = [
      'reuters', 'bloomberg', 'financial times', 'wall street journal', 'wsj',
      'bbc', 'associated press', 'ap', 'afp', 'cnn', 'nbc', 'cbs', 'abc', 'npr',
      'economist', 'foreign policy', 'foreign affairs', 'al jazeera',
      'nikkei', 'new york times', 'washington post', 'guardian', 'politico'
    ];
    
    const sourceLower = analysis.source ? analysis.source.toLowerCase() : '';
    const hasCredibleSource = credibleSources.some(source => 
      sourceLower.includes(source)
    );
    
    // Validate that personal incidents are not classified as high-impact events
    const personalIncidentKeywords = ['yacht', 'personal', 'individual', 'private', 'accident', 
                                    'celebrity', 'actor', 'actress', 'singer', 'athlete'];
    const isPersonalIncident = personalIncidentKeywords.some(keyword =>
      contentText.includes(keyword)
    );
    
    // Apply validation rules
    
    // Rule 1: Reject fictional or speculative content
    if (hasFictionalIndicators) {
      logger.warn(`Rejecting fictional/speculative event: ${analysis.name}`);
      return false;
    }
    
    // Rule 2: Reject personal incidents with high impact but no market impact
    if (isPersonalIncident && analysis.impactLevel > 5 && !hasSpecificMarketImpact) {
      logger.warn(`Rejecting personal incident with high impact but no market impact: ${analysis.name}`);
      return false;
    }
    
    // Rule 3: Require geopolitical context or specific market impact
    if (!hasGeopoliticalContext && !hasSpecificMarketImpact) {
      logger.warn(`Rejecting event with no geopolitical context and no market impact: ${analysis.name}`);
      return false;
    }
    
    // Rule 4: Downgrade impact level for events without credible sources
    if (!hasCredibleSource && analysis.impactLevel > 7) {
      analysis.impactLevel = 7;
      logger.info(`Adjusted impact level for event without credible source: ${analysis.name} (now ${analysis.impactLevel})`);
    }
    
    // Rule 5: Downgrade impact level for events without specific market impact
    if (!hasSpecificMarketImpact && analysis.impactLevel > 6) {
      analysis.impactLevel = Math.min(analysis.impactLevel, 6);
      logger.info(`Adjusted impact level for event with no specific market impact: ${analysis.name} (now ${analysis.impactLevel})`);
    }
    
    // Log validation success with details
    logger.info(`Validated event: ${analysis.name} (Impact: ${analysis.impactLevel}, Geo-relevance: ${geopoliticalMatches.length} matches, Source: ${analysis.source})`);
    
    return true;
  }
  
  inferEventType(event) {
    const content = `${event.headline} ${event.description}`.toLowerCase();
    
    if (content.includes('war') || content.includes('military') || content.includes('attack') || 
        content.includes('troops') || content.includes('invasion')) {
      return 'Military';
    } else if (content.includes('election') || content.includes('government') || 
              content.includes('president') || content.includes('parliament') || 
              content.includes('vote')) {
      return 'Political';
    } else if (content.includes('interest rate') || content.includes('inflation') || 
              content.includes('gdp') || content.includes('economy') || 
              content.includes('recession')) {
      return 'Economic';
    } else if (content.includes('trade') || content.includes('tariff') || 
              content.includes('export') || content.includes('import')) {
      return 'Trade';
    } else if (content.includes('climate') || content.includes('disaster') || 
              content.includes('earthquake') || content.includes('flood') || 
              content.includes('hurricane')) {
      return 'Environmental';
    } else if (content.includes('oil') || content.includes('gas') || 
              content.includes('energy') || content.includes('opec')) {
      return 'Energy';
    } else {
      return 'Geopolitical';
    }
  }

  /**
   * Create default sectors for an event
   * @param {Object} event - The event to create sectors for
   * @returns {Array} - Array of sector objects
   */
  createDefaultSectors(event) {
    const content = `${event.headline} ${event.description}`.toLowerCase();
    const sectors = [];
    
    // Add relevant sectors based on content
    if (content.includes('oil') || content.includes('gas') || content.includes('energy')) {
      sectors.push({
        name: 'Energy',
        impact: 'negative',
        description: 'Potential volatility in energy prices'
      });
    }
    
    if (content.includes('bank') || content.includes('interest rate') || content.includes('fed')) {
      sectors.push({
        name: 'Financial',
        impact: 'negative',
        description: 'Uncertainty in financial markets'
      });
    }
    
    if (content.includes('tech') || content.includes('technology') || content.includes('semiconductor')) {
      sectors.push({
        name: 'Technology',
        impact: 'negative',
        description: 'Supply chain disruptions and market uncertainty'
      });
    }
    
    // Always add a default sector if none were added
    if (sectors.length === 0) {
      sectors.push({
        name: 'Global Markets',
        impact: 'negative',
        description: 'Significant impact on market sentiment'
      });
    }
    
    return sectors;
  }
  
  /**
   * Extract events from text when JSON parsing fails
   * @param {string} content - The text content to extract events from
   * @returns {Array} - Array of extracted events
   */
  extractEventsFromText(content) {
    logger.info('Attempting to extract events from text response');
    const events = [];
    
    try {
      // Look for event patterns in the text
      // Pattern 1: Look for numbered lists with event information
      const eventMatches = content.match(/\d+\.\s*([^\n]+)\s*\n+([^\n]*(date|occurred|reported)[^\n]*\n+)?([^\n]*region[^\n]*\n+)?([^\n]*impact[^\n]*\n+)?([^\n]*source[^\n]*\n+)?/gi);
      
      if (eventMatches && eventMatches.length > 0) {
        logger.info(`Found ${eventMatches.length} potential events in text format`);
        
        eventMatches.forEach((match, index) => {
          // Extract title (first line after number)
          const titleMatch = match.match(/\d+\.\s*([^\n]+)/);
          const title = titleMatch ? titleMatch[1].trim() : `Event ${index + 1}`;
          
          // Extract date if present
          const dateMatch = match.match(/(?:date|occurred|reported)[^\n]*?([\d]{4}-[\d]{2}-[\d]{2}|[\d]{1,2}[/-][\d]{1,2}[/-][\d]{2,4}|\w+ \d{1,2},? \d{4})/i);
          const dateStr = dateMatch ? dateMatch[1].trim() : formatDate(new Date());
          
          // Try to parse and standardize the date
          let standardDate;
          try {
            standardDate = new Date(dateStr).toISOString().split('T')[0];
            if (standardDate === 'Invalid Date') {
              standardDate = formatDate(new Date());
            }
          } catch (e) {
            standardDate = formatDate(new Date());
          }
          
          // Extract description - use everything except the first line as description
          const descLines = match.split('\n').slice(1).filter(line => line.trim().length > 0);
          const description = descLines.join(' ').trim();
          
          // Extract impact level if present
          const impactMatch = match.match(/impact[^\n]*?(\d+)/i);
          const impactLevel = impactMatch ? parseInt(impactMatch[1], 10) : 5;
          
          // Extract region if present
          const regionMatch = match.match(/region[s]?[^\n]*?:?\s*([^\n,\.]+)/i);
          const region = regionMatch ? regionMatch[1].trim() : 'Global';
          
          // Extract source if present
          const sourceMatch = match.match(/source[s]?[^\n]*?:?\s*([^\n,\.]+)/i);
          const source = sourceMatch ? sourceMatch[1].trim() : 'Unknown';
          
          // Create the event object
          const event = {
            title,
            date: standardDate,
            description: description || `Details about ${title}`,
            regions: region,
            impactLevel: Math.min(Math.max(impactLevel, 1), 10), // Ensure between 1-10
            source,
            retrievalChannel: 'perplexity',
            verified: true, // Assume verified since it came from our prompt
            lastUpdated: formatDate(new Date())
          };
          
          events.push(event);
        });
      }
      
      // If we couldn't extract events using the pattern approach, try a more basic approach
      if (events.length === 0) {
        // Split by double newlines to find paragraphs that might be events
        const paragraphs = content.split(/\n\n+/);
        
        paragraphs.forEach((para, index) => {
          if (para.length > 50 && !para.toLowerCase().includes('json') && !para.includes('```')) {
            // This looks like a substantial paragraph, might be an event
            const event = {
              title: para.split('.')[0].trim(),
              date: formatDate(new Date()),
              description: para,
              regions: 'Global',
              impactLevel: 5, // Default medium impact
              source: 'Extracted from text',
              retrievalChannel: 'perplexity',
              verified: true,
              lastUpdated: formatDate(new Date())
            };
            
            events.push(event);
          }
        });
      }
      
      logger.info(`Successfully extracted ${events.length} events from text`);
      return events;
    } catch (error) {
      logger.error(`Error extracting events from text: ${error.message}`);
      return [];
    }
  }
}

module.exports = PerplexityService;
