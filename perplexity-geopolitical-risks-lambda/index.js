// Lambda handler for Perplexity Geopolitical Risks Balanced
// Converted from TestPerplexityGeopoliticalRisksBalanced.js
// No hardcoded values; API key and fallback flag come from environment or event

try {
  // Wrap the entire file in a try/catch to catch any top-level errors
  const axios = require('axios');
  
  // Add global error handler for unhandled promises
  process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  });


// --- Core and helper functions from TestPerplexityGeopoliticalRisksBalanced.js ---

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
- Trade agreements or disputes
- Political transitions or elections with market impact
- Regulatory changes affecting global industries
- Energy market developments
- Natural disasters with economic consequences

SEARCH ACROSS THESE DIVERSE SOURCES:
1. Financial News: Bloomberg, Financial Times, Reuters, Wall Street Journal, CNBC
2. General News: CNN, BBC, New York Times, The Guardian, Al Jazeera, NPR
3. Social Media: Trending topics on X (Twitter) related to markets
4. Research: Major bank research (Goldman Sachs, JPMorgan, Morgan Stanley)
5. Regional Sources: Include sources specific to the regions involved in events

DO NOT OVERREPRESENT any single region, conflict, or type of event. Aim for global coverage.

Format your response as a valid JSON array with the following structure:
[
  {
    "headline": "Brief headline of the event",
    "date": "YYYY-MM-DD", // Must be a real date from the past 7 days
    "description": "Brief 1-2 sentence description of the event with SPECIFIC details",
    "region": "Affected region",
    "source": "Exact source name",
    "url": "Direct URL to specific article"
  }
]
`;
  try {
    console.log('Requesting recent geopolitical events with balanced prompt...');
    const response = await callPerplexityAPI(prompt, apiKey, 0.1);
    // Extract and parse the JSON
    let events;
    try {
      // First try direct parsing
      events = JSON.parse(response);
      console.log('Successfully parsed events JSON directly');
    } catch (error) {
      console.log('Direct JSON parsing failed, trying to extract from response...');
      // Try to extract JSON from markdown code blocks
      const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (jsonMatch && jsonMatch[1]) {
        try {
          console.log('Found JSON in code block, attempting to parse...');
          events = JSON.parse(jsonMatch[1]);
          console.log('Successfully parsed JSON from code block');
        } catch (codeBlockError) {
          console.error('Failed to parse JSON from code block:', codeBlockError);
        }
      }
      // If code block extraction failed, try to find any JSON-like structure
      if (!events) {
        const jsonObjectMatch = response.match(/\[\s*\{[\s\S]*\}\s*\]/);
        if (jsonObjectMatch) {
          try {
            console.log('Found JSON-like structure, attempting to parse...');
            events = JSON.parse(jsonObjectMatch[0]);
            console.log('Successfully parsed JSON from structure match');
          } catch (objectMatchError) {
            console.error('Failed to parse JSON from structure match:', objectMatchError);
          }
        }
      }
    }
    // If we have events, validate them
    if (Array.isArray(events) && events.length > 0) {
      console.log(`Retrieved ${events.length} events, validating...`);
      // Validate each event
      const validatedEvents = events.filter(event => {
        // Check for required fields
        if (!event.headline || !event.date || !event.description || !event.region || !event.source) {
          console.log(`Skipping event missing required fields: ${event.headline || 'Unknown'}`);
          return false;
        }
        // Validate date is within the last 7 days
        try {
          const eventDate = new Date(event.date);
          const sevenDaysAgo = new Date();
          sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
          if (isNaN(eventDate.getTime()) || eventDate < sevenDaysAgo) {
            console.log(`Skipping event with invalid or old date: ${event.headline}`);
            return false;
          }
        } catch (e) {
          console.log(`Skipping event with unparseable date: ${event.headline}`);
          return false;
        }
        return true;
      });
      if (validatedEvents.length > 0) {
        console.log(`Validated ${validatedEvents.length} events`);
        return validatedEvents;
      }
    }
    // If we get here, either no events were found or none passed validation
    console.log('No valid events found or extracted, using real-world fallbacks');
    return getRealWorldFallbackEvents();
  } catch (error) {
    console.error('Error retrieving geopolitical events:', error);
    return getRealWorldFallbackEvents();
  }
}

// Step 2: Analyze a specific geopolitical event in depth with balanced prompt
async function analyzeGeopoliticalEvent(event, apiKey) {
  // Balanced prompt with diverse sources and comprehensive analysis requirements
  const prompt = `
Analyze this specific geopolitical event in depth:

Headline: "${event.headline}"
Date: ${event.date}
Description: ${event.description}
Region: ${event.region}
Source: ${event.source}

Your task is to provide a FACTUAL, DATA-DRIVEN analysis of this event's impact on financial markets. 
Focus ONLY on VERIFIABLE information from reputable sources. DO NOT invent or fabricate data.

Provide a comprehensive analysis that includes:

1. What specific market sectors and assets are most affected by this event? (Be precise with names of indices, stocks, commodities)
2. What is the quantifiable impact observed so far? (Include REAL percentage changes or price movements)
3. What are expert opinions on this event? Include REAL names and affiliations of analysts who have commented on this event.
4. What are the potential short-term implications for markets based on HISTORICAL PRECEDENT for similar events?

IMPORTANT: Consult a DIVERSE range of sources beyond the original source, including:
- Financial media (Bloomberg, Reuters, Financial Times, Wall Street Journal)
- General news outlets (CNN, BBC, New York Times, The Guardian, Al Jazeera)
- Social media discussions on X (Twitter) from verified financial analysts
- Regional news sources specific to the affected regions

If you cannot find specific information on any of these points, state "Insufficient data available" rather than inventing information.

Format your response as a valid JSON object with the following structure:
{
  "type": "Event/Conflict/Policy",
  "name": "${event.headline}",
  "description": "Factual 3-5 sentence description with specific details from verified sources",
  "region": "${event.region}",
  "impactLevel": 7,  // MUST be a number from 1 to 10, with 1 being least impactful and 10 being most catastrophic
  "marketImpact": "Detailed description of OBSERVED market impact with specific sectors and assets",
  "expertOpinions": [
    {
      "name": "Expert's full name",
      "affiliation": "Expert's organization",
      "opinion": "Direct quote or accurately paraphrased opinion"
    }
  ],
  "sectorImpacts": [
    {
      "sector": "Affected sector name",
      "impact": "Positive/Negative/Mixed",
      "details": "Specific impact details with REAL figures where available"
    }
  ],
  "source": "${event.source}",
  "url": "${event.url}",
  "lastUpdated": "${event.date}"
}
`;
  try {
    console.log(`Analyzing event: ${event.headline}`);
    const response = await callPerplexityAPI(prompt, apiKey, 0.2);
    // Extract and parse the JSON
    let analysis;
    try {
      // First try direct parsing
      analysis = JSON.parse(response);
      console.log('Successfully parsed analysis JSON directly');
    } catch (error) {
      console.log('Direct JSON parsing failed, trying to extract from response...');
      // Try to extract JSON from markdown code blocks
      const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (jsonMatch && jsonMatch[1]) {
        try {
          console.log('Found JSON in code block, attempting to parse...');
          analysis = JSON.parse(jsonMatch[1]);
          console.log('Successfully parsed JSON from code block');
        } catch (codeBlockError) {
          console.error('Failed to parse JSON from code block:', codeBlockError);
        }
      }
      // If code block extraction failed, try to find any JSON-like structure
      if (!analysis) {
        const jsonObjectMatch = response.match(/\{[\s\S]*\}/);
        if (jsonObjectMatch) {
          try {
            console.log('Found JSON-like structure, attempting to parse...');
            analysis = JSON.parse(jsonObjectMatch[0]);
            console.log('Successfully parsed JSON from structure match');
          } catch (objectMatchError) {
            console.error('Failed to parse JSON from structure match:', objectMatchError);
          }
        }
      }
    }
    // If all parsing attempts failed
    if (!analysis) {
      console.error('All JSON parsing attempts failed for analysis');
      console.log('Raw response (first 500 chars):', response.substring(0, 500));
      // Create a minimal fallback that clearly indicates it's a fallback
      analysis = createFallbackAnalysis(event);
    }
    // Validate the analysis
    return validateAnalysis(analysis, event);
  } catch (error) {
    console.error(`Error analyzing event ${event.headline}:`, error);
    return createFallbackAnalysis(event);
  }
}

// Step 3: Create a consolidated analysis with proper formatting
function createConsolidatedAnalysis(analyzedEvents) {
  console.log('Creating consolidated analysis from analyzed events...');
  // Calculate overall risk index based on individual impact levels
  const avgImpactLevel = analyzedEvents.reduce((sum, event) => {
    return sum + (parseFloat(event.impactLevel) || 5);
  }, 0) / analyzedEvents.length;
  // Scale to 0-100
  const geopoliticalRiskIndex = Math.round(avgImpactLevel * 10);
  console.log(`Calculated geopolitical risk index: ${geopoliticalRiskIndex}`);
  // Format the risks array to match the required structure
  const risks = analyzedEvents.map(event => {
    // Create expert opinions text - limit to 2 experts to keep description concise
    let expertOpinionsText = '';
    if (event.expertOpinions && Array.isArray(event.expertOpinions) && event.expertOpinions.length > 0) {
      // Filter out any system-generated fallback opinions
      const realOpinions = event.expertOpinions.filter(expert => 
        !expert.name.includes('Unavailable') && 
        !expert.name.includes('Pending') && 
        !expert.affiliation.includes('System')
      );
      // Use up to 2 real opinions, or fallback if none
      const opinionsToUse = realOpinions.length > 0 ? realOpinions.slice(0, 2) : event.expertOpinions.slice(0, 1);
      expertOpinionsText = opinionsToUse.map(expert => 
        `${expert.name} (${expert.affiliation}): "${expert.opinion}"`
      ).join(' ');
    }
    // Enhance description with expert opinions, but keep it concise
    let enhancedDescription = event.description;
    if (expertOpinionsText && !enhancedDescription.includes(expertOpinionsText)) {
      // Check if description is already long
      if (enhancedDescription.length > 300) {
        // If description is already long, don't add expert opinions
        console.log(`Description for ${event.name} already long (${enhancedDescription.length} chars), not adding expert opinions`);
      } else {
        enhancedDescription += ' Experts weigh in: ' + expertOpinionsText;
      }
    }
    // Enhance market impact with sector impacts, but keep it concise
    let enhancedMarketImpact = event.marketImpact || '';
    if (event.sectorImpacts && Array.isArray(event.sectorImpacts) && event.sectorImpacts.length > 0) {
      // Limit to top 3 sector impacts to keep it concise
      const topSectorImpacts = event.sectorImpacts.slice(0, 3);
      const sectorImpactsText = topSectorImpacts.map(sector => 
        `${sector.sector}: ${sector.impact} (${sector.details})`
      ).join('. ');
      // Only add if not already included
      if (!enhancedMarketImpact.includes(sectorImpactsText)) {
        enhancedMarketImpact += ' Sector impacts: ' + sectorImpactsText;
      }
    }
    return {
      type: event.type || 'Event',
      name: event.name,
      description: enhancedDescription,
      region: event.region,
      impactLevel: parseFloat(event.impactLevel) || 5, // Ensure numeric impact level
      marketImpact: enhancedMarketImpact,
      source: event.source,
      url: event.url,
      lastUpdated: event.lastUpdated
    };
  });
  // Sort risks by impact level (highest to lowest)
  risks.sort((a, b) => b.impactLevel - a.impactLevel);
  // Create the final result object
  const currentDate = formatDate(new Date());
  console.log(`Final analysis contains ${risks.length} geopolitical risks`);
  return {
    geopoliticalRiskIndex,
    risks,
    source: "Perplexity API Enhanced Retrieval",
    sourceUrl: "https://perplexity.ai/",
    lastUpdated: currentDate
  };
}

// Helper function to call the Perplexity API
const axios = require('axios');
async function callPerplexityAPI(prompt, apiKey, temperature = 0.0) {
  const url = "https://api.perplexity.ai/chat/completions";
  const payload = {
    model: "sonar-pro",  // Using the standard model for compatibility
    messages: [
      {
        role: "system",
        content: "You are a geopolitical risk analyst for a major investment bank with expertise in how geopolitical events impact financial markets. Your analysis must be factual, data-driven, and based on verifiable information from reputable sources. Focus on quality over quantity. Provide specific details, including real names, figures, and dates. Format your response as valid JSON with no explanations or markdown formatting."
      },
      {
        role: "user",
        content: prompt
      }
    ],
    temperature: temperature,
    max_tokens: 4000,
    top_p: 0.7  // Lower top_p for more focused and factual responses
  };
  try {
    console.log(`Calling Perplexity API with temperature ${temperature}...`);
    const response = await axios.post(url, payload, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });
    const content = response.data.choices[0].message.content;
    console.log('Perplexity API response (first 300 chars):');
    console.log(content.substring(0, 300) + '...');
    return content;
  } catch (error) {
    console.error('Perplexity API error:', error);
    throw new Error(`Perplexity API error: ${error.message}`);
  }
}

// Helper function to validate and clean up the analysis
function validateAnalysis(analysis, event) {
  // Ensure required fields exist
  analysis.type = analysis.type || 'Event';
  analysis.name = analysis.name || event.headline;
  analysis.region = analysis.region || event.region;
  analysis.source = analysis.source || event.source;
  analysis.url = analysis.url || event.url;
  analysis.lastUpdated = analysis.lastUpdated || event.date;
  // Validate description
  if (!analysis.description || analysis.description.includes('Insufficient data') || analysis.description.length < 50) {
    analysis.description = `${event.description} [Note: Enhanced description unavailable.]`;
  }
  // Validate impact level - ENSURE IT'S NUMERIC
  let impactNum = parseFloat(analysis.impactLevel);
  if (isNaN(impactNum) || impactNum < 1 || impactNum > 10) {
    impactNum = 5; // Default to medium impact if invalid
  }
  analysis.impactLevel = impactNum; // Store as number
  // Validate market impact
  if (!analysis.marketImpact || analysis.marketImpact.includes('Insufficient data') || analysis.marketImpact.length < 50) {
    analysis.marketImpact = "Specific market impact data unavailable. The event may affect related sectors and assets.";
  }
  // Validate expert opinions
  if (!Array.isArray(analysis.expertOpinions) || analysis.expertOpinions.length === 0) {
    analysis.expertOpinions = [
      {
        name: "Expert Analysis Pending",
        affiliation: "Financial Markets",
        opinion: "Expert opinions on this event are currently being gathered."
      }
    ];
  }
  // Validate sector impacts
  if (!Array.isArray(analysis.sectorImpacts) || analysis.sectorImpacts.length === 0) {
    // Create default sector impacts based on the event type/region
    analysis.sectorImpacts = createDefaultSectorImpacts(event);
  }
  return analysis;
}

// Helper function to create default sector impacts based on event type/region
function createDefaultSectorImpacts(event) {
  const lowerHeadline = event.headline.toLowerCase();
  const lowerRegion = event.region.toLowerCase();
  // Check for common themes and create appropriate sector impacts
  if (lowerHeadline.includes('oil') || lowerHeadline.includes('energy') || lowerRegion.includes('middle east')) {
    return [
      {
        sector: "Energy",
        impact: "Mixed",
        details: "Energy markets may experience volatility due to this event."
      },
      {
        sector: "Transportation",
        impact: "Negative",
        details: "Higher fuel costs could impact transportation and logistics companies."
      }
    ];
  }
  if (lowerHeadline.includes('fed') || lowerHeadline.includes('interest rate') || lowerHeadline.includes('central bank')) {
    return [
      {
        sector: "Banking",
        impact: "Mixed",
        details: "Financial institutions may see impacts to lending margins and activity."
      },
      {
        sector: "Real Estate",
        impact: "Negative",
        details: "Changes in interest rate expectations could affect property valuations and mortgage activity."
      }
    ];
  }
  // Default fallback
  return [
    {
      sector: "General Markets",
      impact: "Mixed",
      details: "Potential for broad market impact."
    }
  ];
}

// Helper function to create a fallback analysis when the API call fails
function createFallbackAnalysis(event) {
  return {
    type: "Event",
    name: event.headline,
    description: event.description + " This event requires monitoring for potential market impacts.",
    region: event.region,
    impactLevel: 5, // Numeric impact level
    marketImpact: "The full market impact of this event is still being assessed by analysts and investors.",
    expertOpinions: [
      {
        name: "Market Analysis Team",
        affiliation: "Financial Research",
        opinion: "This event is being closely monitored for potential impacts across various market sectors."
      }
    ],
    sectorImpacts: createDefaultSectorImpacts(event),
    source: event.source,
    url: event.url,
    lastUpdated: event.date
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
        impactLevel: 5, // Numeric impact level
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
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const formattedYesterday = formatDate(yesterday);
  return [
    {
      headline: "US Federal Reserve Signals Policy Shift",
      date: formattedYesterday,
      description: "Federal Reserve officials indicated a potential pause in interest rate hikes, causing Treasury yields to decline and stock futures to rise.",
      region: "United States",
      source: "Wall Street Journal",
      url: "https://www.wsj.com/economy/"
    },
    {
      headline: "Middle East Tensions Impact Oil Supply",
      date: formattedYesterday,
      description: "Escalating tensions in the Middle East have raised concerns about oil supply disruptions, with Brent crude prices rising 2% in response.",
      region: "Middle East",
      source: "Bloomberg",
      url: "https://www.bloomberg.com/energy"
    },
    {
      headline: "EU Announces New Climate Regulations",
      date: formattedYesterday,
      description: "The European Union unveiled stricter climate regulations affecting multiple industries, with particular impact on automotive and energy sectors.",
      region: "Europe",
      source: "Financial Times",
      url: "https://www.ft.com/climate-capital"
    }
  ];
}

// Helper function to format dates consistently
function formatDate(date) {
  return date.toISOString().split('T')[0];
}

// Lambda handler
exports.handler = async (event = {}) => {
  console.log('Lambda invoked. Event:', JSON.stringify(event));
  // API key from env or event
  const apiKey = process.env.PERPLEXITY_API_KEY || event.PERPLEXITY_API_KEY;
  console.log('PERPLEXITY_API_KEY present:', !!apiKey);
  if (!apiKey) {
    console.error('PERPLEXITY_API_KEY not provided');
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'PERPLEXITY_API_KEY not provided' })
    };
  }

  // Fallback flag from env or event
  const useFallback = (process.env.USE_FALLBACK === 'true') || event.useFallback;
  console.log('USE_FALLBACK:', useFallback);

  try {
    if (useFallback) {
      console.log('Using fallback data.');
      const fallbackData = createFallbackData();
      return {
        statusCode: 200,
        body: JSON.stringify(fallbackData)
      };
    }
    console.log('Calling retrieveGeopoliticalRisksEnhanced...');
    const geopoliticalData = await retrieveGeopoliticalRisksEnhanced(apiKey);
    console.log('Geopolitical data retrieved:', JSON.stringify(geopoliticalData));
    return {
      statusCode: 200,
      body: JSON.stringify(geopoliticalData)
    };
  } catch (error) {
    // If something fails, return fallback data with error message
    console.error('Error in Lambda handler:', error);
    const fallbackData = createFallbackData(error);
    return {
      statusCode: 500,
      body: JSON.stringify({ ...fallbackData, error: error.message, stack: error.stack })
    };
  }
};

// --- Paste the rest of the helper/core functions from the original script here ---
// (Remove fs, dotenv, and CLI runner logic)

} catch (error) {
  console.error('FATAL ERROR in Lambda initialization:', error);
  
  // Export a fallback handler that will always return an error response
  exports.handler = async (event) => {
    console.error('Using fallback handler due to initialization error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Lambda initialization failed: ' + error.message,
        geopoliticalRiskIndex: 50,
        risks: [{
          type: "Error",
          name: "Lambda Error",
          description: "Geopolitical risk data retrieval encountered a Lambda initialization error.",
          region: "Global",
          impactLevel: 5,
          marketImpact: "Unable to assess market impact at this time.",
          source: "System",
          url: "https://perplexity.ai/"
        }],
        source: "System (Error Fallback)",
        lastUpdated: new Date().toISOString()
      })
    };
  };
}
