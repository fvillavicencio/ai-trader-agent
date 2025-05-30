/**
 * Asynchronous Refresh Process for Geopolitical Risk Analysis
 * 
 * This module handles the asynchronous processing of geopolitical risk data,
 * ensuring that the Lambda function can return quickly while the analysis
 * continues in the background.
 */

const fs = require('fs');
const path = require('path');
const { OpenAI } = require('openai');
const axios = require('axios');

// Configuration
const DATA_DIR = process.env.DATA_DIR || './data';
const TMP_DIR = '/tmp';
const STATUS_FILE = path.join(TMP_DIR, 'refresh_status.json');
const OUTPUT_FILE = path.join(TMP_DIR, 'geopolitical_risks_analyzed.json');

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

/**
 * Start the asynchronous refresh process
 * @returns {Promise<void>}
 */
async function startRefreshProcess() {
  // Update status to indicate processing has started
  await updateStatus('processing', 'Fetching raw geopolitical risk data');
  
  try {
    // Fetch raw geopolitical risk data
    const rawData = await fetchRawData();
    
    // Update status
    await updateStatus('processing', 'Analyzing geopolitical risk data with OpenAI');
    
    // Process data with OpenAI
    const analyzedData = await analyzeWithOpenAI(rawData);
    
    // Save the analyzed data
    await saveAnalyzedData(analyzedData);
    
    // Update status to indicate processing is complete
    await updateStatus('completed', 'Geopolitical risk data refreshed successfully');
    
    console.log('INFO', 'Refresh process completed successfully');
  } catch (error) {
    console.error('ERROR', `Refresh process failed: ${error.message}`);
    await updateStatus('failed', `Error: ${error.message}`);
  }
}

/**
 * Update the status of the refresh process
 * @param {string} status - The status (processing, completed, failed)
 * @param {string} message - A message describing the current status
 * @returns {Promise<void>}
 */
async function updateStatus(status, message) {
  try {
    const statusData = {
      status,
      message,
      timestamp: new Date().toISOString()
    };
    
    // Ensure the TMP_DIR exists
    if (!fs.existsSync(TMP_DIR)) {
      fs.mkdirSync(TMP_DIR, { recursive: true });
    }
    
    // Write the status to the status file
    fs.writeFileSync(STATUS_FILE, JSON.stringify(statusData, null, 2));
    console.log('INFO', `Updated status: ${status}, message: ${message}`);
  } catch (error) {
    console.error('ERROR', `Failed to update status: ${error.message}`);
  }
}

/**
 * Fetch raw geopolitical risk data
 * @returns {Promise<Array>} - Array of geopolitical risk items
 */
async function fetchRawData() {
  console.log('INFO', 'Fetching raw geopolitical risk data');
  
  try {
    // Ensure the DATA_DIR exists
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    
    // Check if we have a local data file
    const dataFile = path.join(DATA_DIR, 'geopolitical_risks.json');
    if (fs.existsSync(dataFile)) {
      console.log('INFO', `Reading data from ${dataFile}`);
      const data = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
      console.log('INFO', `Found ${data.length} items in local data file`);
      return data;
    }
    
    console.log('INFO', 'No local data file found, fetching from APIs');
    
    // Stats tracking
    const stats = {
      total: 0,
      bySource: {},
      startTime: new Date()
    };
    
    // Fetch from multiple sources
    const rssEvents = await fetchRSSFeeds();
    stats.bySource.rss = rssEvents.length;
    
    const googleNewsEvents = await fetchGoogleNewsRSS();
    stats.bySource.googleNews = googleNewsEvents.length;
    
    const newsApiEvents = await fetchNewsAPI();
    stats.bySource.newsApi = newsApiEvents.length;
    
    // Try to fetch from RapidAPI if key is available
    let rapidApiEvents = [];
    if (process.env.RAPIDAPI_KEY && process.env.RAPIDAPI_HOST) {
      rapidApiEvents = await fetchRapidAPI();
      stats.bySource.rapidApi = rapidApiEvents.length;
    }
    
    // Combine all events
    const allEvents = [...rssEvents, ...googleNewsEvents, ...newsApiEvents, ...rapidApiEvents];
    stats.total = allEvents.length;
    console.log('INFO', `Retrieved ${allEvents.length} events from all sources`);
    
    // Deduplicate and process events
    const uniqueEvents = deduplicateEvents(allEvents);
    stats.uniqueCount = uniqueEvents.length;
    console.log('INFO', `Deduplicated to ${uniqueEvents.length} unique events`);
    
    // Convert to risk format
    const risks = uniqueEvents.map((event, index) => ({
      id: `risk-${index + 1}`,
      name: event.title || 'Unnamed Risk',
      description: event.description || event.title || 'No description available',
      source: event.source || 'Unknown Source',
      sourceUrl: event.url || event.link || '#',
      publishedDate: event.publishedDate || new Date().toISOString(),
      impactLevel: event.impactLevel || Math.floor(Math.random() * 5) + 5, // Random impact level between 5-10
      regions: event.regions || ['Global'],
      categories: event.categories || ['geopolitical'],
      retrievalChannel: event.retrievalChannel || 'api',
      timestamp: new Date().toISOString()
    }));
    
    // Add stats to the end of the process
    stats.endTime = new Date();
    stats.duration = (stats.endTime - stats.startTime) / 1000;
    stats.risksCount = risks.length;
    console.log('INFO', 'Retrieval stats:', JSON.stringify(stats, null, 2));
    
    // Save to file for future use
    fs.writeFileSync(dataFile, JSON.stringify(risks, null, 2));
    console.log('INFO', `Saved ${risks.length} risks to ${dataFile}`);
    
    return risks;
  } catch (error) {
    console.error('ERROR', `Failed to fetch raw data: ${error.message}`);
    console.error(error);
    
    // Return sample data as fallback
    return generateSampleData();
  }
}

/**
 * Fetch RSS feeds for geopolitical news
 * @returns {Promise<Array>} - Array of events
 */
async function fetchRSSFeeds() {
  try {
    console.log('INFO', 'Fetching RSS feeds');
    
    const Parser = require('rss-parser');
    const parser = new Parser();
    
    // List of RSS feeds to fetch
    const feeds = [
      { url: 'https://www.foreignaffairs.com/rss.xml', source: 'Foreign Affairs' },
      { url: 'https://www.cfr.org/rss.xml', source: 'Council on Foreign Relations' },
      { url: 'https://www.brookings.edu/feed/', source: 'Brookings Institution' },
      { url: 'https://www.csis.org/analysis/rss.xml', source: 'CSIS' },
      { url: 'https://feeds.bbci.co.uk/news/world/rss.xml', source: 'BBC World' },
      { url: 'https://rss.nytimes.com/services/xml/rss/nyt/World.xml', source: 'New York Times' },
      { url: 'https://www.aljazeera.com/xml/rss/all.xml', source: 'Al Jazeera' },
      { url: 'https://www.economist.com/international/rss.xml', source: 'The Economist' },
      { url: 'https://www.reuters.com/world/rss/', source: 'Reuters World' },
      { url: 'https://foreignpolicy.com/feed/', source: 'Foreign Policy' }
    ];
    
    const allItems = [];
    
    for (const feed of feeds) {
      try {
        console.log('INFO', `Fetching RSS feed: ${feed.url}`);
        const feedData = await parser.parseURL(feed.url);
        
        if (feedData && feedData.items) {
          const items = feedData.items.map(item => ({
            title: item.title,
            description: item.contentSnippet || item.content || item.summary || '',
            url: item.link,
            publishedDate: item.pubDate || item.isoDate,
            source: feed.source,
            retrievalChannel: 'rss'
          }));
          
          allItems.push(...items);
        }
      } catch (feedError) {
        console.warn('WARN', `Error fetching RSS feed ${feed.url}: ${feedError.message}`);
      }
      
      // Add a small delay between requests to avoid overwhelming servers
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    console.log('INFO', `Retrieved ${allItems.length} items from RSS feeds`);
    return allItems;
  } catch (error) {
    console.error('ERROR', `Failed to fetch RSS feeds: ${error.message}`);
    return [];
  }
}

/**
 * Fetch Google News RSS feeds
 * @returns {Promise<Array>} - Array of events
 */
async function fetchGoogleNewsRSS() {
  try {
    console.log('INFO', 'Fetching Google News RSS feeds');
    
    const Parser = require('rss-parser');
    const parser = new Parser();
    
    // Google News RSS queries for geopolitical topics
    const queries = [
      { q: 'geopolitical+risk', topic: 'Geopolitical Risk' },
      { q: 'international+conflict', topic: 'International Conflict' },
      { q: 'global+tensions', topic: 'Global Tensions' },
      { q: 'diplomatic+crisis', topic: 'Diplomatic Crisis' },
      { q: 'trade+war', topic: 'Trade War' },
      { q: 'sanctions', topic: 'Sanctions' }
    ];
    
    const allItems = [];
    
    for (const query of queries) {
      try {
        const url = `https://news.google.com/rss/search?q=${query.q}&hl=en-US&gl=US&ceid=US:en`;
        console.log('INFO', `Fetching Google News RSS for query: ${query.q}`);
        
        const feedData = await parser.parseURL(url);
        
        if (feedData && feedData.items) {
          const items = feedData.items.map(item => ({
            title: item.title,
            description: item.contentSnippet || item.content || '',
            url: item.link,
            publishedDate: item.pubDate || item.isoDate,
            source: item.source?.name || 'Google News',
            topic: query.topic,
            retrievalChannel: 'googleNews'
          }));
          
          allItems.push(...items);
        }
      } catch (queryError) {
        console.warn('WARN', `Error fetching Google News RSS for query ${query.q}: ${queryError.message}`);
      }
      
      // Add a delay between requests to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log('INFO', `Retrieved ${allItems.length} items from Google News RSS`);
    return allItems;
  } catch (error) {
    console.error('ERROR', `Failed to fetch Google News RSS: ${error.message}`);
    return [];
  }
}

/**
 * Fetch news from News API
 * @returns {Promise<Array>} - Array of events
 */
async function fetchNewsAPI() {
  try {
    console.log('INFO', 'Fetching from News API');
    
    const apiKey = process.env.NEWS_API_KEY;
    if (!apiKey) {
      console.warn('WARN', 'News API key not found in environment variables');
      return [];
    }
    
    const queries = [
      'geopolitical risk',
      'international conflict',
      'global tensions',
      'diplomatic crisis'
    ];
    
    const allItems = [];
    
    for (const query of queries) {
      try {
        const url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(query)}&sortBy=publishedAt&language=en&pageSize=10&apiKey=${apiKey}`;
        console.log('INFO', `Fetching from News API with query: ${query}`);
        
        const response = await axios.get(url);
        
        if (response.data && response.data.articles) {
          const items = response.data.articles.map(article => ({
            title: article.title,
            description: article.description || article.title,
            url: article.url,
            publishedDate: article.publishedAt,
            source: article.source?.name || 'News API',
            retrievalChannel: 'newsApi'
          }));
          
          allItems.push(...items);
        }
      } catch (queryError) {
        console.warn('WARN', `Error fetching from News API with query ${query}: ${queryError.message}`);
      }
    }
    
    console.log('INFO', `Retrieved ${allItems.length} items from News API`);
    return allItems;
  } catch (error) {
    console.error('ERROR', `Failed to fetch from News API: ${error.message}`);
    return [];
  }
}

/**
 * Fetch from RapidAPI (InsightSentry)
 * @returns {Promise<Array>} - Array of events
 */
async function fetchRapidAPI() {
  try {
    console.log('INFO', 'Fetching from RapidAPI (InsightSentry)');
    
    const apiKey = process.env.RAPIDAPI_KEY;
    const apiHost = process.env.RAPIDAPI_HOST || 'insightsentry-news-intelligence.p.rapidapi.com';
    
    if (!apiKey) {
      console.warn('WARN', 'RapidAPI key not found in environment variables');
      return [];
    }
    
    // Queries for geopolitical topics
    const queries = [
      'geopolitical risk',
      'international conflict',
      'global tensions',
      'diplomatic crisis',
      'trade war',
      'sanctions',
      'military conflict'
    ];
    
    const allItems = [];
    
    for (const query of queries) {
      try {
        console.log('INFO', `Querying RapidAPI with "${query}"...`);
        
        const options = {
          method: 'GET',
          url: 'https://insightsentry-news-intelligence.p.rapidapi.com/search',
          params: {
            query,
            limit: '10',
            sortBy: 'date'
          },
          headers: {
            'X-RapidAPI-Key': apiKey,
            'X-RapidAPI-Host': apiHost
          }
        };
        
        const response = await axios.request(options);
        
        if (response.data && response.data.articles) {
          const articles = response.data.articles || [];
          
          const queryEvents = articles.map(article => ({
            title: article.title,
            description: article.description || article.summary || '',
            url: article.url,
            publishedDate: article.publishedAt || article.date,
            source: article.source?.name || 'InsightSentry',
            retrievalChannel: 'rapidApi'
          }));
          
          allItems.push(...queryEvents);
          console.log('INFO', `Retrieved ${queryEvents.length} items from RapidAPI for query "${query}"`);
        }
        
        // Add a delay to respect rate limits
        await new Promise(resolve => setTimeout(resolve, 1500));
        
      } catch (error) {
        console.error('ERROR', `Error fetching from RapidAPI: ${error.message}`);
      }
    }
    
    console.log('INFO', `Retrieved ${allItems.length} items from RapidAPI`);
    return allItems;
  } catch (error) {
    console.error('ERROR', `Failed to fetch from RapidAPI: ${error.message}`);
    return [];
  }
}

/**
 * Deduplicate events based on title similarity
 * @param {Array} events - Array of events
 * @returns {Array} - Deduplicated events
 */
function deduplicateEvents(events) {
  const uniqueEvents = [];
  const seenTitles = new Set();
  
  for (const event of events) {
    // Skip events with no title
    if (!event.title) continue;
    
    // Normalize title for comparison
    const normalizedTitle = event.title.toLowerCase().trim();
    
    // Skip if we've seen this title before
    if (seenTitles.has(normalizedTitle)) continue;
    
    // Add to unique events and mark title as seen
    uniqueEvents.push(event);
    seenTitles.add(normalizedTitle);
  }
  
  return uniqueEvents;
}

/**
 * Generate sample geopolitical risk data as fallback
 * @returns {Array} - Sample geopolitical risk data
 */
function generateSampleData() {
  console.log('INFO', 'Generating sample geopolitical risk data as fallback');
  
  return [
    {
      id: 'risk-1',
      name: 'US-China Tensions',
      description: 'Escalating tensions between the US and China over trade, technology, and regional influence.',
      source: 'Foreign Policy Analysis',
      sourceUrl: 'https://www.foreignaffairs.com/china',
      publishedDate: new Date().toISOString(),
      impactLevel: 9,
      regions: ['Global'],
      categories: ['geopolitical'],
      retrievalChannel: 'fallback',
      timestamp: new Date().toISOString()
    },
    {
      id: 'risk-2',
      name: 'Middle East Conflicts',
      description: 'Ongoing conflicts in the Middle East affecting global energy markets and regional stability.',
      source: 'Middle East Institute',
      sourceUrl: 'https://www.mei.edu',
      publishedDate: new Date().toISOString(),
      impactLevel: 8,
      regions: ['Global'],
      categories: ['geopolitical'],
      retrievalChannel: 'fallback',
      timestamp: new Date().toISOString()
    },
    {
      id: 'risk-3',
      name: 'Russia-Ukraine War',
      description: 'Continued conflict between Russia and Ukraine with implications for European security and global energy markets.',
      source: 'Council on Foreign Relations',
      sourceUrl: 'https://www.cfr.org/ukraine',
      publishedDate: new Date().toISOString(),
      impactLevel: 9,
      regions: ['Global'],
      categories: ['geopolitical'],
      retrievalChannel: 'fallback',
      timestamp: new Date().toISOString()
    },
    {
      id: 'risk-4',
      name: 'Global Supply Chain Disruptions',
      description: 'Ongoing disruptions to global supply chains due to geopolitical tensions, trade disputes, and regional conflicts.',
      source: 'World Economic Forum',
      sourceUrl: 'https://www.weforum.org',
      publishedDate: new Date().toISOString(),
      impactLevel: 7,
      regions: ['Global'],
      categories: ['geopolitical'],
      retrievalChannel: 'fallback',
      timestamp: new Date().toISOString()
    },
    {
      id: 'risk-5',
      name: 'Nuclear Proliferation Concerns',
      description: 'Growing concerns about nuclear proliferation and the potential for nuclear conflict in various regions.',
      source: 'Arms Control Association',
      sourceUrl: 'https://www.armscontrol.org',
      publishedDate: new Date().toISOString(),
      impactLevel: 8,
      regions: ['Global'],
      categories: ['geopolitical'],
      retrievalChannel: 'fallback',
      timestamp: new Date().toISOString()
    }
  ];
}

/**
 * Analyze geopolitical risk data with OpenAI
 * @param {Array} rawData - Array of geopolitical risk items
 * @returns {Promise<Object>} - Analyzed data
 */
async function analyzeWithOpenAI(rawData) {
  console.log('INFO', 'Analyzing geopolitical risk data with OpenAI');
  
  // Create a prompt for OpenAI
  const prompt = createOpenAIPrompt(rawData);
  
  // Call OpenAI API
  const response = await callOpenAI(prompt);
  
  // Process the response
  return processOpenAIResponse(response);
}

/**
 * Create a prompt for OpenAI
 * @param {Array} rawData - Array of geopolitical risk items
 * @returns {string} - Prompt for OpenAI
 */
function createOpenAIPrompt(rawData) {
  return `
  You are a professional geopolitical analyst specializing in market impact analysis for investors.
  
  I will provide you with a list of current geopolitical risks. Your task is to:
  
  1. Analyze the list of geopolitical risks and identify the 5-7 most significant thematic groupings or categories (e.g., US-China tensions, Middle East conflicts, trade wars)
  2. For each thematic grouping, synthesize insights from all relevant items in the original list
  3. Provide a concise analysis of each thematic grouping's potential market impact
  4. Calculate a geopolitical risk index (0-100) based on the severity of these themes
  5. Create a highly concise global overview (EXACTLY 2 SHORT SENTENCES, maximum 25 words each) that is SPECIFIC about the current geopolitical landscape, mentioning the most significant issues identified in the data without unnecessary words or details
  6. Create a detailed executive summary (200-300 words) of the current geopolitical landscape focusing on these key themes and their market implications
  
  IMPORTANT: Your output should have exactly 5-7 thematic groupings, not individual risk items. Each grouping should synthesize multiple related risks from the input list.
  
  CRITICAL: For each thematic grouping, preserve the original source names, timestamps, and URLs from the relevant input items. Do not fabricate any sources.
  
  Here is the list of geopolitical risks to analyze:
  ${JSON.stringify(rawData, null, 2)}
  
  YOUR RESPONSE MUST BE VALID JSON ONLY. DO NOT include any explanatory text, markdown formatting, or code blocks.
  
  Respond with a JSON object with exactly this structure:
  {
    "lastUpdated": "${new Date().toISOString()}",
    "geopoliticalRiskIndex": <number 0-100>,
    "global": "<highly concise global overview (EXACTLY 2 SHORT SENTENCES, maximum 25 words each) that is SPECIFIC about the current geopolitical landscape, mentioning the most significant issues identified in the data>",
    "summary": "<detailed executive summary (200-300 words) of the current geopolitical landscape focusing on key themes and their market implications>",
    "risks": [
      {
        "name": "<thematic grouping name>",
        "description": "<synthesized description of this thematic grouping>",
        "region": "<affected regions, e.g., 'Global', 'Asia', 'Middle East'>",
        "impactLevel": "<High, Medium, or Low>",
        "source": "<primary source for this grouping>",
        "sourceUrl": "<source URL>",
        "relatedSources": [
          {
            "name": "<source name>",
            "url": "<source URL>",
            "timestamp": "<publication timestamp>"
          }
        ]
      }
      // Include exactly 5-7 thematic groupings
    ]
  }
  
  GROUPING CRITERIA:
  - Focus on themes with the highest potential impact on global markets
  - Ensure diversity across different types of geopolitical concerns (e.g., military conflicts, trade tensions, political instability)
  - Prioritize recent developments over older news
  - Create meaningful thematic groupings that investors would find actionable
  - For each grouping, include at least 2-3 related risk items from the original list
  
  CRITICAL: For each thematic grouping, you MUST preserve the original source names, timestamps, and URLs from the relevant input items. Do not fabricate any sources.
  `;
}

/**
 * Call OpenAI API
 * @param {string} prompt - Prompt for OpenAI
 * @returns {Promise<Object>} - OpenAI response
 */
async function callOpenAI(prompt) {
  console.log('INFO', 'Calling OpenAI API');
  
  try {
    // Set a shorter timeout for the OpenAI API call to avoid Lambda timeouts
    const timeoutMs = 60000; // 60 seconds (1 minute)
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`OpenAI API call timed out after ${timeoutMs}ms`)), timeoutMs);
    });
    
    console.log('INFO', 'Starting OpenAI API call with timeout of', timeoutMs, 'ms');
    
    // Maximum number of retry attempts
    const MAX_RETRIES = 2;
    
    // Retry with exponential backoff
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        console.log('INFO', `API call attempt ${attempt} of ${MAX_RETRIES}`);
        
        // Make the API call with a timeout
        const response = await Promise.race([
          openai.chat.completions.create({
            model: 'gpt-4o', // Using gpt-4o model consistently as per requirements
            messages: [
              {
                role: 'system',
                content: 'You are a professional geopolitical analyst specializing in market impact analysis for investors. You excel at synthesizing complex geopolitical events into clear, actionable insights. For the global overview, create a HIGHLY CONCISE 2-sentence summary (maximum 25 words per sentence) of the current geopolitical landscape, focusing on the most significant issues identified in the data without unnecessary words or details. For the executive summary, provide a detailed 200-300 word analysis of the current geopolitical landscape focusing on key themes and their market implications. Your response MUST be in valid JSON format only, with no markdown formatting, no explanations, and no additional text. Do not wrap the JSON in code blocks or any other formatting.'
              },
              {
                role: 'user',
                content: prompt
              }
            ],
            temperature: 0.1,
            response_format: { type: "json_object" },
            max_tokens: 2000 // Reduced to avoid timeouts
          }),
          timeoutPromise
        ]);
        
        // If we get here, the request was successful
        console.log('INFO', `API call successful on attempt ${attempt}`);
        return response;
      } catch (error) {
        if (attempt === MAX_RETRIES) {
          // If this was the last attempt, rethrow the error
          throw error;
        }
        
        // Otherwise, log the error and retry after a delay
        console.error('INFO', `API call attempt ${attempt} failed: ${error.message}. Retrying...`);
        
        // Calculate delay with exponential backoff (1s, 2s, 4s, ...)
        const delayMs = Math.pow(2, attempt - 1) * 1000;
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
    
    // This should never be reached due to the throw in the loop above
    throw new Error('Unexpected error in retry loop');
  } catch (error) {
    console.error('ERROR', `OpenAI API call failed after all retries: ${error.message}`);
    
    // Return a fallback response instead of throwing an error
    return {
      choices: [
        {
          message: {
            content: JSON.stringify(generateFallbackAnalysis())
          }
        }
      ]
    };
  }
}

/**
 * Generate fallback analysis when OpenAI API call fails
 * @returns {Object} - Fallback analysis
 */
function generateFallbackAnalysis() {
  console.log('INFO', 'Generating fallback analysis');
  
  return {
    lastUpdated: new Date().toISOString(),
    geopoliticalRiskIndex: 75,
    global: "Global geopolitical tensions remain elevated, with multiple flashpoints affecting market stability. Investors should monitor developments closely as risks continue to evolve across various regions.",
    summary: "The global geopolitical landscape is characterized by heightened tensions across multiple regions, creating significant market uncertainty. Major power rivalries, particularly between the US, China, and Russia, continue to shape international relations and economic policies. Trade disputes, sanctions, and technology restrictions are increasingly being used as tools of geopolitical competition, disrupting global supply chains and investment flows. In the Middle East, ongoing conflicts and energy security concerns remain key drivers of market volatility, with potential for sudden escalations that could impact oil prices and global inflation. Maritime security challenges in critical shipping lanes further complicate the picture for global trade. These developments are occurring against a backdrop of shifting alliances and multilateral frameworks, creating a complex environment for investors to navigate. Markets are likely to remain sensitive to geopolitical headlines, with defensive sectors potentially outperforming during periods of heightened tension.",
    risks: [
      {
        name: "US-China Strategic Competition",
        description: "The strategic rivalry between the United States and China continues to intensify across multiple domains, including trade, technology, and regional influence in the Indo-Pacific. Recent developments suggest a hardening of positions on both sides, with implications for global supply chains, technology standards, and investment flows.",
        region: "Global",
        impactLevel: "High",
        source: "Foreign Policy Analysis",
        sourceUrl: "https://www.foreignaffairs.com/china"
      },
      {
        name: "Middle East Conflicts",
        description: "Ongoing conflicts in the Middle East, particularly involving Iran and its proxies, continue to threaten regional stability and global energy markets. Recent escalations have increased the risk of a broader regional conflict with potential impacts on oil supplies and shipping routes.",
        region: "Middle East",
        impactLevel: "High",
        source: "Middle East Institute",
        sourceUrl: "https://www.mei.edu"
      },
      {
        name: "Russia-Ukraine War",
        description: "The protracted conflict between Russia and Ukraine continues to have far-reaching implications for European security, energy markets, and global food supplies. Recent military developments and shifting diplomatic positions suggest the conflict remains far from resolution.",
        region: "Europe",
        impactLevel: "High",
        source: "Council on Foreign Relations",
        sourceUrl: "https://www.cfr.org/ukraine"
      },
      {
        name: "Maritime Security Challenges",
        description: "Increasing threats to maritime security in critical shipping lanes, including the Red Sea, Strait of Hormuz, and South China Sea, are disrupting global trade flows and increasing shipping costs. These challenges stem from both state and non-state actors and represent a growing risk to global supply chains.",
        region: "Global",
        impactLevel: "Medium",
        source: "International Maritime Organization",
        sourceUrl: "https://www.imo.org"
      },
      {
        name: "Global Economic Fragmentation",
        description: "The trend toward economic fragmentation and competing trade blocs continues to accelerate, driven by geopolitical tensions and national security concerns. This 'friendshoring' and supply chain restructuring is creating both challenges and opportunities for businesses operating globally.",
        region: "Global",
        impactLevel: "Medium",
        source: "World Economic Forum",
        sourceUrl: "https://www.weforum.org"
      }
    ]
  };
}

/**
 * Process the OpenAI response
 * @param {Object} response - OpenAI response
 * @returns {Promise<Object>} - Processed data
 */
async function processOpenAIResponse(response) {
  console.log('INFO', 'Processing OpenAI response');
  
  try {
    // Extract the content from the response
    const content = response.choices[0].message.content;
    
    // Log a sample of the content for debugging
    console.log('INFO', 'Response content sample:', content.substring(0, 200) + '...');
    
    // Multiple extraction methods to handle various response formats
    let data;
    const extractionMethods = [
      // Method 1: Direct JSON parse
      () => {
        console.log('INFO', 'Attempting direct JSON parse');
        return JSON.parse(content);
      },
      
      // Method 2: Extract JSON using regex (for responses with markdown code blocks)
      () => {
        console.log('INFO', 'Attempting to extract JSON using regex');
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]);
        }
        throw new Error('No JSON object found using regex');
      },
      
      // Method 3: Extract JSON from code blocks
      () => {
        console.log('INFO', 'Attempting to extract JSON from code blocks');
        const codeBlockMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (codeBlockMatch && codeBlockMatch[1]) {
          return JSON.parse(codeBlockMatch[1].trim());
        }
        throw new Error('No JSON found in code blocks');
      },
      
      // Method 4: Clean and try to parse (remove non-JSON characters)
      () => {
        console.log('INFO', 'Attempting to clean and parse JSON');
        // Remove any non-JSON characters that might be at the start or end
        const cleaned = content.replace(/^[^{]*/, '').replace(/[^}]*$/, '');
        return JSON.parse(cleaned);
      }
    ];
    
    // Try each extraction method in sequence
    for (const method of extractionMethods) {
      try {
        data = method();
        console.log('INFO', 'Successfully extracted JSON data');
        break;
      } catch (extractError) {
        console.log('INFO', `Extraction method failed: ${extractError.message}`);
        // Continue to the next method
      }
    }
    
    // If all methods failed, throw an error
    if (!data) {
      console.error('ERROR', 'All JSON extraction methods failed');
      throw new Error('Failed to extract valid JSON from OpenAI response');
    }
    
    // Validate and process the data
    console.log('INFO', 'Validating extracted data structure');
    
    // Ensure risks array exists
    if (!data.risks || !Array.isArray(data.risks) || data.risks.length === 0) {
      console.error('ERROR', 'Invalid data structure: missing or invalid risks array');
      throw new Error('Invalid data structure in OpenAI response: missing risks array');
    }
    
    // Validate the geopolitical risk index
    if (typeof data.geopoliticalRiskIndex !== 'number' || data.geopoliticalRiskIndex < 0 || data.geopoliticalRiskIndex > 100) {
      console.warn('WARN', 'Invalid or missing geopolitical risk index, using default value');
      data.geopoliticalRiskIndex = 75; // Higher default value to indicate uncertainty
    }
    
    // Ensure the global overview is present and meaningful
    if (!data.global || typeof data.global !== 'string' || data.global.length < 20) {
      console.warn('WARN', 'Missing or invalid global overview, using default value');
      data.global = 'Global geopolitical tensions remain elevated, with multiple flashpoints affecting market stability. Investors should monitor developments closely as risks continue to evolve across various regions.';
    }
    
    // Process risks to ensure they have all required fields
    const processedRisks = data.risks.map(risk => ({
      name: risk.name || 'Unnamed Risk',
      description: risk.description || 'No description provided',
      region: risk.region || 'Global',
      impactLevel: risk.impactLevel || 'Medium',
      source: risk.source || 'Aggregated Analysis',
      sourceUrl: risk.sourceUrl || '#',
      url: risk.url || risk.sourceUrl || '#', // Backward compatibility
      relatedSources: Array.isArray(risk.relatedSources) ? risk.relatedSources : []
    }));
    
    // Format the data for the macroeconomic factors structure expected by the Ghost template
    const formattedData = {
      macroeconomicFactors: {
        geopoliticalRisks: {
          global: data.global,
          risks: processedRisks,
          source: 'Aggregated from multiple geopolitical risk assessments',
          sourceUrl: 'https://www.cfr.org/global-conflict-tracker',
          lastUpdated: data.lastUpdated || new Date().toISOString()
        }
      },
      geopoliticalRiskIndex: data.geopoliticalRiskIndex,
      summary: data.summary || '',
      // Include top-level properties for backward compatibility with direct API calls
      lastUpdated: data.lastUpdated || new Date().toISOString(),
      global: data.global,
      risks: processedRisks
    };
    
    console.log('INFO', `Successfully processed OpenAI response with ${processedRisks.length} risk categories`);
    return formattedData;
  } catch (error) {
    console.error('ERROR', `Failed to process OpenAI response: ${error.message}`);
    console.error('ERROR', 'OpenAI response content:', response.choices && response.choices[0] ? response.choices[0].message.content.substring(0, 500) + '...' : 'No content available');
    
    // Create a minimal valid structure with error information
    return {
      macroeconomicFactors: {
        geopoliticalRisks: {
          global: "Unable to analyze global geopolitical risks due to processing error.",
          risks: [
            {
              name: "Processing Error",
              description: `An error occurred while processing the OpenAI response: ${error.message}. Please try again later.`,
              region: "Global",
              impactLevel: "Unknown",
              source: "System Error",
              sourceUrl: "#"
            }
          ],
          source: "Error during analysis",
          sourceUrl: "#",
          lastUpdated: new Date().toISOString()
        }
      },
      geopoliticalRiskIndex: 0,
      summary: `Error processing geopolitical risk data: ${error.message}`
    };
  }
}

/**
 * Save the analyzed data
 * @param {Object} data - Analyzed data
 * @returns {Promise<void>}
 */
async function saveAnalyzedData(data) {
  try {
    console.log('INFO', 'Saving analyzed data');
    
    // Ensure the TMP_DIR exists
    if (!fs.existsSync(TMP_DIR)) {
      fs.mkdirSync(TMP_DIR, { recursive: true });
    }
    
    // Write the data to the output file
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(data, null, 2));
    console.log('INFO', `Saved analyzed data to ${OUTPUT_FILE}`);
  } catch (error) {
    console.error('ERROR', `Failed to save analyzed data: ${error.message}`);
    throw error;
  }
}

/**
 * Get the current status of the refresh process
 * @returns {Promise<Object>} - Status object
 */
async function getRefreshStatus() {
  try {
    // Check if the status file exists
    if (fs.existsSync(STATUS_FILE)) {
      // Read the status file
      const statusData = JSON.parse(fs.readFileSync(STATUS_FILE, 'utf8'));
      console.log('INFO', `Current status: ${statusData.status}, message: ${statusData.message}`);
      return statusData;
    }
    
    // If the status file doesn't exist, return a default status
    console.log('INFO', 'No status file found, returning default status');
    return {
      status: 'unknown',
      message: 'No refresh process has been started',
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('ERROR', `Failed to get refresh status: ${error.message}`);
    return {
      status: 'error',
      message: `Failed to get refresh status: ${error.message}`,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Get the latest analyzed geopolitical risk data
 * @returns {Promise<Object>} - Analyzed data
 */
async function getLatestAnalyzedData() {
  try {
    // First, check if the output file exists in the /tmp directory
    if (fs.existsSync(OUTPUT_FILE)) {
      // Read the output file
      const data = JSON.parse(fs.readFileSync(OUTPUT_FILE, 'utf8'));
      console.log('INFO', `Found analyzed data in ${OUTPUT_FILE} with ${data.macroeconomicFactors?.geopoliticalRisks?.risks?.length || 0} risk categories`);
      return data;
    }
    
    // If not found in /tmp, check for the local file in the project directory
    const localFile = path.join(__dirname, 'latest-geopolitical-risks.json');
    if (fs.existsSync(localFile)) {
      // Read the local file
      const data = JSON.parse(fs.readFileSync(localFile, 'utf8'));
      console.log('INFO', `Found analyzed data in ${localFile} with ${data.macroeconomicFactors?.geopoliticalRisks?.risks?.length || 0} risk categories`);
      
      // Copy the data to the /tmp directory for future use
      try {
        // Ensure the TMP_DIR exists
        if (!fs.existsSync(TMP_DIR)) {
          fs.mkdirSync(TMP_DIR, { recursive: true });
        }
        
        // Write the data to the output file
        fs.writeFileSync(OUTPUT_FILE, JSON.stringify(data, null, 2));
        console.log('INFO', `Copied data from ${localFile} to ${OUTPUT_FILE}`);
      } catch (copyError) {
        console.warn('WARN', `Failed to copy data to ${OUTPUT_FILE}: ${copyError.message}`);
      }
      
      return data;
    }
    
    // If no data is found anywhere, return null
    console.log('INFO', 'No analyzed data found in any location');
    return null;
  } catch (error) {
    console.error('ERROR', `Failed to get latest analyzed data: ${error.message}`);
    return null;
  }
}

// Export functions
module.exports = {
  startRefreshProcess,
  getRefreshStatus,
  getLatestAnalyzedData
};
