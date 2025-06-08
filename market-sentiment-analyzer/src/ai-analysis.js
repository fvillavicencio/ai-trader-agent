/**
 * AI Analysis module for Market Sentiment Analyzer
 * 
 * This module handles sending data to AI providers for analysis and processing the responses.
 * It implements random provider selection with fallbacks and retries.
 */

require('dotenv').config();
const axios = require('axios');
const path = require('path');
const fs = require('fs');
const { FINANCIAL_ANALYSTS } = require('../config/config');
const { filterContentByAnalysts } = require('./analyst-detection');
const { getAnalystFirm, determineSentiment } = require('./utils/analystUtils');
const { formatDate } = require('./utils/textUtils');
const { CONFIG } = require('../config/config');

// Initialize logger
const { createLogger } = require('./utils/logger');
const logger = createLogger('ai-analysis');

/**
 * Create a prompt for AI analysis of market sentiment data
 * @param {Array} commentaryItems - Collected analyst commentary items
 * @returns {string} - Formatted prompt
 */
function createMarketSentimentPrompt(commentaryItems) {
  const currentDate = new Date().toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  // Get list of valid financial analysts from config
  const { FINANCIAL_ANALYSTS } = require('../config/config');
  
  // Group items by analyst
  const analystMap = {};
  
  commentaryItems.forEach(item => {
    const analysts = item.mentionedAnalysts || [];
    
    // Only include target analysts
    analysts.filter(analyst => FINANCIAL_ANALYSTS.includes(analyst)).forEach(analyst => {
      if (!analystMap[analyst]) {
        analystMap[analyst] = [];
      }
      
      analystMap[analyst].push({
        title: item.title,
        content: item.content,
        source: item.source,
        sourceType: item.sourceType,
        link: item.link,
lastUpdated: item.pubDate,
        mentionedStocks: item.mentionedStocks || []
      });
    });
  });
  
  // Build analystComments as a JSON array
  const analystComments = Object.keys(analystMap).flatMap(analystName => {
    const items = analystMap[analystName];
    // Sort by date, most recent first
    items.sort((a, b) => new Date(b.lastUpdated || 0) - new Date(a.lastUpdated || 0));
    // Take the most recent and relevant items (up to 3)
    const relevantItems = items.slice(0, 3);
    return relevantItems.map(item => ({
      name: analystName,
      // firm: getAnalystFirm(analystName),
      title: item.title,
      content: item.content,
      source: item.source,
      sourceType: item.sourceType,
      link: item.link,
      lastUpdated: item.lastUpdated,
      mentionedStocks: item.mentionedStocks || []
    }));
  });

  // Create the prompt
  return `You are a financial analyst assistant analyzing market sentiment from specific financial analysts. Your task is to analyze ONLY the commentary provided in the JSON array at the end of this prompt - DO NOT search for or include any additional information.

Current Date: ${currentDate}

Based on ONLY the analyst commentary provided, generate a comprehensive analysis in the following JSON format:

{
  "analysts": [
    {
      "name": "Analyst Name",
      // "firm": "Firm Name",
      "commentary": "A single paragraph summarizing their recent comments/views with specific details and market insights",
      "sentiment": "Bullish/Neutral/Bearish",
      "mentionedStocks": ["AAPL", "MSFT"],
      "source": "Source Name",
      "url": "https://source-url.com/exact-article-url",
      "lastUpdated": "YYYY-MM-DD"
    }
  ],
  "patternAnalysis": {
    "commonThemes": ["Detailed description of common themes across analysts with specific sectors and trends"],
    "contradictions": ["Specific areas where analysts disagree with examples"],
    "emergingTrends": ["Emerging trends mentioned by multiple analysts with supporting evidence"],
    "frequentlyMentionedStocks": [
      {
        "symbol": "AAPL",
        "mentionCount": 5,
        "sentimentBreakdown": {"Bullish": 3, "Neutral": 1, "Bearish": 1}
      }
    ]
  },
  "overallSentiment": "Bullish/Neutral/Bearish",
  "summary": "A single paragraph overall market sentiment analysis commenting on themes, risks, issues, contradictions and things to look out for, possibly mentioning specific stocks"
}

CRITICAL INSTRUCTIONS:
1. ONLY analyze commentary from these specific analysts: ${FINANCIAL_ANALYSTS.join(', ')}. If the provided data includes commentary from other sources, DO NOT include them in your analysis.
2. Your response MUST be VALID JSON and NOTHING ELSE.
3. Do NOT include any explanations, markdown formatting, code blocks, or any text before or after the JSON.
4. For each analyst, provide a SINGLE PARAGRAPH summary of their views, mentioning specific stocks they discussed.
5. For the overall summary, provide a SINGLE PARAGRAPH that covers themes, risks, contradictions, and things to watch for.
6. For each analyst, you MUST ONLY use the URLs provided in the input data for that analyst. NEVER invent, fabricate, or guess a URL. If multiple URLs are provided, select the single most relevant one. If no real URL is available, set the field to null.
7. Do not use URLs from any external source or your own knowledge. Only use URLs that are present in the provided commentary for each analyst.
8. Only include the analysts for whom you have data.
9. Ensure all JSON is properly formatted with double quotes around keys and string values.
10. Do not include any comments within the JSON structure.
11. Do not include the string \`\`\`json or \`\`\` anywhere in your response.
12. If you are unsure about any part of the instructions, please err on the side of caution and follow the most conservative interpretation.

Below is a JSON array of analyst commentary objects. Use ONLY this data for your analysis.

analystComments = ${JSON.stringify(analystComments, null, 2)}
`;
}

/**
 * Parse AI response content to extract JSON
 * @param {string} content - AI response content
 * @returns {Object} - Parsed JSON object
 */
function parseAIResponse(content) {
  try {
    // First try direct parsing
    return JSON.parse(content);
  } catch (directParseError) {
    // If direct parsing fails, try to extract JSON
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      // Clean up any potential markdown code block markers
      let jsonStr = jsonMatch[0];
      jsonStr = jsonStr.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      return JSON.parse(jsonStr);
    }
    throw new Error('No valid JSON found in response');
  }
}

/**
 * Call OpenAI API for market sentiment analysis
 * @param {string} prompt - Analysis prompt
 * @returns {Promise<Object>} - Parsed JSON response
 */
async function callOpenAI(prompt) {
  logger.info('Calling OpenAI API for market sentiment analysis');
  
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || apiKey === 'your_openai_api_key_here') {
    throw new Error('Valid OpenAI API key not found in environment variables');
  }
  
  try {
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: process.env.OPENAI_MODEL || 'gpt-4o',
        messages: [
          { role: 'system', content: 'You are a financial analyst assistant.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.2,
        max_tokens: 4000,
        response_format: { type: "json_object" }
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        timeout: 90000 // 90 seconds timeout
      }
    );
    
    // Extract and parse the response
    const content = response.data.choices[0].message.content;
    return parseAIResponse(content);
  } catch (error) {
    logger.error(`OpenAI API error: ${error.response?.data?.error?.message || error.message}`);
    throw new Error(`OpenAI request failed: ${error.message}`);
  }
}

/**
 * Call Perplexity API for market sentiment analysis
 * @param {string} prompt - Analysis prompt
 * @returns {Promise<Object>} - Parsed JSON response
 */
async function callPerplexity(prompt) {
  // Stronger instruction to Perplexity to preserve analyst name
  const nameInstruction = 'IMPORTANT: For each analyst, the "name" field in your output MUST match the actual analyst\'s name as provided in the input. NEVER use the firm or team name as the analyst name unless no individual name is available.';
  const perplexityPrompt = `${nameInstruction}\n\n${prompt}`;
  logger.info('Calling Perplexity API for market sentiment analysis');
  
  const apiKey = process.env.PERPLEXITY_API_KEY;
  if (!apiKey || apiKey === 'your_perplexity_api_key_here') {
    throw new Error('Valid Perplexity API key not found in environment variables');
  }
  
  try {
    const response = await axios.post(
      'https://api.perplexity.ai/chat/completions',
      {
        model: process.env.PERPLEXITY_MODEL || 'sonar-pro',
        messages: [
          { role: 'system', content: 'You are a financial analyst assistant.' },
          { role: 'user', content: perplexityPrompt }
        ],
        temperature: 0.2,
        max_tokens: 4000
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'Accept': 'application/json'
        },
        timeout: 90000 // 90 seconds timeout
      }
    );
    
    // Extract and parse the response
    const content = response.data.choices[0].message.content;
    return parseAIResponse(content);
  } catch (error) {
    logger.error(`Perplexity API error: ${error.response?.data?.error?.message || error.message}`);
    throw new Error(`Perplexity request failed: ${error.message}`);
  }
}

/**
 * Generate a fallback response when AI analysis fails
 * @param {Array} commentaryItems - Collected analyst commentary items
 * @param {Error} error - The error that caused the fallback
 * @returns {Object} - Fallback response
 */
function generateFallbackResponse(commentaryItems, error) {
  logger.info('Generating fallback response');
  
  // Group items by analyst
  const analystMap = {};
  
  commentaryItems.forEach(item => {
    const analysts = item.mentionedAnalysts || [];
    
    analysts.forEach(analyst => {
      if (!analystMap[analyst]) {
        analystMap[analyst] = {
          name: analyst,
          // firm: getAnalystFirm(analyst),
          items: [],
          mentionedStocks: new Set(),
          mentionedSectors: new Set()
        };
      }
      
      analystMap[analyst].items.push(item);
      
      // Add mentioned stocks
      if (item.mentionedStocks && item.mentionedStocks.length > 0) {
        item.mentionedStocks.forEach(stock => {
          analystMap[analyst].mentionedStocks.add(stock);
        });
      }
    });
  });
  
  // Create analysts array for the response
  const analysts = Object.keys(analystMap).map(analystName => {
    const analyst = analystMap[analystName];
    const items = analyst.items;
    
    // Determine sentiment based on content
    let sentiment = 'Neutral';
    const combinedContent = items.map(item => item.content).join(' ');
    if (combinedContent) {
      sentiment = determineSentiment(combinedContent);
    }
    
    // Create commentary from the most recent items
    const commentary = items
      .slice(0, 3)
      .map(item => `${item.title}: ${item.content.substring(0, 200)}${item.content.length > 200 ? '...' : ''}`)
      .join('\n\n');
    
    return {
      name: analystName,
      // firm: analyst.firm,
      sentiment: sentiment,
      commentary: commentary || 'No recent commentary available',
      mentionedStocks: Array.from(analyst.mentionedStocks),
      mentionedSectors: Array.from(analyst.mentionedSectors),
      lastUpdated: formatDate(new Date())
    };
  });
  
  // Create fallback response
  return {
    analysts: analysts,
    patternAnalysis: {
      commonThemes: [],
      contradictions: [],
      emergingTrends: [],
      frequentlyMentionedStocks: []
    },
    overallSentiment: 'Neutral',
    summary: 'AI analysis failed. This is a fallback response based on the collected data.',
    error: error ? error.message : 'Unknown error during AI analysis'
  };
}

/**
 * Analyze market sentiment data using AI
 * @param {Array} commentaryItems - Collected analyst commentary items
 * @returns {Promise<Object>} - Analyzed market sentiment data
 */
async function analyzeMarketSentiment(commentaryItems, providerOverride) {
  logger.info('Analyzing market sentiment data');
  
  // Create the analysis prompt
  const prompt = createMarketSentimentPrompt(commentaryItems);

  // Save prompt to file for debugging
  const debugDir = path.join(__dirname, '..', 'debug');
  if (!fs.existsSync(debugDir)) {
    fs.mkdirSync(debugDir, { recursive: true });
  }
  fs.writeFileSync(path.join(debugDir, 'last_prompt.txt'), prompt);

  // Provider selection logic
  let providerOrder = [
    { name: 'perplexity', func: callPerplexity },
    { name: 'openai', func: callOpenAI }
  ];
  if (providerOverride) {
    providerOrder = providerOrder.filter(p => p.name === providerOverride);
  }

  // Filter to available providers
  const availableProviders = providerOrder.filter(provider => {
    const key = provider.name === 'perplexity' 
      ? process.env.PERPLEXITY_API_KEY 
      : process.env.OPENAI_API_KEY;
    return key && key !== `your_${provider.name}_api_key_here`;
  });

  if (availableProviders.length === 0) {
    logger.error('No AI providers available - using fallback');
    return generateFallbackResponse(commentaryItems, new Error('No API keys configured'));
  }

  // Try each provider in order
  let lastError = null;
  for (const provider of availableProviders) {
    try {
      logger.info(`Trying ${provider.name} API...`);
      return await provider.func(prompt);
    } catch (error) {
      logger.error(`${provider.name} API failed: ${error.message}`);
      lastError = error;
    }
  }

  // All providers failed - use fallback
  logger.error('All AI providers failed - using fallback response');
  return generateFallbackResponse(commentaryItems, lastError);
}

module.exports = {
  analyzeMarketSentiment,
  createMarketSentimentPrompt,
  generateFallbackResponse
};