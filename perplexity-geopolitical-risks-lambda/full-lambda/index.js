/**
 * Lambda handler for Perplexity Geopolitical Risks
 * 
 * Adapted from TestPerplexityGeopoliticalRisksBalanced.js
 * Enhanced implementation of geopolitical risks retrieval with balanced prompts:
 * 1. More diverse news sources (CNN, BBC, NYT, Al Jazeera, etc.)
 * 2. Balanced coverage requirements across regions and event types
 * 3. Removed specific event bias
 * 4. Numeric impact levels (1-10) as expected by the system
 */

const axios = require('axios');

// Lambda handler
exports.handler = async (event = {}) => {
  console.log('Lambda invoked with event:', JSON.stringify(event));
  
  try {
    // Get API key from environment or event
    const apiKey = process.env.PERPLEXITY_API_KEY || event.PERPLEXITY_API_KEY;
    console.log('PERPLEXITY_API_KEY present:', !!apiKey);
    
    if (!apiKey) {
      console.error('PERPLEXITY_API_KEY not provided');
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'PERPLEXITY_API_KEY not provided' })
      };
    }

    // Get fallback flag from environment or event
    const useFallback = (process.env.USE_FALLBACK === 'true') || event.useFallback;
    console.log('USE_FALLBACK:', useFallback);

    // If fallback is requested, return fallback data
    if (useFallback) {
      console.log('Using fallback data');
      const fallbackData = createFallbackData();
      return {
        statusCode: 200,
        body: JSON.stringify(fallbackData)
      };
    }

    // Otherwise, retrieve geopolitical risks data
    console.log('Retrieving geopolitical risks data...');
    const geopoliticalData = await retrieveGeopoliticalRisksEnhanced(apiKey);
    console.log('Geopolitical data retrieved successfully');
    
    return {
      statusCode: 200,
      body: JSON.stringify(geopoliticalData)
    };
  } catch (error) {
    console.error('Error in Lambda handler:', error);
    const fallbackData = createFallbackData(error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        ...fallbackData,
        error: error.message,
        stack: error.stack
      })
    };
  }
};

// Main function to retrieve geopolitical risks data using the enhanced multi-step approach
async function retrieveGeopoliticalRisksEnhanced(apiKey) {
  try {
    console.log("Starting enhanced geopolitical risks retrieval...");
    // Step 1: Get recent specific events
    const recentEvents = await getRecentGeopoliticalEvents(apiKey);
    console.log(`Found ${recentEvents.length} recent events`);
    // Step 2: Analyze each event in depth
    const analyzedEvents = [];
    for (const event of recentEvents) {
      console.log(`Analyzing event: ${event.headline}`);
      const analysis = await analyzeGeopoliticalEvent(event, apiKey);
      analyzedEvents.push(analysis);
    }
    // Step 3: Create consolidated analysis with proper formatting
    const geopoliticalData = createConsolidatedAnalysis(analyzedEvents);
    return geopoliticalData;
  } catch (error) {
    console.error(`Error retrieving enhanced geopolitical risks: ${error}`);
    return createFallbackData(error);
  }
}

// Step 1: Get recent specific geopolitical events with balanced prompt
async function getRecentGeopoliticalEvents(apiKey) {
  const currentDate = new Date();
  const formattedDate = formatDate(currentDate);
  // Calculate dates for the past 7 days for better context
  const yesterday = new Date(currentDate);
  yesterday.setDate(currentDate.getDate() - 1);
  const twoDaysAgo = new Date(currentDate);
  twoDaysAgo.setDate(currentDate.getDate() - 2);
  const yesterdayFormatted = formatDate(yesterday);
  const twoDaysAgoFormatted = formatDate(twoDaysAgo);
  // Balanced prompt with diverse sources and coverage requirements
  const prompt = `
Today's Date: ${formattedDate}
Yesterday: ${yesterdayFormatted}
Two Days Ago: ${twoDaysAgoFormatted}

Identify the 7 MOST SIGNIFICANT geopolitical events from the PAST WEEK that are CURRENTLY impacting financial markets.

CRITICAL REQUIREMENTS:
1. Focus on REAL, VERIFIABLE events that have occurred recently
2. Each event MUST have a documented market impact (specific sectors, indices, or assets affected)
3. Each event MUST be from a reputable news source published in the last 7 days
4. Each event MUST include specific details (names, figures, dates)
5. Events should represent a DIVERSE range of regions and event types

ENSURE DIVERSE COVERAGE across these categories:
- Major conflicts or military actions in any region
- Significant diplomatic developments (state visits, treaties, negotiations)
- Central bank decisions and monetary policy changes
- Trade agreements, sanctions, or tariffs
- Political instability or elections with market implications
- Energy market developments
- Supply chain or commodity disruptions

FORMAT EACH EVENT AS:
{
  "headline": "Concise headline of the event",
  "date": "Date of the event (MM/DD/YYYY)",
  "region": "Primary geographic region affected",
  "description": "2-3 sentence factual description with specific details",
  "marketImpact": "Brief statement on how this affects financial markets",
  "source": "Name of reputable news source",
  "url": "URL to the news article (if available)"
}

RETURN AS JSON ARRAY of exactly 7 events.`;

  try {
    const response = await callPerplexityAPI(prompt, apiKey);
    console.log("Received response from Perplexity API for recent events");
    
    // Parse the response to extract the events
    let events = [];
    try {
      // Try to parse the JSON from the response
      const responseText = response.data.text || response.data.answer || "";
      const jsonMatch = responseText.match(/\[\s*\{.*\}\s*\]/s);
      
      if (jsonMatch) {
        events = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("Could not extract JSON array from response");
      }
      
      // Validate the events
      if (!Array.isArray(events) || events.length === 0) {
        throw new Error("No events found in response");
      }
      
      // Ensure each event has the required fields
      events = events.filter(event => 
        event && event.headline && event.date && event.region && 
        event.description && event.marketImpact && event.source
      );
      
      if (events.length === 0) {
        throw new Error("No valid events found in response");
      }
      
      return events;
    } catch (parseError) {
      console.error("Error parsing events:", parseError);
      return getRealWorldFallbackEvents();
    }
  } catch (error) {
    console.error("Error getting recent geopolitical events:", error);
    return getRealWorldFallbackEvents();
  }
}

// Step 2: Analyze a specific geopolitical event in depth with balanced prompt
async function analyzeGeopoliticalEvent(event, apiKey) {
  const prompt = `
Analyze this specific geopolitical event in depth: ${event.headline}

Event Details:
- Date: ${event.date}
- Region: ${event.region}
- Description: ${event.description}
- Market Impact: ${event.marketImpact}
- Source: ${event.source}

Provide a comprehensive analysis with the following structure:

{
  "name": "${event.headline}",
  "date": "${event.date}",
  "region": "${event.region}",
  "type": "CATEGORY_OF_EVENT",
  "description": "Detailed 2-3 sentence description of the event",
  "analysis": "3-4 sentence analysis of the geopolitical implications",
  "impactLevel": NUMERIC_IMPACT_LEVEL_1_TO_10,
  "marketImpact": "Detailed explanation of market impacts across sectors and assets",
  "sectorImpacts": [
    {"sector": "SECTOR_NAME", "impact": "POSITIVE/NEGATIVE/NEUTRAL", "description": "Brief explanation"},
    {"sector": "SECTOR_NAME", "impact": "POSITIVE/NEGATIVE/NEUTRAL", "description": "Brief explanation"},
    {"sector": "SECTOR_NAME", "impact": "POSITIVE/NEGATIVE/NEUTRAL", "description": "Brief explanation"}
  ],
  "source": "${event.source}",
  "url": "${event.url || ''}"
}

RETURN AS VALID JSON OBJECT.`;

  try {
    const response = await callPerplexityAPI(prompt, apiKey);
    console.log(`Received analysis for event: ${event.headline}`);
    
    // Parse the response to extract the analysis
    try {
      const responseText = response.data.text || response.data.answer || "";
      const jsonMatch = responseText.match(/\{.*\}/s);
      
      if (jsonMatch) {
        const analysis = JSON.parse(jsonMatch[0]);
        return validateAnalysis(analysis, event);
      } else {
        throw new Error("Could not extract JSON object from response");
      }
    } catch (parseError) {
      console.error(`Error parsing analysis for ${event.headline}:`, parseError);
      return createFallbackAnalysis(event);
    }
  } catch (error) {
    console.error(`Error analyzing event ${event.headline}:`, error);
    return createFallbackAnalysis(event);
  }
}

// Step 3: Create a consolidated analysis with proper formatting
function createConsolidatedAnalysis(analyzedEvents) {
  // Calculate average impact level
  const totalImpact = analyzedEvents.reduce((sum, event) => sum + event.impactLevel, 0);
  const avgImpact = Math.round(totalImpact / analyzedEvents.length);
  
  // Determine overall geopolitical risk index (scale 0-100)
  const geopoliticalRiskIndex = Math.min(100, Math.max(0, avgImpact * 10));
  
  // Sort events by impact level (descending)
  const sortedEvents = [...analyzedEvents].sort((a, b) => b.impactLevel - a.impactLevel);
  
  return {
    geopoliticalRiskIndex,
    risks: sortedEvents,
    source: "Perplexity AI",
    sourceUrl: "https://perplexity.ai/",
    lastUpdated: formatDate(new Date())
  };
}

// Helper function to call the Perplexity API
async function callPerplexityAPI(prompt, apiKey, temperature = 0.0) {
  try {
    const response = await axios({
      method: 'post',
      url: 'https://api.perplexity.ai/chat/completions',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      data: {
        model: 'llama-3-sonar-small-32k-online',
        messages: [
          {
            role: 'system',
            content: 'You are a geopolitical analyst with expertise in financial markets. Provide factual, balanced analysis based on reliable sources.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: temperature,
        max_tokens: 4000
      }
    });
    
    return response;
  } catch (error) {
    console.error('Error calling Perplexity API:', error.message);
    throw error;
  }
}

// Helper function to validate and clean up the analysis
function validateAnalysis(analysis, event) {
  // Ensure all required fields are present
  const validatedAnalysis = {
    name: analysis.name || event.headline,
    date: analysis.date || event.date,
    region: analysis.region || event.region,
    type: analysis.type || 'Geopolitical Event',
    description: analysis.description || event.description,
    analysis: analysis.analysis || 'No analysis available.',
    impactLevel: typeof analysis.impactLevel === 'number' ? 
      Math.min(10, Math.max(1, analysis.impactLevel)) : 5,
    marketImpact: analysis.marketImpact || event.marketImpact,
    sectorImpacts: Array.isArray(analysis.sectorImpacts) ? 
      analysis.sectorImpacts : createDefaultSectorImpacts(event),
    source: analysis.source || event.source,
    url: analysis.url || event.url || ''
  };
  
  // Ensure sectorImpacts has at least one item
  if (validatedAnalysis.sectorImpacts.length === 0) {
    validatedAnalysis.sectorImpacts = createDefaultSectorImpacts(event);
  }
  
  return validatedAnalysis;
}

// Helper function to create default sector impacts based on event type/region
function createDefaultSectorImpacts(event) {
  // Default sectors that might be affected by geopolitical events
  const sectors = [
    'Energy',
    'Technology',
    'Financial',
    'Defense',
    'Healthcare',
    'Consumer Staples',
    'Utilities',
    'Materials',
    'Industrials',
    'Communication Services',
    'Real Estate'
  ];
  
  // Select 3 random sectors
  const selectedSectors = [];
  const availableSectors = [...sectors];
  
  for (let i = 0; i < 3 && availableSectors.length > 0; i++) {
    const randomIndex = Math.floor(Math.random() * availableSectors.length);
    const sector = availableSectors.splice(randomIndex, 1)[0];
    
    // Randomly assign impact
    const impacts = ['POSITIVE', 'NEGATIVE', 'NEUTRAL'];
    const impact = impacts[Math.floor(Math.random() * impacts.length)];
    
    selectedSectors.push({
      sector,
      impact,
      description: `Default ${impact.toLowerCase()} impact on ${sector} sector due to ${event.region} event.`
    });
  }
  
  return selectedSectors;
}

// Helper function to create a fallback analysis when the API call fails
function createFallbackAnalysis(event) {
  return {
    name: event.headline,
    date: event.date,
    region: event.region,
    type: 'Geopolitical Event',
    description: event.description,
    analysis: 'Analysis unavailable due to API limitations.',
    impactLevel: 5,
    marketImpact: event.marketImpact || 'Impact assessment unavailable.',
    sectorImpacts: createDefaultSectorImpacts(event),
    source: event.source,
    url: event.url || ''
  };
}

// Helper function to create fallback data when the entire process fails
function createFallbackData(error) {
  return {
    geopoliticalRiskIndex: 50,
    risks: [
      {
        type: "Error",
        name: "API Error",
        description: "Geopolitical risk data retrieval encountered an API error: " + (error ? error.message : "Unknown error"),
        region: "Global",
        impactLevel: 5,
        marketImpact: "Unable to assess market impact at this time.",
        source: "System",
        url: "https://perplexity.ai/"
      }
    ],
    source: "System (Error Fallback)",
    sourceUrl: "https://perplexity.ai/",
    lastUpdated: formatDate(new Date()),
    error: error ? error.toString() : "Unknown error"
  };
}

// Helper function to provide real-world fallback events
function getRealWorldFallbackEvents() {
  const currentDate = new Date();
  const formattedDate = formatDate(currentDate);
  
  return [
    {
      headline: "Ongoing Russia-Ukraine Conflict",
      date: formattedDate,
      region: "Eastern Europe",
      description: "The conflict between Russia and Ukraine continues with significant implications for global energy markets and supply chains.",
      marketImpact: "Energy prices remain volatile, with European markets particularly affected.",
      source: "Reuters",
      url: "https://www.reuters.com/"
    },
    {
      headline: "US-China Trade Tensions",
      date: formattedDate,
      region: "Global",
      description: "Ongoing trade tensions between the United States and China continue to impact global supply chains and technology sectors.",
      marketImpact: "Technology and semiconductor stocks face pressure amid supply chain concerns.",
      source: "Financial Times",
      url: "https://www.ft.com/"
    },
    {
      headline: "Middle East Regional Instability",
      date: formattedDate,
      region: "Middle East",
      description: "Continuing tensions in the Middle East affect oil markets and regional stability.",
      marketImpact: "Oil prices fluctuate in response to security concerns in major producing regions.",
      source: "Bloomberg",
      url: "https://www.bloomberg.com/"
    }
  ];
}

// Helper function to format dates consistently
function formatDate(date) {
  return date.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
}
